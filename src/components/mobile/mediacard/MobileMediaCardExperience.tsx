"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import {
  MEDIACARD_AUDIENCE,
  MEDIACARD_COLLABS,
  MEDIACARD_METRICS,
  MEDIACARD_SERVICES,
} from "@/lib/mobile-content";

const ACCENT = "#ead8bc";

export function MobileMediaCardExperience() {
  return (
    <MobileRouteFrame
      currentPath="/mediacard"
      eyebrow="Mediacard"
      title="Mediacard"
      description="Audience, metrics, services, and partner names."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(234,216,188,0.18),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.1),transparent_22%),radial-gradient(circle_at_52%_84%,rgba(255,231,204,0.14),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),transparent_18%,rgba(255,255,255,0.02)_52%,transparent)]" />
        </>
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8">
        <div className="max-w-[17rem]">
          <p className="chv-mobile-body text-[0.78rem] italic tracking-[0.03em] text-white/48">
            prestige folio
          </p>
          <h1 className="chv-mobile-display mt-4 text-[3.95rem] leading-[0.78] tracking-[-0.09em] text-[#fff7ea]">
            mediacard
          </h1>
          <p className="mt-5 text-[1rem] leading-8 text-white/64">
            This should feel like a luxury briefing object with depth, not a stat dashboard dropped onto the page.
          </p>
        </div>

        <div className="relative mt-10 h-[18rem]">
          <div className="absolute right-2 top-3 h-[14rem] w-[14rem] rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(255,245,228,0.18),rgba(255,255,255,0.02)_42%,transparent_72%)]" />
          <div className="absolute right-[2.8rem] top-[2.8rem] h-[8.5rem] w-[8.5rem] rounded-full bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.88),rgba(234,216,188,0.38)_38%,transparent_72%)]" />
          <div className="absolute left-0 top-6 max-w-[9rem] border-l border-white/12 pl-4">
            <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.04em] text-white/42">
              one orbital hero object
            </p>
          </div>
          <div className="absolute bottom-4 left-0 h-20 w-[12rem] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-[16px]">
            <p className="chv-mobile-body text-[0.62rem] italic tracking-[0.04em] text-white/42">for brands / press / partners</p>
            <p className="mt-2 text-sm leading-6 text-white/62">numbers first, then markets, then what the collaboration actually looks like.</p>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <section className="space-y-8">
          {MEDIACARD_METRICS.map((metric, index) => (
            <article key={metric.label} className="relative" style={{ marginLeft: index % 2 === 0 ? "0px" : "28px" }}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.04em] text-white/42">{metric.label}</p>
                  <p className="chv-mobile-display mt-3 text-[3.2rem] leading-[0.84] tracking-[-0.08em] text-[#fff6e8]">
                    {metric.value}
                  </p>
                </div>
                <div className="h-[4.6rem] w-[4.6rem] rounded-full border border-white/10 bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.86),rgba(234,216,188,0.36)_36%,transparent_72%)]" />
              </div>
            </article>
          ))}
        </section>

        <section className="mt-14">
          <p className="chv-mobile-body text-[0.76rem] italic tracking-[0.03em] text-white/48">
            audience markets
          </p>
          <div className="mt-6 space-y-4">
            {MEDIACARD_AUDIENCE.map((market, index) => (
              <div key={market} className="relative" style={{ marginLeft: index % 2 === 0 ? "14px" : "52px" }}>
                <div className="absolute -left-4 top-2 h-3 w-3 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.82),rgba(234,216,188,0.34)_42%,transparent_72%)]" />
                <p className="chv-mobile-display text-[1.7rem] leading-[0.94] tracking-[-0.05em] text-[#faf1e4]">
                  {market}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 space-y-10">
          <ServiceStack title="brand partnerships" items={MEDIACARD_SERVICES.brandPartnerships} />
          <ServiceStack title="dining partnerships" items={MEDIACARD_SERVICES.diningPartnerships} />
        </section>

        <section className="mt-14">
          <p className="chv-mobile-body text-[0.76rem] italic tracking-[0.03em] text-white/48">
            selected collaborations
          </p>
          <div className="mt-6 grid gap-5">
            {MEDIACARD_COLLABS.map((brand, index) => (
              <div
                key={brand}
                className="flex items-center justify-between gap-4"
                style={{ marginLeft: index % 2 === 0 ? "0px" : "22px" }}
              >
                <p className="chv-mobile-display text-[1.95rem] leading-[0.94] tracking-[-0.06em] text-[#fbf2e4]">
                  {brand}
                </p>
                <Image
                  src={`/mediacard/logos/${brand.toLowerCase().replace(/\s+/g, "")}.png`}
                  alt={brand}
                  width={96}
                  height={34}
                  sizes="96px"
                  className="h-8 w-auto object-contain opacity-[0.88]"
                />
              </div>
            ))}
          </div>
        </section>
      </motion.section>
    </MobileRouteFrame>
  );
}

function ServiceStack({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <article>
      <h2 className="chv-mobile-display text-[2rem] leading-[0.9] tracking-[-0.06em] text-[#fff5e6]">
        {title}
      </h2>
      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <p
            key={item}
            className="max-w-[17rem] text-[1rem] leading-7 text-white/76"
            style={{ marginLeft: index % 2 === 0 ? "0px" : "14px" }}
          >
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
