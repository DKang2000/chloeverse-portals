"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { MobileLiquidChromeShader } from "@/components/mobile/home/MobileLiquidChromeShader";
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
  const extrusionLayers = Array.from({ length: 4 }, (_, index) => index);

  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={
        reducedMotion
          ? undefined
          : {
              opacity: [1, 1, 0.18, 1, 0.08, 1],
              y: [0, 0, 1.5, 0, 1, 0],
              filter: [
                "blur(0px)",
                "blur(0px)",
                "blur(1.2px)",
                "blur(0px)",
                "blur(1.6px)",
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
      className="relative block pb-1"
    >
      <span className="pointer-events-none absolute inset-0 [transform-style:preserve-3d]">
        {extrusionLayers.map((layer) => (
          <span
            key={`${text}-${layer}`}
            className="chv-mobile-signal-title absolute inset-0 text-[#11141b]"
            style={{
              transform: `translate3d(${layer * 1.2}px, ${layer * 1.6}px, 0)`,
              opacity: Math.max(0.28, 0.86 - layer * 0.14),
              textShadow:
                layer === extrusionLayers.length - 1
                  ? `0 10px 18px rgba(0,0,0,0.34), 0 0 14px ${accent}18`
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
                opacity: [0.08, 0.18, 0.1],
                x: [-1.5, 1.5, -1.5],
              }
        }
        transition={{
          duration: 6.5,
          delay,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="chv-mobile-signal-title absolute inset-0 text-white/18 blur-[1px]"
      >
        {text}
      </motion.span>

      <span
        className="chv-mobile-signal-title relative block bg-[linear-gradient(180deg,#fcfeff_0%,#f1f6fb_24%,#cad2de_56%,#7b8697_100%)] bg-clip-text text-transparent"
        style={{
          textShadow: `0 1px 0 rgba(255,255,255,0.16), 0 12px 24px rgba(0,0,0,0.28), 0 0 12px ${accent}14`,
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
  onReady,
}: {
  accent: string;
  reducedMotion: boolean;
  onReady?: () => void;
}) {
  return (
    <div className="chv-mobile-liquid-metal absolute inset-0 overflow-hidden">
      <MobileLiquidChromeShader accent={accent} reducedMotion={reducedMotion} onReady={onReady} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,2,4,0.38)_0%,rgba(1,2,4,0.44)_42%,rgba(1,2,4,0.62)_100%)]" />
      <div className="chv-mobile-liquid-metal__iridescence" />
      <div className="chv-mobile-liquid-metal__ripple" />
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.08, 0.16, 0.1],
                scale: [1, 1.12, 1.05],
                x: [0, 24, -10],
                y: [0, 18, -12],
              }
        }
        transition={{ duration: 7.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-1/2 top-[12%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}44 0%, transparent 66%)` }}
      />
      <div className="chv-mobile-liquid-metal__vignette absolute inset-0" />
    </div>
  );
}

function MobileLandingLoader({
  accent,
  visible,
}: {
  accent: string;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="mobile-landing-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.09),rgba(4,5,8,0.88)_42%,rgba(2,3,6,0.98)_100%)]"
        >
          <motion.div
            animate={{ scale: [0.985, 1.015, 0.985], opacity: [0.94, 1, 0.94] }}
            transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-black/20 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute inset-[10px] rounded-full border border-white/10"
              style={{
                background: `conic-gradient(from 40deg, transparent 0deg, ${accent}66 70deg, rgba(255,255,255,0.65) 130deg, transparent 220deg, rgba(150,220,255,0.3) 300deg, transparent 360deg)`,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 28px ${accent}22`,
              }}
            />
            <div className="absolute inset-[24px] rounded-full border border-white/8 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.16)_100%)]" />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute inset-[18px] rounded-full"
            >
              <span
                className="absolute left-1/2 top-0 block h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/15"
                style={{
                  background: `radial-gradient(circle, ${accent}dd 0%, ${accent}55 40%, transparent 72%)`,
                  boxShadow: `0 0 24px ${accent}88`,
                }}
              />
            </motion.div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.22),rgba(255,255,255,0.04)_44%,rgba(0,0,0,0.26)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_22px_rgba(255,255,255,0.08)]">
              <span className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.34em] text-white/72">
                tune
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MobileHomeExperience(_: MobileHomeExperienceProps) {
  void _.titleFontClassName;
  void _.monoFontClassName;
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [shaderReady, setShaderReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

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

  useEffect(() => {
    let cancelled = false;

    const fontPromise =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();
    const loadPromise =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            window.addEventListener("load", () => resolve(), { once: true });
          });

    Promise.all([fontPromise, loadPromise, new Promise((resolve) => window.setTimeout(resolve, 320))]).then(
      () => {
        if (!cancelled) {
          setAssetsReady(true);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assetsReady || !shaderReady) return;

    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [assetsReady, shaderReady]);

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
          <MobileLiquidChromeField
            accent={activePortal.accent}
            reducedMotion={Boolean(reducedMotion)}
            onReady={() => setShaderReady(true)}
          />
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
                          rotateX: active ? 16 : 4,
                          rotateY: active ? 0 : index < activeIndex ? -8 : 8,
                          y: active ? -12 : 4,
                          z: active ? 18 : -4,
                          scale: active ? 1.04 : 0.955,
                          opacity: active ? 1 : 0.8,
                        }
                  }
                  whileTap={reducedMotion ? undefined : { scale: 0.99, y: -6, rotateX: 10 }}
                  transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.7 }}
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
                  <div className="chv-mobile-signal-card__shine absolute inset-[1px] rounded-[calc(2rem-1px)]" />
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
                    <motion.span
                      className="mt-4 block h-9 w-9 rounded-full border border-white/10"
                      animate={
                        reducedMotion
                          ? undefined
                          : {
                              scale: active ? [1, 1.08, 1] : 1,
                              boxShadow: active
                                ? [
                                    `0 0 0px ${item.accent}00`,
                                    `0 0 22px ${item.accent}55`,
                                    `0 0 12px ${item.accent}30`,
                                  ]
                                : `0 0 0px ${item.accent}00`,
                            }
                      }
                      transition={{ duration: 1.8, repeat: active ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${item.accent}dd 0%, ${item.accent}55 34%, transparent 62%)`,
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
      <MobileLandingLoader accent={activePortal.accent} visible={showLoader} />
    </MobileRouteFrame>
  );
}
