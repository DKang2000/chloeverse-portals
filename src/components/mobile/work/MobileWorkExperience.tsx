"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { WORK_ENTRIES, WORK_ROLE_STACK, type WorkEntry } from "@/lib/mobile-content";

const WORK_ACCENT = "#a9f4d6";

const monthMap: Record<string, number> = {
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

const cardLayouts = [
  { x: -16, rotateZ: -5, rotateY: 7, width: 88, glow: "#c1f8ff" },
  { x: 12, rotateZ: 4, rotateY: -6, width: 84, glow: "#9ee3ff" },
  { x: -4, rotateZ: -2.5, rotateY: 4, width: 90, glow: "#daf6ff" },
  { x: 15, rotateZ: 5.5, rotateY: -7, width: 83, glow: "#aef3de" },
  { x: -12, rotateZ: -4.5, rotateY: 6.5, width: 86, glow: "#b4fbff" },
  { x: 8, rotateZ: 2.5, rotateY: -4.5, width: 89, glow: "#e9ffff" },
] as const;

const shatteredVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const shatteredFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uMotion;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return fract(vec2(n, n * 19.19) * vec2(421.12, 371.73));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.04 + vec2(9.2, -6.7);
    amplitude *= 0.52;
  }

  return value;
}

vec3 spectrum(float t) {
  vec3 silver = vec3(0.72, 0.78, 0.84);
  vec3 cyan = vec3(0.54, 0.9, 1.0);
  vec3 mint = vec3(0.71, 1.0, 0.86);
  vec3 lilac = vec3(0.78, 0.78, 0.96);

  if (t < 0.33) return mix(silver, cyan, smoothstep(0.0, 0.33, t));
  if (t < 0.66) return mix(cyan, mint, smoothstep(0.33, 0.66, t));
  return mix(mint, lilac, smoothstep(0.66, 1.0, t));
}

vec3 shardField(vec2 uv) {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float time = uTime * 0.08 * uMotion;

  p.x += sin(p.y * 3.1 + time) * 0.04;
  p.y += cos(p.x * 2.6 - time * 1.4) * 0.03;

  vec2 cellPos = p * 7.5;
  vec2 cell = floor(cellPos);
  vec2 fractPos = fract(cellPos);

  float minDist = 10.0;
  float secondDist = 10.0;
  vec2 nearest = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = 0.14 + 0.74 * hash22(cell + neighbor);
      point += vec2(
        sin(time + dot(cell + neighbor, vec2(1.7, 2.4))) * 0.015,
        cos(time * 1.2 + dot(cell + neighbor, vec2(2.9, 1.3))) * 0.015
      );

      vec2 diff = neighbor + point - fractPos;
      float dist = dot(diff, diff);

      if (dist < minDist) {
        secondDist = minDist;
        minDist = dist;
        nearest = diff;
      } else if (dist < secondDist) {
        secondDist = dist;
      }
    }
  }

  float edges = smoothstep(0.0, 0.05, secondDist - minDist);
  float ridge = 1.0 - edges;
  float glaze = fbm(p * 5.8 + nearest * 1.4);
  float crackle = pow(1.0 - smoothstep(0.0, 0.2, length(nearest)), 1.6);

  vec3 base = mix(vec3(0.015, 0.02, 0.035), vec3(0.08, 0.11, 0.17), glaze * 0.7 + 0.15);
  vec3 tint = spectrum(fract(glaze * 0.8 + ridge * 0.35 + uv.y * 0.24));
  vec3 color = mix(base, tint * 0.34 + vec3(0.12, 0.18, 0.24), 0.42);
  color += ridge * vec3(0.42, 0.62, 0.74);
  color += crackle * vec3(0.18, 0.28, 0.34);

  float highlightA = pow(max(0.0, 1.0 - length(p - vec2(-0.18, 0.12)) * 1.45), 3.2);
  float highlightB = pow(max(0.0, 1.0 - length(p - vec2(0.26, -0.28)) * 1.7), 3.8);
  color += highlightA * vec3(0.18, 0.26, 0.32);
  color += highlightB * vec3(0.16, 0.22, 0.28);

  float vignette = smoothstep(1.18, 0.12, length((uv - 0.5) * aspect));
  color *= mix(0.48, 1.0, vignette);

  return pow(clamp(color, 0.0, 1.3), vec3(0.92));
}

