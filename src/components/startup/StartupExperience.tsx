"use client";

import { DesktopAstroField } from "@/components/home/DesktopAstroField";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

type StartupExperienceProps = {
  titleFontClassName: string;
  monoFontClassName: string;
  isMobileExperience?: boolean;
};

const WAITLIST_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxOP0JpamQ_26ZKOL1wnE939tImNZm1iewK85ZyKbgWW_RmP27LELvjQVtPxnsUKET3HQ/exec";

const STARTUP_LAUNCH_DATE = "5.01.26";
const STARTUP_STATUS_LABEL = "COMING SOON";

type CssVars = CSSProperties & Record<`--${string}`, string>;
type GlyphMetric = { x: number; y: number; radius: number };
type BlockMotionState = { tiltX: number; tiltY: number; shiftX: number; shiftY: number };
type RippleState = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  startedAt: number;
  lastX: number;
  lastY: number;
  hasLast: boolean;
};
type DepthConfig = {
  baseDepth: number;
  hoverRadius: number;
  hoverLift: number;
  rippleLift: number;
  rippleDurationMs: number;
  rippleSpeedPxPerMs: number;
  rippleBandPx: number;
  maxTiltX: number;
  maxTiltY: number;
  maxShiftX: number;
  maxShiftY: number;
};

const TITLE_DEPTH_CONFIG: DepthConfig = {
  baseDepth: 10.8,
  hoverRadius: 132,
  hoverLift: 13.8,
  rippleLift: 10.4,
  rippleDurationMs: 430,
  rippleSpeedPxPerMs: 0.42,
  rippleBandPx: 52,
  maxTiltX: 7,
  maxTiltY: 8.8,
  maxShiftX: 8.6,
  maxShiftY: 6.8,
};

const DATE_DEPTH_CONFIG: DepthConfig = {
  baseDepth: 7.2,
  hoverRadius: 102,
  hoverLift: 8.4,
  rippleLift: 6.8,
  rippleDurationMs: 380,
  rippleSpeedPxPerMs: 0.34,
  rippleBandPx: 42,
  maxTiltX: 4.2,
  maxTiltY: 5.2,
  maxShiftX: 4.5,
  maxShiftY: 3.4,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number) {
  return function next() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function idlePulseStyle(seed: number): CssVars {
  const rnd = mulberry32((seed ^ 0x7f4a7c15) >>> 0);
  const duration = 1.7 + rnd() * 0.7;
  const scalePeak = 1.06 + rnd() * 0.055;
  const liftPeak = -5.2 - rnd() * 6.8;
  const brightnessPeak = 1.2 + rnd() * 0.22;
  const glowPeak = 0.34 + rnd() * 0.3;

  return {
    "--glyph-pulse-duration": `${duration.toFixed(3)}s`,
    "--glyph-pulse-delay": `${(-rnd() * duration).toFixed(3)}s`,
    "--glyph-pulse-scale-peak": scalePeak.toFixed(4),
    "--glyph-pulse-lift-peak": `${liftPeak.toFixed(3)}px`,
    "--glyph-pulse-brightness-peak": brightnessPeak.toFixed(3),
    "--glyph-pulse-glow-peak": glowPeak.toFixed(3),
  };
}

function measureGlyphMetrics(
  host: HTMLElement | null,
  refs: Array<HTMLSpanElement | null>,
  count: number,
): GlyphMetric[] {
  if (!host || count <= 0) return [];

  const hostRect = host.getBoundingClientRect();
  const metrics: GlyphMetric[] = [];

  for (let index = 0; index < count; index += 1) {
    const node = refs[index];
    if (!node) continue;
    const rect = node.getBoundingClientRect();
    metrics.push({
      x: rect.left - hostRect.left + rect.width * 0.5,
      y: rect.top - hostRect.top + rect.height * 0.5,
      radius: Math.max(18, Math.max(rect.width, rect.height) * 0.64),
    });
  }

  return metrics;
}

function setBlockMotionVars(host: HTMLElement | null, motion: BlockMotionState) {
  if (!host) return;
  host.style.setProperty("--block-tilt-x", `${motion.tiltX.toFixed(3)}deg`);
  host.style.setProperty("--block-tilt-y", `${motion.tiltY.toFixed(3)}deg`);
  host.style.setProperty("--block-shift-x", `${motion.shiftX.toFixed(3)}px`);
  host.style.setProperty("--block-shift-y", `${motion.shiftY.toFixed(3)}px`);
}

function setGlyphDepthVars(
  node: HTMLSpanElement | null,
  depth: number,
  lift: number,
  ripple: number,
  shadow: number,
  offsetX: number,
  offsetY: number,
  rotateX: number,
  rotateY: number,
  scale: number,
) {
  if (!node) return;
  node.style.setProperty("--glyph-depth", `${depth.toFixed(3)}px`);
  node.style.setProperty("--glyph-lift", `${lift.toFixed(3)}px`);
  node.style.setProperty("--glyph-ripple", `${ripple.toFixed(3)}px`);
  node.style.setProperty("--glyph-shadow-alpha", shadow.toFixed(3));
  node.style.setProperty("--glyph-offset-x", `${offsetX.toFixed(3)}px`);
  node.style.setProperty("--glyph-offset-y", `${offsetY.toFixed(3)}px`);
  node.style.setProperty("--glyph-rotate-x", `${rotateX.toFixed(3)}deg`);
  node.style.setProperty("--glyph-rotate-y", `${rotateY.toFixed(3)}deg`);
  node.style.setProperty("--glyph-scale", scale.toFixed(4));
}

function createRippleState(): RippleState {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    energy: 0,
    startedAt: 0,
    lastX: 0,
    lastY: 0,
    hasLast: false,
  };
}

