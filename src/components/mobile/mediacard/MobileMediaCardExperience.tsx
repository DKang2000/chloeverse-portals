"use client";

import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import {
  MEDIACARD_AUDIENCE,
  MEDIACARD_COLLABS,
  MEDIACARD_METRICS,
  MEDIACARD_SERVICES,
} from "@/lib/mobile-content";

const ACCENT = "#e7d4be";
const LENS_CLIP_PATH =
  "polygon(12% 1%, 86% 3%, 100% 18%, 96% 88%, 82% 100%, 18% 98%, 0% 76%, 4% 14%)";
const LENS_VIEWPORT_CLIP_PATH =
  "polygon(14% 4%, 84% 6%, 94% 19%, 89% 83%, 79% 95%, 20% 93%, 7% 73%, 9% 18%)";

type FacetId = "numbers" | "markets" | "collabs" | "terms";

type Facet = {
  id: FacetId;
  title: string;
  eyebrow: string;
  caption: string;
  atmosphere: string;
  accent: string;
  bloom: string;
  rim: string;
  plane: string;
  crystal: string;
  shellRotateY: number;
  shellRotateX: number;
  sceneRotateY: number;
  sceneRotateX: number;
};

const FACETS: Facet[] = [
  {
    id: "numbers",
    title: "Numbers",
    eyebrow: "proof through clarity",
    caption: "The brightest face of the instrument: clean scale, immediate signal, no clutter.",
    atmosphere: "clarity",
    accent: "#ffe6cb",
    bloom: "rgba(255, 229, 195, 0.26)",
    rim: "#fff2e4",
    plane: "rgba(255, 246, 234, 0.82)",
    crystal: "#ffd9bd",
    shellRotateY: -14,
    shellRotateX: 7,
    sceneRotateY: -0.55,
    sceneRotateX: 0.18,
  },
  {
    id: "markets",
    title: "Markets",
    eyebrow: "reach through dispersion",
    caption: "A cooler reading of the same object, where territory appears as drifting audience coordinates.",
    atmosphere: "dispersion",
    accent: "#cfe1ff",
    bloom: "rgba(184, 207, 255, 0.22)",
    rim: "#e7f0ff",
    plane: "rgba(232, 241, 255, 0.78)",
    crystal: "#b4ccff",
    shellRotateY: -4,
    shellRotateX: 4,
    sceneRotateY: 0.18,
    sceneRotateX: 0.02,
  },
  {
    id: "collabs",
    title: "Collabs",
    eyebrow: "credibility through association",
    caption: "Brand trust signals appear like inlays caught inside the prism instead of sitting on separate cards.",
    atmosphere: "prestige",
    accent: "#ffd7cf",
    bloom: "rgba(255, 204, 190, 0.24)",
    rim: "#fff0ea",
    plane: "rgba(255, 241, 235, 0.78)",
    crystal: "#ffc5bb",
    shellRotateY: 7,
    shellRotateX: 5,
    sceneRotateY: 0.74,
    sceneRotateX: -0.08,
  },
  {
    id: "terms",
    title: "Terms",
    eyebrow: "value through precision",
    caption: "The deepest facet: warmer, denser, and more ledger-like, where terms become engraved structure.",
    atmosphere: "precision",
    accent: "#e7d8ff",
    bloom: "rgba(208, 186, 255, 0.22)",
    rim: "#f3ecff",
    plane: "rgba(243, 237, 255, 0.8)",
    crystal: "#d5baff",
    shellRotateY: 16,
    shellRotateX: 7,
    sceneRotateY: 1.2,
    sceneRotateX: -0.18,
  },
] as const;

const MARKET_POSITIONS = [
  { left: "10%", top: "20%" },
  { left: "56%", top: "12%" },
  { left: "16%", top: "62%" },
  { left: "58%", top: "58%" },
] as const;

function wrapFacetIndex(index: number) {
  return (index + FACETS.length) % FACETS.length;
}

function brandLogoPath(brand: string) {
  return `/mediacard/logos/${brand.toLowerCase().replace(/\s+/g, "")}.png`;
}

