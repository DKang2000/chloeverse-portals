"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { collabsReels, type CollabsReel } from "@/content/collabsReels";

import { CollabsReelModalPlayer } from "./CollabsReelModalPlayer";

const PLATE = {
  lobby: "/collabs/backplate.png",
  program: "/collabs/plates/program.png",
  reel: "/collabs/plates/reel.png",
} as const;

type View =
  | "lobby"
  | "transitionToProgram"
  | "program"
  | "transitionToReel"
  | "reel";

const TIMING = { pushMs: 720, crossfadeMs: 240, staggerMs: 85 } as const;
const SCALE = { lobby: 1, program: 1.18, reel: 1.22 } as const;

const PLACEMENTS = [
  { left: 2.8, top: 22.0, w: 21.5, h: 73.0, depth: 1.0, reelIndex: 0 },
  { left: 26.0, top: 25.0, w: 15.5, h: 68.0, depth: 0.7, reelIndex: 1 },
  { left: 57.5, top: 25.0, w: 15.5, h: 68.0, depth: 0.7, reelIndex: 2 },
  { left: 76.0, top: 22.0, w: 21.8, h: 73.0, depth: 1.0, reelIndex: 3 },
  { left: 46.0, top: 53.0, w: 8.0, h: 24.0, depth: 0.35, reelIndex: 4 },
] as const;

function plateForView(view: View) {
  if (view === "program" || view === "transitionToProgram") return PLATE.program;
  if (view === "reel" || view === "transitionToReel") return PLATE.reel;
  return PLATE.lobby;
}

function scaleForView(view: View) {
  if (view === "transitionToReel" || view === "reel") return SCALE.reel;
  if (view === "transitionToProgram" || view === "program") return SCALE.program;
  return SCALE.lobby;
}

