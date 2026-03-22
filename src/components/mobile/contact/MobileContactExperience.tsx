"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import { useContactCarousel } from "@/hooks/useContactCarousel";
import { CONTACT_CAROUSEL_ITEMS, CONTACT_DETAILS, type ContactCarouselItem } from "@/lib/mobile-content";

const ACCENT = "#ffcfac";
const CAROUSEL_RADIUS = 118;

export function MobileContactExperience() {
  const [copied, setCopied] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const { activeIndex, bind, rotation, snapToIndex } = useContactCarousel(CONTACT_CAROUSEL_ITEMS.length, {
    autoPlayEnabled: !contactPanelOpen,
  });

  const activeItem = CONTACT_CAROUSEL_ITEMS[activeIndex] ?? CONTACT_CAROUSEL_ITEMS[0];

  useEffect(() => {
    if (activeItem.id !== "contact" && contactPanelOpen) {
      setContactPanelOpen(false);
    }
  }, [activeItem.id, contactPanelOpen]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_DETAILS.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      window.location.href = `mailto:${CONTACT_DETAILS.email}`;
    }
  };

  return (
    <main className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-black" />

      <MobileRouteLink
        href="/"
        accent={ACCENT}
        label="Chloeverse"
        aria-label="Return to the Chloeverse"
        className="fixed left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(10,10,12,0.84)] text-white/84 backdrop-blur-xl"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.9rem)" }}
      >
        <span aria-hidden="true" className="text-[1.25rem] leading-none">
          &#x2039;
        </span>
      </MobileRouteLink>

      <section className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="chv-contact-ring-stage relative h-[24rem] w-[24rem] max-w-[100vw] touch-none"
          style={{ touchAction: "none" }}
          onPointerDown={bind.onPointerDown}
          onPointerMove={bind.onPointerMove}
          onPointerUp={bind.onPointerUp}
          onPointerCancel={bind.onPointerUp}
        >
          <motion.div
            key={activeItem.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[11.5rem] w-[11.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[58px]"
            initial={{ opacity: 0.12, scale: 0.88 }}
            animate={{ opacity: 0.26, scale: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: `radial-gradient(circle, ${activeItem.glow} 0%, transparent 74%)` }}
          />
          <div
            className="chv-contact-ring absolute inset-0"
            aria-hidden="true"
          >
            {CONTACT_CAROUSEL_ITEMS.map((item, index) => (
              <RingIcon
                key={item.id}
                index={index}
                item={item}
                rotation={rotation}
                radius={CAROUSEL_RADIUS}
              />
            ))}
          </div>
          <CenteredAction
            item={activeItem}
            onContactOpen={() => {
              snapToIndex(activeIndex);
              setContactPanelOpen(true);
            }}
          />
        </div>
      </section>

      <AnimatePresence>
        {contactPanelOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-4 z-50"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <div className="chv-contact-overlay-card relative overflow-hidden rounded-[2rem] border border-white/12 px-5 py-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,210,176,0.22),transparent_24%),radial-gradient(circle_at_16%_84%,rgba(145,201,255,0.18),transparent_28%)]" />
              <button
                type="button"
                onClick={() => setContactPanelOpen(false)}
                className="absolute right-4 top-4 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.28em] text-white/76"
              >
                close
              </button>

              <div className="relative pr-16">
                <h2 className="text-[2.15rem] leading-[0.88] tracking-[-0.08em] text-[#fff2de]">
                  {CONTACT_DETAILS.name}
                </h2>
                <p className="mt-4 break-all text-[1rem] leading-7 text-[#ffe8ca]">{CONTACT_DETAILS.email}</p>

                <div className="mt-6 flex items-end justify-between gap-3">
                  <Link
                    href={`mailto:${CONTACT_DETAILS.email}`}
                    className="chv-contact-overlay-link text-[1.06rem] leading-none text-[#fff7ef]"
                  >
                    write ↗
                  </Link>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="chv-mobile-mono text-[0.7rem] uppercase tracking-[0.28em] text-white/70"
                  >
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function RingIcon({
  index,
  item,
  rotation,
  radius,
}: {
  index: number;
  item: ContactCarouselItem;
  rotation: number;
  radius: number;
}) {
  const step = 360 / CONTACT_CAROUSEL_ITEMS.length;
  const currentAngle = index * step + rotation;
  const radians = (currentAngle * Math.PI) / 180;
  const frontness = (Math.cos(radians) + 1) / 2;
  const x = Math.sin(radians) * radius;
  const y = (1 - frontness) * 14;
  const scale = 0.56 + frontness * 0.46;
  const opacity = 0.16 + frontness * 0.84;
  const zIndex = Math.round(frontness * 100);
  const iconStyle = {
    opacity,
    zIndex,
    transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) scale(${scale})`,
  } as CSSProperties;

  const bubbleStyle = {
    filter: `drop-shadow(0 ${8 + frontness * 16}px ${16 + frontness * 20}px rgba(0,0,0,0.58)) drop-shadow(0 0 ${4 + frontness * 14}px ${item.glow})`,
  } as CSSProperties;

  const iconBubble = (
    <div className="chv-contact-app-glyph" style={bubbleStyle}>
      <AppIcon icon={item.icon} accent={item.accent} />
    </div>
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 block" style={iconStyle}>
      {iconBubble}
    </div>
  );
}

function CenteredAction({
  item,
  onContactOpen,
}: {
  item: ContactCarouselItem;
  onContactOpen: () => void;
}) {
  if (item.id === "contact") {
    return (
      <button
        type="button"
        aria-label="Open contact card"
        onClick={onContactOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        className="absolute left-1/2 top-1/2 z-20 h-[7.9rem] w-[7.9rem] -translate-x-1/2 -translate-y-1/2 rounded-[2.3rem] focus:outline-none"
      />
    );
  }

  return (
    <Link
      href={item.href ?? "/contact"}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Open ${item.label}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      className="absolute left-1/2 top-1/2 z-20 block h-[7.9rem] w-[7.9rem] -translate-x-1/2 -translate-y-1/2 rounded-[2.3rem] focus:outline-none"
    />
  );
}

function AppIcon({
  icon,
  accent,
}: {
  icon: ContactCarouselItem["icon"];
  accent: string;
}) {
  const className = "h-[7.25rem] w-[7.25rem] [shape-rendering:geometricPrecision]";
  const suffix = icon;

  return (
    <svg viewBox="0 0 120 120" className={className}>
      <defs>
        <linearGradient id={`frameOuter-${suffix}`} x1="0.12" y1="0.08" x2="0.86" y2="0.94">
          <stop offset="0%" stopColor="#38363d" />
          <stop offset="42%" stopColor="#16181f" />
          <stop offset="100%" stopColor="#050608" />
        </linearGradient>
        <linearGradient id={`frameInner-${suffix}`} x1="0.18" y1="0.08" x2="0.82" y2="0.94">
          <stop offset="0%" stopColor="#1d2128" />
          <stop offset="48%" stopColor="#0d1015" />
          <stop offset="100%" stopColor="#030406" />
        </linearGradient>
        <linearGradient id={`glass-${suffix}`} x1="0.18" y1="0.08" x2="0.84" y2="0.86">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="28%" stopColor="rgba(255,255,255,0.11)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={`edge-${suffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.36)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <radialGradient id={`ambient-${suffix}`} cx="0.32" cy="0.2" r="0.9">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {renderIconGradients(icon, suffix, accent)}
      </defs>

      <rect x="7" y="7" width="106" height="106" rx="33" fill={`url(#frameOuter-${suffix})`} />
      <rect x="12" y="12" width="96" height="96" rx="29" fill={`url(#frameInner-${suffix})`} />
      <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#surface-${suffix})`} />
      <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#ambient-${suffix})`} />
      <path
        d="M26 20h54c9.5 0 14.3 0 18.2 2.2 2.4 1.3 4.3 3.2 5.7 5.6C106 31.5 106 36.3 106 46H14c0-9.6 0-14.4 2.2-18.2 1.4-2.4 3.3-4.3 5.7-5.6C25.8 20 30.6 20 40.2 20z"
        fill={`url(#glass-${suffix})`}
        opacity="0.92"
      />
      <rect x="17.5" y="17.5" width="85" height="85" rx="24.5" fill="none" stroke={`url(#edge-${suffix})`} strokeWidth="1.5" />
      <path d="M29 87c11 8 47 8 62 0" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5.5" strokeLinecap="round" />

      {renderIconMark(icon, suffix, accent)}
    </svg>
  );
}

