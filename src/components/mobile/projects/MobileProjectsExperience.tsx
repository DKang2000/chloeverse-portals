"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, Heart, MessageCircle, Play, Send, Volume2, VolumeX } from "lucide-react";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { useProjectReelViewer } from "@/hooks/useProjectReelViewer";
import { PROJECT_REELS } from "@/lib/mobile-content";

const ACCENT = "#f5f5f7";

export function MobileProjectsExperience() {
  const { activeIndex, activeVideoPaused, muted, setSlideRef, setVideoRef, toggleMuted, togglePlayback } =
    useProjectReelViewer(PROJECT_REELS.length);

  return (
    <main className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_24%),linear-gradient(180deg,#191919_0%,#060606_40%,#000000_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),transparent_18%,transparent_76%,rgba(0,0,0,0.48)_100%)]" />

      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.55rem)]"
        aria-label="Projects reel controls"
      >
        <MobileRouteLink
          href="/"
          accent={ACCENT}
          label="Chloeverse"
          aria-label="Return to Chloeverse"
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md"
        >
          <span aria-hidden="true" className="text-[1.3rem] leading-none">
            &#x2039;
          </span>
        </MobileRouteLink>

        <div className="pointer-events-none text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/58">Projects</p>
          <p className="mt-1 text-[1rem] font-semibold tracking-[-0.03em] text-white">Reels</p>
        </div>

        <div className="pointer-events-none min-w-[2.25rem] text-right text-[0.78rem] font-medium text-white/72">
          {String(activeIndex + 1).padStart(2, "0")}
        </div>
      </header>

      <div className="chv-mobile-reels-feed chv-hide-scrollbar relative z-10 h-[100svh] overflow-y-auto overscroll-y-contain">
        {PROJECT_REELS.map((reel, index) => {
          const isActive = activeIndex === index;
          const mutedLabel = muted ? "Unmute reel" : "Mute reel";
          const playLabel = activeVideoPaused ? "Play reel" : "Pause reel";

          return (
            <section
              key={reel.id}
              ref={setSlideRef(index)}
              className="chv-mobile-reel-slide relative isolate"
              aria-label={`Project reel ${index + 1}`}
            >
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={reel.coverImage}
                  alt={reel.posterAlt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="chv-mobile-reel-poster object-cover"
                />
                <div className="absolute inset-0 bg-black/15" />
                <video
                  ref={setVideoRef(index)}
                  src={reel.videoSrc}
                  poster={reel.coverImage}
                  playsInline
                  loop
                  muted
                  preload={Math.abs(index - activeIndex) <= 1 ? "metadata" : "none"}
                  className="chv-mobile-reel-video absolute inset-0 h-full w-full object-cover"
                  aria-label={`Project reel ${index + 1} playback`}
                />
              </div>

              <button
                type="button"
                aria-label={playLabel}
                onClick={togglePlayback}
                className="absolute inset-0 z-10 block cursor-pointer"
              />

              <div className="chv-mobile-reel-gradient absolute inset-0 z-10" />

              <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-20 px-4">
                <div className="inline-flex items-center rounded-full bg-black/20 px-3 py-1 text-[0.72rem] font-medium text-white/88 backdrop-blur-md">
                  <span>{reel.durationLabel}</span>
                </div>
              </div>

              <aside className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-3 z-30 flex flex-col items-center gap-4">
                <ReelAction icon={<Heart size={30} strokeWidth={1.85} />} />
                <ReelAction icon={<MessageCircle size={30} strokeWidth={1.85} />} />
                <ReelAction icon={<Send size={30} strokeWidth={1.85} />} />
                <ReelAction icon={<Bookmark size={30} strokeWidth={1.85} />} />
                <button
                  type="button"
                  onClick={toggleMuted}
                  aria-label={mutedLabel}
                  className="flex flex-col items-center gap-1.5 text-white"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/34 backdrop-blur-md">
                    {muted ? <VolumeX size={26} strokeWidth={1.9} /> : <Volume2 size={26} strokeWidth={1.9} />}
                  </span>
                  <span className="text-[0.66rem] font-medium text-white/84">{muted ? "mute" : "sound"}</span>
                </button>
              </aside>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.15rem)]">
                <div className="flex items-end justify-between gap-4">
                  <div className="max-w-[74%]">
                    <div className="pointer-events-auto mt-4 flex items-center gap-3">
                      <Link
                        href={reel.instagramUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex rounded-full border border-white/14 bg-white/9 px-3.5 py-2 text-[0.76rem] font-medium text-white backdrop-blur-md"
                      >
                        open original
                      </Link>
                    </div>
                  </div>

                  <div
                    className={`pointer-events-none flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-opacity duration-200 ${
                      isActive && activeVideoPaused ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Play size={22} strokeWidth={1.9} fill="currentColor" />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function ReelAction({
  icon,
}: {
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center text-white">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/34 backdrop-blur-md">{icon}</span>
    </div>
  );
}