function formatDuration(durationSec?: number) {
  if (!durationSec || durationSec <= 0) return "TBD";
  const minutes = Math.floor(durationSec / 60);
  const seconds = String(durationSec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getCoverRect(viewW: number, viewH: number, imgAspect = 16 / 9) {
  if (viewW <= 0 || viewH <= 0) {
    return { x: 0, y: 0, w: viewW, h: viewH };
  }

  const viewAspect = viewW / viewH;
  if (viewAspect >= imgAspect) {
    const w = viewH * imgAspect;
    return { x: (viewW - w) / 2, y: 0, w, h: viewH };
  }

  const h = viewW / imgAspect;
  return { x: 0, y: (viewH - h) / 2, w: viewW, h };
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

export default function CollabsCinematicV2() {
  const reels = collabsReels.slice(0, 5);
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";
  const prefersReducedMotion = usePrefersReducedMotion();

  const timeoutsRef = useRef<number[]>([]);
  const tokenRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [view, setView] = useState<View>("lobby");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [committedPlateSrc, setCommittedPlateSrc] = useState<string>(PLATE.lobby);
  const [fadingPlateSrc, setFadingPlateSrc] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [modalReel, setModalReel] = useState<CollabsReel | null>(null);
  const [programReveal, setProgramReveal] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const pushMs = prefersReducedMotion ? 0 : TIMING.pushMs;
  const crossfadeMs = prefersReducedMotion ? 0 : TIMING.crossfadeMs;
  const selectedReel =
    selectedIndex === null ? null : (reels[selectedIndex] ?? null);
  const coverRect = getCoverRect(viewportSize.w, viewportSize.h);

  const clearAll = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const bumpToken = () => {
    tokenRef.current += 1;
    return tokenRef.current;
  };

  const isToken = (token: number) => tokenRef.current === token;

  const schedule = (callback: () => void, ms: number, token = tokenRef.current) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      if (!isToken(token)) return;
      callback();
    }, ms);
    timeoutsRef.current.push(id);
  };

  const startCrossfade = (nextSrc: string, token: number) => {
    if (committedPlateSrc === nextSrc) {
      setFadingPlateSrc(null);
      setIsCrossfading(false);
      return;
    }

    if (prefersReducedMotion || crossfadeMs === 0) {
      setCommittedPlateSrc(nextSrc);
      setFadingPlateSrc(null);
      setIsCrossfading(false);
      return;
    }

    setFadingPlateSrc(nextSrc);
    setIsCrossfading(true);
    schedule(() => {
      setCommittedPlateSrc(nextSrc);
      setFadingPlateSrc(null);
      setIsCrossfading(false);
    }, crossfadeMs, token);
  };

  const resetToLobby = () => {
    clearAll();
    bumpToken();
    setView("lobby");
    setSelectedIndex(null);
    setCommittedPlateSrc(PLATE.lobby);
    setFadingPlateSrc(null);
    setIsCrossfading(false);
    setProgramReveal(false);
  };

  const resetToProgram = () => {
    clearAll();
    bumpToken();
    setView("program");
    setCommittedPlateSrc(PLATE.program);
    setFadingPlateSrc(null);
    setIsCrossfading(false);
    setProgramReveal(false);
    rafRef.current = window.requestAnimationFrame(() => {
      setProgramReveal(true);
      rafRef.current = null;
    });
  };

  const beginTransition = (
    transitionView: Extract<View, "transitionToProgram" | "transitionToReel">,
    finalView: Extract<View, "program" | "reel">,
    index: number,
  ) => {
    clearAll();
    const token = bumpToken();

    setSelectedIndex(index);
    setView(transitionView);

    const nextPlateSrc = plateForView(finalView);
    if (prefersReducedMotion) {
      setCommittedPlateSrc(nextPlateSrc);
      setFadingPlateSrc(null);
      setIsCrossfading(false);
      setView(finalView);
      return;
    }

    startCrossfade(nextPlateSrc, token);

    schedule(() => {
      setView(finalView);
      if (finalView === "program") {
        setProgramReveal(false);
        rafRef.current = window.requestAnimationFrame(() => {
          setProgramReveal(true);
          rafRef.current = null;
        });
      }
    }, TIMING.pushMs, token);
  };

  useEffect(() => {
    return () => clearAll();
  }, []);

  useEffect(() => {
    const syncViewport = () =>
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modalReel) return;
      resetToLobby();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalReel]);

  const pushScale = scaleForView(view);
  const pushTransform = `translate(-50%, -50%) scale(${pushScale}) translate(50%, 50%)`;

  const showLobbyWall = view === "lobby" || view === "transitionToProgram";
  const showProgramUi = view === "program" || view === "transitionToReel";
  const showReelUi = view === "reel";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-[#f4ead6]">
      <div
        className="absolute inset-0 transition-transform will-change-transform"
        style={{
          transform: pushTransform,
          transitionDuration: `${pushMs}ms`,
          transitionTimingFunction:
            view === "transitionToProgram" || view === "transitionToReel"
              ? "cubic-bezier(0.18, 0.84, 0.22, 1)"
              : "cubic-bezier(0.22, 0.9, 0.2, 1)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={committedPlateSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {fadingPlateSrc ? (
            <img
              src={fadingPlateSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                opacity: isCrossfading ? 1 : 0,
                transition: `opacity ${crossfadeMs}ms ease`,
              }}
            />
          ) : null}
        </div>

        <div className="absolute inset-0 z-10 pointer-events-auto">
          {showLobbyWall ? (
            <div className="absolute inset-0">
              {PLACEMENTS.map((box) => {
                const reel = reels[box.reelIndex];
                if (!reel) return null;
                const left = coverRect.x + (coverRect.w * box.left) / 100;
                const top = coverRect.y + (coverRect.h * box.top) / 100;
                const width = (coverRect.w * box.w) / 100;
                const height = (coverRect.h * box.h) / 100;

                return (
                  <button
                    key={`${reel.id}-lobby-hit`}
                    type="button"
                    onClick={() => beginTransition("transitionToProgram", "program", box.reelIndex)}
                    aria-label={`Open program room from ${reel.title}`}
                    className="absolute overflow-hidden rounded-xl border border-white/20 bg-black/5 shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition duration-200 ease-out hover:-translate-y-[4px] hover:scale-[1.01] hover:border-white/45 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)] focus-visible:-translate-y-[4px] focus-visible:scale-[1.01] focus-visible:border-white/45 focus-visible:shadow-[0_16px_30px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    style={{
                      left,
                      top,
                      width,
                      height,
                      zIndex: Math.round(10 + box.depth * 10),
                    }}
                  >
                    <img
                      src={reel.posterSrc}
                      alt={`${reel.title} poster`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/5"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}

          {showProgramUi ? (
            <>
              <div className="pointer-events-none absolute bottom-36 left-4 z-20 md:bottom-40 md:left-6">
                <p className="text-[0.64rem] uppercase tracking-[0.18em] text-[#d8c2a0]">
                  Program Room
                </p>
                <h2 className="mt-1 text-xl font-semibold uppercase tracking-[0.24em] text-[#f6ead3] md:text-2xl">
                  MONTAGE
                </h2>
              </div>

              <section
                className="absolute bottom-4 left-1/2 z-20 w-[min(58rem,calc(100%-1rem))] -translate-x-1/2 transition-opacity duration-200"
                style={{ opacity: view === "transitionToReel" ? 0.4 : 1 }}
              >
                <div className="mb-2 text-[0.64rem] uppercase tracking-[0.18em] text-[#d2ba97]">
                  Program Room
                </div>
                <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/15 bg-black/45 p-3">
                  {reels.map((reel, index) => (
                    <button
                      key={reel.id}
                      type="button"
                      onClick={() => beginTransition("transitionToReel", "reel", index)}
                      disabled={view !== "program"}
                      className={`min-w-[8.6rem] rounded-xl border border-white/10 bg-white/[0.025] p-2 text-left text-inherit transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05] hover:shadow-[0_14px_34px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        programReveal ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                      } ${view !== "program" ? "pointer-events-none" : ""}`}
                      style={{ transitionDelay: `${index * TIMING.staggerMs}ms` }}
                    >
                      <span className="block overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                        <img
                          src={reel.posterSrc}
                          alt={`${reel.title} poster`}
                          className="block aspect-[2/3] w-full object-cover"
                        />
                      </span>
                      <span className="mt-2 block">
                        <span className="block text-sm font-semibold tracking-[0.02em] text-[#f5e8d2]">
                          {reel.title}
                        </span>
                        <span className="block text-[0.6rem] uppercase tracking-[0.14em] text-[#d4c1a2]">
                          {reel.subtitle}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {showReelUi && selectedReel ? (
            <section
              className="absolute inset-0 z-20 grid place-items-center px-4 py-6 transition-opacity duration-200"
              style={{ opacity: 1 }}
            >
              <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03]">
                  <img
                    src={selectedReel.posterSrc}
                    alt={`${selectedReel.title} poster`}
                    className="block aspect-[2/3] w-full object-cover"
                  />
                </div>
                <div className="self-center text-white">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#d2ba97]">
                    Reel Room
                  </p>
                  <h2 className="text-3xl font-semibold leading-tight text-[#f7ecd8] md:text-4xl">
                    {selectedReel.title}
                  </h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d5c2a2] md:text-sm">
                    {selectedReel.subtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.14em]">
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[#d4c1a0]">
                      {selectedReel.year ?? "Year TBD"}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[#d4c1a0]">
                      {formatDuration(selectedReel.durationSec)}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[#d4c1a0]">
                      {selectedReel.videoSrc ? "Video Ready" : "No Video Yet"}
                    </span>
                  </div>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setModalReel(selectedReel)}
                      disabled={view !== "reel"}
                      className="rounded-full border border-[#ffe3b8]/35 bg-[#ffe3b8]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#faedd7] transition hover:bg-white/10 hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      PLAY REEL
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 33%, rgba(0,0,0,0.05) 67%, rgba(0,0,0,0.13) 100%), linear-gradient(to top, rgba(0,0,0,0.07), transparent 42%), linear-gradient(to bottom, rgba(0,0,0,0.05), transparent 35%)",
            }}
          />
          <div
            className="absolute inset-[-12%] opacity-[0.035] mix-blend-soft-light"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.75) 0 0.6px, transparent 1px), radial-gradient(circle at 63% 38%, rgba(255,255,255,0.6) 0 0.7px, transparent 1px), radial-gradient(circle at 38% 76%, rgba(255,255,255,0.55) 0 0.8px, transparent 1.1px), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.62) 0 0.7px, transparent 1px)",
              backgroundSize: "15px 15px, 19px 19px, 23px 23px, 17px 17px",
            }}
          />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-30">
        <div className="absolute left-4 top-4 text-xs uppercase tracking-[0.28em] text-[#efe4ce] md:left-5 md:top-5">
          CHLOEVERSE
        </div>

        {debug ? (
          <div className="pointer-events-none absolute left-4 top-10 rounded-md border border-white/20 bg-black/55 px-2 py-1 text-[10px] leading-4 text-[#f1e7d3] md:left-5 md:top-12">
            <div className="font-semibold uppercase tracking-[0.18em]">COLLABS V2</div>
            <div>view: {view}</div>
            <div>wallMounted: {String(showLobbyWall)}</div>
            <div className="max-w-[18rem] truncate">plate: {committedPlateSrc}</div>
          </div>
        ) : null}

        {(view === "program" || view === "reel") && (
          <div className="pointer-events-none absolute right-3 top-3 flex flex-wrap justify-end gap-2 md:right-4 md:top-4">
            {view === "reel" ? (
              <>
                <button
                  type="button"
                  onClick={() => startTransition(resetToProgram)}
                  className="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#f4ead7] transition hover:bg-white/10 hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  RETURN TO PROGRAM
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(resetToLobby)}
                  className="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#f4ead7] transition hover:bg-white/10 hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  RETURN TO LOBBY
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => startTransition(resetToLobby)}
                className="pointer-events-auto rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-[#f4ead7] transition hover:bg-white/10 hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                RETURN TO LOBBY
              </button>
            )}
          </div>
        )}

        {debug ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs leading-5 text-[#ecdec3]">
            <div>view: {view}</div>
            <div>committedSrc: {committedPlateSrc}</div>
            <div>fadingSrc: {fadingPlateSrc ?? "-"}</div>
          </div>
        ) : null}
      </div>

      <CollabsReelModalPlayer
        key={modalReel?.id ?? "closed"}
        reel={modalReel}
        onClose={() => setModalReel(null)}
      />
    </div>
  );
}
