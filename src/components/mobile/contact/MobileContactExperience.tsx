"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { CONTACT_DETAILS } from "@/lib/mobile-content";

const ACCENT = "#f1c8a1";

export function MobileContactExperience() {
  const [copied, setCopied] = useState(false);

  const channels = [
    { label: "Instagram", href: CONTACT_DETAILS.instagram },
    { label: "TikTok", href: CONTACT_DETAILS.tiktok },
    { label: "LinkedIn", href: CONTACT_DETAILS.linkedin },
    { label: "X", href: CONTACT_DETAILS.x },
    { label: "Candy Castle", href: CONTACT_DETAILS.candy },
  ];

  return (
    <MobileRouteFrame
      currentPath="/contact"
      eyebrow="Contact"
      title="Contact"
      description="Direct email and social links."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(241,200,161,0.16),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.1),transparent_22%),radial-gradient(circle_at_48%_84%,rgba(255,223,196,0.14),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.04),transparent_18%,rgba(255,255,255,0.02)_52%,transparent)]" />
        </>
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8">
        <div className="max-w-[17rem]">
          <p className="chv-mobile-body text-[0.78rem] italic tracking-[0.03em] text-white/48">
            open signal
          </p>
          <h1 className="chv-mobile-display mt-4 text-[4rem] leading-[0.78] tracking-[-0.09em] text-[#fff5ea]">
            contact
          </h1>
          <p className="mt-5 text-[1rem] leading-8 text-white/64">
            This page needs to feel like a held note in the middle of the field, with the other ways in drifting around it.
          </p>
        </div>

        <div className="relative mt-10 h-[18rem]">
          <div className="absolute left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(255,244,228,0.18),rgba(255,255,255,0.02)_42%,transparent_72%)]" />
          <div className="absolute left-1/2 top-1/2 h-[10rem] w-[10rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8" />
          <div className="absolute left-1/2 top-1/2 h-[6rem] w-[6rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_34%_30%,rgba(255,255,255,0.9),rgba(241,200,161,0.34)_38%,transparent_72%)]" />
          <div className="absolute left-3 top-6 max-w-[8rem] border-l border-white/12 pl-3">
            <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.04em] text-white/42">
              one warm focal point
            </p>
          </div>
          <div className="absolute bottom-6 right-0 max-w-[8rem] border-r border-white/12 pr-3 text-right">
            <p className="chv-mobile-body text-[0.64rem] italic tracking-[0.04em] text-white/42">
              everything else can orbit it
            </p>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        <section className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,244,228,0.2),transparent_24%),radial-gradient(circle_at_18%_82%,rgba(241,200,161,0.12),transparent_28%)]" />
          <div className="relative">
            <p className="chv-mobile-body text-[0.66rem] italic tracking-[0.04em] text-white/48">
              for notes, partnerships, and hello
            </p>
            <h2 className="chv-mobile-display mt-5 text-[2.9rem] leading-[0.88] tracking-[-0.08em] text-[#fff5ea]">
              {CONTACT_DETAILS.name}
            </h2>
            <p className="mt-6 break-all text-[1.12rem] leading-8 text-[#fff0de]">
              {CONTACT_DETAILS.email}
            </p>
            <div className="mt-8 flex items-end justify-between gap-4">
              <Link
                href={`mailto:${CONTACT_DETAILS.email}`}
                className="chv-mobile-display text-[1.7rem] leading-[0.95] tracking-[-0.05em] text-[#fff7ef]"
              >
                write ↗
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
                className="chv-mobile-body text-[0.9rem] italic tracking-[0.02em] text-white/70"
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="space-y-7">
            {channels.map((channel, index) => (
              <Link
                key={channel.label}
                href={channel.href}
                target="_blank"
                rel="noreferrer noopener"
                className="block"
                style={{ marginLeft: index % 2 === 0 ? "10px" : "52px" }}
              >
                <p className="chv-mobile-display text-[2.2rem] leading-[0.92] tracking-[-0.06em] text-[#fff0e1]">
                  {channel.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/46">open this channel ↗</p>
              </Link>
            ))}
          </div>
        </section>
      </motion.section>
    </MobileRouteFrame>
  );
}
