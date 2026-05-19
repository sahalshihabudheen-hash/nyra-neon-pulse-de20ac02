import { useState, useCallback, useRef, useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface DjState {
  balance: number;
  leftGain: number;
  rightGain: number;
  low: number;
  mid: number;
  high: number;
  active: boolean;
}

let ctx: AudioContext | null = null;
let source: MediaElementAudioSourceNode | null = null;
let gainL: GainNode | null = null;
let gainR: GainNode | null = null;
let lowEq: BiquadFilterNode | null = null;
let midEq: BiquadFilterNode | null = null;
let highEq: BiquadFilterNode | null = null;
let merger: ChannelMergerNode | null = null;
let splitter: ChannelSplitterNode | null = null;
let analyserL: AnalyserNode | null = null;
let analyserR: AnalyserNode | null = null;

export function useDjAudio() {
  const { audioRef, isPlaying } = useMusicPlayer();
  const [state, setState] = useState<DjState>({
    balance: 0, leftGain: 1, rightGain: 1,
    low: 0, mid: 0, high: 0, active: false,
  });

  const initedRef = useRef(false);
  const stateRef = useRef(state);

  // Memoize apply so it doesn't change on every render
  const apply = useCallback((next: DjState) => {
    setState(next);
    const balL = next.balance <= 0 ? 1 : 1 - next.balance;
    const balR = next.balance >= 0 ? 1 : 1 + next.balance;
    
    if (gainL) gainL.gain.value = next.leftGain * balL;
    if (gainR) gainR.gain.value = next.rightGain * balR;
    if (lowEq) lowEq.gain.value = next.low;
    if (midEq) midEq.gain.value = next.mid;
    if (highEq) highEq.gain.value = next.high;
  }, []);

  const init = useCallback(() => {
    if (!audioRef.current) return false;
    try {
      if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();

      // Fast path: graph is fully wired to the same element — just ensure destination is connected
      if (merger && source && initedRef.current && (source as any).mediaElement === audioRef.current) {
        try { merger.connect(ctx.destination); } catch(e) {}
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }

      // Source node creation:
      // MediaElementAudioSourceNode is permanently bound to its HTMLAudioElement.
      // createMediaElementSource throws InvalidStateError if called again on the same element.
      // So: create only on first init. On reSync, the same source node is reused and the
      // graph is just rewired from scratch around it.
      if (!source) {
        try {
          source = ctx.createMediaElementSource(audioRef.current);
        } catch(e: any) {
          console.error('DJ createMediaElementSource failed:', e);
          return false;
        }
      }

      if (!splitter) splitter = ctx.createChannelSplitter(2);
      if (!merger) merger = ctx.createChannelMerger(2);
      if (!gainL) gainL = ctx.createGain();
      if (!gainR) gainR = ctx.createGain();
      if (!analyserL) analyserL = ctx.createAnalyser();
      if (!analyserR) analyserR = ctx.createAnalyser();
      
      if (!lowEq) {
        lowEq = ctx.createBiquadFilter();
        lowEq.type = 'lowshelf';
        lowEq.frequency.value = 320;
      }
      if (!midEq) {
        midEq = ctx.createBiquadFilter();
        midEq.type = 'peaking';
        midEq.frequency.value = 1000;
        midEq.Q.value = 1;
      }
      if (!highEq) {
        highEq = ctx.createBiquadFilter();
        highEq.type = 'highshelf';
        highEq.frequency.value = 3200;
      }

      // Disconnect all nodes cleanly before rewiring to avoid duplicate signal paths
      try { source.disconnect(); } catch(e) {}
      try { splitter.disconnect(); } catch(e) {}
      try { gainL.disconnect(); } catch(e) {}
      try { gainR.disconnect(); } catch(e) {}
      try { analyserL.disconnect(); } catch(e) {}
      try { analyserR.disconnect(); } catch(e) {}
      try { merger.disconnect(); } catch(e) {}

      // Rewire: source → EQ chain → splitter → gains → analysers → merger → output
      source.connect(lowEq);
      lowEq.connect(midEq);
      midEq.connect(highEq);
      highEq.connect(splitter);
      
      splitter.connect(gainL, 0);
      splitter.connect(gainR, 1);
      
      gainL.connect(analyserL);
      gainR.connect(analyserR);
      
      analyserL.connect(merger, 0, 0);
      analyserR.connect(merger, 0, 1);
      
      merger.connect(ctx.destination);

      initedRef.current = true;
      setState(s => ({ ...s, active: true }));
      return true;
    } catch (e) {
      console.error('DJ Engine Init Error:', e);
      return false;
    }
  }, [audioRef]);

  // Periodic Pressure Sync to prevent bypass
  useEffect(() => {
    if (!audioRef.current) return;

    const handleSync = () => {
      if (initedRef.current) {
        console.log("DJ Engine: Play-triggered wake-up sync");
        init();
      }
    };

    const isPlayingRef = { current: isPlaying };
    const periodicSync = setInterval(() => {
      if (initedRef.current && isPlayingRef.current) {
        if (ctx?.state === 'suspended') ctx.resume();
        try { merger?.connect(ctx!.destination); } catch(e) {}
      }
    }, 2000);

    audioRef.current.addEventListener('play', handleSync);
    return () => {
      audioRef.current?.removeEventListener('play', handleSync);
      clearInterval(periodicSync);
    };
  }, [init]); // isPlaying removed to prevent setup loops

  useEffect(() => { stateRef.current = state; }, [state]);

  const reSync = useCallback(() => {
    console.log("DJ Engine: Deep Re-Sync initiated");
    // Reset init flag to force full graph rewire (but keep source node —
    // MediaElementAudioSourceNode is permanently bound to its element)
    initedRef.current = false;
    const ok = init();
    // IMPORTANT: preserve active:true — apply(stateRef.current) would override
    // the active:true set by init() since stateRef still has active:false
    if (ok) apply({ ...stateRef.current, active: true });
    return ok;
  }, [init, apply]);

  const getLevels = useCallback(() => {
    if (!analyserL || !analyserR || !initedRef.current) return { left: 0, right: 0 };
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);
    analyserL.getByteFrequencyData(dataL);
    analyserR.getByteFrequencyData(dataR);
    const avg = (data: Uint8Array) => data.reduce((a, b) => a + b, 0) / data.length / 255;
    return { left: avg(dataL), right: avg(dataR) };
  }, []);

  const getBassLevel = useCallback(() => {
    if (!analyserL || !initedRef.current) return 0;
    const data = new Uint8Array(analyserL.frequencyBinCount);
    analyserL.getByteFrequencyData(data);
    // Bass is roughly first 10% of frequency spectrum
    const bassData = data.slice(0, Math.floor(data.length * 0.1));
    return bassData.reduce((a, b) => a + b, 0) / bassData.length / 255;
  }, []);

  return { state, apply, init, reSync, getLevels, getBassLevel };
}
