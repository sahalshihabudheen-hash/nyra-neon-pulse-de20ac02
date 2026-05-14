import { useEffect, useRef, useState, useCallback } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

// Singleton AudioContext + nodes attached to the shared <audio> element.
// Web Audio cannot tap into the YouTube iframe (CORS). DJ Mode therefore
// only takes effect when the background-audio fallback (MP3 stream) is used.
let ctx: AudioContext | null = null;
let source: MediaElementAudioSourceNode | null = null;
let splitter: ChannelSplitterNode | null = null;
let merger: ChannelMergerNode | null = null;
let gainL: GainNode | null = null;
let gainR: GainNode | null = null;
let lowEq: BiquadFilterNode | null = null;
let midEq: BiquadFilterNode | null = null;
let highEq: BiquadFilterNode | null = null;
let analyserL: AnalyserNode | null = null;
let analyserR: AnalyserNode | null = null;

export interface DjState {
  balance: number;       // -1 (full L) .. 0 (center) .. 1 (full R)
  leftGain: number;      // 0..1.5
  rightGain: number;     // 0..1.5
  low: number;           // -12..12 dB
  mid: number;
  high: number;
  active: boolean;       // whether DJ chain is wired (background source live)
}

export function useDjAudio() {
  const { audioRef } = useMusicPlayer();
  const [state, setState] = useState<DjState>({
    balance: 0, leftGain: 1, rightGain: 1,
    low: 0, mid: 0, high: 0, active: false,
  });
  const initedRef = useRef(false);

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
        lowEq = ctx.createBiquadFilter(); lowEq.type = 'lowshelf'; lowEq.frequency.value = 200;
        midEq = ctx.createBiquadFilter(); midEq.type = 'peaking'; midEq.frequency.value = 1000; midEq.Q.value = 1;
        highEq = ctx.createBiquadFilter(); highEq.type = 'highshelf'; highEq.frequency.value = 3000;

        splitter = ctx.createChannelSplitter(2);
        gainL = ctx.createGain(); gainR = ctx.createGain();
        analyserL = ctx.createAnalyser(); analyserL.fftSize = 256;
        analyserR = ctx.createAnalyser(); analyserR.fftSize = 256;
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
    } catch (err) {
      console.warn('DJ init failed:', err);
      return false;
    }
  }, [audioRef]);

  const getLevels = (): { left: number; right: number } => {
    if (!analyserL || !analyserR) return { left: 0, right: 0 };
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);
    analyserL.getByteFrequencyData(dataL);
    analyserR.getByteFrequencyData(dataR);
    const avg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / arr.length / 255;
    return { left: avg(dataL), right: avg(dataR) };
  };

  const getBassLevel = (): number => {
    if (!analyserL || !analyserR) return 0;
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);
    analyserL.getByteFrequencyData(dataL);
    analyserR.getByteFrequencyData(dataR);
    
    // Look at first 2-3 bins for bass (up to ~400Hz)
    const bassL = (dataL[0] + dataL[1] + dataL[2]) / 3 / 255;
    const bassR = (dataR[0] + dataR[1] + dataR[2]) / 3 / 255;
    return (bassL + bassR) / 2;
  };

  // Sync engine on track change or play event
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleSync = () => {
      // If we've initialized the engine before, make sure it's awake
      if (initedRef.current) {
        console.log("DJ Engine: Play-triggered wake-up sync");
        init();
        // apply state is handled by the state change useEffect or we can call it here
      }
    };

    audioRef.current.addEventListener('play', handleSync);
    return () => audioRef.current?.removeEventListener('play', handleSync);
  }, [init]);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const reSync = useCallback(() => {
    // Force a re-wiring of the existing audio graph
    console.log("DJ Engine: Deep Re-Sync initiated");
    initedRef.current = false;
    // DO NOT set source = null here! createMediaElementSource can only be called once per element.
    const ok = init();
    if (ok) apply(stateRef.current);
    return ok;
  }, [init, apply]); // removed state dependency to prevent infinite loop

  return { state, apply, init, reSync, getLevels, getBassLevel };
}
