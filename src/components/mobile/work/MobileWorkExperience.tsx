"use client";

import { motion } from "framer-motion";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import {
  WORK_ENTRIES,
  WORK_HIGHLIGHTS,
  WORK_INTRO_COPY,
  WORK_ROLE_STACK,
} from "@/lib/mobile-content";

const ACCENT = "#c4ead3";

export function MobileWorkExperience() {
  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Work"
      title="Work"
      description="Roles, dates, and highlights."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(196,234,211,0.16),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_50%_84%,rgba(171,231,201,0.14),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),transparent_18%,rgba(255,255,255,0.02)_52%,transparent)]" />
        </>
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8">
        <div className="max-w-[17rem]">
          <p className="chv-mobile-body text-[0.78rem] italic tracking-[0.03em] text-white/48">
            chapter file
          </p>
          <h1 className="chv-mobile-display mt-4 text-[4rem] leading-[0.78] tracking-[-0.09em] text-[#f3fbf5]">
            work
          </h1>
          <p className="mt-5 text-[1rem] leading-8 text-white/64">
            The career story needs layers too: chapter pages, margin notes, and proof instead of a flat credentials list.
          </p>
        </div>

        <div className="relative mt-10 min-h-[17rem]">
          <div className="absolute left-0 top-4 h-[13rem] w-[12.5rem] rounded-[2.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.03))] shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]" />
          <div className="absolute left-4 top-8 h-[13rem] w-[12.5rem] rounded-[2.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(17,28,21,0.96),rgba(10,14,12,0.98))] px-5 py-5">
            <p className="chv-mobile-body text-[0.62rem] italic tracking-[0.04em] text-white/42">preface</p>
            <p className="mt-4 text-[1.02rem] leading-8 text-[#effdf3]/74">{WORK_INTRO_COPY}</p>
          </div>
          <div className="absolute left-[9.8rem] top-0 h-20 w-24 rotate-[10deg] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]" />
          <div className="absolute right-0 top-5 max-w-[10rem] border-l border-white/12 pl-4">
            <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.04em] text-white/42">roles in the margins</p>
            <div className="mt-3 space-y-2">
              {WORK_ROLE_STACK.map((role) => (
                <p key={role} className="text-sm leading-6 text-white/58">
                  {role}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <section className="space-y-14">
          {WORK_ENTRIES.map((entry, index) => (
            <CareerChapter key={`${entry.title}-${entry.date}`} entry={entry} index={index} />
          ))}
        </section>

        <section className="mt-16">
          <p className="chv-mobile-body text-[0.76rem] italic tracking-[0.03em] text-white/48">
            proof marks
          </p>
          <div className="mt-6 grid gap-5">
            {WORK_HIGHLIGHTS.map((highlight, index) => (
              <div
                key={highlight}
                className="relative max-w-[15rem]"
                style={{ marginLeft: index % 2 === 0 ? "10px" : "48px" }}
              >
                <div className="absolute -left-3 top-1 h-7 w-7 rounded-full border border-white/10 bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.78),rgba(196,234,211,0.32)_34%,transparent_72%)]" />
                <p className="chv-mobile-display pl-6 text-[1.65rem] leading-[0.95] tracking-[-0.05em] text-[#eefdf2]">
                  {highlight}
                </p>
              </div>
            ))}
          </div>
        </section>
      </motion.section>
    </MobileRouteFrame>
  );
}

function CareerChapter({
  entry,
  index,
}: {
  entry: (typeof WORK_ENTRIES)[number];
  index: number;
}) {
  const even = index % 2 === 0;

  return (
    <article className="relative">
      <div className="relative min-h-[18rem]" style={{ marginLeft: even ? "0px" : "20px" }}>
        <div className="absolute left-0 top-0 h-full w-px bg-[linear-gradient(180deg,rgba(196,234,211,0.38),transparent)]" />
        <div className="pl-6">
          <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.04em] text-white/44">{entry.date}</p>
          <h2 className="chv-mobile-display mt-3 max-w-[15rem] text-[2.45rem] leading-[0.9] tracking-[-0.07em] text-[#f3efe9]">
            {entry.title}
          </h2>
          <div className="mt-3 space-y-1 text-sm leading-6 text-white/58">
            <p>{entry.location}</p>
            {entry.type ? <p className="italic text-white/42">{entry.type}</p> : null}
          </div>
        </div>

        <div
          className="absolute top-[5.5rem] w-[11rem] rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_26px_70px_rgba(0,0,0,0.2)] backdrop-blur-[16px]"
          style={{ right: even ? "0px" : "auto", left: even ? "auto" : "3rem" }}
        >
          {entry.bullets.map((bullet, bulletIndex) => (
            <p key={bullet} className={`text-sm leading-6 text-[#effdf3]/76 ${bulletIndex > 0 ? "mt-3" : ""}`}>
              {bullet}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