function setRipplePointer(ripple: RippleState, x: number, y: number, reducedMotion: boolean) {
  if (!ripple.hasLast) {
    ripple.lastX = x;
    ripple.lastY = y;
    ripple.hasLast = true;
    return;
  }

  const dx = x - ripple.lastX;
  const dy = y - ripple.lastY;
  ripple.lastX = x;
  ripple.lastY = y;

  if (reducedMotion) return;

  const speed = Math.hypot(dx, dy);
  if (speed < 6) return;

  ripple.active = true;
  ripple.x = x;
  ripple.y = y;
  ripple.vx = dx;
  ripple.vy = dy;
  ripple.energy = clamp(speed / 30, 0.35, 1.2);
  ripple.startedAt = performance.now();
}

function updateDepthBlock(
  host: HTMLElement | null,
  metrics: GlyphMetric[],
  refs: Array<HTMLSpanElement | null>,
  pointer: { x: number; y: number },
  active: boolean,
  config: DepthConfig,
  motion: BlockMotionState,
  ripple: RippleState,
  prefersReducedMotion: boolean,
) {
  if (!host) return;

  const rect = host.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const localX = clamp(pointer.x - rect.left, 0, width);
  const localY = clamp(pointer.y - rect.top, 0, height);
  const normalizedX = (localX / width - 0.5) * 2;
  const normalizedY = (localY / height - 0.5) * 2;

  const targetTiltX =
    active && !prefersReducedMotion ? clamp(-normalizedY * config.maxTiltX, -config.maxTiltX, config.maxTiltX) : 0;
  const targetTiltY =
    active && !prefersReducedMotion ? clamp(normalizedX * config.maxTiltY, -config.maxTiltY, config.maxTiltY) : 0;
  const targetShiftX = active && !prefersReducedMotion ? normalizedX * config.maxShiftX : 0;
  const targetShiftY = active && !prefersReducedMotion ? normalizedY * config.maxShiftY : 0;
  const smoothing = prefersReducedMotion ? 0.34 : 0.18;

  motion.tiltX += (targetTiltX - motion.tiltX) * smoothing;
  motion.tiltY += (targetTiltY - motion.tiltY) * smoothing;
  motion.shiftX += (targetShiftX - motion.shiftX) * smoothing;
  motion.shiftY += (targetShiftY - motion.shiftY) * smoothing;
  setBlockMotionVars(host, motion);

  const now = performance.now();
  let rippleProgress = 0;
  let rippleWave = 0;
  let rippleDecay = 0;
  let rippleVelocityLength = 1;
  if (ripple.active && !prefersReducedMotion) {
    rippleProgress = (now - ripple.startedAt) / config.rippleDurationMs;
    if (rippleProgress >= 1) {
      ripple.active = false;
    } else {
      rippleWave = rippleProgress * config.rippleDurationMs * config.rippleSpeedPxPerMs;
      rippleDecay = 1 - rippleProgress;
      rippleVelocityLength = Math.max(1, Math.hypot(ripple.vx, ripple.vy));
    }
  }

  const baseDepth = prefersReducedMotion ? config.baseDepth * 0.74 : config.baseDepth;

  for (let index = 0; index < metrics.length; index += 1) {
    const metric = metrics[index];
    const deltaX = metric.x - localX;
    const deltaY = metric.y - localY;
    const distance = Math.hypot(deltaX, deltaY);
    const hoverBase =
      active && !prefersReducedMotion ? clamp(1 - distance / (config.hoverRadius + metric.radius * 0.32), 0, 1) : 0;
    const hoverLift = hoverBase * hoverBase * config.hoverLift;

    let rippleLift = 0;
    if (ripple.active && !prefersReducedMotion) {
      const glyphDx = metric.x - ripple.x;
      const glyphDy = metric.y - ripple.y;
      const rippleDistance = Math.hypot(glyphDx, glyphDy);
      const band = clamp(1 - Math.abs(rippleDistance - rippleWave) / config.rippleBandPx, 0, 1);
      const direction = (glyphDx * ripple.vx + glyphDy * ripple.vy) / (Math.max(1, rippleDistance) * rippleVelocityLength);
      const directionBias = 0.78 + Math.max(0, direction) * 0.22;
      rippleLift = band * band * config.rippleLift * ripple.energy * rippleDecay * directionBias;
    }

    const totalLift = hoverLift + rippleLift;
    const distanceScale = Math.max(metric.radius, distance);
    const directionalX = clamp(deltaX / distanceScale, -1, 1);
    const directionalY = clamp(deltaY / distanceScale, -1, 1);
    const rippleNudge =
      ripple.active && !prefersReducedMotion
        ? clamp((metric.x - ripple.x) / Math.max(metric.radius * 1.2, 1), -1, 1) * rippleLift * 0.16
        : 0;
    const offsetX = active && !prefersReducedMotion ? -directionalX * hoverLift * 0.22 + rippleNudge : rippleNudge * 0.6;
    const offsetY = -(hoverLift * 0.9 + rippleLift * 1.08);
    const rotateY = active && !prefersReducedMotion
      ? clamp(-directionalX * (8 + hoverBase * 6) + rippleNudge * 0.9, -16, 16)
      : clamp(rippleNudge * 0.4, -8, 8);
    const rotateX = active && !prefersReducedMotion
      ? clamp(directionalY * (6 + hoverBase * 5) - totalLift * 0.12, -14, 14)
      : clamp(-totalLift * 0.1, -8, 8);
    const scale = 1 + clamp(totalLift * 0.012, 0, prefersReducedMotion ? 0.03 : 0.18);
    const shadow = clamp(totalLift / (config.hoverLift + config.rippleLift), 0.08, 1);
    setGlyphDepthVars(refs[index], baseDepth, hoverLift, rippleLift, shadow, offsetX, offsetY, rotateX, rotateY, scale);
  }
}

