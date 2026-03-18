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

function MobileSignalWord({
  text,
  accent,
  reducedMotion,
  delay = 0,
}: {
  text: string;
  accent: string;
  reducedMotion: boolean;
  delay?: number;
}) {
  const extrusionLayers = Array.from({ length: 6 }, (_, index) => index);

  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, filter: "blur(8px)" }}
      animate={
        reducedMotion
          ? undefined
          : {
              opacity: [1, 1, 0.12, 1, 0.04, 1],
              filter: [
                "blur(0px)",
                "blur(0px)",
                "blur(1.6px)",
                "blur(0px)",
                "blur(2px)",
                "blur(0px)",
              ],
            }
      }
      transition={{
        duration: 8.5,
        times: [0, 0.18, 0.24, 0.62, 0.68, 1],
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
      className="relative block"
    >
      <span className="pointer-events-none absolute inset-0 [transform-style:preserve-3d]">
        {extrusionLayers.map((layer) => (
          <span
            key={`${text}-${layer}`}
            className="chv-mobile-signal-title absolute inset-0 text-[#090b10]"
            style={{
              transform: `translate3d(${layer * 0.7}px, ${layer * 1.15}px, 0)`,
              opacity: Math.max(0.2, 0.9 - layer * 0.12),
              textShadow:
                layer === extrusionLayers.length - 1
                  ? `0 12px 24px rgba(0,0,0,0.42), 0 0 18px ${accent}22`
                  : undefined,
            }}
            aria-hidden="true"
          >
            {text}
          </span>
        ))}
      </span>

      <motion.span
        aria-hidden="true"
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.16, 0.28, 0.16],
                x: [-2, 2, -2],
              }
        }
        transition={{
          duration: 5.5,
          delay,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="chv-mobile-signal-title absolute inset-0 text-white/24 blur-[1.6px]"
      >
        {text}
      </motion.span>

      <span
        className="chv-mobile-signal-title relative block bg-[linear-gradient(180deg,#fffdfa_0%,#f2eee7_38%,#bfc6d2_76%,#7f8898_100%)] bg-clip-text text-transparent"
        style={{
          textShadow: `0 1px 0 rgba(255,255,255,0.16), 0 18px 34px rgba(0,0,0,0.34), 0 0 18px ${accent}1c`,
        }}
      >
        {text}
      </span>
    </motion.span>
  );
}

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
          <pattern
            id="chv-metal-bands"
            height="34"
            patternTransform="rotate(22)"
            patternUnits="userSpaceOnUse"
            width="34"
          >
            <rect fill="#050607" height="34" width="34" />
            <rect fill="#f4f4f4" height="34" opacity="0.96" width="6" x="0" />
            <rect fill="#a7a7ac" height="34" opacity="0.72" width="4" x="6" />
            <rect fill="#1a1b1f" height="34" opacity="0.98" width="7" x="10" />
            <rect fill="#d7d8db" height="34" opacity="0.84" width="5" x="17" />
            <rect fill="#0a0b0d" height="34" opacity="0.98" width="6" x="22" />
            <rect fill="#ececee" height="34" opacity="0.92" width="6" x="28" />
          </pattern>
          <linearGradient id="chv-metal-sweep" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#040506" />
            <stop offset="16%" stopColor="#d7d8db" />
            <stop offset="30%" stopColor="#141518" />
            <stop offset="48%" stopColor="#f6f6f6" />
            <stop offset="66%" stopColor="#090a0c" />
            <stop offset="84%" stopColor="#c8c9cd" />
            <stop offset="100%" stopColor="#050607" />
          </linearGradient>
          <linearGradient id="chv-iridescent-flow" x1="0%" x2="100%" y1="10%" y2="90%">
            <stop offset="0%" stopColor="#6fb9ff" stopOpacity="0" />
            <stop offset="22%" stopColor="#6fb9ff" stopOpacity="0.42" />
            <stop offset="44%" stopColor="#ffd6aa" stopOpacity="0.28" />
            <stop offset="66%" stopColor="#d8a6ff" stopOpacity="0.34" />
            <stop offset="84%" stopColor="#6cffd8" stopOpacity="0.26" />
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
              baseFrequency="0.012 0.032"
              numOctaves="3"
              result="noise"
              seed="7"
              type="turbulence"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="baseFrequency"
                  dur="10s"
                  repeatCount="indefinite"
                  values="0.012 0.032;0.017 0.05;0.011 0.026;0.012 0.032"
                />
              )}
            </feTurbulence>
            <feGaussianBlur in="noise" result="noiseSoft" stdDeviation="0.3" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noiseSoft"
              result="displaced"
              scale="62"
              xChannelSelector="R"
              yChannelSelector="B"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="scale"
                  dur="8s"
                  repeatCount="indefinite"
                  values="48;78;56;48"
                />
              )}
            </feDisplacementMap>
            <feSpecularLighting
              in="noiseSoft"
              lightingColor="#ffffff"
              result="specular"
              specularConstant="1.4"
              specularExponent="28"
              surfaceScale="10"
            >
              <fePointLight x="42" y="-18" z="118" />
            </feSpecularLighting>
            <feComposite in="specular" in2="displaced" operator="in" result="litMetal" />
            <feBlend in="displaced" in2="litMetal" mode="screen" result="brightened" />
            <feGaussianBlur in="brightened" result="softened" stdDeviation="0.5" />
            <feColorMatrix
              in="softened"
              type="matrix"
              values="1.34 0 0 0 0  0 1.34 0 0 0  0 0 1.34 0 0  0 0 0 1 0"
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
              baseFrequency="0.016 0.024"
              numOctaves="2"
              result="noise"
              seed="11"
              type="fractalNoise"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="baseFrequency"
                  dur="12s"
                  repeatCount="indefinite"
                  values="0.016 0.024;0.022 0.03;0.014 0.02;0.016 0.024"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="56"
              xChannelSelector="G"
              yChannelSelector="R"
            >
              {reducedMotion ? null : (
                <animate
                  attributeName="scale"
                  dur="9s"
                  repeatCount="indefinite"
                  values="40;64;46;40"
                />
              )}
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>

        <rect fill="#040507" height="170" width="100" />
        <g filter="url(#chv-liquid-chrome)" opacity="0.58">
          <rect fill="url(#chv-metal-bands)" height="170" width="100" x="0" y="0" />
          <rect fill="url(#chv-metal-sweep)" height="170" opacity="0.66" width="100" x="0" y="0" />
        </g>

        <g filter="url(#chv-liquid-color)" opacity="0.34">
          <rect fill="url(#chv-iridescent-flow)" height="170" width="100">
            {reducedMotion ? null : (
              <animateTransform
                attributeName="transform"
                dur="9s"
                repeatCount="indefinite"
                type="translate"
                values="-10 0; 12 6; -6 10; -10 0"
              />
            )}
          </rect>
        </g>
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,7,0.22)_0%,rgba(2,3,5,0.34)_38%,rgba(2,2,4,0.54)_100%)]" />
      <div className="chv-mobile-liquid-metal__iridescence" />
      <div className="chv-mobile-liquid-metal__ripple" />
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.14, 0.28, 0.16],
                scale: [1, 1.14, 1.06],
                x: [0, 28, -12],
                y: [0, 30, -16],
              }
        }
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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
      contentClassName="h-[100svh] !px-0 !pb-0 !pt-0"
      ambient={
        <>
          <MobileLiquidChromeField accent={activePortal.accent} reducedMotion={Boolean(reducedMotion)} />
        </>
      }
    >
      <div
        className="relative flex min-h-0 flex-col overflow-hidden"
        style={{
          height: "100svh",
          paddingTop: "env(safe-area-inset-top,0px)",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[6.35rem] z-0 h-[16rem] w-[23rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle at 50% 34%, color-mix(in srgb, ${activePortal.accent} 18%, rgba(255,255,255,0.12)) 0%, rgba(255,255,255,0.05) 28%, rgba(255,255,255,0) 72%)`,
          }}
        />

        <section className="relative z-10 shrink-0 pt-5 text-center">
          <div className="relative mx-auto max-w-[17.2rem]">
            <motion.div
              aria-hidden="true"
              animate={reducedMotion ? undefined : { opacity: [0.18, 0.28, 0.18], scale: [1, 1.04, 1] }}
              transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="absolute inset-x-6 top-3 h-20 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${activePortal.accent}36 0%, rgba(255,255,255,0.08) 34%, transparent 72%)` }}
            />
            <div className="relative [perspective:1200px]">
              <h1 className="relative text-[2.48rem] leading-[0.86] tracking-[0.02em] sm:text-[2.94rem]">
                <MobileSignalWord
                  text="The"
                  accent={activePortal.accent}
                  reducedMotion={Boolean(reducedMotion)}
                />
                <MobileSignalWord
                  text="Chloeverse"
                  accent={activePortal.accent}
                  reducedMotion={Boolean(reducedMotion)}
                  delay={0.3}
                />
              </h1>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-[18rem] space-y-2">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="chv-mobile-signal-title text-[0.8rem] leading-6 tracking-[0.08em] text-white/72"
            >
              where storytelling meets tomorrow
            </motion.p>
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="chv-mobile-signal-title pt-1 text-[0.52rem] uppercase tracking-[0.18em] text-white/42"
            >
              scroll to enter
            </motion.p>
          </div>
        </section>

        <section className="relative z-10 mt-4 min-h-0 flex-1">
          <div
            ref={containerRef}
            className="chv-hide-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto"
            style={{
              paddingTop: "0.4rem",
              paddingBottom: "1.4rem",
            }}
            aria-label="Portal navigation"
          >
            <div className="mx-auto flex max-w-sm flex-col gap-4 pb-2">
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
      </div>
    </MobileRouteFrame>
  );
}
