"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, Heart, MessageCircle, Play, Send, Volume2, VolumeX } from "lucide-react";

import { REELS } from "@/components/collabs/reelsData";
import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { useProjectReelViewer } from "@/hooks/useProjectReelViewer";

const ACCENT = "#c2c9ff";

const COLLAB_REELS = [
  {
    username: "adobe",
    caption: "Adobe collaboration, now watchable directly inside the collabs feed with the same full-screen reel behavior as projects.",
    audioLabel: "Adobe commission",
    coverImage: "/collabs/reels/DQukZZpjrpu/cover.jpg",
    videoSrc: "/collabs/reels/DQukZZpjrpu/video.mp4",
    posterAlt: "Adobe collaboration cover.",
    durationLabel: "0:56",
    accent: "#d9e0ff",
    metrics: { likes: "brand", comments: "post", shares: "source" },
  },
  {
    username: "openai",
    caption: "OpenAI collaboration in the same swipeable, autoplaying full-screen viewer format as the mobile projects route.",
    audioLabel: "OpenAI collaboration",
    coverImage: "/collabs/reels/DUjezQzjpYx/cover.jpg",
    videoSrc: "/collabs/reels/DUjezQzjpYx/video.mp4",
    posterAlt: "OpenAI collaboration cover.",
    durationLabel: "0:49",
    accent: "#d4c4ff",
    metrics: { likes: "brand", comments: "reel", shares: "source" },
  },
  {
    username: "ume",
    caption: "Ume - Williamsburg presented with the same mobile reel-feed pacing, controls, and entry rhythm as projects.",
    audioLabel: "Dining feature",
    coverImage: "/collabs/reels/DTRjg4rkcIT/cover.jpg",
    videoSrc: "/collabs/reels/DTRjg4rkcIT/video.mp4",
    posterAlt: "Ume - Williamsburg collaboration cover.",
    durationLabel: "0:37",
    accent: "#bfe7ff",
    metrics: { likes: "venue", comments: "post", shares: "source" },
  },
  {
    username: "beautyfashion",
    caption: "Beauty/fashion collaboration, kept in the exact same reel-viewer UX rather than a separate collabs-specific interaction model.",
    audioLabel: "Beauty / fashion placement",
    coverImage: "/collabs/reels/DT14hYEDq__/cover.jpg",
    videoSrc: "/collabs/reels/DT14hYEDq__/video.mp4",
    posterAlt: "Beauty/fashion collaboration cover.",
    durationLabel: "0:35",
    accent: "#ffd9ee",
    metrics: { likes: "brand", comments: "post", shares: "source" },
  },
  {
    username: "adidas",
    caption: "Adidas collaboration surfaced in the same full-screen collabs reel feed as the rest of the partner work.",
    audioLabel: "Adidas collaboration",
    coverImage: "/collabs/reels/DPEZ7PfERdU/cover.jpg",
    videoSrc: "/collabs/reels/DPEZ7PfERdU/video.mp4",
    posterAlt: "Adidas collaboration cover.",
    durationLabel: "0:43",
    accent: "#d5ecff",
    metrics: { likes: "brand", comments: "post", shares: "source" },
  },
] as const;

const COLLAB_FEED = REELS.map((item, index) => ({
  ...item,
  ...COLLAB_REELS[index],
}));

export function MobileCollabsExperience(_: { skipIntro?: boolean }) {
  void _.skipIntro;
  const { activeIndex, activeVideoPaused, muted, setSlideRef, setVideoRef, toggleMuted, togglePlayback } =
    useProjectReelViewer(COLLAB_FEED.length);

  return (
    <main className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(194,201,255,0.12),transparent_24%),linear-gradient(180deg,#181a2a_0%,#05060d_40%,#000000_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),transparent_18%,transparent_76%,rgba(0,0,0,0.48)_100%)]" />

      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.55rem)" }}
        aria-label="Collabs reel controls"
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
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/58">Collabs</p>
          <p className="mt-1 text-[1rem] font-semibold tracking-[-0.03em] text-white">Reels</p>
        </div>

        <div className="pointer-events-none min-w-[2.25rem] text-right text-[0.78rem] font-medium text-white/72">
          {String(activeIndex + 1).padStart(2, "0")}
        </div>
      </header>

      <div className="chv-mobile-reels-feed chv-hide-scrollbar relative z-10 h-[100svh] overflow-y-auto overscroll-y-contain">
        {COLLAB_FEED.map((reel, index) => {
          const isActive = activeIndex === index;
          const mutedLabel = muted ? "Unmute reel" : "Mute reel";
          const playLabel = activeVideoPaused ? "Play reel" : "Pause reel";

          return (
            <section
              key={reel.id}
              ref={setSlideRef(index)}
              className="chv-mobile-reel-slide relative isolate"
              aria-label={`Collab reel ${index + 1}`}
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
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle_at_22%_18%, ${reel.accent}26 0%, transparent 24%), radial-gradient(circle_at_78%_18%, rgba(255,255,255,0.12), transparent 18%)`,
                  }}
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
                  aria-label={`${reel.title} reel playback`}
                />
              </div>

              <button
                type="button"
                aria-label={playLabel}
                onClick={togglePlayback}
                className="absolute inset-0 z-10 block cursor-pointer"
              />

              <div className="chv-mobile-reel-gradient absolute inset-0 z-10" />

              <div
                className="pointer-events-none absolute inset-x-0 z-20 px-4"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.75rem)" }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-[0.72rem] font-medium text-white/88 backdrop-blur-md">
                  <span>{reel.title}</span>
                  <span className="text-white/34">&bull;</span>
                  <span>{reel.durationLabel}</span>
                </div>
              </div>

              <aside
                className="pointer-events-auto absolute right-3 z-30 flex flex-col items-center gap-4"
                style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
              >
                <ReelAction icon={<Heart size={30} strokeWidth={1.85} />} label={reel.metrics.likes} />
                <ReelAction icon={<MessageCircle size={30} strokeWidth={1.85} />} label={reel.metrics.comments} />
                <ReelAction icon={<Send size={30} strokeWidth={1.85} />} label={reel.metrics.shares} />
                <ReelAction icon={<Bookmark size={30} strokeWidth={1.85} />} label="save" />
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

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.15rem)" }}
              >
                <div className="flex items-end justify-between gap-4">
                  <div className="pointer-events-auto">
                    <Link
                      href={reel.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex rounded-full border border-white/14 bg-white/9 px-3.5 py-2 text-[0.76rem] font-medium text-white backdrop-blur-md"
                    >
                      open original
                    </Link>
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
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-white">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/34 backdrop-blur-md">{icon}</span>
      <span className="text-[0.66rem] font-medium text-white/84">{label}</span>
    </div>
  );
}
