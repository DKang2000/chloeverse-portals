"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { HOME_PORTALS } from "@/lib/mobile-content";

type MobileHomeExperienceProps = {
  titleFontClassName?: string;
  monoFontClassName?: string;
};

const ITEM_HEIGHT = 132;

function MobileLiquidChromeField({
  accent,
  reducedMotion,
}: {
  accent: string;
  reducedMotion: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#05070a_0%,#030406_44%,#020205_100%)]" />
      <svg
        aria-hidden="true"
        className="absolute inset-[-8%] h-[116%] w-[116%] opacity-[0.62]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 100 170"
      >
        <defs>
          <linearGradient id="chv-metal-base" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#040506" />
            <stop offset="24%" stopColor="#d9d9d9" />
            <stop offset="42%" stopColor="#111214" />
            <stop offset="62%" stopColor="#f4f4f4" />
            <stop offset="82%" stopColor="#050607" />
            <stop offset="100%" stopColor="#d8d8d8" />
          </linearGradient>
          <linearGradient id="chv-iridescent-flow" x1="0%" x2="100%" y1="10%" y2="90%">
            <stop offset="0%" stopColor="#6fb9ff" stopOpacity="0" />
            <stop offset="24%" stopColor="#6fb9ff" stopOpacity="0.34" />
            <stop offset="46%" stopColor="#ffd6aa" stopOpacity="0.2" />
            <stop offset="68%" stopColor="#d8a6ff" stopOpacity="0.28" />
            <stop offset="84%" stopColor="#6cffd8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6cffd8" stopOpacity="0" />
          </linearGradient>
          <filter
            id="chv-liquid-chrome"
            colorInterpolationFilters="sRGB"
            height="140%"
            width="140%"
            x="-20%"
            y="-20%"
          >
            <feTurbulence
              baseFrequency="0.014 0.008"
              numOctaves="2"
              result="noise"
              seed="7"
              type="fractalNoise"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="baseFrequency"
                  dur="24s"
                  repeatCount="indefinite"
                  values="0.014 0.008;0.02 0.012;0.016 0.007;0.014 0.008"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              result="displaced"
              scale="34"
              xChannelSelector="R"
              yChannelSelector="B"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="scale"
                  dur="18s"
                  repeatCount="indefinite"
                  values="28;42;34;28"
                />
              )}
            </feDisplacementMap>
            <feGaussianBlur in="displaced" result="softened" stdDeviation="0.65" />
            <feColorMatrix
              in="softened"
              type="matrix"
              values="1.18 0 0 0 0  0 1.18 0 0 0  0 0 1.18 0 0  0 0 0 1 0"
            />
          </filter>
          <filter
            id="chv-liquid-color"
            colorInterpolationFilters="sRGB"
            height="140%"
            width="140%"
            x="-20%"
            y="-20%"
          >
            <feTurbulence
              baseFrequency="0.01 0.016"
              numOctaves="2"
              result="noise"
              seed="11"
              type="fractalNoise"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="baseFrequency"
                  dur="26s"
                  repeatCount="indefinite"
                  values="0.01 0.016;0.014 0.02;0.011 0.014;0.01 0.016"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="42"
              xChannelSelector="G"
              yChannelSelector="R"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="scale"
                  dur="20s"
                  repeatCount="indefinite"
                  values="34;48;38;34"
                />
              )}
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        <rect fill="#040507" height="170" width="100" />
        <g filter="url(#chv-liquid-chrome)" opacity="0.58">
          <ellipse cx="12" cy="14" fill="url(#chv-metal-base)" rx="16" ry="22" transform="rotate(-14 12 14)" />
          <ellipse cx="34" cy="26" fill="url(#chv-metal-base)" rx="18" ry="16" transform="rotate(12 34 26)" />
          <ellipse cx="68" cy="18" fill="url(#chv-metal-base)" rx="16" ry="20" transform="rotate(-18 68 18)" />
          <ellipse cx="86" cy="42" fill="url(#chv-metal-base)" rx="18" ry="18" transform="rotate(8 86 42)" />
          <ellipse cx="22" cy="64" fill="url(#chv-metal-base)" rx="22" ry="18" transform="rotate(20 22 64)" />
          <ellipse cx="52" cy="60" fill="url(#chv-metal-base)" rx="16" ry="22" transform="rotate(-12 52 60)" />
          <ellipse cx="78" cy="78" fill="url(#chv-metal-base)" rx="22" ry="18" transform="rotate(14 78 78)" />
          <ellipse cx="14" cy="108" fill="url(#chv-metal-base)" rx="18" ry="24" transform="rotate(-8 14 108)" />
          <ellipse cx="46" cy="102" fill="url(#chv-metal-base)" rx="22" ry="18" transform="rotate(6 46 102)" />
          <ellipse cx="72" cy="122" fill="url(#chv-metal-base)" rx="20" ry="20" transform="rotate(-20 72 122)" />
          <ellipse cx="26" cy="146" fill="url(#chv-metal-base)" rx="20" ry="16" transform="rotate(14 26 146)" />
          <ellipse cx="84" cy="150" fill="url(#chv-metal-base)" rx="18" ry="22" transform="rotate(-6 84 150)" />
        </g>

        <g filter="url(#chv-liquid-color)" opacity="0.24">
          <rect fill="url(#chv-iridescent-flow)" height="170" width="100">
            {reducedMotion ? null : (
              <animateTransform
                attributeName="transform"
                dur="26s"
                repeatCount="indefinite"
                type="translate"
                values="-6 0; 8 4; -4 8; -6 0"
              />
            )}
          </rect>
        </g>
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,7,0.3)_0%,rgba(2,3,5,0.46)_38%,rgba(2,2,4,0.68)_100%)]" />
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.08, 0.18, 0.1],
                scale: [1, 1.08, 1.02],
                x: [0, 18, -8],
                y: [0, 22, -12],
              }
        }
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-1/2 top-[12%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}88 0%, transparent 66%)` }}
      />
      <div className="chv-mobile-liquid-metal__vignette absolute inset-0" />
    </div>
  );
}

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
          <MobileLiquidChromeField accent={activePortal.accent} reducedMotion={Boolean(reducedMotion)} />
        </>
      }
    >
      <section className="pt-7 text-center">
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

        <div className="mx-auto mt-5 max-w-[20rem] space-y-2">
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

      <section className="relative mt-5">
        <div
          ref={containerRef}
          className="chv-hide-scrollbar relative z-10 h-[51svh] snap-y snap-mandatory overflow-y-auto"
          style={{
            paddingTop: `calc(15svh - ${ITEM_HEIGHT / 2}px)`,
            paddingBottom: `calc(13svh - ${ITEM_HEIGHT / 2}px)`,
            WebkitMaskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 79%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%)",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 79%, rgba(0,0,0,0.2) 92%, rgba(0,0,0,0) 100%)",
          }}
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
