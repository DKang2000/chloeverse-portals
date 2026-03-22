"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  BOTTOM_CAP_H,
  CollabsInstagramEmbedRuntime,
  InstagramProjectsEmbed,
  MODAL_CROP_VISIBLE,
  TOP_CAP_H,
} from "@/components/collabs/InstagramProjectsEmbed";
import { REELS } from "@/components/collabs/reelsData";
import styles from "@/components/collabs/CollabsReelsMotion.module.css";
import { useReelsStageMotion } from "@/components/collabs/useReelsStageMotion";
import { useAudioGate } from "@/hooks/useAudioGate";

function seeded(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function shouldStartWithArrivalBloom(): boolean {
  if (typeof window === "undefined") return false;

  let shouldShowArrival = false;

  try {
    const sessionFlag = window.sessionStorage.getItem("collabs:portal-entry");
    if (sessionFlag === "1") {
      shouldShowArrival = true;
      window.sessionStorage.removeItem("collabs:portal-entry");
    }
  } catch {
    // no-op
  }

  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && ref.pathname === "/collabs") {
        shouldShowArrival = true;
      }
    }
  } catch {
    // no-op
  }

  return shouldShowArrival;
}

export default function CollabsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const whooshTimerRef = useRef(0);
  const lastOpenAtRef = useRef(0);
  const voidPulseRef = useRef(0);

  const [openingIndex, setOpeningIndex] = useState<number | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [modalEmbedReady, setModalEmbedReady] = useState(false);
  const [modalUserInteracted, setModalUserInteracted] = useState(false);
  const [openOrigin, setOpenOrigin] = useState({ x: 50, y: 50 });
  const [arrivalBloomActive, setArrivalBloomActive] = useState(shouldStartWithArrivalBloom);

  const audio = useAudioGate({ volume: 0.14, ambientLevel: 0.23 });

  const {
    viewportRef,
    stageRef,
    contentRef,
    setCardRef,
    getCardHandlers,
    viewportHandlers,
    motionEnabled,
    reducedMotion,
    dragging,
    scrollEnergy,
  } = useReelsStageMotion({
    cardCount: REELS.length,
    paused: selectedFrameIndex !== null || openingIndex !== null,
  });
  const modalItem = selectedFrameIndex === null ? null : (REELS[selectedFrameIndex] ?? null);
  const modalOpen = Boolean(modalItem);

  const bumpVoidPulse = useCallback((amount = 1) => {
    voidPulseRef.current += amount;
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty("--void-pulse", String(voidPulseRef.current));
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => ({
        x: 8 + seeded(index + 11) * 84,
        y: 6 + seeded(index + 37) * 88,
        size: 0.12 + seeded(index + 73) * 0.72,
        duration: 14 + seeded(index + 101) * 26,
        delay: seeded(index + 151) * -22,
        drift: (seeded(index + 193) * 2 - 1) * 32,
      })),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty("--scroll-energy", scrollEnergy.toFixed(3));
  }, [scrollEnergy]);

  useEffect(() => {
    if (!arrivalBloomActive) return;
    let rafA = 0;
    let rafB = 0;
    rafA = window.requestAnimationFrame(() => {
      rafB = window.requestAnimationFrame(() => {
        setArrivalBloomActive(false);
      });
    });

    return () => {
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
    };
  }, [arrivalBloomActive]);

  useEffect(() => {
    if (!modalOpen) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen) return;
    audio.setDucked(false);
  }, [audio, modalOpen]);

  useEffect(() => {
    if (!modalOpen || !modalEmbedReady) return;
    const timer = window.setTimeout(() => {
      setModalUserInteracted(true);
    }, 1200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [modalEmbedReady, modalOpen]);

  useEffect(() => {
    if (scrollEnergy < 0.65) return;
    const now = performance.now();
    if (now - whooshTimerRef.current < 380) return;
    whooshTimerRef.current = now;
    audio.playFocusWhoosh(0.65 + scrollEnergy * 0.5);
  }, [audio, scrollEnergy]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  const updatePointerVars = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    root.style.setProperty("--pointer-x", `${clampedX.toFixed(2)}%`);
    root.style.setProperty("--pointer-y", `${clampedY.toFixed(2)}%`);
  }, []);

  const onViewportPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      viewportHandlers.onPointerMove(event);
      updatePointerVars(event.clientX, event.clientY);
    },
    [updatePointerVars, viewportHandlers],
  );

  const onViewportPointerLeave = useCallback(() => {
    viewportHandlers.onPointerLeave();
  }, [viewportHandlers]);

  const onViewportPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      void audio.requestStart();
      viewportHandlers.onPointerDown(event);
      updatePointerVars(event.clientX, event.clientY);
    },
    [audio, updatePointerVars, viewportHandlers],
  );

  const onViewportPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      viewportHandlers.onPointerUp(event);
    },
    [viewportHandlers],
  );

  const onViewportPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      viewportHandlers.onPointerCancel(event);
    },
    [viewportHandlers],
  );

  const onViewportWheelCapture = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      void audio.requestStart();
      const now = performance.now();
      if (now - whooshTimerRef.current < 220) return;
      whooshTimerRef.current = now;
      audio.playFocusWhoosh(Math.min(1.15, 0.55 + Math.abs(event.deltaY) / 1200));
    },
    [audio],
  );

  const openReel = useCallback(
    (index: number, source: HTMLElement | null) => {
      const now = performance.now();
      if (now - lastOpenAtRef.current < 280) return;
      if (openingIndex !== null) return;
      const item = REELS[index];
      if (!item) return;
      lastOpenAtRef.current = now;

      void audio.requestStart();
      audio.playOpenBloom();

      if (source) {
        const rect = source.getBoundingClientRect();
        setOpenOrigin({
          x: ((rect.left + rect.width * 0.5) / Math.max(window.innerWidth, 1)) * 100,
          y: ((rect.top + rect.height * 0.46) / Math.max(window.innerHeight, 1)) * 100,
        });
      }

      bumpVoidPulse(2);
      setOpeningIndex(index);

      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);

      openTimerRef.current = window.setTimeout(() => {
        setModalEmbedReady(false);
        setModalUserInteracted(false);
        setSelectedFrameIndex(index);
        setOpeningIndex(null);
      }, reducedMotion ? 120 : 300);
    },
    [audio, bumpVoidPulse, openingIndex, reducedMotion],
  );

  const closeModal = useCallback(() => {
    audio.setDucked(false);
    setSelectedFrameIndex(null);
  }, [audio]);

  return (
    <main
      ref={rootRef}
      className={styles.portalMain}
      data-collabs-ui="reels-gallery"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-motion-enabled={motionEnabled ? "true" : "false"}
    >
      <div className={styles.voidField} aria-hidden="true">
        <div className={styles.voidGradient} />
        <div className={styles.voidFog} />
        <div className={styles.voidRings} />
        <div className={styles.voidSeams} />
        <div className={styles.voidHalo} />
        <div className={styles.voidParticles}>
          {particles.map((particle, index) => (
            <span
              key={`void-particle-${index}`}
              className={styles.voidParticle}
              style={
                {
                  "--x": `${particle.x.toFixed(2)}%`,
                  "--y": `${particle.y.toFixed(2)}%`,
                  "--size": `${particle.size.toFixed(3)}rem`,
                  "--duration": `${particle.duration.toFixed(2)}s`,
                  "--delay": `${particle.delay.toFixed(2)}s`,
                  "--drift": `${particle.drift.toFixed(2)}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <header className={[styles.archiveHeader, modalOpen ? styles.hudHidden : ""].filter(Boolean).join(" ")}>
        <a
          href="https://imchloekang.com"
          target="_blank"
          rel="noreferrer noopener"
          className={styles.candyButton}
        >
          Candy Castle
        </a>
        <p className={styles.archiveHint} aria-hidden="true">
          Scroll to drift through Reels
        </p>
        <button
          type="button"
          className={styles.audioToggle}
          aria-label={audio.muted ? "Unmute ambient portal audio" : "Mute ambient portal audio"}
          onClick={() => {
            void audio.requestStart();
            audio.toggleMuted();
          }}
        >
          {audio.muted ? "Audio Off" : "Audio On"}
        </button>
      </header>

      <p className={[styles.archiveHintTop, modalOpen ? styles.hudHidden : ""].filter(Boolean).join(" ")}>
        Scroll to drift through Reels
      </p>

      <a
        href="/"
        className={[styles.topRightLink, modalOpen ? styles.hudHidden : ""].filter(Boolean).join(" ")}
      >
        Chloeverse
      </a>

      <div
        ref={viewportRef}
        className={[
          styles.reelsViewport,
          dragging ? styles.reelsViewportDragging : "",
          modalOpen ? styles.viewportHidden : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onWheelCapture={onViewportWheelCapture}
        onPointerMove={onViewportPointerMove}
        onPointerLeave={onViewportPointerLeave}
        onPointerDown={onViewportPointerDown}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
      >
        <div ref={stageRef} className={styles.reelsStage}>
          <div ref={contentRef} className={styles.reelsContent}>
            <div className={styles.tilesGrid}>
              {REELS.map((item, index) => (
                <article
                  key={item.id}
                  ref={setCardRef(index)}
                  data-reel-index={index}
                  data-testid={`collabs-reel-card-${index}`}
                  className={styles.reelsCard}
                  {...getCardHandlers(index)}
                >
                  <button
                    type="button"
                    data-collabs-anchor="true"
                    data-reel-index={index}
                    aria-label={`Open ${item.title} reel`}
                    className={styles.reelsHitTarget}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      openReel(index, event.currentTarget);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  />
                  <div className={styles.portalGlass}>
                    <span className={styles.portalCore} aria-hidden="true" />
                    <span className={styles.portalEdge} aria-hidden="true" />
                    <span className={styles.portalShimmer} aria-hidden="true" />
                    <div className={styles.reelsCardLabel}>
                      <p className={styles.reelsTitle}>{item.title}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={[
          styles.portalWash,
          openingIndex !== null ? styles.portalWashActive : "",
          arrivalBloomActive ? styles.portalArrival : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--open-x": `${openOrigin.x.toFixed(2)}%`,
            "--open-y": `${openOrigin.y.toFixed(2)}%`,
          } as CSSProperties
        }
      />

      {modalOpen && modalItem ? (
        <>
          <CollabsInstagramEmbedRuntime />
          <div
            data-collabs-modal="open"
            className="fixed inset-0 z-[140] bg-[rgba(242,247,255,0.97)] p-4 backdrop-blur-2xl md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${modalItem.title} reel`}
            onClick={closeModal}
          >
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
                  }}
                  className="rounded-full border border-white/45 bg-white/55 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#4e638a] transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  Close
                </button>
              </div>
              <div className="grid min-h-0 flex-1 place-items-center">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-[-34px] rounded-[50px] bg-[radial-gradient(circle_at_50%_36%,rgba(219,233,255,0.78),rgba(255,255,255,0)_68%)] blur-2xl" />
                  <div
                    data-phone-shell="true"
                    className="relative h-[90vh] min-h-[560px] max-h-[920px] w-auto aspect-[608/1000] overflow-hidden rounded-[34px] bg-white p-0 shadow-[0_40px_140px_rgba(146,173,228,0.32)] md:h-[94vh] md:min-h-[740px] md:max-h-[1120px]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div
                      className="relative mx-auto h-full aspect-[9/16] overflow-hidden rounded-[28px] bg-white"
                      onPointerDownCapture={() => {
                        setModalUserInteracted(true);
                        audio.setDucked(true);
                      }}
                    >
                      <div className="absolute inset-0 z-0">
                        <InstagramProjectsEmbed
                          key={`modal:${modalItem.url}:${modalOpen ? 1 : 0}`}
                          url={modalItem.url}
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
                          href={modalItem.url}
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
