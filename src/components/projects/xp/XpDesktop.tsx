"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";

type XpDesktopProps = {
  onOpen: () => void;
};

function formatClockTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function formatClockDate() {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function Windows7Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 420" aria-hidden="true">
      <defs>
        <linearGradient id="w7red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6a5e" />
          <stop offset="0.45" stopColor="#e83b2f" />
          <stop offset="1" stopColor="#b81612" />
        </linearGradient>
        <linearGradient id="w7green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ef06b" />
          <stop offset="0.5" stopColor="#3bd13a" />
          <stop offset="1" stopColor="#159a1a" />
        </linearGradient>
        <linearGradient id="w7blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#77b7ff" />
          <stop offset="0.55" stopColor="#2f86ff" />
          <stop offset="1" stopColor="#0f55c8" />
        </linearGradient>
        <linearGradient id="w7yellow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.55" stopColor="#ffbf2f" />
          <stop offset="1" stopColor="#d18a00" />
        </linearGradient>

        <filter id="w7shadow" x="-20%" y="-20%" width="140%" height="170%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#000000" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.22" />
        </filter>

        <linearGradient id="w7sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g filter="url(#w7shadow)" transform="translate(70 45) skewX(-6) rotate(-6 190 150)">
        {/* panes */}
        <path d="M20 78 L198 40 L214 172 L40 210 Z" fill="url(#w7red)" />
        <path d="M214 40 L392 14 L408 146 L230 172 Z" fill="url(#w7green)" />
        <path d="M40 214 L214 176 L232 338 L64 372 Z" fill="url(#w7blue)" />
        <path d="M230 176 L408 150 L426 308 L252 338 Z" fill="url(#w7yellow)" />

        {/* separators (crisp, not mushy) */}
        <path d="M210 42 L228 174" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="6" />
        <path d="M42 212 L410 148" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="5" />
        <path d="M214 176 L232 338" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="4" />

        {/* sheen overlay */}
        <path
          d="M18 70 C120 10, 250 10, 410 80 L410 118 C252 64, 120 64, 18 132 Z"
          fill="url(#w7sheen)"
        />
      </g>
    </svg>
  );
}

function TbIconExplorer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M10 20c0-3 2-5 5-5h12l4 4h18c3 0 5 2 5 5v22c0 3-2 5-5 5H15c-3 0-5-2-5-5V20z" fill="#F6C34A" />
      <path d="M10 26h44v6H10z" fill="#E8A93B" opacity="0.9" />
      <path d="M18 38h20" stroke="#8A5A12" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function TbIconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="10" y="16" width="44" height="32" rx="6" fill="#ffffff" opacity="0.95" />
      <path d="M14 22l18 14L50 22" fill="none" stroke="#E04A3A" strokeWidth="4" strokeLinejoin="round" />
      <path d="M14 44l14-12" stroke="#c9c9c9" strokeWidth="3" opacity="0.8" />
      <path d="M50 44L36 32" stroke="#c9c9c9" strokeWidth="3" opacity="0.8" />
    </svg>
  );
}

function TbIconDiscord({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g transform="translate(5.76 5.76) scale(0.82)">
        <circle cx="32" cy="32" r="30" fill="#5865F2" />
        <path
          d="M22 24c8-3 12-3 20 0c3 1 5 4 6 8c1 5-1 13-4 16c-2 2-4 1-6-1l-3-3H29l-3 3c-2 2-4 3-6 1c-3-3-5-11-4-16c1-4 3-7 6-8z"
          fill="#ffffff"
        />
        <circle cx="27.5" cy="35" r="2.3" fill="#5865F2" />
        <circle cx="36.5" cy="35" r="2.3" fill="#5865F2" />
      </g>
    </svg>
  );
}

