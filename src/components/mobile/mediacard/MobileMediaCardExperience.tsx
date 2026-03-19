"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { MobileHoldButton } from "@/components/mobile/shared/MobileHoldButton";
import { MobileRitualSettle, useRitualReveal } from "@/components/mobile/shared/MobileRitualState";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import {
  MEDIACARD_AUDIENCE,
  MEDIACARD_COLLABS,
  MEDIACARD_METRICS,
  MEDIACARD_SERVICES,
} from "@/lib/mobile-content";

const ACCENT = "#e6cf9f";

export function MobileMediaCardExperience() {
  const ritual = useRitualReveal(false, 700);

  return (
    <MobileRouteFrame
      currentPath="/mediacard"
      eyebrow="Briefing Notes"
      title="Mediacard"
      description="A flowing brand brief carrying the same real audience, metrics, services, and partner names as the desktop media card."
      accent={ACCENT}
      ambient={
        <>
          <div className="absolute left-1/2 top-[12rem] h-48 w-48 -translate-x-1/2 rounded-full border border-[#e6cf9f]/16" />
          <div className="absolute left-1/2 top-[12rem] h-72 w-72 -translate-x-1/2 rounded-full border border-[#e6cf9f]/10" />
          <div className="absolute left-1/2 top-[12rem] h-96 w-96 -translate-x-1/2 rounded-full border border-[#e6cf9f]/6" />
          <div className="absolute left-1/2 top-[12rem] h-44 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,207,159,0.2),transparent_72%)] blur-3xl" />
        </>
      }
    >
      {ritual.stage === "idle" ? (
        <section className="mt-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/34 p-5">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_44%)]" />
            <div className="relative">
              <div className="mx-auto grid h-40 w-40 place-items-center rounded-full border border-[#e6cf9f]/14">
                <div className="grid h-24 w-24 place-items-center rounded-full border border-[#e6cf9f]/20">
                  <div className="h-14 w-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.92),rgba(230,207,159,0.52)_34%,rgba(255,255,255,0.06)_62%,transparent_80%)]" />
                </div>
              </div>
              <p className="mt-6 max-w-[17rem] text-sm leading-6 text-white/56">
                Hold and the brief opens into audience, metrics, services, and collaborations.
              </p>
              <div className="mt-5">
                <MobileHoldButton
                  label="Open the brief"
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
            key="mediacard-settle"
            accent={ACCENT}
            label="Brief opening"
            detail="Markets, metrics, services, and partner names are settling into view."
          />
        ) : null}
      </AnimatePresence>

      {ritual.isRevealed ? (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-6"
        >
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(230,207,159,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_44%)]" />
            <div className="relative">
              <div className="mx-auto grid h-40 w-40 place-items-center rounded-full border border-[#e6cf9f]/12">
                <div className="grid h-24 w-24 place-items-center rounded-full border border-[#e6cf9f]/18">
                  <div className="h-14 w-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.94),rgba(230,207,159,0.56)_34%,rgba(255,255,255,0.1)_62%,transparent_82%)]" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {["audience", "metrics", "services", "collabs"].map((section) => (
                  <span
                    key={section}
                    className="chv-mobile-body rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[0.72rem] italic tracking-[0.01em] text-white/68"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6">
            <div>
              <p className="chv-mobile-body text-[0.74rem] italic tracking-[0.01em] text-[#e6cf9f]/66">audience</p>
              <div className="mt-3 grid gap-3">
                {MEDIACARD_AUDIENCE.map((country, index) => (
                  <div
                    key={country}
                    className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-black/28 px-4 py-4"
                    style={{ transform: `translateX(${index % 2 === 0 ? "10px" : "-2px"})` }}
                  >
                    <div className="absolute left-0 top-0 h-full w-[2px] bg-[linear-gradient(180deg,rgba(230,207,159,0.86),transparent)]" />
                    <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-[#e6cf9f]/62">
                      market {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-lg text-[#f4eee6]">{country}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="chv-mobile-body text-[0.74rem] italic tracking-[0.01em] text-[#e6cf9f]/66">metrics</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {MEDIACARD_METRICS.map((metric) => (
                  <div
                    key={metric.label}
                    className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"
                  >
                    <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.01em] text-[#e6cf9f]/62">
                      {metric.label}
                    </p>
                    <p className="chv-mobile-display mt-4 text-[1.8rem] leading-[0.9] tracking-[-0.05em] text-[#f4eee6]">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="chv-mobile-body text-[0.74rem] italic tracking-[0.01em] text-[#e6cf9f]/66">services</p>
              <div className="mt-3 space-y-4">
                <article className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/26 p-5">
                  <p className="chv-mobile-body text-[0.68rem] italic tracking-[0.01em] text-[#e6cf9f]/62">
                    brand partnerships
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-white/78">
                    {MEDIACARD_SERVICES.brandPartnerships.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/26 p-5">
                  <p className="chv-mobile-body text-[0.68rem] italic tracking-[0.01em] text-[#e6cf9f]/62">
                    dining partnerships
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-white/78">
                    {MEDIACARD_SERVICES.diningPartnerships.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>

            <div>
              <p className="chv-mobile-body text-[0.74rem] italic tracking-[0.01em] text-[#e6cf9f]/66">collaborations</p>
              <div className="mt-3 grid gap-3">
                {MEDIACARD_COLLABS.map((brand) => (
                  <div
                    key={brand}
                    className="flex items-center justify-between rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-4"
                  >
                    <p className="text-lg text-[#f4eee6]">{brand}</p>
                    <Image
                      src={`/mediacard/logos/${brand.toLowerCase().replace(/\s+/g, "")}.png`}
                      alt={brand}
                      width={96}
                      height={32}
                      sizes="96px"
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </motion.section>
      ) : null}
    </MobileRouteFrame>
  );
}
