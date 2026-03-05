"use client";

const BGM_SRC = "/audio/suzume.mp3";
const TARGET_VOLUME = 0.35;

type FadeState = {
  rafId: number | null;
  startedAt: number;
  from: number;
  to: number;
  durationMs: number;
};

type BgmState = {
  audio: HTMLAudioElement | null;
  initialized: boolean;
  started: boolean;
  muted: boolean;
  lastToggleAt: number;
  listenersBound: Map<EventTarget, EventListener>;
  fade: FadeState;
};

const state: BgmState = {
  audio: null,
  initialized: false,
  started: false,
  muted: false,
  lastToggleAt: 0,
  listenersBound: new Map<EventTarget, EventListener>(),
  fade: {
    rafId: null,
    startedAt: 0,
    from: 0,
    to: 0,
    durationMs: 0,
  },
};

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (state.audio) return state.audio;
  const audio = new Audio(BGM_SRC);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  state.audio = audio;
  return audio;
}

function stopActiveFade() {
  if (state.fade.rafId !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(state.fade.rafId);
  }
  state.fade.rafId = null;
}

function maybeStartBgm(reason: string) {
  const audio = getAudio();
  if (!audio) return;

  if (state.started && !audio.paused) {
    fadeVolumeTo(state.muted ? 0 : TARGET_VOLUME, 1200);
    return;
  }

  audio
    .play()
    .then(() => {
      state.started = true;
      console.log("[collabs-bgm] start", { reason });
      fadeVolumeTo(state.muted ? 0 : TARGET_VOLUME, 1200);
    })
    .catch((error) => {
      console.error("[collabs-bgm] play() failed", { reason, error });
    });
}

function unbindGestureTarget(target: EventTarget) {
  const handler = state.listenersBound.get(target);
  if (!handler) return;
  if ("removeEventListener" in target) {
    target.removeEventListener("pointerdown", handler);
    target.removeEventListener("keydown", handler);
    target.removeEventListener("touchstart", handler);
  }
  state.listenersBound.delete(target);
}

function unbindAllGestureTargets() {
  for (const target of Array.from(state.listenersBound.keys())) {
    unbindGestureTarget(target);
  }
}

export function initBgm() {
  if (state.initialized) return;
  const audio = getAudio();
  if (!audio) return;
  state.initialized = true;
  console.log("[collabs-bgm] init", {
    src: BGM_SRC,
    targetVolume: TARGET_VOLUME,
    preload: audio.preload,
    loop: audio.loop,
  });
}

export function startBgmOnFirstGesture(target?: EventTarget | null) {
  initBgm();

  if (!target) {
    maybeStartBgm("direct");
    return;
  }
  if (state.listenersBound.has(target) || state.started) return;

  const onGesture = (event: Event) => {
    maybeStartBgm(`first-gesture:${event.type}`);

    // Keep listeners alive until playback truly starts.
    window.setTimeout(() => {
      if (!state.started) return;
      unbindGestureTarget(target);
    }, 120);
  };

  if ("addEventListener" in target) {
    target.addEventListener("pointerdown", onGesture as EventListener, {
      passive: true,
    });
    target.addEventListener("keydown", onGesture as EventListener, {
      passive: true,
    });
    target.addEventListener("touchstart", onGesture as EventListener, {
      passive: true,
    });
    state.listenersBound.set(target, onGesture as EventListener);
  }
}

export function fadeVolumeTo(target: number, ms: number) {
  const audio = getAudio();
  if (!audio) return;

  stopActiveFade();

  const clampedTarget = Math.min(1, Math.max(0, target));
  const duration = Math.max(0, ms);
  const from = audio.volume;

  if (duration === 0) {
    audio.volume = clampedTarget;
    if (clampedTarget === 0 && !state.muted && !audio.paused) {
      audio.pause();
    }
    return;
  }

  state.fade.startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  state.fade.from = from;
  state.fade.to = clampedTarget;
  state.fade.durationMs = duration;

  const tick = () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const t = Math.min(1, (now - state.fade.startedAt) / state.fade.durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    const nextVolume = state.fade.from + (state.fade.to - state.fade.from) * eased;
    audio.volume = Math.min(1, Math.max(0, nextVolume));

    if (t < 1) {
      state.fade.rafId = window.requestAnimationFrame(tick);
      return;
    }

    state.fade.rafId = null;
    if (state.fade.to === 0 && !state.muted && !audio.paused) {
      audio.pause();
    }
  };

  if (audio.paused && clampedTarget > 0 && !state.muted) {
    maybeStartBgm("fade-request");
    return;
  }

  state.fade.rafId = window.requestAnimationFrame(tick);
}

export function toggleMute(): boolean {
  initBgm();
  const audio = getAudio();
  if (!audio) return state.muted;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - state.lastToggleAt < 220) {
    return state.muted;
  }
  state.lastToggleAt = now;

  state.muted = !state.muted;
  audio.muted = state.muted;

  if (state.muted) {
    fadeVolumeTo(0, 180);
  } else {
    if (audio.paused) maybeStartBgm("unmute");
    fadeVolumeTo(TARGET_VOLUME, 300);
  }

  console.log("[collabs-bgm] mute", { muted: state.muted });
  return state.muted;
}

export function stopBgm(options?: { resetTime?: boolean; clearGestureListeners?: boolean }) {
  const audio = getAudio();
  if (!audio) return;

  stopActiveFade();
  audio.pause();
  if (options?.resetTime) {
    audio.currentTime = 0;
  }

  state.started = false;
  if (options?.clearGestureListeners ?? true) {
    unbindAllGestureTargets();
  }
  console.log("[collabs-bgm] stop", { resetTime: Boolean(options?.resetTime) });
}