function TbIconSpotify({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g transform="translate(4.8 4.8) scale(0.85)">
        <circle cx="32" cy="32" r="30" fill="#1DB954" />
        <path d="M18 28c10-3 22-2 30 3" stroke="#0b0b0b" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.92" />
        <path d="M20 36c8-2 18-1 24 3" stroke="#0b0b0b" strokeWidth="4.0" strokeLinecap="round" fill="none" opacity="0.86" />
        <path d="M22 44c6-1 12 0 17 3" stroke="#0b0b0b" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.80" />
      </g>
    </svg>
  );
}

function TbIconNotion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="10" y="10" width="44" height="44" rx="10" fill="#ffffff" />
      <rect x="14" y="14" width="36" height="36" rx="8" fill="none" stroke="#111" strokeWidth="4" />
      <path d="M26 44V22h4l10 14V22h4v22h-4L30 30v14h-4z" fill="#111" />
    </svg>
  );
}

function TbIconSlack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="12" y="12" width="40" height="40" rx="12" fill="#ffffff" opacity="0.95" />
      <path d="M26 18a4 4 0 1 1 0 8h-4a4 4 0 1 1 0-8h4z" fill="#36C5F0" />
      <path d="M18 26a4 4 0 1 1 8 0v4a4 4 0 1 1-8 0v-4z" fill="#36C5F0" />
      <path d="M38 18a4 4 0 1 1 0 8h-4a4 4 0 1 1 0-8h4z" fill="#2EB67D" />
      <path d="M38 26a4 4 0 1 1 8 0v4a4 4 0 1 1-8 0v-4z" fill="#2EB67D" />
      <path d="M26 38a4 4 0 1 1 0 8h-4a4 4 0 1 1 0-8h4z" fill="#E01E5A" />
      <path d="M18 34a4 4 0 1 1 8 0v4a4 4 0 1 1-8 0v-4z" fill="#E01E5A" />
      <path d="M42 38a4 4 0 1 1 0 8h-4a4 4 0 1 1 0-8h4z" fill="#ECB22E" />
      <path d="M38 34a4 4 0 1 1 8 0v4a4 4 0 1 1-8 0v-4z" fill="#ECB22E" />
    </svg>
  );
}

const TASKBAR_ICON_CLASS = "h-9 w-9";
const TASKBAR_ICON_CLASS_SM = "h-8 w-8";

type DesktopApp = {
  id: string;
  label: string;
  tileClass: string;
  Icon: () => ReactElement;
};

type DesktopAppLayout = {
  id: DesktopApp["id"];
  x: number;
  y: number;
};

