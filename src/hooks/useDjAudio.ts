import { useEffect, useRef, useState } from 'react';
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

  const init = () => {
    if (initedRef.current || !audioRef.current) return false;
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!ctx) ctx = new AC();
      if (!source) source = ctx.createMediaElementSource(audioRef.current);

      lowEq = ctx.createBiquadFilter(); lowEq.type = 'lowshelf'; lowEq.frequency.value = 200;
      midEq = ctx.createBiquadFilter(); midEq.type = 'peaking'; midEq.frequency.value = 1000; midEq.Q.value = 1;
      highEq = ctx.createBiquadFilter(); highEq.type = 'highshelf'; highEq.frequency.value = 3000;

      splitter = ctx.createChannelSplitter(2);
      gainL = ctx.createGain(); gainR = ctx.createGain();
      analyserL = ctx.createAnalyser(); analyserL.fftSize = 256;
      analyserR = ctx.createAnalyser(); analyserR.fftSize = 256;
      merger = ctx.createChannelMerger(2);

      // Wire: source -> low -> mid -> high -> splitter -> [L gain -> analyser, R gain -> analyser] -> merger -> destination
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
    } catch (err) {
      console.warn('DJ init failed (likely YouTube iframe source):', err);
      return false;
    }
  };

  useEffect(() => {
    // Try to resume context on user gesture
    const resume = () => { ctx?.resume?.(); };
    window.addEventListener('click', resume, { once: true });
    return () => window.removeEventListener('click', resume);
  }, []);

  const apply = (next: DjState) => {
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
  };

  const getLevels = (): { left: number; right: number } => {
    if (!analyserL || !analyserR) return { left: 0, right: 0 };
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);
    analyserL.getByteFrequencyData(dataL);
    analyserR.getByteFrequencyData(dataR);
    const avg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / arr.length / 255;
    return { left: avg(dataL), right: avg(dataR) };
  };

  return { state, apply, init, getLevels };
}
