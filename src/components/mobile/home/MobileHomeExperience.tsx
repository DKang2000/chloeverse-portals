"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { HOME_PORTALS } from "@/lib/mobile-content";

type MobileHomeExperienceProps = {
  titleFontClassName?: string;
  monoFontClassName?: string;
};

const ITEM_HEIGHT = 132;

export function MobileHomeExperience(_: MobileHomeExperienceProps) {
  void _.titleFontClassName;
  void _.monoFontClassName;
  const reducedMotion = useReducedMotion();
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
        threshold: [0.42, 0.68, 0.9],
      },
    );

    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  const topPad = useMemo(() => `calc(20svh - ${ITEM_HEIGHT / 2}px)`, []);
  const activePortal = HOME_PORTALS[activeIndex] ?? HOME_PORTALS[0];

  return (
    <MobileRouteFrame
      currentPath="/"
      eyebrow="Signal Atlas"
      title="The Chloeverse"
      description=""
      accent={activePortal.accent}
      showHeader={false}
      ambient={
        <>
          <div className="chv-mobile-iridescence absolute inset-0" />
          <div className="chv-mobile-sheen-sweep" />
          <div className="chv-mobile-ripple-ring" />
          <div className="chv-mobile-ripple-ring" data-delay="2" />
          <div className="chv-mobile-ripple-ring" data-delay="3" />
          <motion.div
            animate={
              reducedMotion
                ? undefined
                : {
                    opacity: [0.18, 0.34, 0.2],
                    scale: [1, 1.08, 1.03],
                    x: [0, 8, -4],
                    y: [0, 16, -10],
                  }
            }
            transition={{ duration: 10.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute left-1/2 top-[8%] h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${activePortal.accent}88 0%, transparent 68%)` }}
          />
        </>
      }
    >
      <section className="pt-8 text-center">
        <div className="relative mx-auto max-w-sm">
          <motion.div
            animate={reducedMotion ? undefined : { opacity: [0.2, 0.34, 0.2], x: [-8, 0, -8] }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="chv-mobile-signal-title absolute inset-x-0 top-0 text-[3.3rem] font-extrabold leading-[0.82] tracking-[-0.1em] text-white/10 blur-[1.6px] sm:text-[3.7rem]"
          >
            The Chloeverse
          </motion.div>
          <motion.div
            animate={reducedMotion ? undefined : { opacity: [0.18, 0.36, 0.18], x: [10, 4, 10], y: [2, -2, 2] }}
            transition={{ duration: 7.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="chv-mobile-signal-title absolute inset-x-0 top-1 text-[3.3rem] font-bold leading-[0.82] tracking-[-0.1em] sm:text-[3.7rem]"
            style={{ color: `${activePortal.accent}55` }}
          >
            The Chloeverse
          </motion.div>
          <h1 className="chv-mobile-signal-title relative bg-[linear-gradient(180deg,#fffdf9_0%,#ebe8e2_44%,#8c96aa_100%)] bg-clip-text text-[3.3rem] font-extrabold leading-[0.82] tracking-[-0.1em] text-transparent [text-shadow:0_0_30px_rgba(255,255,255,0.06)] sm:text-[3.7rem]">
            The Chloeverse
          </h1>
        </div>

        <div className="mx-auto mt-6 max-w-[20rem] space-y-2">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="chv-mobile-body text-[1.02rem] leading-7 text-white/72"
          >
            where storytelling meets tomorrow
          </motion.p>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="chv-mobile-mono pt-1 text-[0.6rem] uppercase tracking-[0.34em] text-white/42"
          >
            scroll to enter
          </motion.p>
        </div>
      </section>

      <section className="relative mt-8">
        <div
          ref={containerRef}
          className="chv-hide-scrollbar relative z-10 h-[52svh] snap-y snap-mandatory overflow-y-auto"
          style={{ paddingTop: topPad, paddingBottom: topPad }}
          aria-label="Portal navigation"
        >
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {HOME_PORTALS.map((item, index) => {
              const active = activeIndex === index;
              const sharedClassName =
                "chv-mobile-signal-card-wrap group relative snap-center px-4 py-5 transition-transform duration-300";

              const content = (
                <motion.div
                  data-active={active}
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          rotateX: active ? 10 : 1,
                          rotateY: active ? 0 : index < activeIndex ? -5 : 5,
                          y: active ? -8 : 2,
                          scale: active ? 1.03 : 0.97,
                          opacity: active ? 1 : 0.76,
                        }
                  }
                  whileTap={reducedMotion ? undefined : { scale: 0.992, y: -4, rotateX: 7 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="chv-mobile-signal-card relative flex min-h-[112px] items-center justify-between gap-5 rounded-[2rem] border border-white/8 px-5"
                  style={
                    {
                      "--signal-accent": item.accent,
                    } as CSSProperties
                  }
                >
                  <div
                    className="absolute inset-x-6 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.accent}66, transparent)` }}
                  />
                  <div className="absolute inset-y-4 left-[2.35rem] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.26),transparent)] [transform:translateZ(18px)]" />
                  <div className="chv-mobile-signal-layer relative pl-6">
                    <p className="chv-mobile-mono text-[0.56rem] uppercase tracking-[0.3em] text-white/34">
                      {item.sigil}
                    </p>
                    <h2 className="chv-mobile-display mt-2 text-[1.66rem] leading-[0.9] tracking-[-0.06em] text-[#f5efe8]">
                      {item.label}
                    </h2>
                  </div>
                  <div className="chv-mobile-signal-layer--deep relative flex flex-col items-end">
                    <span className="chv-mobile-mono text-[0.56rem] uppercase tracking-[0.28em] text-white/34">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="mt-4 block h-9 w-9 rounded-full border border-white/10"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${item.accent}bb 0%, transparent 58%)`,
                        boxShadow: active ? `0 0 26px ${item.accent}55` : "none",
                      }}
                    />
                  </div>
                </motion.div>
              );

              return (
                <MobileRouteLink
                  key={item.href}
                  href={item.href}
                  accent={item.accent}
                  label={item.label}
                  ref={(node) => {
                    itemRefs.current[index] = node as HTMLElement | null;
                  }}
                  data-index={index}
                  aria-current={active ? "true" : undefined}
                  onPointerDown={() => setActiveIndex(index)}
                  className={sharedClassName}
                  style={{
                    transform: active ? "translateX(0px)" : `translateX(${index < activeIndex ? "-8px" : "8px"})`,
                  }}
                >
                  {content}
                </MobileRouteLink>
              );
            })}
          </div>
        </div>
      </section>
    </MobileRouteFrame>
  );
}