const DESKTOP_APPS: DesktopApp[] = [
  {
    id: "instagram",
    label: "Instagram",
    tileClass:
      "bg-[linear-gradient(135deg,#f9d86a_0%,#f77737_32%,#d62976_60%,#962fbf_85%,#4f5bd5_100%)]",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="white" strokeWidth="1.8">
        <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.2" />
        <circle cx="12" cy="12" r="3.9" />
        <circle cx="16.9" cy="7.3" r="1.15" fill="white" stroke="none" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    tileClass: "bg-[radial-gradient(circle_at_30%_25%,#222_0%,#0b0b0b_55%,#000_100%)]",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <path d="M14 6.2c1.1 1.7 2.6 2.7 4.6 2.9v2.6c-2.1-.1-3.7-.8-4.6-1.6v5.2c0 2.6-2.1 4.7-4.7 4.7-2.6 0-4.7-2.1-4.7-4.7 0-2.6 2.1-4.7 4.7-4.7.3 0 .7 0 1 .1v2.7c-.3-.1-.6-.2-1-.2-1.1 0-2 .9-2 2.1 0 1.1.9 2.1 2.1 2.1 1.1 0 2.1-.9 2.1-2.1V4.5h2.5z" fill="#ffffff" opacity="0.92" />
        <path d="M13.3 6.1v11.1c0 2.2-1.8 4-4 4-1.7 0-3.2-1.1-3.8-2.6.7 1 1.8 1.6 3.1 1.6 2.2 0 4-1.8 4-4V5.5c.2.2.5.4.7.6z" fill="#22e6ff" opacity="0.75" />
        <path d="M12.6 6.6v10.6c0 1.8-1.5 3.3-3.3 3.3-1.1 0-2.1-.6-2.7-1.4.6.5 1.3.8 2.1.8 1.8 0 3.3-1.5 3.3-3.3V6.1c.2.2.4.4.6.5z" fill="#ff3b7c" opacity="0.65" />
      </svg>
    ),
  },
  {
    id: "youtubestudio",
    label: "YouTube Studio",
    tileClass: "bg-[radial-gradient(circle_at_35%_30%,#ff6b6b_0%,#e11d48_45%,#7f0a22_100%)]",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <path
          d="M12 7.2l3.3 1.9v3.8L12 14.8 8.7 12.9V9.1L12 7.2z"
          fill="#fff"
          opacity="0.92"
        />
        <path
          d="M20.2 12c0 1.1-.3 2.2-.9 3.1l1.1 1.6-2 2-1.6-1.1c-.9.6-2 .9-3.1.9s-2.2-.3-3.1-.9l-1.6 1.1-2-2 1.1-1.6c-.6-.9-.9-2-.9-3.1s.3-2.2.9-3.1L6.9 7.3l2-2 1.6 1.1c.9-.6 2-.9 3.1-.9s2.2.3 3.1.9l1.6-1.1 2 2-1.1 1.6c.6.9.9 2 .9 3.1z"
          fill="#fff"
          opacity="0.22"
        />
        <path d="M11 10.2l4 1.8-4 1.8v-3.6z" fill="#0b0b0b" opacity="0.75" />
      </svg>
    ),
  },
  {
    id: "capcut",
    label: "CapCut",
    tileClass: "bg-[linear-gradient(135deg,#1a1a1a_0%,#0b0b0b_55%,#000_100%)]",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7h14l-4.5 5L19 17H5l4.5-5L5 7z" />
        <path d="M9 9l6 6" />
        <path d="M15 9l-6 6" />
      </svg>
    ),
  },
  {
    id: "canva",
    label: "Canva",
    tileClass: "bg-[linear-gradient(135deg,#5cf6ff_0%,#2d77ff_42%,#7c3aed_100%)]",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <path
          d="M16.9 9.2c-.5-2.2-2.4-3.7-4.8-3.7-2.9 0-5.1 2.2-5.1 6.3 0 4 2 6.2 5 6.2 2.4 0 4.1-1.4 4.8-3.6l-2.6-.8c-.3 1.2-1 2-2.2 2-1.7 0-2.5-1.6-2.5-3.8 0-2.2.9-3.9 2.5-3.9 1.2 0 1.9.8 2.2 2l2.7-.7z"
          fill="#fff"
          opacity="0.92"
        />
      </svg>
    ),
  },
  {
    id: "notion",
    label: "Notion",
    tileClass: "bg-white",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <rect x="5" y="4.8" width="14" height="14.4" rx="2" fill="#fff" stroke="#0b0b0b" strokeWidth="1.8" />
        <path d="M9 16V8.2l6 7.8V8" stroke="#0b0b0b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "gmail",
    label: "Gmail",
    tileClass: "bg-white",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <path d="M5.5 8.2V18.2" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18.5 8.2V18.2" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M6 7.8l6 5 6-5"
          stroke="#ea4335"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 8l6 5 6-5"
          stroke="#34a853"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
        />
        <path
          d="M6 18h12"
          stroke="#1f2937"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    ),
  },
  {
    id: "figma",
    label: "Figma",
    tileClass: "bg-white",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
        <path d="M12 4.8a3.1 3.1 0 0 1 0 6.2H9.2A3.1 3.1 0 0 1 9.2 4.8H12z" fill="#f24e1e" />
        <path d="M12 11a3.1 3.1 0 0 1 0 6.2H9.2A3.1 3.1 0 0 1 9.2 11H12z" fill="#a259ff" />
        <path d="M12 17.2a3.1 3.1 0 1 1-3.1 3.1V17.2H12z" fill="#0acf83" />
        <path d="M12 4.8h2.8a3.1 3.1 0 0 1 0 6.2H12V4.8z" fill="#ff7262" />
        <path d="M12 11h2.8a3.1 3.1 0 0 1 0 6.2H12V11z" fill="#1abcfe" />
      </svg>
    ),
  },
];

