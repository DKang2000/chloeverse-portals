"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MobileHoldButton } from "@/components/mobile/shared/MobileHoldButton";
import { MobileRitualSettle, useRitualReveal } from "@/components/mobile/shared/MobileRitualState";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import {
  WORK_ENTRIES,
  WORK_HIGHLIGHTS,
  WORK_INTRO_COPY,
  WORK_ROLE_STACK,
} from "@/lib/mobile-content";

const ACCENT = "#8fe7ad";

export function MobileWorkExperience() {
  const ritual = useRitualReveal(false, 700);

  const cvRows = useMemo(
    () =>
      WORK_ENTRIES.map((entry) => ({
        title: entry.title,
        date: entry.date,
        meta: [entry.location, entry.type].filter(Boolean).join(" / "),
      })),
    [],
  );

  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Working Life"
      title="Work"
      description="A quieter reading room for Chloe's work history: real roles, dates, highlights, and the path behind the Chloeverse."
      accent={ACCENT}
      ambient={
        <>
          <div className="absolute inset-y-0 right-[14%] w-px bg-[linear-gradient(180deg,transparent,rgba(135,255,184,0.34),transparent)]" />
          <div className="absolute left-[-4rem] top-[14rem] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(121,255,171,0.16),transparent_70%)] blur-3xl" />
        </>
      }
    >
      {ritual.stage === "idle" ? (
        <section className="mt-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#8fe7ad]/12 bg-[#07110c]/82 p-5 text-[#d7ffe4]">
            <div className="absolute inset-0 chv-mobile-scanlines opacity-30" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.01em] text-[#8fe7ad]/72">
                    reading room
                  </p>
                  <p className="mt-3 max-w-[16rem] text-sm leading-6 text-[#d7ffe4]/60">
                    Hold here and the work archive opens softly.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8fe7ad]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8fe7ad]/44" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8fe7ad]/22" />
                </div>
              </div>

              <div className="mt-5">
                <MobileHoldButton
                  label="Open archive"
                  hint="hold to gather"
                  accent={ACCENT}
                  onComplete={() => ritual.trigger()}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <AnimatePresence mode="wait">
        {ritual.isSettling ? (
          <MobileRitualSettle
            key="work-settle"
            accent={ACCENT}
            label="Archive opening"
            detail="Field notes, timeline entries, and highlights are settling into place."
          />
        ) : null}
      </AnimatePresence>

      {ritual.isRevealed ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-6"
        >
          <section className="relative overflow-hidden rounded-[2rem] border border-[#8fe7ad]/16 bg-[linear-gradient(180deg,rgba(12,30,20,0.96),rgba(4,10,7,0.96))] p-5 text-[#dbffe7] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="absolute inset-0 chv-mobile-scanlines opacity-24" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(143,231,173,0.12),transparent_44%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.01em] text-[#97f0b4]/76">
                  working life
                </p>
                <h2 className="chv-mobile-display mt-3 text-[2.4rem] leading-[0.88] tracking-[-0.06em] text-[#edf8f0]">
                  Chloe Kang
                </h2>
              </div>
              <div className="chv-mobile-mono text-right text-[0.52rem] uppercase tracking-[0.22em] text-[#97f0b4]/60">
                <p>node</p>
                <p className="mt-1">03</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {WORK_ROLE_STACK.map((role) => (
                <span key={role} className="chv-mobile-body border border-[#8fe7ad]/18 bg-[#132219] px-2.5 py-1 text-[0.68rem] italic tracking-[0.01em] text-[#e1ffee]/76">
                  {role}
                </span>
              ))}
            </div>
            <p className="mt-4 max-w-[18rem] text-sm leading-6 text-[#e4fced]/76">{WORK_INTRO_COPY}</p>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 backdrop-blur-[18px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(143,231,173,0.12),transparent_32%)]" />
            <div className="relative">
              <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.01em] text-[#97f0b4]/72">recent chapters</p>
              <div className="mt-4 space-y-4">
                {WORK_ENTRIES.slice(0, 3).map((entry, index) => (
                  <article
                    key={entry.title}
                    className="rounded-[1.8rem] border border-white/8 bg-black/18 p-4"
                    style={{ transform: `translateX(${index % 2 === 0 ? "0px" : "10px"})` }}
                  >
                    <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-[#8fe7ad]/68">{entry.date}</p>
                    <h3 className="chv-mobile-display mt-2 text-[1.55rem] leading-[0.94] tracking-[-0.045em] text-[#f2eee8]">
                      {entry.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/58">{entry.location}</p>
                    {entry.type ? <p className="mt-1 text-sm italic text-white/46">{entry.type}</p> : null}
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-white/74">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-black/22 p-5">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(143,231,173,0.08),rgba(143,231,173,0)_30%)]" />
            <div className="relative">
              <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.01em] text-[#97f0b4]/72">wins along the way</p>
              <div className="mt-4 grid gap-3">
                {WORK_HIGHLIGHTS.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-[#8fe7ad]/10 bg-[linear-gradient(180deg,rgba(12,24,17,0.68),rgba(5,10,7,0.72))] px-4 py-4"
                    style={{ transform: `translateX(${index % 2 === 0 ? "8px" : "-4px"})` }}
                  >
                    <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-[#8fe7ad]/56">
                      note {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#dcffe8]/78">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-5">
            <div className="relative">
              <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.01em] text-white/62">timeline</p>
              <div className="mt-4 space-y-4">
                {WORK_ENTRIES.map((entry, index) => (
                  <article key={entry.title} className="grid grid-cols-[1.9rem_1fr] gap-3">
                    <div className="flex flex-col items-center pt-2">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#8fe7ad]/45 bg-[#8fe7ad]/28" />
                      {index < WORK_ENTRIES.length - 1 ? <span className="mt-2 w-px flex-1 bg-[#8fe7ad]/18" /> : null}
                    </div>
                    <div className="rounded-[1.55rem] border border-white/8 bg-black/20 p-4">
                      <h3 className="chv-mobile-display text-[1.35rem] leading-[0.95] tracking-[-0.04em] text-[#f0ebe4]">
                        {entry.title}
                      </h3>
                      <p className="chv-mobile-body mt-2 text-[0.66rem] italic tracking-[0.01em] text-[#8fe7ad]/62">{entry.date}</p>
                      <p className="mt-2 text-sm text-white/54">{entry.location}</p>
                      {entry.type ? <p className="mt-1 text-sm italic text-white/44">{entry.type}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-black/24">
            <div className="grid grid-cols-[1.3fr_0.95fr] gap-3 border-b border-white/8 px-4 py-3">
              <span className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-white/44">role</span>
              <span className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-white/44">date</span>
            </div>
            <div className="divide-y divide-white/8">
              {cvRows.map((row) => (
                <div key={row.title} className="grid grid-cols-[1.3fr_0.95fr] gap-3 px-4 py-4">
                  <div>
                    <p className="text-sm text-[#f0ebe4]">{row.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/50">{row.meta}</p>
                  </div>
                  <p className="text-sm text-white/68">{row.date}</p>
                </div>
              ))}
            </div>
          </section>
        </motion.section>
      ) : null}
    </MobileRouteFrame>
  );
}
