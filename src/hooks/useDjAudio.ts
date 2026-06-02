/**
 * useDjAudio — Web Audio API DJ engine (v3)
 *
 * Signal chain:
 *   HTMLAudioElement  ←  edge-function proxy stream (crossOrigin="anonymous")
 *     └─ MediaElementSourceNode  (singleton — one per element)
 *          └─ ChannelSplitterNode(2)
 *               ├─ ch 0 → leftGainNode  → lowShelfL → peakingL → highShelfL → analyserL → ChannelMerger(0)
 *               └─ ch 1 → rightGainNode → lowShelfR → peakingR → highShelfR → analyserR → ChannelMerger(1)
 *          ChannelMerger → masterGain → AudioContext.destination
 *
 * Key design decisions:
 *  • EQ is applied PER CHANNEL (after splitter) → true L/R tone shaping.
 *  • Equal-power crossfade avoids the 3 dB dip at centre.
 *  • All parameter changes use linearRampToValueAtTime (30 ms) → click-free.
 *  • AudioContext + source node live in module-level vars → guaranteed singleton.
 *    React's StrictMode double-invocation can't break it.
 *  • Separate AnalyserNodes on L and R give independent VU metering.
 *  • Periodic pressure-sync every 2 s reconnects the merger if something
 *    external disconnects it (e.g. iOS backgrounding).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

// ─── Public state shape ──────────────────────────────────────────────────────

export interface DjState {
  /** Engine is wired and active */
  active: boolean;
  /** Crossfader: -1 = full L, 0 = centre, +1 = full R */
  balance: number;
  /** Left deck fader (0 – 1.5) */
  leftGain: number;
  /** Right deck fader (0 – 1.5) */
  rightGain: number;
  /** Bass shelf dB (-12 – +12) */
  low: number;
  /** Mid peaking dB (-12 – +12) */
  mid: number;
  /** Treble shelf dB (-12 – +12) */
  high: number;
}

// ─── Module-level AudioContext singleton ─────────────────────────────────────
// These must live outside the hook so React re-renders / StrictMode double
// calls cannot create duplicate MediaElementSourceNodes.

let _ctx: AudioContext | null = null;
let _source: MediaElementAudioSourceNode | null = null;
let _splitter: ChannelSplitterNode | null = null;
let _gainL: GainNode | null = null;
let _gainR: GainNode | null = null;
// Left EQ chain
let _lowL: BiquadFilterNode | null = null;
let _midL: BiquadFilterNode | null = null;
let _highL: BiquadFilterNode | null = null;
// Right EQ chain
let _lowR: BiquadFilterNode | null = null;
let _midR: BiquadFilterNode | null = null;
let _highR: BiquadFilterNode | null = null;
// Per-channel analysers
let _analyserL: AnalyserNode | null = null;
let _analyserR: AnalyserNode | null = null;
// Output
let _merger: ChannelMergerNode | null = null;
let _masterGain: GainNode | null = null;

// EQ frequencies
const LOW_FREQ  = 320;   // Hz — low-shelf
const MID_FREQ  = 1000;  // Hz — peaking centre
const MID_Q     = 1.0;   // peaking Q
const HIGH_FREQ = 3200;  // Hz — high-shelf
const RAMP_S    = 0.03;  // 30 ms smooth ramp

// ─── Helper: build one EQ chain ──────────────────────────────────────────────

function makeEq(ctx: AudioContext): [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode] {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = LOW_FREQ;
  low.gain.value = 0;

  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = MID_FREQ;
  mid.Q.value = MID_Q;
  mid.gain.value = 0;

  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = HIGH_FREQ;
  high.gain.value = 0;

  low.connect(mid);
  mid.connect(high);
  return [low, mid, high];
}

// ─── Helper: equal-power crossfade ───────────────────────────────────────────
// balance ∈ [-1, 1]; returns [gainL, gainR] ∈ [0, 1]