const DESKTOP_LAYOUT: DesktopAppLayout[] = [
  { id: "instagram", x: 0, y: 0 },
  { id: "tiktok", x: 120, y: 0 },
  { id: "youtubestudio", x: 0, y: 112 },
  { id: "capcut", x: 120, y: 112 },
  { id: "canva", x: 0, y: 224 },
  { id: "notion", x: 120, y: 224 },
  { id: "gmail", x: 0, y: 336 },
  { id: "figma", x: 120, y: 336 },
];

function DoubleClickHint() {
  return (
    <div className="pointer-events-none absolute left-[-140px] top-[10px]">
      <div className="relative rounded border border-black bg-[#f7e7a6] px-2 py-1 font-mono text-[10px] tracking-widest text-black shadow-[2px_2px_0_rgba(0,0,0,0.55)]">
        DOUBLE CLICK
        <svg
          width="28"
          height="22"
          viewBox="0 0 28 22"
          className="absolute -right-[26px] top-[10px]"
          aria-hidden="true"
        >
          <path d="M0 10h12V7l16 4-16 4v-3H0z" fill="#0b0b0b" />
        </svg>
      </div>
    </div>
  );
}

type DesktopIconTileProps = {
  app: DesktopApp;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  showHint?: boolean;
};

function DesktopIconTile({
  app,
  selected,
  onClick,
  onDoubleClick,
  showHint = false,
}: DesktopIconTileProps) {
  const Icon = app.Icon;

  return (
    <div className="relative w-[96px]">
      {showHint ? <DoubleClickHint /> : null}
      <button
        type="button"
        aria-label={`${app.label} desktop app icon`}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onDoubleClick={
          onDoubleClick
            ? (event) => {
                event.stopPropagation();
                onDoubleClick();
              }
            : undefined
        }
        className={`group relative flex w-[96px] flex-col items-center rounded-md px-2 py-2 text-white transition ${
          selected
            ? "bg-white/15 ring-1 ring-white/55 shadow-[0_10px_22px_rgba(0,0,0,0.25)]"
            : "hover:bg-white/10"
        }`}
      >
        <span
          className={`relative grid h-12 w-12 place-items-center rounded-[14px] ${app.tileClass} shadow-[0_10px_22px_rgba(0,0,0,0.35)]`}
        >
          <Icon />
        </span>
        <span className="mt-2 max-w-[88px] overflow-hidden text-center text-[11px] font-medium text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [line-height:1.2] [text-shadow:0_1px_4px_rgba(0,0,0,0.65)]">
          {app.label}
        </span>
      </button>
    </div>
  );
}

