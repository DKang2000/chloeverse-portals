"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOTTOM_CAP_H,
  CollabsInstagramEmbedRuntime,
  InstagramProjectsEmbed,
  MODAL_CROP_VISIBLE,
  TOP_CAP_H,
} from "@/components/collabs/InstagramProjectsEmbed";
import CollabsCursor from "@/components/collabs/cursor/CollabsCursor";
import ForestPortalHero from "@/components/collabs/forestC/ForestPortalHero";
import ReelsEternityScene from "@/components/collabs/reels/ReelsEternityScene";
import ReelsSmoothScroll from "@/components/collabs/reels/ReelsSmoothScroll";
import CollabsUnderwaterOverlay from "./CollabsUnderwaterOverlay";
import CollabsDebugHud from "./CollabsDebugHud";
import { PORTAL_LOOK } from "./collabsDesignLock";
import { setDebugState } from "./collabsDebugState";
import { REELS } from "./CollabsReelsCorridor";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { CollabsRouteQuery } from "@/app/collabs/query";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function CollabsShell({
  routeMode,
  query,
  children,
}: {
  routeMode: "home" | "reels";
  query: CollabsRouteQuery;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const isLanding = routeMode === "home";
  const isReels = routeMode === "reels";
  const benchPointer = query.benchMode && query.pointerOverride ? query.pointerOverride : { x: 0.5, y: 0.5 };

  const [portalHover, setPortalHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState(benchPointer);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragDownRef = useRef<{ x: number; y: number } | null>(null);

  const [portalRunId, setPortalRunId] = useState(0);
  const [portalProgress, setPortalProgress] = useState(0);
  const [overlayActive, setOverlayActive] = useState(false);
  const [overlayProgress, setOverlayProgress] = useState(0);
  const pushedRef = useRef(false);
  const portalActiveRef = useRef(false);
  const fallbackNavTimerRef = useRef<number | null>(null);

  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [modalEmbedReady, setModalEmbedReady] = useState(false);
  const [modalUserInteracted, setModalUserInteracted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const priorFocusRef = useRef<HTMLElement | null>(null);

  const activeItem = selectedFrameIndex === null ? null : (REELS[selectedFrameIndex] ?? null);
  const modalOpen = Boolean(activeItem);

  useEffect(() => {
    if (query.benchMode) return;
    const onMove = (event: PointerEvent) => {
      const x = Math.min(1, Math.max(0, event.clientX / Math.max(window.innerWidth, 1)));
      const y = Math.min(1, Math.max(0, event.clientY / Math.max(window.innerHeight, 1)));
      setPointer({ x, y });
      if (dragDownRef.current) {
        setDragDelta({
          x: (event.clientX - dragDownRef.current.x) / Math.max(window.innerWidth, 1),
          y: (event.clientY - dragDownRef.current.y) / Math.max(window.innerHeight, 1),
        });
      }
    };
    const onDown = (event: PointerEvent) => {
      dragDownRef.current = { x: event.clientX, y: event.clientY };
      setDragging(true);
    };
    const onUp = () => {
      dragDownRef.current = null;
      setDragging(false);
      setDragDelta({ x: 0, y: 0 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [query.benchMode]);

  useEffect(() => {
    if (portalRunId === 0 || !isLanding || !portalActiveRef.current) return;
    if (reducedMotion) {
      router.push("/collabs/reels");
      return;
    }
    let raf = 0;
    const started = performance.now();
    const duration = PORTAL_LOOK.transitionMs;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      setPortalProgress(p);
      setOverlayProgress(p);
      if (!pushedRef.current && p >= 0.6 && portalActiveRef.current) {
        pushedRef.current = true;
        portalActiveRef.current = false;
        setPortalProgress(0);
        router.push("/collabs/reels");
      }
      if (p < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isLanding, portalRunId, reducedMotion, router]);

  useEffect(() => {
    if (isLanding) return;
    portalActiveRef.current = false;
    if (fallbackNavTimerRef.current !== null) {
      window.clearTimeout(fallbackNavTimerRef.current);
      fallbackNavTimerRef.current = null;
    }
  }, [isLanding]);

  useEffect(
    () => () => {
      if (fallbackNavTimerRef.current !== null) {
        window.clearTimeout(fallbackNavTimerRef.current);
        fallbackNavTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isReels || !overlayActive) return;
    const started = performance.now();
    let raf = 0;
    const duration = reducedMotion ? 140 : 480;
    const from = overlayProgress;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const next = from * (1 - p);
      setOverlayProgress(next);
      if (p < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setOverlayActive(false);
        setOverlayProgress(0);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isReels, overlayActive, overlayProgress, reducedMotion]);

  const onPortalActivate = useCallback(() => {
    if (!isLanding) return;
    if (reducedMotion) {
      router.push("/collabs/reels");
      return;
    }
    if (portalActiveRef.current) return;
    portalActiveRef.current = true;
    setOverlayActive(true);
    setOverlayProgress(0);
    setPortalRunId((v) => v + 1);
    setPortalProgress(0);
    pushedRef.current = false;
    if (fallbackNavTimerRef.current !== null) {
      window.clearTimeout(fallbackNavTimerRef.current);
    }
    fallbackNavTimerRef.current = window.setTimeout(() => {
      if (pushedRef.current) return;
      pushedRef.current = true;
      portalActiveRef.current = false;
      setPortalProgress(0);
      router.push("/collabs/reels");
    }, Math.max(250, Math.floor(PORTAL_LOOK.transitionMs * 0.8)));
  }, [isLanding, reducedMotion, router]);

  const closeModal = useCallback(() => {
    setSelectedFrameIndex(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;

    priorFocusRef.current = document.activeElement as HTMLElement | null;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      priorFocusRef.current?.focus();
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.tabIndex !== -1 &&
          element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal, modalOpen]);

  useEffect(() => {
    if (!(query.smokeMode && isLanding && query.smokeAction === "cta")) return;
    const timer = window.setTimeout(() => onPortalActivate(), 260);
    return () => window.clearTimeout(timer);
  }, [isLanding, onPortalActivate, query.smokeAction, query.smokeMode]);

  useEffect(() => {
    setDebugState({
      ready: true,
      routeMode: isReels ? "reels" : "home",
      reducedMotion,
      fxMode: query.fxMode,
      noPost: query.noPost,
      modal: { open: modalOpen },
    });
  }, [isReels, modalOpen, query.fxMode, query.noPost, reducedMotion]);

  useEffect(() => {
    const velocity = Math.hypot(dragDelta.x, dragDelta.y);
    setDebugState({
      drag: {
        active: dragging,
        yaw: dragDelta.x * 4.2,
        pitch: -dragDelta.y * 3.6,
        velocity,
      },
    });
  }, [dragDelta.x, dragDelta.y, dragging]);

  useEffect(() => {
    const transitionActive = overlayActive && overlayProgress > 0.001;
    const transitionPhase = transitionActive ? (isLanding ? "out" : "in") : null;
    setDebugState({
      transition: {
        active: transitionActive,
        phase: transitionPhase,
        progress: overlayProgress,
      },
    });
  }, [isLanding, overlayActive, overlayProgress]);

  const activePortalProgress = isLanding ? portalProgress : 0;

  const radialVignette = useMemo(() => {
    const opacity = reducedMotion ? 0 : activePortalProgress * 0.9;
    const blur = 8 + activePortalProgress * 18;
    return {
      opacity,
      backdropFilter: `blur(${blur}px)`,
      transform: `scale(${1 + activePortalProgress * 0.2})`,
    } as const;
  }, [activePortalProgress, reducedMotion]);

  if (isLanding && query.refMode) {
    return (
      <main className="relative h-screen w-full overflow-hidden bg-black">
        <div id="__next" hidden aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/collabs/ref/forest_portal_ref.png"
          alt="Collabs reference"
          className="h-full w-full object-cover"
        />
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden cursor-none">
      <div id="__next" hidden aria-hidden="true" />
      {isLanding ? (
        <>
          <ForestPortalHero
            reducedMotion={reducedMotion}
            benchMode={query.benchMode}
            pointerOverride={query.pointerOverride}
            onEnter={onPortalActivate}
            onPortalHover={setPortalHover}
            onDraggingChange={setDragging}
          />
          {query.debugMode ? (
            <div className="pointer-events-none absolute left-4 top-4 z-[120] rounded-md bg-black/55 px-3 py-2 text-xs tracking-[0.12em] text-white/90">
              Scene: ForestPortalHero
            </div>
          ) : null}
          {!query.noFx && !query.benchMode && !reducedMotion ? (
            <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.0)_33%,rgba(8,9,7,0.88)_100%)] transition-opacity duration-300" style={radialVignette} />
          ) : null}
        </>
      ) : null}

      {isReels ? (
        <>
          <ReelsEternityScene reducedMotion={reducedMotion} pointer={pointer} drag={{ active: dragging, dx: dragDelta.x, dy: dragDelta.y }} />
          {!query.noFx ? <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.0)_30%,rgba(235,236,232,0.42)_100%)]" /> : null}
          <ReelsSmoothScroll
            smokeAction={query.smokeMode ? query.smokeAction : null}
            reducedMotion={reducedMotion}
            onDragActiveChange={setDragging}
            onSelectFrame={(index) => {
              setModalEmbedReady(false);
              setModalUserInteracted(false);
              setSelectedFrameIndex(index);
            }}
          />
        </>
      ) : null}

      <CollabsCursor enterHover={isLanding && portalHover} dragging={dragging} dark={isReels} reducedMotion={reducedMotion} />

      <CollabsUnderwaterOverlay
        active={overlayActive && overlayProgress > 0.001}
        progress={overlayProgress}
        fxMode={query.fxMode}
        reducedMotion={reducedMotion}
      />
      {query.debugMode ? <CollabsDebugHud /> : null}

      {!reducedMotion && activePortalProgress > 0.001 && isLanding ? (
        <div className="pointer-events-none absolute inset-0 z-[70] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_52%)]" />
      ) : null}

      {modalOpen && activeItem ? (
        <>
          <CollabsInstagramEmbedRuntime />
          <div
            data-collabs-modal="open"
            className="fixed inset-0 z-50 bg-black/90 p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collabs-reels-modal-title"
            onClick={closeModal}
          >
            <div ref={modalRef} className="mx-auto flex h-full w-full max-w-7xl flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
                  }}
                  className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#f0e4ce] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Close
                </button>
              </div>
              <div className="grid min-h-0 flex-1 place-items-center" onClick={(event) => event.stopPropagation()}>
                <h2 id="collabs-reels-modal-title" className="sr-only">
                  {activeItem.title} reel
                </h2>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-[-30px] rounded-[46px] bg-[radial-gradient(circle_at_50%_38%,rgba(132,171,238,0.24),rgba(0,0,0,0)_68%)] blur-xl" />
                  <div
                    data-phone-shell="true"
                    className="relative h-[92vh] min-h-[560px] max-h-[920px] w-auto aspect-[608/1000] overflow-hidden rounded-[34px] bg-white p-0 ring-0 border-0 outline-none shadow-[0_40px_140px_rgba(0,0,0,0.55)] md:h-[94vh] md:min-h-[740px] md:max-h-[1120px] md:p-0"
                    style={{
                      border: "none",
                      outline: "none",
                      boxShadow: "0 40px 140px rgba(0,0,0,0.55)",
                      backgroundClip: "padding-box",
                    }}
                  >
                    <div
                      className="relative mx-auto h-full aspect-[9/16] overflow-hidden rounded-[28px] bg-white"
                      onPointerDownCapture={() => setModalUserInteracted(true)}
                    >
                      <div className="absolute inset-0 z-0">
                        <InstagramProjectsEmbed
                          key={`modal:${activeItem.url}:${modalOpen ? 1 : 0}`}
                          url={activeItem.url}
                          token={999000 + (selectedFrameIndex ?? 0)}
                          crop={MODAL_CROP_VISIBLE}
                          onReadyChange={setModalEmbedReady}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-white" style={{ height: TOP_CAP_H }} />
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-white"
                        style={{ height: BOTTOM_CAP_H, pointerEvents: "none" }}
                      >
                        <a
                          href={activeItem.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block h-full px-4 text-[13px] font-medium text-blue-600"
                          style={{ pointerEvents: "auto", display: "flex", alignItems: "center" }}
                        >
                          View more on Instagram
                        </a>
                      </div>
                      {modalEmbedReady && !modalUserInteracted ? (
                        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                          <div className="grid h-16 w-16 place-items-center rounded-full bg-black/35 ring-1 ring-white/25">
                            <div className="ml-1 h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white/85" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      {children}
    </main>
  );
}