export function MobileMediaCardExperience() {
  const reducedMotion = useReducedMotion();
  const [facetIndex, setFacetIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const activeFacet = FACETS[facetIndex] ?? FACETS[0];

  const rotateFacet = (delta: number) => {
    if (delta === 0) return;
    setDirection(delta > 0 ? 1 : -1);
    setFacetIndex((current) => wrapFacetIndex(current + delta));
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldAdvance = Math.abs(info.offset.x) > 46 || Math.abs(info.velocity.x) > 420;
    if (!shouldAdvance) return;
    rotateFacet(info.offset.x < 0 || info.velocity.x < 0 ? 1 : -1);
  };

  const lensTone = useMemo(
    () =>
      ({
        "--facet-accent": activeFacet.accent,
        "--facet-bloom": activeFacet.bloom,
      }) as CSSProperties,
    [activeFacet.accent, activeFacet.bloom],
  );

  return (
    <main
      className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-[#04040a] text-white"
      style={lensTone}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#080812_0%,#04040b_48%,#020206_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.09),transparent_22%),radial-gradient(circle_at_22%_20%,rgba(190,210,255,0.1),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(255,213,193,0.08),transparent_26%)]" />
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : {
                  opacity: [0.18, 0.3, 0.22],
                  x: [-22, 14, -10],
                  y: [-10, 18, -6],
                }
          }
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute left-1/2 top-[16%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${activeFacet.bloom} 0%, transparent 68%)` }}
        />
        <div className="chv-mobile-grain absolute inset-0 opacity-50" />
        <div className="chv-vignette absolute inset-0" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.9rem)]">
        <div className="flex items-start justify-between gap-4">
          <MobileRouteLink
            href="/"
            accent={ACCENT}
            label="Chloeverse"
            aria-label="Return to the Chloeverse"
            className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-3.5 py-2 text-white/84 backdrop-blur-xl"
            style={{ boxShadow: "0 18px 42px rgba(0,0,0,0.28), 0 0 0 1px rgba(231,212,190,0.12)" }}
          >
            <span className="inline-flex items-center gap-3">
              <span className="relative block h-7 w-7 overflow-hidden rounded-full border border-white/18">
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.96),rgba(255,255,255,0.14)_54%,transparent_76%)]" />
              </span>
              <span className="chv-mobile-body text-[0.7rem] italic tracking-[0.02em] text-white/84">back to chloeverse</span>
            </span>
          </MobileRouteLink>

          <div className="max-w-[11.5rem] rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-4 py-3 text-right shadow-[0_18px_48px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <p className="chv-mobile-mono text-[0.56rem] uppercase tracking-[0.34em] text-white/42">prism lens</p>
            <p className="mt-2 chv-mobile-display text-[1.5rem] leading-[0.9] tracking-[-0.06em] text-[#f8f3ec]">
              {activeFacet.title}
            </p>
            <p className="mt-2 text-[0.74rem] leading-6 text-white/56">{activeFacet.eyebrow}</p>
          </div>
        </div>
      </div>

      <section className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.6rem)] pt-[calc(env(safe-area-inset-top,0px)+6.2rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+6.6rem)] z-10 flex justify-center px-6 text-center">
          <div className="max-w-[17rem] rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-2.5 backdrop-blur-lg">
            <p className="chv-mobile-body text-[0.8rem] italic tracking-[0.02em] text-white/62">
              Swipe the same instrument to change the angle of interpretation.
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-[24rem] [perspective:1800px]">
          <div className="pointer-events-none absolute inset-[-14%] -z-10">
            <PrismScene facet={activeFacet} reducedMotion={Boolean(reducedMotion)} />
          </div>

          <motion.div
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            whileDrag={reducedMotion ? undefined : { scale: 1.012 }}
            animate={{
              rotateY: activeFacet.shellRotateY,
              rotateX: activeFacet.shellRotateX,
            }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-[0.73] w-[min(88vw,22rem)] touch-none"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0"
              style={{
                clipPath: LENS_CLIP_PATH,
                background:
                  "linear-gradient(140deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 16%, rgba(255,255,255,0.02) 42%, rgba(4,5,8,0.14) 100%)",
                boxShadow:
                  "0 30px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.06)",
              }}
            />
            <div
              className="absolute inset-[1px]"
              style={{
                clipPath: LENS_CLIP_PATH,
                background: `radial-gradient(circle at 18% 12%, rgba(255,255,255,0.18), transparent 26%), linear-gradient(165deg, ${activeFacet.plane} 0%, rgba(255,255,255,0.07) 14%, rgba(12,14,20,0.48) 78%, rgba(4,5,8,0.76) 100%)`,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <div
              className="absolute inset-[10px]"
              style={{
                clipPath: LENS_VIEWPORT_CLIP_PATH,
                background:
                  "linear-gradient(180deg, rgba(4,5,10,0.82) 0%, rgba(8,9,15,0.68) 20%, rgba(8,9,16,0.54) 50%, rgba(4,5,8,0.8) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 80px ${activeFacet.bloom}`,
              }}
            >
              <motion.div
                key={`sheen-${activeFacet.id}`}
                initial={{ opacity: 0, x: "-18%" }}
                animate={
                  reducedMotion
                    ? { opacity: 0.32, x: "0%" }
                    : { opacity: [0.24, 0.48, 0.28], x: ["-12%", "12%", "-4%"] }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.45 }
                    : { duration: 9.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                }
                className="pointer-events-none absolute inset-y-[-10%] left-[-16%] w-[68%] -rotate-[16deg] blur-2xl"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${activeFacet.bloom} 34%, rgba(255,255,255,0) 100%)`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.14),transparent_32%),linear-gradient(115deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_12%,transparent_28%,transparent_78%,rgba(255,255,255,0.03)_100%)]" />
              <div className="pointer-events-none absolute inset-y-0 left-[11%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.22),transparent)]" />
              <div className="pointer-events-none absolute inset-y-0 right-[14%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.16),transparent)]" />
              <div className="pointer-events-none absolute inset-x-[12%] top-[18%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />

              <div className="relative flex h-full flex-col px-5 pb-5 pt-4">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.32em] text-white/42">the prism lens</p>
                    <p className="mt-1 chv-mobile-display text-[1.28rem] leading-none tracking-[-0.05em] text-[#fbf7f0]">
                      {activeFacet.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.3em] text-white/36">
                      {String(facetIndex + 1).padStart(2, "0")} / {String(FACETS.length).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-[0.7rem] leading-5 text-white/52">{activeFacet.atmosphere}</p>
                  </div>
                </div>

                <div className="relative min-h-0 flex-1 py-4">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={activeFacet.id}
                      custom={direction}
                      variants={facetContentVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full"
                    >
                      <FacetContent facet={activeFacet} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="text-[0.74rem] leading-6 text-white/58">{activeFacet.caption}</p>
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-[6%] opacity-80"
              style={{
                clipPath: LENS_CLIP_PATH,
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 44px ${activeFacet.bloom}`,
              }}
            />
          </motion.div>
        </div>
      </section>

      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] z-30 px-5">
        <div className="mx-auto flex w-full max-w-[23rem] items-end justify-between gap-4">
          <div className="max-w-[10.5rem]">
            <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.32em] text-white/38">gesture</p>
            <p className="mt-2 text-[0.82rem] leading-6 text-white/56">
              One object. One gesture. Four interpretations.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-2 backdrop-blur-xl">
            {FACETS.map((facet, index) => {
              const active = index === facetIndex;
              return (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => {
                    setDirection(index > facetIndex ? 1 : -1);
                    setFacetIndex(index);
                  }}
                  className={`relative h-2.5 rounded-full transition-all duration-300 ${active ? "w-10" : "w-2.5"}`}
                  style={{
                    background: active ? facet.accent : "rgba(255,255,255,0.18)",
                    boxShadow: active ? `0 0 16px ${facet.bloom}` : "none",
                  }}
                  aria-label={`Show ${facet.title} facet`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

const facetContentVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 26 : -26,
    scale: 0.98,
    filter: "blur(10px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
    scale: 0.985,
    filter: "blur(12px)",
  }),
};

function FacetContent({ facet }: { facet: Facet }) {
  if (facet.id === "numbers") return <NumbersFacet accent={facet.accent} />;
  if (facet.id === "markets") return <MarketsFacet accent={facet.accent} />;
  if (facet.id === "collabs") return <CollabsFacet accent={facet.accent} />;
  return <TermsFacet accent={facet.accent} />;
}

function NumbersFacet({ accent }: { accent: string }) {
  const [instagram, tiktok, views, engagement] = MEDIACARD_METRICS;

  return (
    <div className="grid h-full grid-cols-[1.06fr_0.94fr] grid-rows-[1fr_1fr] gap-3">
      <div
        className="row-span-2 overflow-hidden rounded-[1.55rem] border border-white/10 px-4 py-4"
        style={{
          background: `radial-gradient(circle_at_14%_14%, ${accent}22 0%, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03) 60%, rgba(6,8,12,0.18) 100%)`,
        }}
      >
        <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.28em] text-white/38">{instagram.label}</p>
        <p className="chv-mobile-display mt-4 text-[3.2rem] leading-[0.84] tracking-[-0.08em] text-[#fff7ef]">
          {instagram.value}
        </p>
        <div className="mt-6 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.18),transparent)]" />
        <p className="mt-5 chv-mobile-mono text-[0.52rem] uppercase tracking-[0.28em] text-white/38">{views.label}</p>
        <p className="chv-mobile-display mt-3 text-[1.98rem] leading-[0.88] tracking-[-0.06em] text-[#fff0e2]">
          {views.value}
        </p>
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-4">
        <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.28em] text-white/38">{tiktok.label}</p>
        <p className="chv-mobile-display mt-3 text-[2.08rem] leading-[0.86] tracking-[-0.06em] text-[#fff7ef]">
          {tiktok.value}
        </p>
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-4">
        <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.28em] text-white/38">{engagement.label}</p>
        <p className="chv-mobile-display mt-3 text-[2.08rem] leading-[0.86] tracking-[-0.06em] text-[#fff7ef]">
          {engagement.value}
        </p>
      </div>
    </div>
  );
}