export function XpDesktop({ onOpen }: XpDesktopProps) {
  const [showApps, setShowApps] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [clock, setClock] = useState("--:--");
  const [dateLabel, setDateLabel] = useState("--/--/----");
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Reveal the desktop icons after the initial beat.
    const coreTimer = window.setTimeout(() => setShowApps(true), 2000);

    const updateClockDisplay = () => {
      setClock(formatClockTime());
      setDateLabel(formatClockDate());
    };
    const firstClockTick = window.setTimeout(updateClockDisplay, 0);
    const clockTimer = window.setInterval(updateClockDisplay, 60000);

    return () => {
      window.clearTimeout(coreTimer);
      window.clearTimeout(firstClockTick);
      window.clearInterval(clockTimer);
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const handleDoubleClick = () => {
    if (opening) return;
    setOpening(true);
    openTimerRef.current = window.setTimeout(() => onOpen(), 250);
  };

  return (
    <main
      className={`relative h-screen w-full overflow-hidden supports-[height:100svh]:h-[100svh] ${
        opening ? "scale-[1.03] opacity-0 blur-[2px]" : "scale-100 opacity-100"
      } transition-all duration-300 ease-out`}
      onClick={() => setSelectedId(null)}
    >
      <img
        src="/projects/candy-kingdom.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "auto", filter: "contrast(1.04) saturate(1.03)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0)_34%,rgba(0,0,0,0.34)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-black/5" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)_40%,rgba(0,0,0,0.04))]" />

      <div
        className="absolute top-[70px] left-[clamp(380px,34vw,620px)] bottom-14 z-30 w-[300px] pb-16"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-full w-full">
          {DESKTOP_LAYOUT.map((entry) => {
            const app = DESKTOP_APPS.find((desktopApp) => desktopApp.id === entry.id);
            if (!app) return null;
            if (!showApps) return null;

            return (
              <div
                key={entry.id}
                className="absolute"
                style={{ left: `${entry.x}px`, top: `${entry.y}px` }}
              >
                <DesktopIconTile
                  app={app}
                  selected={selectedId === app.id}
                  onClick={() => setSelectedId(app.id)}
                  onDoubleClick={app.id === "instagram" ? handleDoubleClick : undefined}
                  showHint={app.id === "instagram" && showApps}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 h-12 border-t border-white/35 bg-black/30 backdrop-blur-[12px] shadow-[0_-1px_0_rgba(255,255,255,0.35),0_-14px_50px_rgba(0,0,0,0.35)]">
        <div className="flex h-full items-center justify-between px-2 sm:px-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-[#5cb4ff] bg-[radial-gradient(circle_at_30%_30%,#8fe0ff_0%,#4aa7ff_38%,#1b66cf_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_0_14px_rgba(77,174,255,0.55)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path d="M4.5 4.5h6.2v6.2H4.5z" fill="#f45f56" />
                <path d="M12 3.8l7.5-1.3v8.2H12z" fill="#7ad04a" />
                <path d="M4.5 11.3h6.2v8.2L4.5 20.6z" fill="#5cb0ff" />
                <path d="M12 11.3h7.5v10.2L12 20.3z" fill="#ffd95b" />
              </svg>
            </div>
            <div className="flex h-[30px] min-w-[150px] sm:min-w-[190px] items-center gap-2 rounded-lg border border-white/22 bg-white/14 px-3 text-xs text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8.2" cy="8.2" r="4.4" />
                <path d="M11.5 11.5L16 16" strokeLinecap="round" />
              </svg>
              <span>Type here to search</span>
            </div>
            <div className="flex items-center gap-3 pointer-events-none select-none">
              <div className="flex items-center justify-center">
                <TbIconExplorer className={TASKBAR_ICON_CLASS} />
              </div>
              <div className="flex items-center justify-center">
                <TbIconMail className={TASKBAR_ICON_CLASS} />
              </div>
              <div className="flex items-center justify-center">
                <TbIconDiscord className={TASKBAR_ICON_CLASS} />
              </div>
              <div className="flex items-center justify-center">
                <TbIconSpotify className={TASKBAR_ICON_CLASS_SM} />
              </div>
              <div className="flex items-center justify-center">
                <TbIconNotion className={TASKBAR_ICON_CLASS_SM} />
              </div>
              <div className="flex items-center justify-center">
                <TbIconSlack className={TASKBAR_ICON_CLASS} />
              </div>
            </div>
          </div>

          <div className="flex h-9 items-center gap-2 rounded-md border border-white/20 bg-white/14 px-3 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9ce8ff]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d7efff]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#8dd2ff]" />
            <div className="min-w-[74px] text-right leading-tight">
              <div className="text-sm font-medium">{clock}</div>
              <div className="text-[10px] text-white/80">{dateLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

