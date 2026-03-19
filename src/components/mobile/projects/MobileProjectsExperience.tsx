"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import {
  PROJECT_REELS,
  formatProjectIndex,
  getProjectPathLabel,
  getProjectPermalinkToken,
  getProjectReelKind,
} from "@/lib/mobile-content";

const ACCENT = "#eab0a4";

export function MobileProjectsExperience() {
  return (
    <MobileRouteFrame
      currentPath="/projects"
      eyebrow="Projects"
      title="Projects"
      description="Published cuts and original source links."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,220,212,0.18),transparent_26%),radial-gradient(circle_at_82%_24%,rgba(176,196,255,0.14),transparent_24%),radial-gradient(circle_at_48%_82%,rgba(234,176,164,0.16),transparent_32%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),transparent_16%,rgba(255,255,255,0.02)_48%,transparent_72%)]" />
        </>
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8">
        <div className="relative max-w-[18rem]">
          <div className="absolute -left-2 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_62%)] blur-2xl" />
          <p className="relative chv-mobile-body text-[0.78rem] italic tracking-[0.03em] text-white/48">
            studio drift
          </p>
          <h1 className="relative chv-mobile-display mt-4 text-[4.15rem] leading-[0.78] tracking-[-0.09em] text-[#fff6f0]">
            things
            <span className="ml-10 block text-[3.2rem] text-[#ffe4d9]">i&apos;ve made</span>
          </h1>
          <p className="relative mt-5 max-w-[15rem] text-[1rem] leading-8 text-white/64">
            More like a creative table than a feed: loose frames, source cuts, and pieces still connected to where they first went live.
          </p>
        </div>

        <div className="relative mt-9 h-[17rem]">
          <div className="absolute left-2 top-7 h-40 w-[11rem] rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] shadow-[0_26px_70px_rgba(0,0,0,0.24)] backdrop-blur-[18px]" />
          <div className="absolute left-8 top-12 h-40 w-[11rem] rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(40,22,24,0.82),rgba(16,12,17,0.9))]" />
          <div className="absolute left-36 top-0 h-20 w-24 rotate-[-10deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))]" />
          <div className="absolute left-20 top-28 h-24 w-[13rem] rounded-[999px] bg-[radial-gradient(circle_at_28%_32%,rgba(255,224,216,0.42),rgba(255,255,255,0.02)_58%,transparent_80%)] blur-sm" />
          <div className="absolute right-0 top-9 max-w-[10.5rem] border-l border-white/14 pl-4">
            <p className="chv-mobile-body text-[0.65rem] italic tracking-[0.04em] text-white/42">
              the work arrives as moving studies
            </p>
            <p className="mt-3 text-sm leading-6 text-white/62">
              source-first, with the fragments and labels drifting around the image instead of trapping it in a card.
            </p>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 space-y-14"
      >
        {PROJECT_REELS.map((reel, index) => (
          <ProjectFragment key={reel.id} index={index} permalink={reel.permalink} user={reel.user} />
        ))}
      </motion.section>
    </MobileRouteFrame>
  );
}

function ProjectFragment({
  index,
  permalink,
  user,
}: {
  index: number;
  permalink: string;
  user: string;
}) {
  const token = getProjectPermalinkToken(permalink);
  const even = index % 2 === 0;

  return (
    <article className="relative">
      <div
        className="relative min-h-[22rem]"
        style={{ marginLeft: even ? "0px" : "26px", marginRight: even ? "20px" : "0px" }}
      >
        <div
          className="absolute top-3 h-[14.5rem] w-[82%] rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]"
          style={{ left: even ? "0px" : "auto", right: even ? "auto" : "0px" }}
        />
        <div
          className="absolute top-7 h-[14.5rem] w-[82%] overflow-hidden rounded-[2.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(28,17,19,0.94),rgba(12,10,13,0.96))]"
          style={{
            left: even ? "1rem" : "auto",
            right: even ? "auto" : "1rem",
            transform: `rotate(${even ? "-1.6deg" : "1.6deg"})`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_74%_76%,rgba(234,176,164,0.22),transparent_26%)]" />
          <div className="absolute left-6 top-6 text-[0.58rem] uppercase tracking-[0.26em] text-white/34">
            live fragment
          </div>
          <div className="absolute right-6 top-6 text-[0.58rem] uppercase tracking-[0.26em] text-white/28">
            @{user}
          </div>
          <div className="absolute left-6 top-16 h-16 w-24 rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.04))]" />
          <div className="absolute left-14 top-36 h-10 w-28 rounded-full bg-[linear-gradient(90deg,rgba(255,215,202,0.4),rgba(255,255,255,0.04))]" />
          <div className="absolute bottom-6 right-6 max-w-[10rem] text-right">
            <p className="chv-mobile-display break-all text-[1.75rem] leading-[0.9] tracking-[-0.06em] text-[#fff1e8]">
              {token.slice(0, 8)}
            </p>
          </div>
        </div>

        <div
          className="absolute top-0 h-14 w-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]"
          style={{
            left: even ? "62%" : "10%",
            transform: `rotate(${even ? "-10deg" : "14deg"})`,
          }}
        />

        <div
          className="absolute top-[12rem] max-w-[10rem]"
          style={{ left: even ? "58%" : "0px", right: even ? "0px" : "58%" }}
        >
          <p className="chv-mobile-body text-[0.65rem] italic tracking-[0.04em] text-white/42">
            study {formatProjectIndex(index)}
          </p>
          <h2 className="chv-mobile-display mt-3 text-[2.15rem] leading-[0.9] tracking-[-0.06em] text-[#fff5ef]">
            {getProjectReelKind(permalink)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/58">{getProjectPathLabel(permalink)}</p>
        </div>

        <div
          className="absolute bottom-0 max-w-[12rem] border-l border-white/12 pl-4"
          style={{ left: even ? "0px" : "auto", right: even ? "auto" : "0px" }}
        >
          <Link
            href={permalink}
            target="_blank"
            rel="noreferrer noopener"
            className="chv-mobile-display block text-[1.3rem] leading-[0.95] tracking-[-0.05em] text-[#fff4ec]"
          >
            open source ↗
          </Link>
          <p className="mt-2 text-sm leading-6 text-white/52">Original publication, unchanged.</p>
        </div>
      </div>
    </article>
  );
}
