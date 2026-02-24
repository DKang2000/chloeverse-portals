"use client";

import { useEffect, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { collabsReels } from "@/content/collabsReels";

type View =
  | "lobby"
  | "transitionToReel"
  | "reel"
  | "transitionToLobby";

const TIMING = { pushMs: 1100, crossfadeMs: 640 } as const;
const CAMERA = {
  lobby: { scale: 1.0, tyK: 0.0 },
  reel: { scale: 1.12, tyK: -0.045 },
} as const;
const CLICK_HOLD_MS = 90;
const CLICK_CROSSFADE_MS = 520;
const RETURN_CROSSFADE_MS = 560;
const RETURN_PUSH_MS = 960;

const PLATES = {
  lobby: "/collabs/plates/lobby.png",
  program: "/collabs/plates/program.png",
  reel: "/collabs/plates/reel.png",
} as const;

const PLATE_ASPECT = 16 / 9;
const PLATE_FOCUS = { x: 0.5, y: 0.18 } as const;
const PLATE_STYLE = {
  lobby: {
    pos: "50% 18%",
    filter: "brightness(1.06) contrast(1.03) saturate(1.02)",
  },
  reel: {
    pos: "50% 10%",
    filter: "brightness(1.10) contrast(1.03) saturate(1.02)",
  },
} as const;

const STAGE_OVERSCAN = 1.12;

const WALL = [
  { i: 0, u: 0.18, v: 0.52, w: 0.15, h: 0.28, r: -1.2 },
  { i: 1, u: 0.34, v: 0.49, w: 0.13, h: 0.25, r: 0.6 },
  { i: 2, u: 0.5, v: 0.48, w: 0.13, h: 0.25, r: 0.0 },
  { i: 3, u: 0.66, v: 0.49, w: 0.13, h: 0.25, r: -0.6 },
  { i: 4, u: 0.82, v: 0.52, w: 0.15, h: 0.28, r: 1.2 },
] as const;

function getCoverRect(
  viewW: number,
  viewH: number,
  imgAspect = 16 / 9,
  focusX = 0.5,
  focusY = 0.5,
) {
  if (viewW <= 0 || viewH <= 0) {
    return { x: 0, y: 0, w: viewW, h: viewH };
  }

  const viewAspect = viewW / viewH;
  if (viewAspect > imgAspect) {
    const w = viewW;
    const h = viewW / imgAspect;
    return { x: 0, y: (viewH - h) * focusY, w, h };
  }

  const h = viewH;
  const w = viewH * imgAspect;
  return { x: (viewW - w) * focusX, y: 0, w, h };
}

function formatDuration(durationSec?: number) {
  if (!durationSec || durationSec <= 0) return "TBD";
  const minutes = Math.floor(durationSec / 60);
  const seconds = String(durationSec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type PlateKey = keyof typeof PLATE_STYLE;

function plateKeyFromSrc(src: string | null | undefined): PlateKey {
  if (!src) return "lobby";
  const clean = src.split("?")[0];
  if (clean === PLATES.reel || clean.includes("/plates/reel")) return "reel";
  return "lobby";
}

export default function CollabsCinematicV3() {
  const reels = collabsReels.slice(0, 5);
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";

  const [view, setView] = useState<View>("lobby");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [committedSrc, setCommittedSrc] = useState<string>(PLATES.lobby);
  const [fadingSrc, setFadingSrc] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [videoOpen, setVideoOpen] = useState(false);

  const fadeImgRef = useRef<HTMLImageElement | null>(null);
  const fadingSrcRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const postersRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const animIdRef = useRef(0);
  const parallaxRafRef = useRef<number | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const parTarget = useRef({ x: 0, y: 0 });
  const parCur = useRef({ x: 0, y: 0 });
  const viewRef = useRef<View>("lobby");
  const transitioningRef = useRef(false);

  const selectedReel =
    selectedIndex === null ? null : (reels[selectedIndex] ?? null);
  const coverRect = getCoverRect(
    viewport.w,
    viewport.h,
    PLATE_ASPECT,
    PLATE_FOCUS.x,
    PLATE_FOCUS.y,
  );
  const committedPlateStyle = PLATE_STYLE[plateKeyFromSrc(committedSrc)];
  const fadingPlateStyle = fadingSrc
    ? PLATE_STYLE[plateKeyFromSrc(fadingSrc)]
    : committedPlateStyle;
  fadingSrcRef.current = fadingSrc;
  viewRef.current = view;
  transitioningRef.current = isTransitioning;

  const clearAllTimeouts = () => {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const schedule = (
    fn: () => void,
    ms: number,
    animId = animIdRef.current,
  ) => {
    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== timeoutId);
      if (animIdRef.current !== animId) return;
      fn();
    }, ms);
    timeoutsRef.current.push(timeoutId);
  };

  useEffect(() => {
    stageRef.current?.style.setProperty("--stage-ty", "0px");
    stageRef.current?.style.setProperty("--stage-scale", "1");
    fadeImgRef.current?.style.setProperty("--fade", "0");
    postersRef.current?.style.setProperty("--posters-a", "1");
    postersRef.current?.style.setProperty("--posters-ty", "0px");
  }, []);

  function startTransition(
    to: "reel" | "lobby",
    existingAnimId?: number,
    seededT0?: number,
  ) {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const id = existingAnimId ?? ++animIdRef.current;
    if (existingAnimId === undefined) {
      animIdRef.current = id;
    }
    const nextPlate = to === "reel" ? PLATES.reel : PLATES.lobby;
    let hasCommittedPlate = false;

    clearAllTimeouts();
    transitioningRef.current = true;
    setIsTransitioning(true);
    setFadingSrc(nextPlate);
    fadingSrcRef.current = nextPlate;
    fadeImgRef.current?.style.setProperty("--fade", "0");
    const fromScale =
      parseFloat(stageRef.current?.style.getPropertyValue("--stage-scale") || "1") || 1;
    const fromTy =
      parseFloat((stageRef.current?.style.getPropertyValue("--stage-ty") || "0").replace("px", "")) || 0;
    const h = window.innerHeight || 1000;
    const target = to === "reel" ? CAMERA.reel : CAMERA.lobby;
    const toScale = target.scale;
    const toTy = target.tyK * h;
    const t0 = seededT0 ?? performance.now();

    rafRef.current = window.requestAnimationFrame(() => {
      if (animIdRef.current !== id) return;
      if (fadeImgRef.current) fadeImgRef.current.style.setProperty("--fade", "0");
      if (postersRef.current) {
        if (to === "reel") {
          postersRef.current.style.setProperty("--posters-a", "1");
          postersRef.current.style.setProperty("--posters-ty", "0px");
        } else {
          postersRef.current.style.setProperty("--posters-a", "0");
          postersRef.current.style.setProperty("--posters-ty", "-10px");
        }
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        if (animIdRef.current !== id) return;

        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
        const smoothstep = (t: number) => t * t * (3 - 2 * t);

        const tick = (now: number) => {
          if (animIdRef.current !== id) return;

          const elapsed = now - t0;
          const fadeDur = to === "reel" ? CLICK_CROSSFADE_MS : RETURN_CROSSFADE_MS;
          if (to === "lobby" && elapsed < 30) {
            fadeImgRef.current?.style.setProperty("--fade", "0");
          }
          const pFade = Math.min(1, Math.max(0, elapsed / fadeDur));
          const pushDur = to === "reel" ? TIMING.pushMs : RETURN_PUSH_MS;
          const pPush = Math.min(1, elapsed / pushDur);
          const kBase = easeOutQuint(pPush);
          const tail = smoothstep(Math.max(0, (pPush - 0.8) / 0.2));
          const k = kBase * (0.92 + 0.08 * tail);

          if (fadeImgRef.current) {
            fadeImgRef.current.style.setProperty("--fade", String(pFade));
          }

          if (stageRef.current) {
            const scale = fromScale + (toScale - fromScale) * k;
            const ty = fromTy + (toTy - fromTy) * k;
            stageRef.current.style.setProperty("--stage-ty", `${ty}px`);
            stageRef.current.style.setProperty("--stage-scale", String(scale));
            stageRef.current.style.willChange = "transform";
          }

          if (postersRef.current) {
            if (to === "reel") {
              const pf = Math.min(1, elapsed / 300);
              postersRef.current.style.setProperty("--posters-a", String(1 - pf));
              postersRef.current.style.setProperty("--posters-ty", `${-10 * pf}px`);
            } else {
              const startIn = fadeDur * 0.45;
              const pin = elapsed < startIn ? 0 : Math.min(1, (elapsed - startIn) / 260);
              postersRef.current.style.setProperty("--posters-a", String(pin));
              postersRef.current.style.setProperty("--posters-ty", `${-10 * (1 - pin)}px`);
            }
          }

          const activeFadingSrc = fadingSrcRef.current;
          if (!hasCommittedPlate && pFade >= 1 && activeFadingSrc) {
            hasCommittedPlate = true;
            setCommittedSrc(activeFadingSrc);
            fadingSrcRef.current = null;
            setFadingSrc(null);
          }

          if (pPush >= 1) {
            if (postersRef.current) {
              postersRef.current.style.setProperty("--posters-a", to === "lobby" ? "1" : "0");
              postersRef.current.style.setProperty("--posters-ty", "0px");
            }
            rafRef.current = null;
            transitioningRef.current = false;
            setIsTransitioning(false);
            setView(to === "reel" ? "reel" : "lobby");
            if (to === "lobby") setSelectedIndex(null);
            const endH = window.innerHeight || 1000;
            const cam = to === "reel" ? CAMERA.reel : CAMERA.lobby;
            stageRef.current?.style.setProperty("--stage-ty", `${cam.tyK * endH}px`);
            stageRef.current?.style.setProperty("--stage-scale", String(cam.scale));
            fadeImgRef.current?.style.setProperty("--fade", "0");
            return;
          }

          rafRef.current = window.requestAnimationFrame(tick);
        };

        rafRef.current = window.requestAnimationFrame(tick);
      });
    });
  }

  const beginTransitionToLobby = () => {
    if (viewRef.current !== "reel" || transitioningRef.current) {
      return;
    }
    const id = ++animIdRef.current;
    clearAllTimeouts();
    setView("transitionToLobby");
    setVideoOpen(false);
    startTransition("lobby", id);
  };

  const beginTransitionToReel = (index: number) => {
    if (viewRef.current !== "lobby" || transitioningRef.current) {
      return;
    }
    const id = ++animIdRef.current;
    clearAllTimeouts();
    setSelectedIndex(index);
    setView("transitionToReel");
    setVideoOpen(false);
    schedule(() => {
      if (animIdRef.current !== id) return;
      startTransition("reel", id);
    }, CLICK_HOLD_MS, id);
  };

  useEffect(() => {
    const syncViewport = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = (document.body.style as CSSStyleDeclaration & {
      overscrollBehavior?: string;
    }).overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    (document.body.style as CSSStyleDeclaration & { overscrollBehavior?: string }).overscrollBehavior =
      "none";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      (document.body.style as CSSStyleDeclaration & { overscrollBehavior?: string }).overscrollBehavior =
        prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (videoOpen) {
        setVideoOpen(false);
        return;
      }
      if (viewRef.current !== "lobby") {
        beginTransitionToLobby();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoOpen]);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;

    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");

    const tick = () => {
      const inTransition = transitioningRef.current;
      const targetX = inTransition ? 0 : parTarget.current.x;
      const targetY = inTransition ? 0 : parTarget.current.y;
      const lerp = inTransition ? 0.22 : 0.08;

      parCur.current.x += (targetX - parCur.current.x) * lerp;
      parCur.current.y += (targetY - parCur.current.y) * lerp;
      el.style.setProperty("--px", String(parCur.current.x));
      el.style.setProperty("--py", String(parCur.current.y));
      parallaxRafRef.current = window.requestAnimationFrame(tick);
    };

    parallaxRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (parallaxRafRef.current !== null) {
        window.cancelAnimationFrame(parallaxRafRef.current);
        parallaxRafRef.current = null;
      }
    };
  }, []);

  const showReelUi = view === "reel" && !isTransitioning;
  const postersFallbackTy = view === "transitionToLobby" ? "-10px" : "0px";

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black text-white select-none"
      style={{ WebkitTapHighlightColor: "transparent" as any }}
      onPointerMove={(event) => {
        if (transitioningRef.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        parTarget.current = { x: nx, y: ny };
      }}
      onPointerLeave={() => {
        parTarget.current = { x: 0, y: 0 };
      }}
    >
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `scale(${STAGE_OVERSCAN})`, transformOrigin: "50% 50%" }}
        >
          <div
            ref={stageRef}
            className="absolute inset-0 will-change-transform"
            style={{
              transform: "translate3d(0, var(--stage-ty, 0px), 0) scale(var(--stage-scale, 1))",
            }}
          >
            <div
              ref={parallaxRef}
              className="absolute inset-0"
              style={{
                transform:
                  "translate3d(calc(var(--px, 0) * 9px), calc(var(--py, 0) * 7px), 0) rotateX(calc(var(--py, 0) * -0.6deg)) rotateY(calc(var(--px, 0) * 0.7deg))",
                transformStyle: "preserve-3d",
                willChange: "transform",
                transition: view.includes("transition") ? "none" : undefined,
              }}
            >
          <div className="absolute inset-0 pointer-events-none">
          <img
            src={committedSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: committedPlateStyle.pos,
              filter: committedPlateStyle.filter,
            }}
          />
          {fadingSrc ? (
            <img
              ref={fadeImgRef}
              src={fadingSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: "var(--fade, 0)",
                objectPosition: fadingPlateStyle.pos,
                filter: fadingPlateStyle.filter,
              }}
            />
          ) : null}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent_40%,rgba(0,0,0,0.05)_70%,rgba(0,0,0,0.12)_100%)]" />
          <div
            className="absolute inset-[-8%] opacity-[0.028] mix-blend-soft-light"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 24%, rgba(255,255,255,0.7) 0 0.7px, transparent 1px), radial-gradient(circle at 63% 51%, rgba(255,255,255,0.55) 0 0.7px, transparent 1px), radial-gradient(circle at 78% 76%, rgba(255,255,255,0.5) 0 0.8px, transparent 1px)",
              backgroundSize: "17px 17px, 21px 21px, 19px 19px",
            }}
          />
          </div>

          <div className="absolute inset-0">
            <div
              ref={postersRef}
              className="absolute inset-0"
              style={{
                opacity: "var(--posters-a, 0)",
                transform: `translate3d(0, var(--posters-ty, ${postersFallbackTy}), 0)`,
              }}
            >
              {WALL.map((slot) => {
                const reel = reels[slot.i];
                if (!reel) return null;

                const width = coverRect.w * slot.w;
                const height = coverRect.h * slot.h;
                const left = coverRect.x + coverRect.w * slot.u - width / 2;
                const top = coverRect.y + coverRect.h * slot.v - height / 2;

                return (
                  <div
                    key={`${reel.id}-wall`}
                    className="absolute"
                    style={{
                      left,
                      top,
                      width,
                      height,
                      transform: `rotate(${slot.r}deg)`,
                      opacity: 1,
                    }}
                  >
                    <div
                      className="h-full w-full"
                      style={{
                        transform: "translate3d(0,0,0)",
                      }}
                    >
                    <button
                      type="button"
                      disabled={view !== "lobby" || isTransitioning}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        beginTransitionToReel(slot.i);
                      }}
                      aria-label={`Open reel room for ${reel.title}`}
                      className="group relative h-full w-full overflow-hidden rounded-lg border border-white/20 bg-black/5 shadow-[0_10px_22px_rgba(0,0,0,0.24)] transition duration-200 ease-out hover:border-white/40 focus-visible:border-white/40 focus-visible:outline-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                    >
                      <div
                        className="relative h-full w-full"
                        style={{
                          transform:
                            "translate3d(calc(var(--px, 0) * 18px), calc(var(--py, 0) * 14px), 0) rotateX(calc(var(--py, 0) * -1.6deg)) rotateY(calc(var(--px, 0) * 1.8deg))",
                          willChange: "transform",
                          filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.28))",
                        }}
                      >
                        <div
                          className="relative h-full w-full"
                          style={{
                            transform: "translate3d(0,0,0)",
                            willChange: "transform",
                          }}
                        >
                          <div
                            className="relative h-full w-full transition duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.018] group-focus-visible:-translate-y-1 group-focus-visible:scale-[1.018]"
                            style={{
                              animation: "floatBob 6.2s ease-in-out infinite",
                              animationDelay: `${-slot.i * 0.65}s`,
                              willChange: "transform",
                            }}
                          >
                            <img
                              src={reel.posterSrc}
                              alt={`${reel.title} poster`}
                              draggable={false}
                              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 border border-white/10" />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 opacity-80" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                              <div className="truncate text-[0.55rem] font-medium uppercase tracking-[0.12em] text-[#f3e7d1]">
                                {reel.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                    </div>
                  </div>
                );
              })}
            </div>

          {showReelUi && selectedReel ? (
            <section className="absolute inset-0 z-20 grid place-items-center px-4 py-8">
              <div className="grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-[minmax(13rem,20rem)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                  <img
                    src={selectedReel.posterSrc}
                    alt={`${selectedReel.title} poster`}
                    draggable={false}
                    className="pointer-events-none block aspect-[2/3] w-full select-none object-cover"
                  />
                </div>

                <div className="self-center rounded-2xl border border-white/12 bg-black/28 p-5 text-[#f5ead5]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#d4bc99]">
                    Reel Room
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                    {selectedReel.title}
                  </h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#d5c1a2] md:text-sm">
                    {selectedReel.subtitle}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.14em] text-[#d9c5a7]">
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                      {selectedReel.year ?? "Year TBD"}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1">
                      {formatDuration(selectedReel.durationSec)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {selectedReel.videoSrc ? (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          if (view !== "reel" || isTransitioning || selectedIndex === null) return;
                          setVideoOpen(true);
                        }}
                        disabled={view !== "reel" || isTransitioning || selectedIndex === null}
                        className="rounded-full border border-[#ffe4bb]/35 bg-[#ffe4bb]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#fbedd7] transition hover:bg-white/10 hover:shadow-[0_10px_20px_rgba(0,0,0,0.18)] disabled:cursor-default disabled:opacity-60 focus-visible:outline-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                      >
                        Play Reel
                      </button>
                    ) : (
                      <div className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#d6c1a0]">
                        Video Coming Soon
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          </div>
        </div>
            </div>
          </div>
        </div>

      <div className="pointer-events-none fixed inset-0 z-30">
        <div className="fixed left-6 top-6 z-50 flex flex-col gap-2 pointer-events-auto">
          {view === "reel" ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={beginTransitionToLobby}
              className="w-fit border-b border-white/0 pb-0.5 text-[11px] uppercase tracking-[0.18em] text-white/70 transition hover:border-white/60 hover:text-white focus-visible:border-white/60 focus-visible:text-white focus-visible:outline-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              Return to Lobby
            </button>
          ) : null}
        </div>

        {debug ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs leading-5 text-[#ebdec3]">
            <div>view: {view}</div>
            <div className="max-w-[18rem] truncate">committedSrc: {committedSrc}</div>
            <div className="max-w-[18rem] truncate">fadingSrc: {fadingSrc ?? "-"}</div>
            <div>selectedIndex: {selectedIndex ?? "-"}</div>
          </div>
        ) : null}
      </div>

      {videoOpen && selectedReel?.videoSrc ? (
        <div
          className="fixed inset-0 z-40 bg-black/85 p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedReel.title} video`}
          onClick={(event) => {
            event.stopPropagation();
            setVideoOpen(false);
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  setVideoOpen(false);
                }}
                className="rounded-full border border-white/20 bg-black/45 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#f0e4ce] transition hover:bg-white/10 focus-visible:outline-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              >
                Close
              </button>
            </div>
            <div
              className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/12 bg-black/40 p-2 md:p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <video
                src={selectedReel.videoSrc}
                autoPlay
                controls
                playsInline
                className="max-h-full w-full rounded-xl bg-black object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes floatBob {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -6px, 0);
          }
        }
      `}</style>
    </div>
  );
}
