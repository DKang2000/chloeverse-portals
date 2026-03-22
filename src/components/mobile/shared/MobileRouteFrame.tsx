"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";

type MobileRouteFrameProps = {
  children: ReactNode;
  currentPath: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  ambient?: ReactNode;
  chrome?: ReactNode;
  titleSlot?: ReactNode;
  contentClassName?: string;
  showHeader?: boolean;
  showReturnSigil?: boolean;
};

export function MobileRouteFrame({
  children,
  currentPath,
  eyebrow,
  title,
  description,
  accent,
  ambient,
  chrome,
  titleSlot,
  contentClassName = "",
  showHeader = true,
  showReturnSigil = true,
}: MobileRouteFrameProps) {
  const reducedMotion = useReducedMotion();
  const frameStyle = {
    "--route-accent": accent,
  } as CSSProperties;
  const contentStyle = {
    ...(contentClassName.includes("!pt-0")
      ? {}
      : { paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.2rem)" }),
    ...(contentClassName.includes("!pb-0")
      ? {}
      : { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }),
  } as CSSProperties;

  return (
    <main
      className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-[#020304] text-[rgba(245,242,238,0.92)]"
      style={frameStyle}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--route-accent)_18%,transparent),transparent_42%),linear-gradient(180deg,#07080d_0%,#030407_42%,#010102_100%)]" />
        <div className="chv-mobile-grain absolute inset-0" />
        {ambient}
        {chrome}
      </div>

      {currentPath !== "/" && showReturnSigil ? <MobileReturnSigil accent={accent} /> : null}

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 px-5 ${contentClassName}`}
        style={contentStyle}
      >
        {showHeader ? (
          <header className="max-w-md">
            <p className="chv-mobile-mono text-[0.63rem] uppercase tracking-[0.34em] text-white/46">
              {eyebrow}
            </p>
            {titleSlot ?? (
              <h1 className="chv-mobile-display mt-4 text-[2.4rem] leading-[0.88] tracking-[-0.06em] text-[#f4efe7]">
                {title}
              </h1>
            )}
            <p className="mt-4 max-w-sm text-[0.96rem] leading-7 text-white/62">
              {description}
            </p>
          </header>
        ) : null}
        {children}
      </motion.div>
    </main>
  );
}

export function MobileReturnSigil({ accent }: { accent: string }) {
  return (
    <MobileRouteLink
      href="/"
      accent={accent}
      label="Chloeverse"
      aria-label="Return to the Chloeverse"
      className="fixed left-4 z-30 inline-flex items-center gap-3 rounded-[999px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-3.5 py-2 text-white/84 backdrop-blur-xl"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 0.8rem)",
        boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent), 0 18px 36px rgba(0,0,0,0.24)`,
      }}
    >
      <span className="inline-flex items-center gap-3">
        <span
          className="relative block h-7 w-7 overflow-hidden rounded-full border border-white/18"
          style={{ boxShadow: `0 0 22px color-mix(in srgb, ${accent} 30%, transparent)` }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.94),rgba(255,255,255,0.08)_62%,transparent_80%)]" />
        </span>
        <span className="chv-mobile-body text-[0.7rem] italic tracking-[0.02em] text-white/84">back to chloeverse</span>
      </span>
    </MobileRouteLink>
  );
}