void main() {
  vec3 color = shardField(vUv);
  gl_FragColor = vec4(color, 1.0);
}
`;

function modulo(value: number, length: number) {
  if (length === 0) return 0;
  return ((value % length) + length) % length;
}

function parseResumeDate(dateRange: string) {
  const [startRaw, endRaw] = dateRange.split(" - ").map((part) => part.trim());
  const parsePart = (value?: string) => {
    if (!value) return 0;
    if (value === "Present") return Number.POSITIVE_INFINITY;
    const [monthLabel, yearLabel] = value.split(" ");
    const month = monthMap[monthLabel] ?? 0;
    const year = Number.parseInt(yearLabel ?? "0", 10);
    return year * 12 + month;
  };

  return {
    start: parsePart(startRaw),
    end: parsePart(endRaw),
  };
}

function splitRoleTitle(title: string) {
  const [company, ...rest] = title.split(" - ");
  return {
    company: company.trim(),
    role: rest.join(" - ").trim() || company.trim(),
  };
}

function normalizeLocation(location: string) {
  return location.replace(/\s{2,}/g, " • ");
}

function ShatteredGlassPlane({ reducedMotion }: { reducedMotion: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMotion: { value: reducedMotion ? 0.25 : 1 },
    }),
    [reducedMotion],
  );

  useEffect(() => {
    const material = materialRef.current;
    return () => material?.dispose();
  }, []);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={shatteredVertexShader} fragmentShader={shatteredFragmentShader} />
    </mesh>
  );
}

function ShatteredGlassBackdrop({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: false, antialias: false, powerPreference: "high-performance" }}
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        className="absolute inset-0 h-full w-full"
      >
        <ShatteredGlassPlane reducedMotion={reducedMotion} />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(222,255,248,0.18),transparent_30%),radial-gradient(circle_at_15%_25%,rgba(122,244,221,0.12),transparent_26%),radial-gradient(circle_at_85%_80%,rgba(136,204,255,0.12),transparent_28%),linear-gradient(180deg,rgba(4,6,10,0.1)_0%,rgba(3,4,8,0.34)_44%,rgba(2,3,5,0.74)_100%)]" />
      <div className="absolute -left-[14%] top-[10%] h-[14rem] w-[12rem] rotate-[-14deg] rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))] opacity-70 blur-[1px]" style={{ clipPath: "polygon(8% 0%, 100% 14%, 88% 100%, 0% 86%)" }} />
      <div className="absolute right-[-12%] top-[30%] h-[19rem] w-[13rem] rotate-[12deg] rounded-[2.5rem] border border-cyan-100/10 bg-[linear-gradient(180deg,rgba(214,255,255,0.12),rgba(255,255,255,0.02))] opacity-60 blur-[0.5px]" style={{ clipPath: "polygon(18% 0%, 100% 12%, 74% 100%, 0% 84%)" }} />
      <div className="absolute bottom-[-6%] left-[8%] h-[15rem] w-[17rem] rotate-[8deg] rounded-[2rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] opacity-55 blur-[1.5px]" style={{ clipPath: "polygon(0% 10%, 88% 0%, 100% 84%, 16% 100%)" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_0%,transparent_16%,transparent_84%,rgba(255,255,255,0.04)_100%)] mix-blend-screen opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_24%,transparent_76%,rgba(255,255,255,0.03)_100%)] opacity-35" />
    </div>
  );
}

function useLoopingField({
  itemCount,
  itemSpan,
  reducedMotion,
}: {
  itemCount: number;
  itemSpan: number;
  reducedMotion: boolean;
}) {
  const totalSpan = Math.max(itemCount * itemSpan, 1);
  const [position, setPosition] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const draggingRef = useRef(false);
  const velocityRef = useRef(0);
  const pointerRef = useRef<{ id: number | null; y: number; lastDelta: number }>({
    id: null,
    y: 0,
    lastDelta: 0,
  });

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();

    const update = (now: number) => {
      const delta = Math.min(now - previous, 32);
      previous = now;

      if (!draggingRef.current) {
        targetRef.current += velocityRef.current * (delta / 16.67);
        velocityRef.current *= reducedMotion ? 0.72 : 0.9;
        if (Math.abs(velocityRef.current) < 0.02) velocityRef.current = 0;
      }

      const lerp = reducedMotion ? 0.24 : 0.12;
      currentRef.current += (targetRef.current - currentRef.current) * lerp;

      setPosition(modulo(currentRef.current, totalSpan));
      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [reducedMotion, totalSpan]);

  const push = (delta: number) => {
    targetRef.current += delta;
  };

  return {
    position,
    onWheel: (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      push(event.deltaY);
      velocityRef.current = event.deltaY * 0.08;
    },
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      pointerRef.current = { id: event.pointerId, y: event.clientY, lastDelta: 0 };
      velocityRef.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || pointerRef.current.id !== event.pointerId) return;
      const delta = event.clientY - pointerRef.current.y;
      pointerRef.current.y = event.clientY;
      pointerRef.current.lastDelta = delta;
      push(-delta * 1.2);
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerRef.current.id !== event.pointerId) return;
      draggingRef.current = false;
      velocityRef.current = -pointerRef.current.lastDelta * 0.9;
      pointerRef.current = { id: null, y: 0, lastDelta: 0 };
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerRef.current.id !== event.pointerId) return;
      draggingRef.current = false;
      velocityRef.current = 0;
      pointerRef.current = { id: null, y: 0, lastDelta: 0 };
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
  };
}

function GlassResumeCard({
  entry,
  index,
  y,
  viewportHeight,
  reducedMotion,
}: {
  entry: WorkEntry;
  index: number;
  y: number;
  viewportHeight: number;
  reducedMotion: boolean;
}) {
  const layout = cardLayouts[index % cardLayouts.length];
  const { company, role } = splitRoleTitle(entry.title);
  const locationLine = normalizeLocation(entry.location);
  const center = y + viewportHeight * 0.32;
  const progress = (center - viewportHeight * 0.5) / viewportHeight;
  const distance = Math.min(Math.abs(progress), 1.4);
  const focus = 1 - Math.min(distance / 1.2, 1);
  const scale = reducedMotion ? 1 : 0.9 + focus * 0.12;
  const opacity = 0.28 + focus * 0.72;
  const x = layout.x + progress * 18;
  const rotateZ = reducedMotion ? 0 : layout.rotateZ + progress * 8;
  const rotateY = reducedMotion ? 0 : layout.rotateY - progress * 9;
  const translateZ = reducedMotion ? 0 : -70 + focus * 120;
  const blur = reducedMotion ? 0 : distance * 0.7;

  return (
    <article
      className="absolute left-1/2 top-0"
      style={{
        width: `${layout.width}%`,
        transform: `translate3d(calc(-50% + ${x}px), ${y}px, ${translateZ}px) scale(${scale}) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-[2rem] blur-2xl"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${layout.glow}26 0%, transparent 68%)`,
          transform: "translate3d(0, 22px, -1px) scale(0.94)",
        }}
      />
      <div className="absolute inset-x-[8%] -bottom-5 h-10 rounded-full bg-black/35 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(240,255,255,0.24)_0%,rgba(226,248,255,0.12)_20%,rgba(133,178,196,0.08)_58%,rgba(8,16,26,0.18)_100%)] shadow-[0_24px_56px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-1px_0_rgba(210,255,255,0.12)] backdrop-blur-[24px]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.06)_28%,transparent_60%,rgba(187,244,255,0.1)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_78%_88%,rgba(136,236,255,0.14),transparent_28%)]" />
        <div className="absolute inset-y-0 left-[12%] w-px bg-white/20 blur-[1px]" />
        <div className="absolute right-[14%] top-0 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
        <div className="relative px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="chv-mobile-mono text-[0.58rem] uppercase tracking-[0.32em] text-[rgba(235,255,252,0.76)]">
                {entry.date}
              </p>
              <h2 className="mt-3 text-[1.2rem] font-medium leading-[1.02] tracking-[-0.05em] text-white">
                {role}
              </h2>
              <p className="mt-1 text-[0.84rem] uppercase tracking-[0.18em] text-[rgba(219,248,255,0.7)]">
                {company}
              </p>
            </div>
            {entry.type ? (
              <span className="rounded-full border border-white/16 bg-white/8 px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.24em] text-white/70">
                {entry.type}
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(5,12,18,0.16),rgba(5,12,18,0.05))] px-3.5 py-3">
            <p className="chv-mobile-mono text-[0.55rem] uppercase tracking-[0.26em] text-white/50">location</p>
            <p className="mt-1 text-[0.8rem] leading-6 text-[rgba(230,244,247,0.78)]">{locationLine}</p>
          </div>

          <div className="mt-4 space-y-2.5">
            {entry.bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,16,25,0.18),rgba(4,10,16,0.08))] px-3.5 py-3.5"
              >
                <p className="text-[0.88rem] leading-6 text-[rgba(240,248,250,0.9)]">{bullet}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function MobileWorkExperience() {
  const reducedMotion = useReducedMotion() ?? false;
  const [viewportHeight, setViewportHeight] = useState(820);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const sortedEntries = useMemo(
    () =>
      [...WORK_ENTRIES].sort((a, b) => {
        const parsedA = parseResumeDate(a.date);
        const parsedB = parseResumeDate(b.date);

        if (parsedA.end !== parsedB.end) return parsedB.end - parsedA.end;
        return parsedB.start - parsedA.start;
      }),
    [],
  );

  const cardSpan = Math.max(360, viewportHeight * 0.72);
  const field = useLoopingField({
    itemCount: sortedEntries.length,
    itemSpan: cardSpan,
    reducedMotion,
  });

  const repeatedCards = useMemo(
    () =>
      [-1, 0, 1].flatMap((copy) =>
        sortedEntries.map((entry, index) => ({
          entry,
          index,
          key: `${copy}-${entry.title}`,
          y: viewportHeight * 0.2 + (copy * sortedEntries.length + index) * cardSpan - field.position,
        })),
      ),
    [cardSpan, field.position, sortedEntries, viewportHeight],
  );

  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Work"
      title="where i've been"
      description="Scroll the work timeline."
      accent={WORK_ACCENT}
      showHeader={false}
      ambient={<ShatteredGlassBackdrop reducedMotion={reducedMotion} />}
      contentClassName="h-[100svh] !px-0 !pb-0 !pt-0"
    >
      <section
        className="relative h-[100svh] overflow-hidden touch-none"
        style={{ perspective: "1400px" }}
        {...field}
      >
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.8rem)] z-20 px-5">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(238,252,255,0.18),rgba(220,246,255,0.08)_26%,rgba(10,18,28,0.24)_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-[22px]">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.18),transparent_36%,rgba(255,255,255,0.08)_68%,transparent_100%)]" />
            <p className="chv-mobile-mono relative text-[0.58rem] uppercase tracking-[0.34em] text-[rgba(224,253,249,0.72)]">
              Work dossier
            </p>
            <div className="relative mt-3 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[1.35rem] leading-[0.95] tracking-[-0.06em] text-white">Chloe Kang</h1>
                <p className="mt-2 max-w-[14rem] text-[0.82rem] leading-5 text-[rgba(222,242,247,0.72)]">
                  Swipe through an endless, reverse-chronological resume loop.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {WORK_ROLE_STACK.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/14 bg-white/[0.07] px-2.5 py-1 text-[0.54rem] uppercase tracking-[0.24em] text-white/68"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-[linear-gradient(180deg,#02050a_0%,rgba(2,5,10,0.88)_22%,rgba(2,5,10,0.0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-[linear-gradient(180deg,rgba(2,5,10,0.0)_0%,rgba(2,5,10,0.82)_70%,#010204_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-0 opacity-45" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "100% 18px", maskImage: "linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.8) 22%,rgba(0,0,0,0.85) 78%,transparent 100%)" }} />

        <div className="absolute inset-0 z-[5]">
          {repeatedCards.map(({ entry, index, key, y }) => (
            <GlassResumeCard
              key={key}
              entry={entry}
              index={index}
              y={y}
              viewportHeight={viewportHeight}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full border border-white/10 bg-black/28 px-3.5 py-2 backdrop-blur-xl">
            <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.28em] text-white/52">
              continuous loop
            </p>
          </div>
        </div>
      </section>
    </MobileRouteFrame>
  );
}