function renderIconGradients(icon: ContactCarouselItem["icon"], suffix: string, accent: string) {
  if (icon === "contact") {
    return (
      <>
        <linearGradient id={`surface-${suffix}`} x1="0.15" y1="0.12" x2="0.9" y2="0.92">
          <stop offset="0%" stopColor="#fff5e6" />
          <stop offset="38%" stopColor="#f6d8b6" />
          <stop offset="100%" stopColor="#8d633f" />
        </linearGradient>
        <radialGradient id={`core-${suffix}`} cx="0.3" cy="0.22" r="0.92">
          <stop offset="0%" stopColor="#fffaf2" />
          <stop offset="100%" stopColor={accent} />
        </radialGradient>
      </>
    );
  }

  if (icon === "instagram") {
    return (
      <>
        <linearGradient id={`surface-${suffix}`} x1="0.1" y1="0.08" x2="0.9" y2="0.92">
          <stop offset="0%" stopColor="#ffd776" />
          <stop offset="25%" stopColor="#ff8a3d" />
          <stop offset="58%" stopColor="#ef2f8a" />
          <stop offset="82%" stopColor="#8e37ff" />
          <stop offset="100%" stopColor="#4657ff" />
        </linearGradient>
        <radialGradient id={`core-${suffix}`} cx="0.28" cy="0.22" r="0.88">
          <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </>
    );
  }

  if (icon === "tiktok") {
    return (
      <>
        <linearGradient id={`surface-${suffix}`} x1="0.2" y1="0.12" x2="0.86" y2="0.92">
          <stop offset="0%" stopColor="#111318" />
          <stop offset="100%" stopColor="#030305" />
        </linearGradient>
        <radialGradient id={`core-${suffix}`} cx="0.72" cy="0.26" r="0.74">
          <stop offset="0%" stopColor="rgba(255,78,107,0.44)" />
          <stop offset="100%" stopColor="rgba(255,78,107,0)" />
        </radialGradient>
      </>
    );
  }

  if (icon === "linkedin") {
    return (
      <>
        <linearGradient id={`surface-${suffix}`} x1="0.14" y1="0.12" x2="0.88" y2="0.92">
          <stop offset="0%" stopColor="#3b91ff" />
          <stop offset="42%" stopColor="#0a66c2" />
          <stop offset="100%" stopColor="#063f81" />
        </linearGradient>
        <radialGradient id={`core-${suffix}`} cx="0.26" cy="0.2" r="0.88">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </>
    );
  }

  return (
    <>
      <linearGradient id={`surface-${suffix}`} x1="0.12" y1="0.08" x2="0.9" y2="0.94">
        <stop offset="0%" stopColor="#2a2e36" />
        <stop offset="48%" stopColor="#0b0c10" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
      <radialGradient id={`core-${suffix}`} cx="0.26" cy="0.2" r="0.88">
        <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </>
  );
}

