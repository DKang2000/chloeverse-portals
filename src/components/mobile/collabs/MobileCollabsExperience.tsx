"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { REELS } from "@/components/collabs/reelsData";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { getCollabMediumLabel } from "@/lib/mobile-content";

const ACCENT = "#b9c2ff";

export function MobileCollabsExperience({ skipIntro = false }: { skipIntro?: boolean }) {
  return (
    <MobileRouteFrame
      currentPath={skipIntro ? "/collabs/reels" : "/collabs"}
      eyebrow="Collabs"
      title="Collabs"
      description="Shared work and source links."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(207,214,255,0.18),transparent_26%),radial-gradient(circle_at_84%_22%,rgba(255,255,255,0.1),transparent_22%),radial-gradient(circle_at_52%_84%,rgba(150,165,255,0.14),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),transparent_18%,rgba(255,255,255,0.02)_52%,transparent)]" />
        </>
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8">
        <div className="ml-auto max-w-[17rem] text-right">
          <p className="chv-mobile-body text-[0.78rem] italic tracking-[0.03em] text-white/48">
            shared gallery
          </p>
          <h1 className="chv-mobile-display mt-4 text-[4rem] leading-[0.78] tracking-[-0.09em] text-[#f7f5ff]">
            {skipIntro ? "reels" : "collabs"}
          </h1>
          <p className="mt-5 text-[1rem] leading-8 text-white/64">
            These pieces should feel curated and hung, with labels floating around them instead of clean app chrome.
          </p>
        </div>

        <div className="relative mt-10 h-[16rem]">
          <div className="absolute right-6 top-0 h-[12rem] w-[12rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2),rgba(185,194,255,0.12)_34%,transparent_70%)] blur-sm" />
          <div className="absolute left-0 top-8 h-[11rem] w-[12.5rem] rounded-[3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] shadow-[0_28px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]" />
          <div className="absolute left-4 top-12 h-[11rem] w-[12.5rem] rounded-[3rem] border border-white/8 bg-[linear-gradient(180deg,rgba(16,20,40,0.96),rgba(8,10,18,0.98))]" />
          <div className="absolute left-16 top-[5.4rem] h-px w-[9rem] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
          <div className="absolute left-28 top-12 h-[6rem] w-[5rem] rounded-full bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.88),rgba(185,194,255,0.44)_36%,transparent_72%)]" />
          <div className="absolute right-0 top-8 max-w-[10rem] border-r border-white/12 pr-4 text-right">
            <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.04em] text-white/42">
              partner names should feel mounted in space
            </p>
            <p className="mt-3 text-sm leading-6 text-white/58">
              poster first, wall label second, source handoff last.
            </p>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 space-y-16"
      >
        {REELS.map((item, index) => (
          <PosterFragment key={item.id} title={item.title} url={item.url} index={index} />
        ))}
      </motion.section>
    </MobileRouteFrame>
  );
}

function PosterFragment({
  title,
  url,
  index,
}: {
  title: string;
  url: string;
  index: number;
}) {
  const even = index % 2 === 0;

  return (
    <article className="relative">
      <div className="relative min-h-[23rem]" style={{ marginLeft: even ? "12px" : "0px", marginRight: even ? "0px" : "24px" }}>
        <div
          className="absolute top-0 h-[15rem] w-[84%] rounded-[3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.03))] shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]"
          style={{ left: even ? "0px" : "auto", right: even ? "auto" : "0px" }}
        />
        <div
          className="absolute top-4 h-[15rem] w-[84%] overflow-hidden rounded-[3rem] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,34,0.97),rgba(6,8,16,0.98))]"
          style={{
            left: even ? "1rem" : "auto",
            right: even ? "auto" : "1rem",
            transform: `rotate(${even ? "1deg" : "-1deg"})`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_74%_76%,rgba(185,194,255,0.16),transparent_26%)]" />
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.12),transparent)]" />
          <div className="absolute inset-x-8 top-[42%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)]" />
          <div className="absolute left-5 top-5 text-[0.58rem] uppercase tracking-[0.26em] text-white/36">
            {getCollabMediumLabel(url)}
          </div>
          <div className={`absolute ${even ? "left-6" : "right-6 text-right"} bottom-8 max-w-[10rem]`}>
            <h2 className="chv-mobile-display text-[2.8rem] leading-[0.86] tracking-[-0.08em] text-[#fbf8ff]">
              {title}
            </h2>
          </div>
          <div className="absolute left-8 top-[5.5rem] h-14 w-14 rounded-full bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.88),rgba(185,194,255,0.44)_36%,transparent_72%)]" />
        </div>

        <div
          className="absolute top-[11.5rem] max-w-[10rem]"
          style={{ left: even ? "60%" : "0px", right: even ? "0px" : "60%" }}
        >
          <p className="chv-mobile-body text-[0.65rem] italic tracking-[0.04em] text-white/42">
            wall label {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/58">
            A shared piece with a direct handoff to the original source.
          </p>
        </div>

        <div
          className="absolute bottom-0 max-w-[12rem] border-l border-white/12 pl-4"
          style={{ left: even ? "0px" : "auto", right: even ? "auto" : "0px" }}
        >
          <Link
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="chv-mobile-display block text-[1.3rem] leading-[0.95] tracking-[-0.05em] text-[#f4f1ff]"
          >
            open source ↗
          </Link>
        </div>
      </div>
    </article>
  );
}
