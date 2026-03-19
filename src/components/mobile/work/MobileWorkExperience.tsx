"use client";

import { motion, useReducedMotion } from "framer-motion";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { WORK_ENTRIES, WORK_ROLE_STACK } from "@/lib/mobile-content";

const ACCENT = "#72ffae";
const MATRIX_STREAMS = [
  { left: "6%", text: "resume://signal\ncurrent\narchive" },
  { left: "18%", text: "0101\nrole\nrole\nsignal" },
  { left: "31%", text: "present\npresent\nnode\nnode" },
  { left: "47%", text: "matrix\ncareer\nlog\nlog" },
  { left: "62%", text: "dates\ntype\nlocation\nnote" },
  { left: "79%", text: "phosphor\nprompt\nprompt\n>" },
  { left: "91%", text: "chloe\nwork\nresume\nseq" },
] as const;

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const SORTED_WORK_ENTRIES = [...WORK_ENTRIES].sort((left, right) => {
  const endDelta = parseDateMarker(right.date, "end") - parseDateMarker(left.date, "end");
  if (endDelta !== 0) {
    return endDelta;
  }

  return parseDateMarker(right.date, "start") - parseDateMarker(left.date, "start");
});

function parseDateMarker(dateLabel: string, boundary: "start" | "end") {
  const [startRaw, endRaw] = dateLabel.split(" - ").map((part) => part.trim());
  const target = boundary === "start" ? startRaw : endRaw ?? startRaw;

  if (!target) {
    return 0;
  }

  if (target.toLowerCase() === "present") {
    return Number.MAX_SAFE_INTEGER;
  }

  const [monthLabel, yearLabel] = target.split(/\s+/);
  const year = Number(yearLabel);

  if (!monthLabel || Number.isNaN(year)) {
    return 0;
  }

  return year * 12 + (MONTH_INDEX[monthLabel] ?? 0);
}

function splitRoleAndCompany(title: string) {
  const [companyRaw, roleRaw] = title.split(" - ").map((part) => part.trim());

  return {
    company: companyRaw || title,
    role: roleRaw || "Role",
  };
}

