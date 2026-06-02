import { useEffect, useRef, useState, useCallback } from 'react';

// Singleton AudioContext + nodes
let ctx: AudioContext | null = null;
let source: MediaElementAudioSourceNode | null = null;
let lowEq: BiquadFilterNode | null = null;
let midEq: BiquadFilterNode | null = null;
let highEq: BiquadFilterNode | null = null;
let splitter: ChannelSplitterNode | null = null;
let gainL: GainNode | null = null;
let gainR: GainNode | null = null;
let analyserL: AnalyserNode | null = null;
let analyserR: AnalyserNode | null = null;
let merger: ChannelMergerNode | null = null;

export interface DjState {
  balance: number;       // -1 (full L) .. 0 (center) .. 1 (full R)
  leftGain: number;      // 0..1.5
  rightGain: number;     // 0..1.5
  low: number;           // -12..12 dB
  mid: number;
  high: number;
  active: boolean;       // whether DJ chain is wired (background source live)
}

export function useDjAudio(
  providedAudioRef: React.RefObject<HTMLAudioElement | null>,
  providedIsPlaying: boolean
) {
  const [state, setState] = useState<DjState>({
    balance: 0,
    leftGain: 1,
    rightGain: 1,
    low: 0,
    mid: 0,
    high: 0,
    active: false,
  });

  const initedRef = useRef(false);
  const audioRef = providedAudioRef;

  const apply = useCallback((next: DjState) => {
    setState(next);
    if (!initedRef.current) return;
    
    // Balance overlays the per-channel gain
    const balL = next.balance <= 0 ? 1 : 1 - next.balance;
    const balR = next.balance >= 0 ? 1 : 1 + next.balance;
    if (gainL) gainL.gain.value = next.leftGain * balL;
    if (gainR) gainR.gain.value = next.rightGain * balR;
    
    if (lowEq) lowEq.gain.value = next.low;
    if (midEq) midEq.gain.value = next.mid;
    if (highEq) highEq.gain.value = next.high;
  }, []);

  const unlock = useCallback(() => {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('Unlock failed:', e);
    }
  }, []);

  const init = useCallback(() => {
    if (!audioRef.current) return false;
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!ctx) ctx = new AC();
      
      if (ctx.state === 'suspended') ctx.resume();
      
      // If the media element changed or source was lost, we must rebuild the source link
      if (!source || (source as any).mediaElement !== audioRef.current) {
        if (source) try { source.disconnect(); } catch(e) {}
        source = ctx.createMediaElementSource(audioRef.current);
        initedRef.current = false; // Trigger re-wiring
      }

      // If we already have a functional chain, just ensure it's connected
      if (merger && initedRef.current) {
        try { merger.connect(ctx.destination); } catch(e) {}
        return true;
      }

      // Only create nodes if they don't exist (True Singleton)
      if (!lowEq) {
        lowEq = ctx.createBiquadFilter();
        lowEq.type = 'lowshelf';
        lowEq.frequency.value = 320; // lowshelf filter at 320Hz for Bass

        midEq = ctx.createBiquadFilter();
        midEq.type = 'peaking';
        midEq.frequency.value = 1000;
        midEq.Q.value = 1;

        highEq = ctx.createBiquadFilter();
        highEq.type = 'highshelf';
        highEq.frequency.value = 3200; // highshelf filter at 3200Hz for Highs/Treble

        splitter = ctx.createChannelSplitter(2);
        gainL = ctx.createGain();
        gainR = ctx.createGain();
        analyserL = ctx.createAnalyser();
        analyserL.fftSize = 256;
        analyserR = ctx.createAnalyser();
        analyserR.fftSize = 256;
        merger = ctx.createChannelMerger(2);

        // Wire nodes (internal chain stays connected once created)
        lowEq.connect(midEq);
        midEq.connect(highEq);
        highEq.connect(splitter);
        splitter.connect(gainL, 0);
        splitter.connect(gainR, 1);
        gainL.connect(analyserL);
        gainR.connect(analyserR);
        analyserL.connect(merger, 0, 0);
        analyserR.connect(merger, 0, 1);
      }

      // Always reconnect source to start of chain and merger to destination
      source.connect(lowEq);
      merger.connect(ctx.destination);

      initedRef.current = true;
      setState(s => ({ ...s, active: true }));
      return true;
    } catch(e) {
      console.error('DJ Engine Boot Error:', e);
      return false;
    }
  }, [audioRef]);

  const stop = useCallback(() => {
    try {
      if (merger && ctx) {
        merger.disconnect(); // Stand down the stream node without breaking elements
      }
      setState(s => ({ ...s, active: false }));
    } catch(e) {}
  }, []);

  const reSync = useCallback(() => {
    if (!audioRef.current || !initedRef.current) return false;
    try {
      if (!ctx || ctx.state === 'suspended') ctx?.resume();
      if (merger) {
        merger.disconnect();
        merger.connect(ctx!.destination);
      }
      return true;
    } catch (e) {
      return false;
    }
  }, [audioRef]);

  const getLevels = useCallback(() => {
    if (!analyserL || !analyserR || !state.active) return { left: 0, right: 0 };
    const pL = new Uint8Array(1);
    const pR = new Uint8Array(1);
    analyserL.getByteTimeDomainData(pL);
    analyserR.getByteTimeDomainData(pR);
    
    // Normalization out of baseline (128 is center node silence)
    const leftVal = Math.abs(pL[0] - 128) / 128;
    const rightVal = Math.abs(pR[0] - 128) / 128;
    return { left: leftVal, right: rightVal };
  }, [state.active]);

  const getBassLevel = useCallback(() => {
    if (!analyserL || !state.active) return 0;
    const data = new Uint8Array(16);
    analyserL.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += data[i]; // Low-bin nodes
    return sum / (4 * 255);
  }, [state.active]);

  return {
    state,
    apply,
    init,
    stop,
    unlock,
    getLevels,
    getBassLevel,
    reSync
  };
}
