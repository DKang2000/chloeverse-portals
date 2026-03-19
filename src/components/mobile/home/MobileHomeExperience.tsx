"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { MobileLiquidChromeShader } from "@/components/mobile/home/MobileLiquidChromeShader";
import { HOME_PORTALS } from "@/lib/mobile-content";

type MobileHomeExperienceProps = {
  titleFontClassName?: string;
  monoFontClassName?: string;
};

function MobileSignalWord({
  text,
  accent,
  reducedMotion,
  delay = 0,
  titleClassName,
}: {
  text: string;
  accent: string;
  reducedMotion: boolean;
  delay?: number;
  titleClassName?: string;
}) {
  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={
        reducedMotion
          ? undefined
          : {
              opacity: [0.92, 1, 0.94, 1],
              y: [0, -1.5, 0.5, 0],
              filter: ["blur(0px)", "blur(0px)", "blur(0.8px)", "blur(0px)"],
            }
      }
      transition={{
        duration: 10,
        times: [0, 0.26, 0.62, 1],
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
      className="relative block pb-1"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 text-white/22 blur-[10px] ${titleClassName ?? ""}`}
        style={{ textShadow: `0 0 26px ${accent}20` }}
      >
        {text}
      </span>

      <motion.span
        aria-hidden="true"
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.12, 0.2, 0.12],
                x: [-2, 2, -2],
                y: [1, -1, 1],
              }
        }
        transition={{
          duration: 9,
          delay,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className={`absolute inset-0 text-white/14 blur-[1.5px] ${titleClassName ?? ""}`}
      >
        {text}
      </motion.span>

      <span
        className={`relative block bg-[linear-gradient(180deg,#fffaf3_0%,#f6f0ea_26%,#d7d2d0_58%,#948d92_100%)] bg-clip-text text-transparent ${titleClassName ?? ""}`}
        style={{
          textShadow: `0 1px 0 rgba(255,255,255,0.2), 0 16px 36px rgba(0,0,0,0.18), 0 0 16px ${accent}14`,
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [shaderReady, setShaderReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

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
        className="relative flex h-[100svh] flex-col overflow-hidden"
        style={{
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

        <section className="relative z-10 shrink-0 px-5 pt-5 text-center">
          <div className="relative mx-auto max-w-[18rem]">
            <motion.div
              aria-hidden="true"
              animate={reducedMotion ? undefined : { opacity: [0.16, 0.3, 0.18], scale: [1, 1.08, 1] }}
              transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="absolute inset-x-3 top-6 h-24 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${activePortal.accent}36 0%, rgba(255,255,255,0.08) 34%, transparent 72%)` }}
            />
            <div className="relative">
              <h1 className="relative text-[2.18rem] leading-[0.82] tracking-[0.01em] sm:text-[2.72rem]">
                <MobileSignalWord
                  text="The"
                  accent={activePortal.accent}
                  reducedMotion={Boolean(reducedMotion)}
                  titleClassName="chv-mobile-display text-[0.78em] italic tracking-[-0.045em]"
                />
                <MobileSignalWord
                  text="Chloeverse"
                  accent={activePortal.accent}
                  reducedMotion={Boolean(reducedMotion)}
                  delay={0.3}
                  titleClassName="chv-mobile-display tracking-[-0.055em]"
                />
              </h1>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-[18rem] space-y-2">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="chv-mobile-body text-[0.95rem] italic leading-7 tracking-[0.01em] text-white/74"
            >
              where storytelling meets tomorrow
            </motion.p>
          </div>
        </section>

        <section className="relative z-10 flex min-h-0 flex-1 items-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.6rem)] pt-2">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-2.5" aria-label="Portal navigation">
            {HOME_PORTALS.map((item, index) => {
              const active = activeIndex === index;
              const widths = ["84%", "78%", "80%", "83%", "76%"];
              const offsets = [-10, 14, -4, 12, -8];
              const radii = [
                "44px 52px 38px 58px / 30px 42px 26px 40px",
                "54px 36px 46px 34px / 28px 38px 30px 42px",
                "38px 54px 34px 50px / 34px 28px 42px 30px",
                "50px 38px 52px 34px / 30px 42px 28px 38px",
                "40px 56px 36px 52px / 34px 26px 42px 30px",
              ];
              const sharedClassName =
                "chv-mobile-signal-card-wrap group relative px-2 py-1 transition-transform duration-300";

              const content = (
                <motion.div
                  data-active={active}
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          y: active ? -6 : 0,
                          rotateZ: active ? 0 : index % 2 === 0 ? -1.2 : 1.1,
                          scale: active ? 1.016 : 0.985,
                          opacity: active ? 1 : 0.82,
                        }
                  }
                  whileTap={reducedMotion ? undefined : { scale: 0.992, y: -3 }}
                  transition={{ type: "spring", stiffness: 240, damping: 26, mass: 0.8 }}
                  className="chv-mobile-signal-card relative mx-auto flex min-h-[76px] items-center overflow-visible px-0"
                  style={
                    {
                      "--signal-accent": item.accent,
                      "--signal-radius": radii[index],
                      "--signal-bloom-x": `${index % 2 === 0 ? 76 : 22}%`,
                      width: widths[index],
                    } as CSSProperties
                  }
                >
                  <div className="chv-mobile-signal-card__core absolute inset-0" />
                  <div className="chv-mobile-signal-card__wash absolute inset-0" />
                  <div className="chv-mobile-signal-card__shine absolute inset-0" />
                  <div className="chv-mobile-signal-layer relative flex min-h-[76px] flex-1 items-center justify-between px-5 py-3.5">
                    <div className="max-w-[74%]">
                      <p className="chv-mobile-body text-[0.53rem] uppercase tracking-[0.18em] text-white/42">
                        {item.label}
                      </p>
                      <h2 className="chv-mobile-display mt-0.5 text-[1.16rem] leading-[0.94] tracking-[-0.03em] text-[#f7f1e9]">
                        {item.displayTitle}
                      </h2>
                      <p className="chv-mobile-body mt-1 text-[0.58rem] italic tracking-[0.02em] text-white/42">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 self-stretch py-1">
                      <span className="chv-mobile-body text-[0.54rem] italic tracking-[0.04em] text-white/36">
                        {item.sigil}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-px w-7"
                          style={{ background: `linear-gradient(90deg, rgba(255,255,255,0.03), ${item.accent}55, transparent)` }}
                        />
                        <span className="chv-mobile-body text-[0.56rem] italic tracking-[0.04em] text-white/36">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );

              return (
                <MobileRouteLink
                  key={item.href}
                  href={item.href}
                  accent={item.accent}
                  label={item.label}
                  aria-current={active ? "true" : undefined}
                  onPointerEnter={() => setActiveIndex(index)}
                  onPointerDown={() => setActiveIndex(index)}
                  onTouchStart={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  className={sharedClassName}
                  style={{
                    transform: `translateX(${active ? offsets[index] * 0.55 : offsets[index]}px)`,
                  }}
                >
                  {content}
                </MobileRouteLink>
              );
            })}
          </div>
        </section>
      </div>
      <MobileLandingLoader accent={activePortal.accent} visible={showLoader} />
    </MobileRouteFrame>
  );
}
