"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioGraph = {
  ctx: AudioContext;
  master: GainNode;
  ambientBus: GainNode;
  sfxBus: GainNode;
  ambientNodes: AudioNode[];
  ambientStops: Array<() => void>;
};

type UseAudioGateOptions = {
  volume?: number;
  ambientLevel?: number;
};

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.8;
  }
  return buffer;
}

function setupAmbient(graph: AudioGraph, level: number) {
  const { ctx, ambientBus } = graph;
  ambientBus.gain.value = level;

  const low = ctx.createOscillator();
  low.type = "sine";
  low.frequency.value = 74;
  const lowGain = ctx.createGain();
  lowGain.gain.value = 0.18;

  const shimmer = ctx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.value = 161;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.05;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 2.8);
  noise.loop = true;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 320;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1450;
  band.Q.value = 0.45;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.04;

  low.connect(lowGain).connect(ambientBus);
  shimmer.connect(shimmerGain).connect(ambientBus);
  noise.connect(highpass).connect(band).connect(noiseGain).connect(ambientBus);

  const t = ctx.currentTime + 0.01;
  low.start(t);
  shimmer.start(t);
  noise.start(t);

  graph.ambientNodes.push(low, lowGain, shimmer, shimmerGain, noise, highpass, band, noiseGain);
  graph.ambientStops.push(() => {
    try {
      low.stop();
      shimmer.stop();
      noise.stop();
    } catch {
      // no-op
    }
  });
}

function disposeGraph(graph: AudioGraph) {
  for (const stop of graph.ambientStops) stop();
  for (const node of graph.ambientNodes) {
    try {
      node.disconnect();
    } catch {
      // no-op
    }
  }
  try {
    graph.sfxBus.disconnect();
    graph.ambientBus.disconnect();
    graph.master.disconnect();
  } catch {
    // no-op
  }
}

export function useAudioGate(options: UseAudioGateOptions = {}) {
  const volume = options.volume ?? 0.18;
  const ambientLevel = options.ambientLevel ?? 0.26;

  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  const graphRef = useRef<AudioGraph | null>(null);
  const mutedRef = useRef(false);
  const duckedRef = useRef(false);

  const ensureGraph = useCallback((): AudioGraph | null => {
    if (typeof window === "undefined") return null;
    if (graphRef.current) return graphRef.current;

    const ContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ContextCtor) return null;

    const ctx = new ContextCtor();
    const master = ctx.createGain();
    const ambientBus = ctx.createGain();
    const sfxBus = ctx.createGain();

    master.gain.value = 0;
    ambientBus.gain.value = ambientLevel;
    sfxBus.gain.value = 1;

    ambientBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);

    const graph: AudioGraph = {
      ctx,
      master,
      ambientBus,
      sfxBus,
      ambientNodes: [],
      ambientStops: [],
    };

    setupAmbient(graph, ambientLevel);
    graphRef.current = graph;
    return graph;
  }, [ambientLevel]);

  const requestStart = useCallback(async () => {
    const graph = ensureGraph();
    if (!graph) return;

    if (graph.ctx.state === "suspended") {
      try {
        await graph.ctx.resume();
      } catch {
        return;
      }
    }

    const target = mutedRef.current || duckedRef.current ? 0.0001 : volume;
    graph.master.gain.setTargetAtTime(target, graph.ctx.currentTime, 0.08);
    if (!ready) setReady(true);
  }, [ensureGraph, ready, volume]);

  const playHoverChime = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || mutedRef.current || graph.ctx.state !== "running") return;

    const t = graph.ctx.currentTime + 0.005;
    const osc = graph.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.2);

    const gain = graph.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    const hp = graph.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 420;

    osc.connect(hp).connect(gain).connect(graph.sfxBus);
    osc.start(t);
    osc.stop(t + 0.32);

    window.setTimeout(() => {
      try {
        osc.disconnect();
        hp.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    }, 500);
  }, []);

  const playFocusWhoosh = useCallback((intensity = 1) => {
    const graph = graphRef.current;
    if (!graph || mutedRef.current || graph.ctx.state !== "running") return;

    const t = graph.ctx.currentTime + 0.004;
    const noise = graph.ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(graph.ctx, 0.16);

    const band = graph.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(420, t);
    band.frequency.exponentialRampToValueAtTime(1350, t + 0.22);
    band.Q.value = 0.55;

    const gain = graph.ctx.createGain();
    const peak = 0.035 * Math.max(0.45, Math.min(1.5, intensity));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    noise.connect(band).connect(gain).connect(graph.sfxBus);
    noise.start(t);
    noise.stop(t + 0.28);

    window.setTimeout(() => {
      try {
        noise.disconnect();
        band.disconnect();
        gain.disconnect();
      } catch {
        // no-op
      }
    }, 450);
  }, []);

  const playOpenBloom = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || mutedRef.current || graph.ctx.state !== "running") return;

    const t = graph.ctx.currentTime + 0.004;

    const tone = graph.ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(170, t);
    tone.frequency.exponentialRampToValueAtTime(340, t + 0.46);

    const toneGain = graph.ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, t);
    toneGain.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);

    const shimmer = graph.ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(620, t + 0.03);
    shimmer.frequency.exponentialRampToValueAtTime(1120, t + 0.48);

    const shimmerGain = graph.ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.03, t + 0.12);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.56);

    tone.connect(toneGain).connect(graph.sfxBus);
    shimmer.connect(shimmerGain).connect(graph.sfxBus);
    tone.start(t);
    tone.stop(t + 0.65);
    shimmer.start(t);
    shimmer.stop(t + 0.62);

    window.setTimeout(() => {
      try {
        tone.disconnect();
        toneGain.disconnect();
        shimmer.disconnect();
        shimmerGain.disconnect();
      } catch {
        // no-op
      }
    }, 900);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((value) => {
      const next = !value;
      mutedRef.current = next;
      const graph = graphRef.current;
      if (graph) {
        const target = next || duckedRef.current ? 0.0001 : volume;
        graph.master.gain.setTargetAtTime(target, graph.ctx.currentTime, 0.08);
      }
      return next;
    });
  }, [volume]);

  const setDucked = useCallback((ducked: boolean) => {
    duckedRef.current = ducked;
    const graph = graphRef.current;
    if (!graph) return;
    const target = mutedRef.current || ducked ? 0.0001 : volume;
    graph.master.gain.setTargetAtTime(target, graph.ctx.currentTime, ducked ? 0.03 : 0.1);
  }, [volume]);

  useEffect(() => {
    return () => {
      const graph = graphRef.current;
      if (!graph) return;
      disposeGraph(graph);
      void graph.ctx.close().catch(() => {});
      graphRef.current = null;
    };
  }, []);

  return {
    muted,
    ready,
    requestStart,
    toggleMuted,
    setDucked,
    playHoverChime,
    playFocusWhoosh,
    playOpenBloom,
  };
}
