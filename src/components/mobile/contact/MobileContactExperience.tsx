"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MobileHoldButton } from "@/components/mobile/shared/MobileHoldButton";
import { MobileRitualSettle, useRitualReveal } from "@/components/mobile/shared/MobileRitualState";
import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { CONTACT_DETAILS } from "@/lib/mobile-content";

const ACCENT = "#ffbf72";

export function MobileContactExperience() {
  const ritual = useRitualReveal(false, 620);
  const [copied, setCopied] = useState(false);

  const actions = [
    { label: "Instagram", href: CONTACT_DETAILS.instagram },
    { label: "TikTok", href: CONTACT_DETAILS.tiktok },
    { label: "LinkedIn", href: CONTACT_DETAILS.linkedin },
    { label: "X", href: CONTACT_DETAILS.x },
    { label: "Candy Castle", href: CONTACT_DETAILS.candy },
  ];

  return (
    <MobileRouteFrame
      currentPath="/contact"
      eyebrow="Open Channel"
      title="Contact"
      description="A softer contact page with the same live pathways as desktop: direct email, copy, and social channels gathered into one place."
      accent={ACCENT}
      ambient={
        <>
          <div className="absolute left-1/2 top-[11rem] h-52 w-52 -translate-x-1/2 rounded-full border border-[#ffbf72]/14" />
          <div className="absolute left-1/2 top-[11rem] h-72 w-72 -translate-x-1/2 rounded-full border border-[#ffbf72]/8" />
          <div className="absolute left-1/2 top-[11rem] h-96 w-96 -translate-x-1/2 rounded-full border border-[#ffbf72]/6" />
          <div className="absolute left-1/2 top-[11rem] h-44 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,191,114,0.22),transparent_68%)] blur-3xl" />
        </>
      }
    >
      {ritual.stage === "idle" ? (
        <section className="mt-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/34 p-5">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_44%)]" />
            <div className="relative">
              <div className="mx-auto grid h-40 w-40 place-items-center rounded-full border border-[#ffbf72]/14">
                <div className="grid h-24 w-24 place-items-center rounded-full border border-[#ffbf72]/18">
                  <div className="h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(255,228,198,0.98),rgba(255,191,114,0.45)_42%,transparent_74%)]" />
                </div>
              </div>
              <p className="mt-6 max-w-[17rem] text-sm leading-6 text-white/56">
                Hold for a moment and the right ways to reach Chloe will rise to the surface.
              </p>
              <div className="mt-5">
                <MobileHoldButton
                  label="Bring channels online"
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
            key="contact-settle"
            accent={ACCENT}
            label="Beacon locked"
            detail="Primary channels are coming online and the transmission card is stabilizing."
          />
        ) : null}
      </AnimatePresence>

      {ritual.isRevealed ? (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-5"
        >
          <section className="relative overflow-hidden rounded-[2.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,199,116,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_44%)]" />
            <div className="relative">
              <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.02em] text-[#ffcf99]/76">
                channel open
              </p>
              <h2 className="chv-mobile-display mt-3 text-[2.1rem] leading-[0.9] tracking-[-0.06em] text-[#fbf2e8]">
                {CONTACT_DETAILS.name}
              </h2>
              <p className="mt-4 break-all text-[1rem] leading-7 text-[#ffe7c8]">{CONTACT_DETAILS.email}</p>

              <div className="mt-6 grid gap-3">
                <Link
                  href={`mailto:${CONTACT_DETAILS.email}`}
                  className="chv-mobile-body inline-flex items-center justify-between rounded-[1.5rem] border border-[#ffbf72]/20 bg-[#2b1b08]/42 px-4 py-4 text-[0.78rem] italic tracking-[0.01em] text-[#fff1dd]"
                >
                  <span>write to Chloe</span>
                  <span>01</span>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(CONTACT_DETAILS.email);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    } catch {
                      window.location.href = `mailto:${CONTACT_DETAILS.email}`;
                    }
                  }}
                  className="chv-mobile-body inline-flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/24 px-4 py-4 text-[0.78rem] italic tracking-[0.01em] text-white/82"
                >
                  <span>{copied ? "email copied" : "copy address"}</span>
                  <span>02</span>
                </button>
              </div>

            </div>
          </section>

          <section className="space-y-3">
            <p className="chv-mobile-body text-[0.74rem] italic tracking-[0.01em] text-[#ffcf99]/62">other paths</p>
            {actions.map((action, index) => (
              <Link
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noreferrer noopener"
                className="block rounded-[1.9rem] border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-[14px]"
                style={{
                  width: index % 2 === 0 ? "88%" : "80%",
                  transform: `translateX(${index % 2 === 0 ? "0px" : "24px"}) rotate(${index % 2 === 0 ? "-0.4deg" : "0.7deg"})`,
                }}
              >
                <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.01em] text-[#ffcf99]/56">
                  channel {String(index + 3).padStart(2, "0")}
                </p>
                <p className="mt-2 text-[1rem] text-white/88">{action.label}</p>
              </Link>
            ))}
          </section>
        </motion.section>
      ) : null}
    </MobileRouteFrame>
  );
}
