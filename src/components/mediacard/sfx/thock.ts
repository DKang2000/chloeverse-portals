"use client";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.42;
    masterGain.connect(ctx.destination);
  }
  if (!noiseBuffer && ctx) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.035));
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const ch = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) ch[i] = (Math.random() * 2 - 1) * 0.9;
  }
  return ctx && masterGain ? { ctx, masterGain } : null;
}

export function playThock(): void {
  const audio = ensureAudio();
  if (!audio) return;
  const { ctx: ac, masterGain: out } = audio;
  if (ac.state === "suspended") {
    void ac.resume().catch(() => {});
  }

  const t0 = ac.currentTime + 0.001;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, t0);
  bus.gain.exponentialRampToValueAtTime(1.0, t0 + 0.004);
  bus.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  bus.connect(out);

  const thump = ac.createOscillator();
  const thumpGain = ac.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(110, t0);
  thump.frequency.exponentialRampToValueAtTime(58, t0 + 0.075);
  thumpGain.gain.setValueAtTime(0.0001, t0);
  thumpGain.gain.exponentialRampToValueAtTime(0.8, t0 + 0.005);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  thump.connect(thumpGain).connect(bus);
  thump.start(t0);
  thump.stop(t0 + 0.1);

  const tok = ac.createOscillator();
  const tokGain = ac.createGain();
  tok.type = "triangle";
  tok.frequency.setValueAtTime(300, t0);
  tok.frequency.exponentialRampToValueAtTime(210, t0 + 0.025);
  tokGain.gain.setValueAtTime(0.0001, t0);
  tokGain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.002);
  tokGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
  tok.connect(tokGain).connect(bus);
  tok.start(t0);
  tok.stop(t0 + 0.04);

  if (noiseBuffer) {
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(1800, t0);
    band.Q.value = 1.4;
    const low = ac.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(2500, t0);
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.025);
    noise.connect(band).connect(low).connect(noiseGain).connect(bus);
    noise.start(t0);
    noise.stop(t0 + 0.03);
  }
}

