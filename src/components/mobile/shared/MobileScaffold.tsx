import Link from "next/link";
import type { ReactNode } from "react";

function MobileHomeControl({ currentPath }: { currentPath?: string }) {
  if (currentPath === "/") return null;

  return (
    <Link
      href="/"
      className="fixed left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-black/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/82 backdrop-blur-xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.1rem)" }}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(178,241,255,0.8)]" />
      Return to the Chloeverse
    </Link>
  );
}

export function MobileScaffold({
  children,
  eyebrow,
  title,
  description,
  currentPath,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  currentPath?: string;
}) {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#050711] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(96,137,255,0.22),rgba(6,10,18,0)_36%),radial-gradient(circle_at_50%_82%,rgba(0,188,255,0.12),rgba(5,7,17,0)_34%),linear-gradient(180deg,#0a1020_0%,#050711_45%,#020308_100%)]" />
        <div className="absolute inset-x-[-18%] top-[18%] h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),rgba(255,255,255,0))] blur-3xl" />
        <div className="chv-filmgrain absolute inset-0 opacity-25" />
      </div>

      <div
        className="relative z-10 px-5 pb-28"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        {(eyebrow || title || description) ? (
          <header className="mb-6">
            {eyebrow ? (
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/46">{eyebrow}</p>
            ) : null}
            {title ? (
              <h1 className="mt-3 max-w-sm font-[var(--font-head)] text-[1.95rem] leading-[1.05] tracking-[-0.04em] text-white">
                {title}
              </h1>
            ) : null}
            {description ? (
              <p className="mt-3 max-w-md text-sm leading-6 text-white/68">{description}</p>
            ) : null}
          </header>
        ) : null}

        {children}
      </div>

      <MobileHomeControl currentPath={currentPath} />
    </main>
  );
}
