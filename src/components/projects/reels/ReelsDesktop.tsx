"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CommentIcon,
  HeartIcon,
  HomeIcon,
  InstagramNavIcon,
  MessagesIcon,
  MoreIcon,
  PlusIcon,
  ProfileIcon,
  ReelsIcon,
  SaveIcon,
  SearchIcon,
  ShareIcon,
} from "@/components/projects/reels/icons";

type Reel = {
  id: string;
  permalink: string;
  user: string;
  caption: string;
};

const REELS: Reel[] = [
  { id: "r1", permalink: "https://www.instagram.com/p/DR1MfgoDvzQ/", user: "edemmii", caption: "Instagram post embed placeholder caption." },
  { id: "r2", permalink: "https://www.instagram.com/p/DTMwW_Pjv-P/", user: "edemmii", caption: "Instagram post embed placeholder caption." },
  { id: "r3", permalink: "https://www.instagram.com/reel/DTZ2XtNkeNC/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r4", permalink: "https://www.instagram.com/reel/DR_GW1BkQci/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r5", permalink: "https://www.instagram.com/reel/DSitVRLkjEf/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r6", permalink: "https://www.instagram.com/reel/DOH8x_gk2Ew/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r7", permalink: "https://www.instagram.com/reel/DOQ-ZxuEzan/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r8", permalink: "https://www.instagram.com/reel/DObX6ceE-di/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r9", permalink: "https://www.instagram.com/reel/DOsvvxCkUxJ/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r10", permalink: "https://www.instagram.com/reel/DMLYWLOhTfg/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
  { id: "r11", permalink: "https://www.instagram.com/reel/DMxxlTEp98D/", user: "edemmii", caption: "Instagram reel embed placeholder caption." },
];

const WHEEL_THRESHOLD = 45;
const WHEEL_LOCK_MS = 550;
const IG_EMBED_SCALE = 1.16;
const IG_BOTTOM_WHITE_H = "clamp(140px, 18%, 220px)";

export function ReelsDesktop() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [embedScriptReady, setEmbedScriptReady] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const [iframePresent, setIframePresent] = useState(false);
  const [showPlayHint, setShowPlayHint] = useState(true);
  const embedHostRef = useRef<HTMLDivElement | null>(null);
  const phoneViewportRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const lastWheelNavRef = useRef(0);

  const activeReel = REELS[currentIndex];
  const maxIndex = REELS.length - 1;

  const moveNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const movePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleWheelDelta = useCallback((deltaY: number) => {
    wheelAccumRef.current += deltaY;

    if (wheelResetTimerRef.current) {
      window.clearTimeout(wheelResetTimerRef.current);
    }
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelAccumRef.current = 0;
    }, 180);

    if (Math.abs(wheelAccumRef.current) < WHEEL_THRESHOLD) return;

    const now = Date.now();
    if (now - lastWheelNavRef.current < WHEEL_LOCK_MS) return;

    if (wheelAccumRef.current > 0) {
      moveNext();
    } else {
      movePrev();
    }
    wheelAccumRef.current = 0;
    lastWheelNavRef.current = now;
  }, []);

  const handleWheelFrameBand = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleWheelDelta(event.deltaY);
  };

  useEffect(() => {
    if (!embedScriptReady) return;

    setEmbedFailed(false);
    setEmbedReady(false);
    setIframePresent(false);

    (window as any).instgrm?.Embeds?.process?.();

    let elapsed = 0;
    const intervalMs = 150;
    const timeoutMs = 4500;
    const pollId = window.setInterval(() => {
      const iframe = embedHostRef.current?.querySelector("iframe");
      if (iframe) {
        setIframePresent(true);
        window.clearInterval(pollId);
        setEmbedReady(true);
        return;
      }

      elapsed += intervalMs;
      if (elapsed >= timeoutMs) {
        window.clearInterval(pollId);
        setEmbedFailed(true);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(pollId);
    };
  }, [activeReel.id, currentIndex, embedScriptReady]);

  useEffect(() => {
    const host = embedHostRef.current;
    if (!host) return;

    const check = () => {
      const iframe = host.querySelector("iframe");
      if (iframe) {
        setIframePresent(true);
      }
    };

    check();

    const observer = new MutationObserver(() => check());
    observer.observe(host, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [currentIndex, embedReady]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      handleWheelDelta(e.deltaY);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, true);
  }, [handleWheelDelta]);

  useEffect(
    () => () => {
      if (wheelResetTimerRef.current) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    setIframePresent(false);
    setShowPlayHint(true);
  }, [currentIndex]);

  useEffect(() => {
    if (!iframePresent) return;
    const t = window.setTimeout(() => setShowPlayHint(false), 1200);
    return () => window.clearTimeout(t);
  }, [iframePresent]);

  const actionStat = useMemo(
    () => [
      { icon: HeartIcon, count: "12.4K" },
      { icon: CommentIcon, count: "884" },
      { icon: ShareIcon, count: "1.9K" },
      { icon: SaveIcon, count: "3.2K" },
      { icon: MoreIcon, count: "" },
    ],
    []
  );

  return (
    <main
      data-reels-build="wheel-v22"
      className="relative h-screen w-full overflow-hidden bg-[#0b0f14] text-white supports-[height:100svh]:h-[100svh]"
      onWheel={(event) => {
        event.preventDefault();
        handleWheelDelta(event.deltaY);
      }}
      onWheelCapture={(event) => {
        event.preventDefault();
        handleWheelDelta(event.deltaY);
      }}
    >
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="afterInteractive"
        onLoad={() => setEmbedScriptReady(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_56%_47%,rgba(64,86,119,0.38)_0%,rgba(11,15,20,0.82)_46%,rgba(11,15,20,1)_76%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0)_40%)]" />

      <div className="relative z-10 flex h-full w-full">
        <aside className="relative flex h-screen w-[86px] shrink-0 flex-col items-center border-r border-white/10 bg-black/35 backdrop-blur-md supports-[height:100svh]:h-[100svh] sm:w-[92px]">
          <div className="pt-6">
            <button
              type="button"
              aria-label="Go to chloeverse.io"
              onClick={() => window.location.assign("https://chloeverse.io")}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/6 text-white transition hover:bg-white/12"
            >
              <InstagramNavIcon size={26} />
            </button>
          </div>

          <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-6 text-white/88">
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <HomeIcon size={28} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <SearchIcon size={28} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <ReelsIcon size={28} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <MessagesIcon size={28} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <HeartIcon size={28} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md">
              <PlusIcon size={28} />
            </div>
          </div>

          <div className="pointer-events-none pb-6 text-white/88">
            <ProfileIcon size={26} />
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 items-center justify-center px-4 md:px-8 lg:px-14">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
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
                  ref={phoneViewportRef}
                  className="relative mx-auto h-full aspect-[9/16] overflow-hidden rounded-[28px] bg-black"
                >
                  {!embedFailed ? (
                    <div className="absolute inset-0 bg-black">
                      <div
                        key={activeReel.id}
                        ref={embedHostRef}
                        className="reelsInstaHost h-full w-full overflow-hidden bg-black"
                        style={{ ["--ig-embed-scale" as any]: IG_EMBED_SCALE }}
                      >
                        <blockquote
                          className="instagram-media"
                          data-instgrm-permalink={activeReel.permalink}
                          data-instgrm-version="14"
                        >
                          <a href={activeReel.permalink} target="_blank" rel="noreferrer">
                            View on Instagram
                          </a>
                        </blockquote>
                      </div>
                    </div>
                  ) : null}

                  {!embedFailed ? (
                    <div
                      className="absolute left-0 right-0 top-0 z-[70] bg-white pointer-events-none"
                      style={{ height: "64px", borderTopLeftRadius: "28px", borderTopRightRadius: "28px" }}
                    />
                  ) : null}

                  {!embedFailed ? (
                    <>
                      <div
                        className="absolute inset-x-0 bottom-0 z-40 pointer-events-none"
                        style={{ height: IG_BOTTOM_WHITE_H, background: "#fff" }}
                      />
                      <a
                        href={activeReel.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute left-4 bottom-4 z-50 text-[13px] font-medium text-[#0095F6]"
                      >
                        View more on Instagram
                      </a>
                    </>
                  ) : null}

                  {!embedFailed && iframePresent ? (
                    <div className="absolute inset-0 z-30 pointer-events-none bg-transparent" aria-hidden="true">
                      <div
                        className="absolute top-0 left-0 right-0 h-[calc(50%-90px)] pointer-events-auto bg-transparent"
                        onWheel={handleWheelFrameBand}
                        onWheelCapture={handleWheelFrameBand}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[calc(50%-90px)] pointer-events-auto bg-transparent"
                        onWheel={handleWheelFrameBand}
                        onWheelCapture={handleWheelFrameBand}
                      />
                      <div
                        className="absolute top-[calc(50%-90px)] bottom-[calc(50%-90px)] left-0 w-[calc(50%-90px)] pointer-events-auto bg-transparent"
                        onWheel={handleWheelFrameBand}
                        onWheelCapture={handleWheelFrameBand}
                      />
                      <div
                        className="absolute top-[calc(50%-90px)] bottom-[calc(50%-90px)] right-0 w-[calc(50%-90px)] pointer-events-auto bg-transparent"
                        onWheel={handleWheelFrameBand}
                        onWheelCapture={handleWheelFrameBand}
                      />
                    </div>
                  ) : null}

                  {showPlayHint && !embedFailed ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] opacity-90">
                        <svg viewBox="0 0 84 84" className="h-[84px] w-[84px]">
                          <circle cx="42" cy="42" r="34" fill="rgba(0,0,0,0.55)" />
                          <path d="M36 30 L58 42 L36 54 Z" fill="#fff" />
                        </svg>
                      </div>
                    </div>
                  ) : null}

                </div>
              </div>
            </div>

            <div className="pointer-events-none flex flex-col items-center gap-4 self-center text-white/92">
              {actionStat.map(({ icon: Icon, count }, index) => (
                <div key={index} className="flex flex-col items-center gap-1">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur">
                    <Icon size={20} />
                  </div>
                  {count ? <div className="text-[10px] font-medium text-white/72">{count}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:right-5 md:right-8">
            <button
              type="button"
              aria-label="Previous reel"
              onClick={movePrev}
              disabled={currentIndex <= 0}
              className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                currentIndex <= 0
                  ? "cursor-not-allowed border-white/10 bg-white/5 text-white/28"
                  : "border-white/25 bg-black/45 text-white hover:bg-black/60"
              }`}
            >
              <ChevronUpIcon size={21} />
            </button>
            <button
              type="button"
              aria-label="Next reel"
              onClick={moveNext}
              disabled={currentIndex >= maxIndex}
              className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                currentIndex >= maxIndex
                  ? "cursor-not-allowed border-white/10 bg-white/5 text-white/28"
                  : "border-white/25 bg-black/45 text-white hover:bg-black/60"
              }`}
            >
              <ChevronDownIcon size={21} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.location.assign("https://imchloekang.com")}
            className="absolute bottom-5 right-4 z-20 rounded-full border border-white/20 bg-[#f8f8f8] px-4 py-2 text-xs font-semibold text-[#121212] shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:bg-white sm:bottom-7 sm:right-6 md:right-9"
          >
            Return to Candy Castle
          </button>
        </section>
      </div>
      <style jsx global>{`
        .reelsInstaHost {
          overflow: hidden;
        }
        .reelsInstaHost,
        .reelsInstaHost .instagram-media {
          background: #000 !important;
        }
        .reelsInstaHost .instagram-media {
          margin: 0 !important;
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          background: #000 !important;
          border: 0 !important;
          box-shadow: none !important;
        }
        .reelsInstaHost iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: 0 0 0 3px #000 !important;
          transform-origin: top center !important;
          transform: scale(var(--ig-embed-scale, 1.16)) !important;
          background: #000 !important;
        }
      `}</style>
    </main>
  );
}
