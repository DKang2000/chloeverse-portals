"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HOME_PORTALS } from "@/lib/mobile-content";

type MobileHomeExperienceProps = {
  titleFontClassName: string;
  monoFontClassName: string;
};

const ITEM_HEIGHT = 124;

export function MobileHomeExperience({
  titleFontClassName,
  monoFontClassName,
}: MobileHomeExperienceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const nextIndex = Number(visible.target.getAttribute("data-index") ?? "0");
        setActiveIndex(nextIndex);
      },
      {
        root,
        threshold: [0.55, 0.7, 0.85],
      },
    );

    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  const topPad = useMemo(() => `calc(24svh - ${ITEM_HEIGHT / 2}px)`, []);

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#040611] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(116,150,255,0.28),rgba(5,7,17,0)_34%),radial-gradient(circle_at_50%_80%,rgba(0,220,255,0.12),rgba(4,6,17,0)_30%),linear-gradient(180deg,#0c1122_0%,#070912_42%,#03050c_100%)]" />
        <div className="absolute left-1/2 top-[11%] h-44 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.34),rgba(199,225,255,0.08)_40%,rgba(255,255,255,0)_70%)] blur-2xl" />
        <div className="absolute inset-x-6 top-[8%] h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="chv-filmgrain absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.4rem)]">
        <section className="pointer-events-none pt-5 text-center">
          <div className="relative mx-auto max-w-xs">
            <div className={`absolute inset-x-0 top-0 text-[2.8rem] leading-[0.9] text-cyan-100/14 blur-lg ${titleFontClassName}`}>
              The Chloeverse
            </div>
            <div className={`relative text-[2.8rem] leading-[0.9] tracking-[-0.07em] text-white drop-shadow-[0_0_20px_rgba(210,230,255,0.2)] ${titleFontClassName}`}>
              The Chloeverse
            </div>
          </div>
          <div className={`mt-5 space-y-1 text-[0.68rem] uppercase tracking-[0.34em] text-white/64 ${monoFontClassName}`}>
            <p>where storytelling meets tomorrow</p>
            <p>a living archive of projects, collaborations, work, and signals</p>
            <p>scroll to enter</p>
          </div>
        </section>

        <div
          ref={containerRef}
          className="chv-hide-scrollbar mt-8 flex-1 snap-y snap-mandatory overflow-y-auto"
          style={{ paddingTop: topPad, paddingBottom: topPad }}
          aria-label="Portal navigation"
        >
          <div className="mx-auto flex max-w-sm flex-col gap-5">
            {HOME_PORTALS.map((item, index) => {
              const active = index === activeIndex;
              const cardClassName = [
                "group relative snap-center overflow-hidden rounded-[2rem] border px-5 py-6 transition duration-300",
                active
                  ? "scale-[1.02] border-white/24 bg-white/14 shadow-[0_18px_55px_rgba(112,152,255,0.26)]"
                  : "border-white/10 bg-white/[0.06]",
                item.mobileEnabled ? "" : "opacity-72",
              ].join(" ");

              const cardContent = (
                <>
                  <div className="chv-glass-sheen absolute inset-0 rounded-[inherit]" />
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-[0.68rem] uppercase tracking-[0.32em] ${active ? "text-cyan-100/80" : "text-white/44"} ${monoFontClassName}`}>
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h2 className="mt-2 font-[var(--font-head)] text-[1.45rem] tracking-[-0.06em] text-white">
                        {item.label}
                      </h2>
                      <p className="mt-1 text-sm text-white/62">{item.subtitle}</p>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/25 text-white/76">
                      <span className="text-lg leading-none">{item.mobileEnabled ? "↗" : "Lock"}</span>
                    </div>
                  </div>
                </>
              );

              if (item.mobileEnabled) {
                return (
                  <Link
                    key={item.href}
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    href={item.href}
                    data-index={index}
                    aria-current={active ? "true" : undefined}
                    onPointerDown={() => setActiveIndex(index)}
                    className={cardClassName}
                  >
                    {cardContent}
                  </Link>
                );
              }

              return (
                <div
                  key={item.href}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  data-index={index}
                  className={cardClassName}
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