function MarketsFacet({ accent }: { accent: string }) {
  return (
    <div className="relative h-full overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4">
      <div className="absolute left-1/2 top-[18%] bottom-[14%] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.2),transparent)]" />
      <div
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}28 0%, transparent 70%)` }}
      />
      <div className="relative h-full">
        <p className="max-w-[12rem] text-[0.84rem] leading-6 text-white/58">
          Audience territories suspended inside the same lens as illuminated coordinates.
        </p>

        {MEDIACARD_AUDIENCE.map((market, index) => (
          <div
            key={market}
            className="absolute"
            style={MARKET_POSITIONS[index] as CSSProperties}
          >
            <div className="flex items-center gap-2">
              <span
                className="block h-2.5 w-2.5 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 16px ${accent}`,
                }}
              />
              <div className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-2 backdrop-blur-lg">
                <p className="chv-mobile-display text-[1.1rem] leading-none tracking-[-0.05em] text-[#f7f3ff]">
                  {market}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollabsFacet({ accent }: { accent: string }) {
  const placements = [
    { brand: MEDIACARD_COLLABS[0], className: "left-[2%] top-[8%] w-[56%] rotate-[-5deg]" },
    { brand: MEDIACARD_COLLABS[1], className: "right-[2%] top-[24%] w-[42%] rotate-[6deg]" },
    { brand: MEDIACARD_COLLABS[2], className: "left-[8%] bottom-[12%] w-[42%] rotate-[3deg]" },
    { brand: MEDIACARD_COLLABS[3], className: "right-[4%] bottom-[8%] w-[50%] rotate-[-4deg]" },
  ] as const;

  return (
    <div className="relative h-full overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4">
      <div
        className="absolute right-[10%] top-[10%] h-28 w-28 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}24 0%, transparent 74%)` }}
      />
      <p className="relative max-w-[12rem] text-[0.84rem] leading-6 text-white/58">
        Brand trust signals mounted as inlays instead of arranged as a plain partner list.
      </p>

      <div className="relative mt-4 h-[13.7rem]">
        {placements.map(({ brand, className }) => (
          <div
            key={brand}
            className={`absolute overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.2)] ${className}`}
          >
            <p className="chv-mobile-mono text-[0.48rem] uppercase tracking-[0.28em] text-white/36">selected collaboration</p>
            <div className="mt-3 flex h-12 items-center">
              <Image
                src={brandLogoPath(brand)}
                alt={brand}
                width={140}
                height={46}
                sizes="140px"
                className="h-8 w-auto object-contain opacity-[0.95]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TermsFacet({ accent }: { accent: string }) {
  return (
    <div className="space-y-4">
      <section
        className="overflow-hidden rounded-[1.45rem] border border-white/10 px-4 py-4"
        style={{
          background: `radial-gradient(circle_at_12%_12%, ${accent}20 0%, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03) 60%, rgba(6,8,12,0.18) 100%)`,
        }}
      >
        <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.28em] text-white/38">brand partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.brandPartnerships.map((item, index) => (
            <div key={item} className="flex gap-3">
              <span className="chv-mobile-mono pt-[1px] text-[0.56rem] uppercase tracking-[0.2em] text-white/32">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="flex-1 text-[0.86rem] leading-6 text-white/72">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4">
        <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.28em] text-white/38">dining partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.diningPartnerships.map((item) => (
            <p key={item} className="text-[0.86rem] leading-6 text-white/72">
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function PrismScene({
  facet,
  reducedMotion,
}: {
  facet: Facet;
  reducedMotion: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.8], fov: 28 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="h-full w-full"
    >
      <color attach="background" args={["#04040a"]} />
      <fog attach="fog" args={["#04040a", 6.5, 12]} />
      <ambientLight intensity={1.05} color="#f1e9ff" />
      <directionalLight position={[3.6, 4.2, 5]} intensity={1.35} color="#fff3e6" />
      <directionalLight position={[-4, -2.2, 2.8]} intensity={0.66} color="#c7d7ff" />
      <pointLight position={[0, 0, 2.8]} intensity={0.85} color={facet.rim} />
      <Stars radius={16} depth={9} count={760} factor={2} saturation={0} fade speed={reducedMotion ? 0 : 0.36} />
      <Sparkles count={22} scale={[7.5, 7.5, 7.5]} size={2.2} speed={reducedMotion ? 0.08 : 0.2} color={facet.rim} />
      <PrismCore facet={facet} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

function PrismCore({
  facet,
  reducedMotion,
}: {
  facet: Facet;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group | null>(null);
  const shellRef = useRef<THREE.Mesh | null>(null);
  const shardRef = useRef<THREE.Mesh | null>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033);

    if (rootRef.current) {
      const drift = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.26) * 0.06;
      rootRef.current.rotation.y = THREE.MathUtils.damp(rootRef.current.rotation.y, facet.sceneRotateY + drift, 3.2, dt);
      rootRef.current.rotation.x = THREE.MathUtils.damp(
        rootRef.current.rotation.x,
        facet.sceneRotateX + (reducedMotion ? 0 : Math.cos(state.clock.elapsedTime * 0.22) * 0.03),
        3.2,
        dt,
      );
      rootRef.current.rotation.z = THREE.MathUtils.damp(
        rootRef.current.rotation.z,
        reducedMotion ? 0.04 : Math.sin(state.clock.elapsedTime * 0.18) * 0.08,
        2.8,
        dt,
      );
    }

    if (shellRef.current && !reducedMotion) {
      shellRef.current.rotation.z += dt * 0.14;
    }

    if (shardRef.current && !reducedMotion) {
      shardRef.current.rotation.y -= dt * 0.18;
      shardRef.current.rotation.x += dt * 0.05;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      <mesh scale={[1.54, 2.16, 0.34]}>
        <boxGeometry args={[1.8, 2.45, 0.52]} />
        <meshPhysicalMaterial
          color="#f7f1ea"
          roughness={0.2}
          metalness={0.04}
          transmission={0.18}
          thickness={0.6}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transparent
          opacity={0.18}
        />
      </mesh>

      <mesh ref={shellRef} scale={[1.34, 1.92, 0.18]} rotation={[0.22, 0.34, 0.1]}>
        <octahedronGeometry args={[1.36, 1]} />
        <meshPhysicalMaterial
          color={facet.crystal}
          roughness={0.12}
          metalness={0.04}
          transmission={0.22}
          thickness={0.7}
          clearcoat={1}
          clearcoatRoughness={0.06}
          transparent
          opacity={0.2}
          emissive={facet.crystal}
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh scale={[1.1, 1.62, 0.08]}>
        <boxGeometry args={[1.54, 2.08, 0.22]} />
        <meshStandardMaterial
          color={facet.rim}
          roughness={0.14}
          metalness={0.1}
          emissive={facet.accent}
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh ref={shardRef} position={[0.1, 0.02, 0.42]} scale={[0.82, 1.2, 0.06]} rotation={[0.24, -0.2, 0.4]}>
        <boxGeometry args={[1.1, 1.5, 0.16]} />
        <meshPhysicalMaterial
          color={facet.rim}
          roughness={0.06}
          metalness={0.04}
          transmission={0.16}
          transparent
          opacity={0.22}
          emissive={facet.accent}
          emissiveIntensity={0.16}
        />
      </mesh>

      <mesh scale={[1.82, 2.46, 1]}>
        <sphereGeometry args={[1.32, 48, 48]} />
        <meshBasicMaterial color={facet.accent} transparent opacity={0.055} />
      </mesh>
    </group>
  );
}