function renderMonoDepthGlyphs(
  text: string,
  kind: "title" | "date",
  refs: React.MutableRefObject<Array<HTMLSpanElement | null>>,
  seedStart: number,
) {
  return Array.from(text).map((char, index) => {
    const glyph = char === " " ? "\u00A0" : char;
    const isTitle = kind === "title";
    const pulseStyle = idlePulseStyle(seedStart + index * 53);

    return (
      <span
        key={`${kind}-${index}-${char}`}
        ref={(node) => {
          refs.current[index] = node;
        }}
        className={`chv-glyph-stack ${isTitle ? "chv-glyph-stack--title" : "chv-glyph-stack--tagline"} ${
          char === " " ? "chv-glyph-stack--space" : ""
        } startup__glyph-stack startup__glyph-stack--${kind}`}
        style={
          {
            "--glyph-depth": isTitle ? "10.8px" : "7.2px",
            "--glyph-lift": "0px",
            "--glyph-ripple": "0px",
            "--glyph-shadow-alpha": isTitle ? "0.18" : "0.14",
            "--glyph-offset-x": "0px",
            "--glyph-offset-y": "0px",
            "--glyph-rotate-x": "0deg",
            "--glyph-rotate-y": "0deg",
            "--glyph-scale": "1",
            ...(pulseStyle ?? {}),
          } as CssVars
        }
      >
        <span className="chv-glyph-pulse">
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--back">
            {glyph}
          </span>
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--slice chv-glyph-layer--slice-1">
            {glyph}
          </span>
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--slice chv-glyph-layer--slice-2">
            {glyph}
          </span>
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--slice chv-glyph-layer--slice-3">
            {glyph}
          </span>
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--slice chv-glyph-layer--slice-4">
            {glyph}
          </span>
          <span aria-hidden className="chv-glyph-layer chv-glyph-layer--slice chv-glyph-layer--slice-5">
            {glyph}
          </span>
          <span className="chv-glyph-layer chv-glyph-layer--face chv-glyph-face--plain">{glyph}</span>
        </span>
      </span>
    );
  });
}