function createEntryToken(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${String(index + 1).padStart(2, "0")}-${slug}`;
}

function normalizeMeta(value: string) {
  return value.replace(/\s{2,}/g, " • ");
}

function glowText(opacity: number) {
  return `0 0 18px rgba(114,255,174,${opacity})`;
}

export function MobileWorkExperience() {
  const reducedMotion = useReducedMotion();

  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Work"
      title="Work"
      description="Roles, dates, and highlights."
      accent={ACCENT}
      showHeader={false}
      ambient={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(114,255,174,0.16),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(114,255,174,0.12),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(87,227,145,0.08),transparent_26%),linear-gradient(180deg,#030705_0%,#010302_48%,#000201_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: [
                "linear-gradient(180deg, rgba(163,255,200,0.06), rgba(163,255,200,0) 14%)",
                "repeating-linear-gradient(180deg, rgba(163,255,200,0.05) 0px, rgba(163,255,200,0.05) 1px, transparent 1px, transparent 4px)",
                "linear-gradient(90deg, rgba(114,255,174,0.07) 1px, transparent 1px), linear-gradient(180deg, rgba(114,255,174,0.06) 1px, transparent 1px)",
              ].join(","),
              backgroundSize: "100% 100%, 100% 4px, 26px 26px",
            }}
          />
          <motion.div
            animate={
              reducedMotion
                ? undefined
                : {
                    opacity: [0.3, 0.48, 0.34],
                    x: [-12, 10, -4],
                    y: [0, 16, -8],
                    scale: [1, 1.04, 1.01],
                  }
            }
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute left-1/2 top-[4.5rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(114,255,174,0.2) 0%, rgba(114,255,174,0.02) 58%, transparent 76%)" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_42%,rgba(0,0,0,0.12)_72%,rgba(0,0,0,0.3)_100%)]" />
          <MatrixRain reducedMotion={Boolean(reducedMotion)} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.24)_100%)]" />
        </>
      }
      chrome={
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : {
                  opacity: [0.12, 0.2, 0.14],
                  x: [-18, 12, -10],
                }
          }
          transition={{ duration: 7.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute inset-x-0 top-0 h-[24rem]"
          style={{
            background:
              "linear-gradient(180deg, rgba(173,255,206,0.18) 0%, rgba(173,255,206,0.05) 32%, rgba(173,255,206,0) 100%)",
            mixBlendMode: "screen",
          }}
        />
      }
      contentClassName="pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]"
    >
      <section className="relative mt-8 [perspective:1600px]">
        <div className="pointer-events-none absolute inset-x-3 top-6 bottom-[-1.4rem] rounded-[2.25rem] bg-[linear-gradient(180deg,rgba(10,26,16,0.82),rgba(3,8,5,0.24))] shadow-[0_48px_120px_rgba(0,0,0,0.44)]" />
        <div className="pointer-events-none absolute inset-x-7 top-10 bottom-[-2.2rem] rounded-[2.35rem] border border-[#7cffb5]/8 bg-[linear-gradient(180deg,rgba(7,18,11,0.44),rgba(0,0,0,0.08))] opacity-90" />
        <div className="pointer-events-none absolute bottom-[-2.8rem] left-1/2 h-24 w-[78%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(114,255,174,0.22),rgba(114,255,174,0.06)_42%,transparent_76%)] blur-2xl" />
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-[#7cffb5]/18 bg-[linear-gradient(180deg,rgba(2,8,5,0.94),rgba(0,2,1,0.98))] shadow-[0_32px_120px_rgba(0,0,0,0.42),0_0_48px_rgba(114,255,174,0.08)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(142,255,192,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)]" />
          <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-[#8effbd]/8" />
          <div className="absolute left-0 top-0 h-full w-px bg-[linear-gradient(180deg,rgba(148,255,195,0.36),rgba(148,255,195,0))]" />
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.1),transparent_22%),linear-gradient(115deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_12%,transparent_28%,transparent_72%,rgba(170,255,207,0.04)_92%,rgba(255,255,255,0.02)_100%)] opacity-60" />
          <div className="absolute inset-x-[8%] top-0 h-[22%] rounded-b-[100%] bg-[linear-gradient(180deg,rgba(219,255,232,0.18),rgba(219,255,232,0.02)_60%,transparent)] blur-xl opacity-60" />
          <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_0_28px_rgba(120,255,177,0.08),inset_0_0_120px_rgba(0,0,0,0.26)]" />
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(124,255,181,0.08) 0px, rgba(124,255,181,0.08) 1px, transparent 1px, transparent 5px)",
            }}
          />

          <div className="relative px-4 pb-5 pt-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#7cffb5]/14 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8cffbc]/70 shadow-[0_0_12px_rgba(140,255,188,0.9)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#61c98b]/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#2d6d48]/60" />
              </div>
              <p className="chv-mobile-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#91ffc0]/56">
                /system/chloe/work.resume
              </p>
            </div>

            <div className="mt-5 space-y-6">
              <section className="relative overflow-hidden rounded-[1.5rem] border border-[#7cffb5]/14 bg-[linear-gradient(180deg,rgba(10,20,13,0.64),rgba(2,8,5,0.84))] px-4 py-4 shadow-[inset_0_1px_0_rgba(153,255,198,0.06)]">
                <div className="absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,rgba(142,255,189,0),rgba(142,255,189,0.42),rgba(142,255,189,0))]" />
                <div className="absolute inset-y-0 right-0 w-[28%] bg-[linear-gradient(270deg,rgba(124,255,181,0.08),rgba(124,255,181,0))]" />
                <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.012)_12%,transparent_26%,transparent_80%,rgba(158,255,200,0.03)_100%)] opacity-80" />
                <TerminalCommand
                  command="boot work --mobile --mode=premium-terminal"
                  reducedMotion={Boolean(reducedMotion)}
                />
                <div className="mt-4 grid gap-2 border-t border-[#7cffb5]/10 pt-4 text-[0.69rem] uppercase tracking-[0.18em] text-[#8fffbf]/48">
                  <p className="chv-mobile-mono">
                    subject.........
                    <span className="ml-2 text-[#f6fff9]" style={{ textShadow: glowText(0.1) }}>
                      Chloe Kang
                    </span>
                  </p>
                  {WORK_ROLE_STACK.map((role) => (
                    <p key={role} className="chv-mobile-mono">
                      {role}
                    </p>
                  ))}
                </div>
              </section>

              <section className="space-y-5">
                {SORTED_WORK_ENTRIES.map((entry, index) => (
                  <TerminalExperience key={`${entry.title}-${entry.date}`} entry={entry} index={index} />
                ))}
              </section>

              <section className="rounded-[1.25rem] border border-[#7cffb5]/10 bg-[rgba(4,9,6,0.72)] px-4 py-3">
                <TerminalCommand command="echo end_of_resume" reducedMotion={Boolean(reducedMotion)} />
                <p className="mt-3 chv-mobile-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#8effbd]/48">
                  archive sealed // mobile route active
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </section>
    </MobileRouteFrame>
  );
}

function MatrixRain({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.14]">
      {MATRIX_STREAMS.map((stream, index) => (
        <motion.div
          key={`${stream.left}-${index}`}
          animate={
            reducedMotion
              ? undefined
              : {
                  y: ["-18%", "100%"],
                  opacity: [0, 0.18, 0.08, 0],
                }
          }
          transition={{
            duration: 12 + index * 1.3,
            delay: index * 0.7,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute top-[-28%] whitespace-pre-wrap chv-mobile-mono text-[0.58rem] uppercase leading-[1.9] tracking-[0.18em] text-[#9dffca]"
          style={{ left: stream.left }}
        >
          {stream.text}
        </motion.div>
      ))}
    </div>
  );
}

function TerminalCommand({
  command,
  reducedMotion,
}: {
  command: string;
  reducedMotion: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-[0.69rem] uppercase tracking-[0.24em] text-[#8effbd]/70">
      <span className="chv-mobile-mono text-[#78ffb1]">$</span>
      <span className="chv-mobile-mono" style={{ textShadow: glowText(0.08) }}>
        {command}
      </span>
      <motion.span
        aria-hidden="true"
        animate={reducedMotion ? undefined : { opacity: [0.28, 1, 0.28] }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="ml-1 inline-block h-3.5 w-2 rounded-sm bg-[#90ffc0]/80 shadow-[0_0_12px_rgba(144,255,192,0.68)]"
      />
    </div>
  );
}

function TerminalExperience({
  entry,
  index,
}: {
  entry: (typeof WORK_ENTRIES)[number];
  index: number;
}) {
  const { company, role } = splitRoleAndCompany(entry.title);
  const entryToken = createEntryToken(entry.title, index);
  const isCurrentRole = entry.date.includes("Present");

  return (
    <article className="relative">
      <TerminalCommand command={`cat /experience/${entryToken}.log`} reducedMotion={true} />

      <div className="relative mt-3">
        <div className="pointer-events-none absolute inset-x-2 top-3 bottom-[-0.85rem] rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(9,22,13,0.78),rgba(1,4,2,0.18))] shadow-[0_30px_70px_rgba(0,0,0,0.32)]" />
        <div className="pointer-events-none absolute inset-x-5 top-6 bottom-[-1.2rem] rounded-[1.65rem] border border-[#7cffb5]/8 bg-[linear-gradient(180deg,rgba(7,18,11,0.32),rgba(0,0,0,0.04))]" />
        <div className="pointer-events-none absolute bottom-[-1.4rem] left-1/2 h-10 w-[72%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(114,255,174,0.14),rgba(114,255,174,0.04)_44%,transparent_78%)] blur-xl" />

        <div className="relative overflow-hidden rounded-[1.45rem] border border-[#7cffb5]/14 bg-[linear-gradient(180deg,rgba(8,16,11,0.82),rgba(2,5,4,0.96))] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(146,255,193,0.04)]">
          <div className="absolute inset-y-4 left-0 w-px bg-[linear-gradient(180deg,rgba(142,255,189,0),rgba(142,255,189,0.34),rgba(142,255,189,0))]" />
          <div className="absolute inset-y-0 right-0 w-[22%] bg-[linear-gradient(270deg,rgba(124,255,181,0.06),rgba(124,255,181,0))]" />
          <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.018)_10%,transparent_22%,transparent_78%,rgba(158,255,200,0.03)_100%)] opacity-80" />
          <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(218,255,231,0.04),inset_0_0_24px_rgba(121,255,177,0.06)]" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="chv-mobile-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8effbd]/52">
                experience {String(index + 1).padStart(2, "0")}
              </p>
              <h2
                className="mt-3 break-words chv-mobile-mono text-[1.01rem] font-medium uppercase tracking-[0.08em] leading-[1.55] text-[#f0fff5]"
                style={{ textShadow: glowText(0.1) }}
              >
                {role}
              </h2>
              <p
                className="mt-2 break-words chv-mobile-mono text-[0.8rem] uppercase tracking-[0.16em] leading-6 text-[#a4ffcb]/66"
                style={{ textShadow: glowText(0.05) }}
              >
                {company}
              </p>
            </div>

            {isCurrentRole ? (
              <span
                className="chv-mobile-mono shrink-0 rounded-full border border-[#8dffc0]/20 bg-[rgba(114,255,174,0.08)] px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.24em] text-[#b4ffd4]/76"
                style={{ boxShadow: "0 0 18px rgba(114,255,174,0.08)" }}
              >
                current
              </span>
            ) : null}
          </div>

          <div className="mt-4 border-t border-[#7cffb5]/12 pt-4">
            <TerminalRow label="dates" value={entry.date} />
            <TerminalRow label="location" value={normalizeMeta(entry.location)} />
            {entry.type ? <TerminalRow label="type" value={entry.type} /> : null}
          </div>

          <div className="mt-4 border-t border-[#7cffb5]/12 pt-4">
            <p className="chv-mobile-mono text-[0.62rem] uppercase tracking-[0.24em] text-[#8effbd]/54">notes</p>
            <div className="mt-3 space-y-2.5">
              {entry.bullets.map((bullet) => (
                <p key={bullet} className="flex gap-3 text-[0.9rem] leading-[1.9] tracking-[0.005em] text-[#e1ffea]/72">
                  <span
                    className="chv-mobile-mono mt-[0.18rem] text-[#86ffb8]/72"
                    style={{ textShadow: glowText(0.08) }}
                  >
                    &gt;
                  </span>
                  <span>{bullet}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function TerminalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.85rem_minmax(0,1fr)] gap-3 text-[0.74rem] leading-[1.8] text-[#d8ffe2]/70">
      <span className="chv-mobile-mono uppercase tracking-[0.2em] text-[#84ffb7]/48">{label}</span>
      <span className="break-words chv-mobile-mono tracking-[0.03em]">{value}</span>
    </div>
  );
}