function equalPower(balance: number): [number, number] {
  // Map [-1,1] to angle [0, π/2]
  const angle = ((balance + 1) / 2) * (Math.PI / 2);
  return [Math.cos(angle), Math.sin(angle)];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDjAudio() {
  const { audioRef, isPlaying } = useMusicPlayer();

  const [state, setState] = useState<DjState>({
    active: false,
    balance: 0,
    leftGain: 1,
    rightGain: 1,
    low: 0,
    mid: 0,
    high: 0,
  });

  const initedRef    = useRef(false);
  const stateRef     = useRef(state);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── ctxState: tracks live context status ──────────────────────────────────
  const [ctxState, setCtxState] = useState<AudioContextState>('suspended');

  const bindStateListener = useCallback(() => {
    if (!_ctx) return;
    setCtxState(_ctx.state);
    _ctx.onstatechange = () => {
      if (_ctx) setCtxState(_ctx.state);
    };
  }, []);

  // ── unlock: resume AudioContext on user gesture ───────────────────────────

  const unlock = useCallback(() => {
    try {
      if (!_ctx) {
        _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      bindStateListener();
      if (_ctx.state === 'suspended') {
        _ctx.resume().then(bindStateListener).catch(() => {});
      }
      
      // Silent buffer wake up to force opening audio output stream on mobile/WebViews
      const buffer = _ctx.createBuffer(1, 1, 22050);
      const source = _ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(_ctx.destination);
      source.start(0);
      console.log('[DJ] AudioContext unlocked & silent buffer played successfully');
    } catch (e) {
      console.warn('[DJ] unlock failed:', e);
    }
  }, [bindStateListener]);

  // ── apply: push DjState to live nodes ────────────────────────────────────

  const apply = useCallback((next: DjState) => {
    setState(next);
    stateRef.current = next;

    if (!_ctx) return;
    const now = _ctx.currentTime;

    // Equal-power crossfader
    const [xL, xR] = equalPower(next.balance);
    const effL = next.leftGain  * xL;
    const effR = next.rightGain * xR;

    if (_gainL) _gainL.gain.linearRampToValueAtTime(effL, now + RAMP_S);
    if (_gainR) _gainR.gain.linearRampToValueAtTime(effR, now + RAMP_S);

    // EQ — applied independently to each channel
    for (const node of [_lowL, _lowR] as BiquadFilterNode[]) {
      if (node) node.gain.linearRampToValueAtTime(next.low, now + RAMP_S);
    }
    for (const node of [_midL, _midR] as BiquadFilterNode[]) {
      if (node) node.gain.linearRampToValueAtTime(next.mid, now + RAMP_S);
    }
    for (const node of [_highL, _highR] as BiquadFilterNode[]) {
      if (node) node.gain.linearRampToValueAtTime(next.high, now + RAMP_S);
    }
  }, []);

  // ── _wire: (re)build graph around existing nodes ──────────────────────────

  const _wire = useCallback(() => {
    if (!_ctx || !_source || !_splitter || !_gainL || !_gainR ||
        !_lowL || !_midL || !_highL || !_lowR || !_midR || !_highR ||
        !_analyserL || !_analyserR || !_merger || !_masterGain) return;

    // Disconnect all cleanly first to avoid duplicate paths
    const nodes = [
      _source, _splitter, _gainL, _gainR,
      _lowL, _midL, _highL, _lowR, _midR, _highR,
      _analyserL, _analyserR, _merger, _masterGain,
    ];
    for (const n of nodes) { try { n.disconnect(); } catch {} }

    // Wire:
    // source → splitter
    _source.connect(_splitter);

    // Left: splitter[0] → gainL → lowL → midL → highL → analyserL → merger[0]
    _splitter.connect(_gainL, 0);
    _gainL.connect(_lowL);
    // _lowL → _midL → _highL already wired in makeEq
    _highL.connect(_analyserL);
    _analyserL.connect(_merger, 0, 0);

    // Right: splitter[1] → gainR → lowR → midR → highR → analyserR → merger[1]
    _splitter.connect(_gainR, 1);
    _gainR.connect(_lowR);
    _highR.connect(_analyserR);
    _analyserR.connect(_merger, 0, 1);

    // merger → masterGain → destination
    _merger.connect(_masterGain);
    _masterGain.connect(_ctx.destination);
  }, []);

  // ── init: cold start ──────────────────────────────────────────────────────

  const init = useCallback((): boolean => {
    const audio = audioRef.current;
    if (!audio?.src) {
      console.warn('[DJ] init: no audio src');
      return false;
    }
    try {
      // Get or create AudioContext
      if (!_ctx) {
        _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      bindStateListener();
      if (_ctx.state === 'suspended') {
        _ctx.resume().then(bindStateListener).catch(() => {});
      }

      // Fast path: graph already wired to the SAME element
      if (
        initedRef.current &&
        _source &&
        (_source as any).mediaElement === audio &&
        _merger
      ) {
        try { _merger.connect(_masterGain!); _masterGain!.connect(_ctx.destination); } catch {}
        return true;
      }

      // Source node — permanent bond between AudioContext and HTMLAudioElement.
      // Creating it a second time on the same element throws InvalidStateError.
      if (!_source || (_source as any).mediaElement !== audio) {
        try { _source?.disconnect(); } catch {}
        _source = _ctx.createMediaElementSource(audio);
      }

      // Create all other nodes fresh
      _splitter  = _ctx.createChannelSplitter(2);
      _gainL     = _ctx.createGain();
      _gainR     = _ctx.createGain();
      [_lowL, _midL, _highL] = makeEq(_ctx);
      [_lowR, _midR, _highR] = makeEq(_ctx);

      _analyserL = _ctx.createAnalyser();
      _analyserL.fftSize = 256;
      _analyserL.smoothingTimeConstant = 0.8;

      _analyserR = _ctx.createAnalyser();
      _analyserR.fftSize = 256;
      _analyserR.smoothingTimeConstant = 0.8;

      _merger     = _ctx.createChannelMerger(2);
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = 1;

      _wire();
      initedRef.current = true;

      // Push current state to live nodes
      apply({ ...stateRef.current, active: true });
      return true;
    } catch (e) {
      console.error('[DJ] init error:', e);
      return false;
    }
  }, [audioRef, _wire, apply]);

  // ── reSync: rebuild graph after track swap ────────────────────────────────

  const reSync = useCallback((): boolean => {
    console.log('[DJ] reSync');
    initedRef.current = false;
    const ok = init();
    if (ok) apply({ ...stateRef.current, active: true });
    return ok;
  }, [init, apply]);

  // ── Periodic pressure sync (keeps merger wired despite OS interruptions) ──

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      if (initedRef.current) {
        if (_ctx?.state === 'suspended') _ctx.resume().catch(() => {});
        try { _merger?.connect(_masterGain!); _masterGain?.connect(_ctx!.destination); } catch {}
      }
    };

    const interval = setInterval(() => {
      if (initedRef.current && isPlayingRef.current) {
        if (_ctx?.state === 'suspended') _ctx.resume().catch(() => {});
        try { _merger?.connect(_masterGain!); _masterGain?.connect(_ctx!.destination); } catch {}
      }
    }, 2000);

    audio.addEventListener('play', handlePlay);
    return () => {
      audio.removeEventListener('play', handlePlay);
      clearInterval(interval);
    };
  }, [audioRef]);

  // ── Window gesture listener — rescue suspended context ────────────────────

  useEffect(() => {
    const resume = () => {
      if (_ctx?.state === 'suspended' && stateRef.current.active) {
        _ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', resume);
    window.addEventListener('touchstart', resume, { passive: true });
    return () => {
      window.removeEventListener('click', resume);
      window.removeEventListener('touchstart', resume);
    };
  }, []);

  // ── getLevels: 0-1 normalised L/R amplitude ───────────────────────────────

  const getLevels = useCallback((): { left: number; right: number } => {
    if (!_analyserL || !_analyserR || !initedRef.current) return { left: 0, right: 0 };

    const dataL = new Uint8Array(_analyserL.frequencyBinCount);
    const dataR = new Uint8Array(_analyserR.frequencyBinCount);
    _analyserL.getByteFrequencyData(dataL);
    _analyserR.getByteFrequencyData(dataR);

    const avg = (d: Uint8Array) => d.reduce((a, b) => a + b, 0) / d.length / 255;
    return { left: avg(dataL), right: avg(dataR) };
  }, []);

  // ── getBassLevel: 0-1 bass energy from left analyser ─────────────────────

  const getBassLevel = useCallback((): number => {
    if (!_analyserL || !initedRef.current) return 0;

    const data = new Uint8Array(_analyserL.frequencyBinCount);
    _analyserL.getByteFrequencyData(data);

    // Bass ≈ lowest 10% of frequency bins
    const bins = Math.floor(data.length * 0.1);
    const sum  = data.slice(0, bins).reduce((a, b) => a + b, 0);
    return sum / (bins * 255);
  }, []);

  return { state, apply, init, reSync, getLevels, getBassLevel, unlock, ctxState };
}