export function StartupExperience({
  titleFontClassName,
  monoFontClassName,
  isMobileExperience = false,
}: StartupExperienceProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const titleHitRef = useRef<HTMLDivElement | null>(null);
  const dateHitRef = useRef<HTMLDivElement | null>(null);

  const titleGlyphRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const dateGlyphRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const titleGlyphMetricsRef = useRef<GlyphMetric[]>([]);
  const dateGlyphMetricsRef = useRef<GlyphMetric[]>([]);

  const titleBlockMotionRef = useRef<BlockMotionState>({ tiltX: 0, tiltY: 0, shiftX: 0, shiftY: 0 });
  const dateBlockMotionRef = useRef<BlockMotionState>({ tiltX: 0, tiltY: 0, shiftX: 0, shiftY: 0 });
  const titleRippleRef = useRef<RippleState>(createRippleState());
  const dateRippleRef = useRef<RippleState>(createRippleState());

  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const pointerPrevRef = useRef({ x: 0, y: 0 });
  const hasPointerRef = useRef(false);
  const activeRegionRef = useRef<"title" | "date" | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [entered, setEntered] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncMotion = () => {
      setPrefersReducedMotion(motionQuery.matches);
    };

    syncMotion();
    motionQuery.addEventListener("change", syncMotion);

    try {
      const canvas = document.createElement("canvas");
      const supported = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      setWebglSupported(supported);
    } catch {
      setWebglSupported(false);
    }

    const timeout = window.setTimeout(() => {
      setEntered(true);
    }, motionQuery.matches ? 0 : 80);

    return () => {
      motionQuery.removeEventListener("change", syncMotion);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!waitlistOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWaitlistOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [waitlistOpen]);

  useEffect(() => {
    const syncMetrics = () => {
      titleGlyphRefs.current.length = STARTUP_LAUNCH_DATE.length;
      dateGlyphRefs.current.length = STARTUP_STATUS_LABEL.length;
      titleGlyphMetricsRef.current = measureGlyphMetrics(titleHitRef.current, titleGlyphRefs.current, STARTUP_LAUNCH_DATE.length);
      dateGlyphMetricsRef.current = measureGlyphMetrics(dateHitRef.current, dateGlyphRefs.current, STARTUP_STATUS_LABEL.length);
    };

    const raf = window.requestAnimationFrame(syncMetrics);
    window.addEventListener("resize", syncMetrics);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncMetrics);
    };
  }, [entered]);

  useEffect(() => {
    let frame = 0;
    const pointerLerp = prefersReducedMotion ? 1 : 0.16;

    const animate = () => {
      const pointerTarget = pointerTargetRef.current;
      const pointerCurrent = pointerCurrentRef.current;
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * pointerLerp;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * pointerLerp;
      pointerPrevRef.current = { x: pointerCurrent.x, y: pointerCurrent.y };

      updateDepthBlock(
        titleHitRef.current,
        titleGlyphMetricsRef.current,
        titleGlyphRefs.current,
        pointerCurrent,
        hasPointerRef.current && activeRegionRef.current === "title",
        TITLE_DEPTH_CONFIG,
        titleBlockMotionRef.current,
        titleRippleRef.current,
        prefersReducedMotion,
      );

      updateDepthBlock(
        dateHitRef.current,
        dateGlyphMetricsRef.current,
        dateGlyphRefs.current,
        pointerCurrent,
        hasPointerRef.current && activeRegionRef.current === "date",
        DATE_DEPTH_CONFIG,
        dateBlockMotionRef.current,
        dateRippleRef.current,
        prefersReducedMotion,
      );

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [prefersReducedMotion]);

  const useAstroField = !prefersReducedMotion && webglSupported;

  const onRootPointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    hasPointerRef.current = true;
    pointerTargetRef.current = { x: event.clientX, y: event.clientY };
    pointerCurrentRef.current = { x: event.clientX, y: event.clientY };
    pointerPrevRef.current = { x: event.clientX, y: event.clientY };
  };

  const onRootPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;

    const x = event.clientX;
    const y = event.clientY;
    pointerTargetRef.current = { x, y };

    const inRect = (rect?: DOMRect) => Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    const titleRect = titleHitRef.current?.getBoundingClientRect();
    const dateRect = dateHitRef.current?.getBoundingClientRect();

    const nextRegion = inRect(titleRect) ? "title" : inRect(dateRect) ? "date" : null;
    activeRegionRef.current = nextRegion;

    if (nextRegion === "title" && titleRect) {
      setRipplePointer(titleRippleRef.current, clamp(x - titleRect.left, 0, titleRect.width), clamp(y - titleRect.top, 0, titleRect.height), prefersReducedMotion);
    }

    if (nextRegion === "date" && dateRect) {
      setRipplePointer(dateRippleRef.current, clamp(x - dateRect.left, 0, dateRect.width), clamp(y - dateRect.top, 0, dateRect.height), prefersReducedMotion);
    }
  };

  const onRootPointerLeave = () => {
    hasPointerRef.current = false;
    activeRegionRef.current = null;
  };

  const closeWaitlist = () => {
    if (waitlistSubmitting) return;
    setWaitlistOpen(false);
  };

  const openWaitlist = () => {
    setWaitlistError(null);
    setWaitlistSuccess(false);
    setWaitlistOpen(true);
  };

  const submitWaitlist = async () => {
    const trimmedEmail = waitlistEmail.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setWaitlistError("Enter a valid email address.");
      return;
    }

    setWaitlistSubmitting(true);
    setWaitlistError(null);

    try {
      await fetch(WAITLIST_APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          source: "startup",
          submittedAt: new Date().toISOString(),
        }),
      });

      setWaitlistSuccess(true);
      setWaitlistEmail("");
    } catch (error) {
      setWaitlistError(error instanceof Error ? error.message : "Unable to join the waitlist right now.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return (
    <main
      ref={rootRef}
      onPointerEnter={onRootPointerEnter}
      onPointerMove={onRootPointerMove}
      onPointerLeave={onRootPointerLeave}
      className={`startup-mono relative min-h-screen overflow-hidden bg-black text-white ${isMobileExperience ? "startup-mono--mobile" : ""}`}
    >
      <div aria-hidden className="absolute inset-0 z-0 bg-black" />

      {useAstroField ? (
        <DesktopAstroField
          monochrome
          className="pointer-events-none fixed inset-0 z-[8]"
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[8] startup-mono__field" />
      )}

      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 startup-mono__wash" />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 chv-vignette opacity-95" />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 chv-filmgrain opacity-45" />

      <nav className="startup-mono__nav">
        <a href="https://chloeverse.io" className={monoFontClassName}>
          Chloeverse
        </a>
        <a href="https://iamchloekang.com" className={monoFontClassName}>
          Candy Castle
        </a>
      </nav>

      <section className="relative z-30 flex min-h-screen items-center justify-center px-6">
        <div
          className="mx-auto flex w-full max-w-6xl flex-col items-center text-center"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0px)" : "translateY(34px)",
            transition: prefersReducedMotion
              ? "none"
              : "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="startup-mono__hero chv-title-idle-pulse relative inline-flex w-auto flex-col items-center whitespace-nowrap px-4 select-none">
            <div ref={titleHitRef} className="chv-depth-stage">
              <div
                className={`${titleFontClassName} chv-depth-plane overflow-visible leading-[0.9] tracking-[0.02em] startup-mono__title`}
                style={
                  {
                    "--block-tilt-x": "0deg",
                    "--block-tilt-y": "0deg",
                    "--block-shift-x": "0px",
                    "--block-shift-y": "0px",
                  } as CssVars
                }
              >
                <div
                  className={`inline-flex flex-nowrap overflow-visible ${
                    isMobileExperience
                      ? "text-[clamp(3.9rem,16vw,8rem)]"
                      : "text-[clamp(4.6rem,15vw,12rem)]"
                  }`}
                >
                  {renderMonoDepthGlyphs(STARTUP_LAUNCH_DATE, "title", titleGlyphRefs, 401)}
                </div>
              </div>
            </div>
          </div>

          <div className={`relative inline-flex select-none ${isMobileExperience ? "mt-7" : "mt-5"}`}>
            <div ref={dateHitRef} className="chv-depth-stage chv-depth-stage--tagline">
              <div
                className={`${titleFontClassName} chv-depth-plane overflow-visible leading-none tracking-[0.12em] startup-mono__date ${
                  isMobileExperience
                    ? "text-[clamp(1.95rem,7vw,3.1rem)]"
                    : "text-[clamp(1.8rem,4.1vw,3.1rem)]"
                }`}
                style={
                  {
                    "--block-tilt-x": "0deg",
                    "--block-tilt-y": "0deg",
                    "--block-shift-x": "0px",
                    "--block-shift-y": "0px",
                  } as CssVars
                }
              >
                {renderMonoDepthGlyphs(STARTUP_STATUS_LABEL, "date", dateGlyphRefs, 901)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openWaitlist}
            className={`${monoFontClassName} startup-mono__waitlist mt-10 text-[11px] uppercase tracking-[0.34em] text-white/88 transition`}
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0px)" : "translateY(20px)",
              transition: prefersReducedMotion
                ? "none"
                : "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1) 120ms, transform 1000ms cubic-bezier(0.16, 1, 0.3, 1) 120ms",
            }}
          >
            waitlist
          </button>
        </div>
      </section>

      <div
        aria-hidden={!waitlistOpen}
        className={`startup-mono__modal-wrap ${waitlistOpen ? "startup-mono__modal-wrap--open" : ""}`}
        onClick={() => {
          closeWaitlist();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="startup-waitlist-title"
          className="startup-mono__modal"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close waitlist"
            className="startup-mono__modal-close"
            onClick={closeWaitlist}
          >
            +
          </button>

          {waitlistSuccess ? (
            <div className="startup-mono__success">
              <h2 className={`${titleFontClassName} startup-mono__modal-title`}>YOU&apos;RE IN</h2>
            </div>
          ) : (
            <>
              <h2 id="startup-waitlist-title" className={`${titleFontClassName} startup-mono__modal-title`}>JOIN THE LIST</h2>

              <label className="startup-mono__field-label" htmlFor="startup-waitlist-email">
                <span className={`${monoFontClassName} sr-only`}>Email address</span>
                <input
                  id="startup-waitlist-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="email@domain.com"
                  value={waitlistEmail}
                  onChange={(event) => {
                    setWaitlistEmail(event.target.value);
                    if (waitlistError) setWaitlistError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitWaitlist();
                    }
                  }}
                  className={`${monoFontClassName} startup-mono__input`}
                  disabled={waitlistSubmitting}
                />
              </label>

              {waitlistError ? (
                <p className={`${monoFontClassName} startup-mono__feedback startup-mono__feedback--error`}>{waitlistError}</p>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void submitWaitlist();
                }}
                className={`${monoFontClassName} startup-mono__submit`}
                disabled={waitlistSubmitting}
              >
                {waitlistSubmitting ? "submitting" : "submit"}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .startup-mono__field {
          background:
            radial-gradient(60% 56% at 50% 44%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04) 32%, rgba(255, 255, 255, 0) 64%),
            radial-gradient(42% 34% at 22% 20%, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 72%),
            radial-gradient(38% 30% at 78% 18%, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0) 74%),
            radial-gradient(46% 38% at 50% 80%, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0) 78%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0) 28%, rgba(0, 0, 0, 0.32) 100%),
            #000;
        }

        .startup-mono__wash {
          background:
            radial-gradient(56% 44% at 50% 46%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03) 36%, rgba(255, 255, 255, 0) 66%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0) 28%, rgba(0, 0, 0, 0.22) 100%);
        }

        .startup-mono__hero {
          animation: startupMonoFloat 8.4s ease-in-out infinite;
        }

        .startup-mono__nav {
          position: absolute;
          inset: 18px 22px auto 22px;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          pointer-events: none;
        }

        .startup-mono__nav a {
          pointer-events: auto;
          color: rgba(255, 255, 255, 0.68);
          text-decoration: none;
          font-size: 11px;
          line-height: 1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: color 180ms ease, opacity 180ms ease;
        }

        .startup-mono__nav a:hover,
        .startup-mono__nav a:focus-visible {
          color: rgba(255, 255, 255, 0.96);
          outline: none;
        }

        .startup-mono__title {
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
          transform: scaleX(1.045);
          transform-origin: center center;
        }

        .startup-mono__date {
          animation: startupMonoFloatSoft 9.8s ease-in-out infinite;
          opacity: 0.88;
        }

        .startup-mono__waitlist {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.04);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.03) inset,
            0 10px 30px rgba(0, 0, 0, 0.2);
          padding: 12px 18px 12px 22px;
          cursor: pointer;
          animation: startupWaitlistHeartbeat 2.15s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .startup-mono__waitlist:hover,
        .startup-mono__waitlist:focus-visible {
          color: rgba(255, 255, 255, 0.98);
          border-color: rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.08);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.06) inset,
            0 0 26px rgba(255, 255, 255, 0.08),
            0 12px 34px rgba(0, 0, 0, 0.28);
          outline: none;
        }

        .startup-mono__modal-wrap {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.62);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 280ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .startup-mono__modal-wrap--open {
          opacity: 1;
          pointer-events: auto;
        }

        .startup-mono__modal {
          position: relative;
          width: min(100%, 460px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
            rgba(8, 8, 10, 0.9);
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          padding: 28px 24px 24px;
          transform: translateY(20px) scale(0.985);
          transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .startup-mono__modal-wrap--open .startup-mono__modal {
          transform: translateY(0) scale(1);
        }

        .startup-mono__modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.52);
          font-size: 26px;
          line-height: 1;
          transform: rotate(45deg);
          cursor: pointer;
        }

        .startup-mono__modal-title {
          margin: 0 0 18px;
          font-size: clamp(2.8rem, 7vw, 4.8rem);
          line-height: 0.94;
          letter-spacing: 0.03em;
          color: rgba(255, 255, 255, 0.96);
        }

        .startup-mono__field-label {
          display: block;
        }

        .startup-mono__input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.96);
          padding: 14px 16px;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .startup-mono__input::placeholder {
          color: rgba(255, 255, 255, 0.34);
        }

        .startup-mono__input:focus-visible {
          outline: none;
          border-color: rgba(255, 255, 255, 0.36);
          background: rgba(255, 255, 255, 0.06);
        }

        .startup-mono__feedback {
          min-height: 18px;
          margin: 10px 0 0;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.44);
        }

        .startup-mono__feedback--error {
          color: rgba(255, 210, 210, 0.88);
        }

        .startup-mono__submit {
          width: 100%;
          margin-top: 16px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
          padding: 14px 16px;
          font-size: 11px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
          cursor: pointer;
        }

        .startup-mono__submit:hover,
        .startup-mono__submit:focus-visible {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.34);
          outline: none;
        }

        .startup-mono__submit:disabled {
          opacity: 0.58;
          cursor: wait;
        }

        .startup-mono__success {
          padding-right: 18px;
        }

        .startup-mono :global(.startup__glyph-stack .chv-glyph-pulse) {
          animation: startupHeartbeatPulse var(--glyph-pulse-duration, 1.45s) cubic-bezier(0.22, 1, 0.36, 1) infinite;
          animation-delay: var(--glyph-pulse-delay, 0s);
        }

        .startup-mono :global(.startup__glyph-stack .chv-glyph-layer--back),
        .startup-mono :global(.startup__glyph-stack .chv-glyph-layer--slice) {
          color: rgba(18, 18, 22, 0.98);
          -webkit-text-fill-color: currentColor;
          text-shadow:
            0 14px 22px rgba(0, 0, 0, 0.34),
            1px 0 0 rgba(255, 255, 255, 0.04),
            -1px 0 0 rgba(255, 255, 255, 0.02);
        }

        .startup-mono :global(.startup__glyph-stack .chv-glyph-layer--face) {
          color: rgba(255, 255, 255, 0.97);
          text-shadow:
            0 0 18px rgba(255, 255, 255, 0.08),
            0 18px 30px rgba(0, 0, 0, 0.38);
          filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.34));
        }

        .startup-mono :global(.startup__glyph-stack--date) {
          --glyph-depth: 7px;
        }

        @keyframes startupMonoFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -12px, 0);
          }
        }

        @keyframes startupMonoFloatSoft {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -5px, 0);
          }
        }

        @keyframes startupHeartbeatPulse {
          0%,
          100% {
            opacity: 1;
            filter: brightness(1) saturate(1);
            transform: translate3d(0, 0, 0) scale(1);
          }

          14% {
            opacity: calc(0.95 + var(--glyph-pulse-glow-peak, 0.28));
            filter: brightness(calc(var(--glyph-pulse-brightness-peak, 1.18) * 0.92)) saturate(1.18);
            transform: translate3d(0, calc(var(--glyph-pulse-lift-peak, -4px) * 0.55), 0)
              scale(calc(1 + ((var(--glyph-pulse-scale-peak, 1.06) - 1) * 0.72)));
          }

          28% {
            opacity: 1;
            filter: brightness(1.02) saturate(1.04);
            transform: translate3d(0, 0, 0) scale(1.01);
          }

          42% {
            opacity: calc(0.98 + var(--glyph-pulse-glow-peak, 0.28));
            filter: brightness(var(--glyph-pulse-brightness-peak, 1.18)) saturate(1.24);
            transform: translate3d(0, var(--glyph-pulse-lift-peak, -4px), 0)
              scale(var(--glyph-pulse-scale-peak, 1.06));
          }

          58% {
            opacity: 0.98;
            filter: brightness(1.03) saturate(1.05);
            transform: translate3d(0, calc(var(--glyph-pulse-lift-peak, -4px) * 0.18), 0) scale(1.012);
          }

          72% {
            opacity: 1;
            filter: brightness(1) saturate(1);
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes startupWaitlistHeartbeat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: brightness(1);
          }

          14% {
            transform: translate3d(0, -1px, 0) scale(1.018);
            filter: brightness(1.08);
          }

          28% {
            transform: translate3d(0, 0, 0) scale(1.004);
            filter: brightness(1.02);
          }

          42% {
            transform: translate3d(0, -2px, 0) scale(1.028);
            filter: brightness(1.12);
          }

          58% {
            transform: translate3d(0, 0, 0) scale(1.006);
            filter: brightness(1.03);
          }

          72% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: brightness(1);
          }
        }

        @media (max-width: 767px) {
          .startup-mono__nav {
            inset: 16px 16px auto 16px;
          }

          .startup-mono__nav a {
            font-size: 10px;
            letter-spacing: 0.1em;
          }

          .startup-mono__hero {
            width: 100%;
            white-space: normal;
          }

          .startup-mono__title :global(.chv-glyph-stack--title) {
            margin-inline: -0.018em;
          }

          .startup-mono__title {
            transform: scaleX(1.025);
          }

          .startup-mono__date {
            letter-spacing: 0.08em;
          }

          .startup-mono__modal {
            padding: 24px 18px 18px;
          }
        }

        .startup-mono--mobile .startup-mono__hero {
          width: min(100%, 23rem);
          padding-inline: 0.9rem;
        }

        .startup-mono--mobile .startup-mono__title {
          transform: scaleX(1.012);
        }

        .startup-mono--mobile .startup-mono__title :global(.chv-glyph-stack--title) {
          margin-inline: 0.01em;
        }

        .startup-mono--mobile .startup-mono__date {
          letter-spacing: 0.14em;
          opacity: 0.92;
        }
      `}</style>
    </main>
  );
}
