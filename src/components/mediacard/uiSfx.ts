"use client";

type LeatherThockOptions = {
  volume?: number;
};

let audioCtx: AudioContext | null = null;
let masterOut: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function createSoftClipCurve(amount = 1.6, samples = 256) {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

function ensureAudioGraph() {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) {
    audioCtx = new Ctx();
    masterOut = audioCtx.createGain();
    masterOut.gain.value = 0.46;
    masterOut.connect(audioCtx.destination);
  }

  if (!noiseBuf && audioCtx) {
    const len = Math.max(1, Math.floor(audioCtx.sampleRate * 0.04));
    noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * 0.95;
  }

  if (!audioCtx || !masterOut) return null;
  return { ctx: audioCtx, out: masterOut };
}

export function playLeatherThock({ volume = 1 }: LeatherThockOptions = {}): void {
  const audio = ensureAudioGraph();
  if (!audio) return;
  const { ctx, out } = audio;

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  const v = Math.max(0, Math.min(1.25, volume));
  const t0 = ctx.currentTime + 0.001;
  const doneAt = t0 + 0.25;

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t0);
  bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.95 * v), t0 + 0.004);
  bus.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

  const saturator = ctx.createWaveShaper();
  saturator.curve = createSoftClipCurve(1.8);
  saturator.oversample = "2x";
  bus.connect(saturator).connect(out);

  const lowThump = ctx.createOscillator();
  lowThump.type = "sine";
  lowThump.frequency.setValueAtTime(110, t0);
  lowThump.frequency.exponentialRampToValueAtTime(55, t0 + 0.12);
  const lowGain = ctx.createGain();
  lowGain.gain.setValueAtTime(0.0001, t0);
  lowGain.gain.exponentialRampToValueAtTime(0.9, t0 + 0.006);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  lowThump.connect(lowGain).connect(bus);
  lowThump.start(t0);
  lowThump.stop(t0 + 0.16);

  const bodyTok = ctx.createOscillator();
  bodyTok.type = "triangle";
  bodyTok.frequency.setValueAtTime(235, t0);
  bodyTok.frequency.exponentialRampToValueAtTime(165, t0 + 0.03);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, t0);
  bodyGain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.002);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  bodyTok.connect(bodyGain).connect(bus);
  bodyTok.start(t0);
  bodyTok.stop(t0 + 0.05);

  if (noiseBuf) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(700, t0);
    lowpass.Q.value = 0.7;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(220, t0);
    band.Q.value = 0.9;

    noise.connect(lowpass).connect(band).connect(noiseGain).connect(bus);
    noise.start(t0);
    noise.stop(t0 + 0.04);

    window.setTimeout(() => {
      try {
        noise.disconnect();
        lowpass.disconnect();
        band.disconnect();
        noiseGain.disconnect();
      } catch {}
    }, Math.ceil((doneAt - ctx.currentTime) * 1000) + 30);
  }

  window.setTimeout(() => {
    try {
      lowThump.disconnect();
      lowGain.disconnect();
      bodyTok.disconnect();
      bodyGain.disconnect();
      bus.disconnect();
      saturator.disconnect();
    } catch {}
  }, Math.ceil((doneAt - ctx.currentTime) * 1000) + 40);
}