function renderIconMark(icon: ContactCarouselItem["icon"], suffix: string, accent: string) {
  if (icon === "contact") {
    return (
      <>
        <rect x="29" y="35" width="44" height="32" rx="11" fill={`url(#core-${suffix})`} opacity="0.98" />
        <path d="M34 42h34v3.8L51 58 34 45.8z" fill="#2c1f17" opacity="0.86" />
        <circle cx="77" cy="73" r="10" fill="#120e0d" opacity="0.18" />
        <circle cx="76" cy="72" r="10" fill="#fff9f1" />
        <path d="M76 65.5l1.7 4.5 4.8 1.2-3.7 2.9 1.1 4.8-3.9-2.6-3.9 2.6 1.1-4.8-3.7-2.9 4.8-1.2z" fill={accent} />
      </>
    );
  }

  if (icon === "instagram") {
    return (
      <>
        <rect x="36" y="36" width="48" height="48" rx="15" fill="none" stroke="#fffaf4" strokeWidth="5.5" />
        <circle cx="60" cy="60" r="12.5" fill="none" stroke="#fffaf4" strokeWidth="5.5" />
        <circle cx="76" cy="44" r="4.2" fill="#fffaf4" />
        <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#core-${suffix})`} />
      </>
    );
  }

  if (icon === "tiktok") {
    return (
      <>
        <path d="M67 36c3.1 7.9 8.3 11.8 15 12.6v9.5c-6 0-11.2-1.7-15-4.9v15.3c0 9.1-6.4 15.5-15.5 15.5-8.4 0-14.8-6.1-14.8-14.2C36.7 61.8 43 56 51.3 56c1.4 0 2.6.1 4.3.5v10.7c-1.2-.7-2.5-1.1-4-1.1-3 0-5.4 2.2-5.4 5.1 0 3.1 2.5 5.5 5.6 5.5 4 0 5.9-2.7 5.9-6.8V36z" fill="#ffffff" />
        <path d="M62.5 39.5c2.6 5.6 6.4 8.9 11.7 10.4" fill="none" stroke="#24f5e3" strokeWidth="4.2" strokeLinecap="round" opacity="0.96" />
        <path d="M55.2 55.5V70c0 5.7-2.5 9-7.1 9-3.4 0-6.1-2.6-6.1-6.1 0-3.4 2.7-5.8 6.3-5.8 1.5 0 2.6.2 4.1.8" fill="none" stroke="#ff4f70" strokeWidth="4.2" strokeLinecap="round" opacity="0.88" />
        <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#core-${suffix})`} opacity="0.48" />
      </>
    );
  }

  if (icon === "linkedin") {
    return (
      <>
        <circle cx="39" cy="42" r="5.6" fill="#ffffff" />
        <rect x="34" y="50" width="10.5" height="26" rx="2.5" fill="#ffffff" />
        <path d="M52 50h10v4.3c2.3-3.1 5.8-4.9 10.8-4.9 8.5 0 13.2 5.3 13.2 14.8V76H75V66.7c0-4.8-1.7-7.4-5.7-7.4-4.3 0-6.4 2.8-6.4 8.4V76H52z" fill="#ffffff" />
        <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#core-${suffix})`} opacity="0.4" />
      </>
    );
  }

  return (
    <>
      <path d="M36 34h11.5l12.2 17 12-17H83L64.5 60 85 87H73.5L58.7 67.2 44.5 87H33.1L53.8 59.5z" fill="#f5f7fb" />
      <path d="M36 34h11.5l12.2 17 12-17H83L64.5 60 85 87H73.5L58.7 67.2 44.5 87H33.1L53.8 59.5z" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      <rect x="16" y="16" width="88" height="88" rx="26" fill={`url(#core-${suffix})`} opacity="0.32" />
    </>
  );
}
