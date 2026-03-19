"use client";

import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import {
  MEDIACARD_AUDIENCE,
  MEDIACARD_COLLABS,
  MEDIACARD_METRICS,
  MEDIACARD_SERVICES,
} from "@/lib/mobile-content";

const ACCENT = "#ead8bc";

type OrbitArtifactId = "numbers" | "markets" | "collabs" | "terms";

type OrbitArtifact = {
  id: OrbitArtifactId;
  label: string;
  title: string;
  eyebrow: string;
  accent: string;
  phase: number;
  radius: number;
  height: number;
  speed: number;
};

const ORBIT_ARTIFACTS: OrbitArtifact[] = [
  {
    id: "numbers",
    label: "numbers",
    title: "Numbers",
    eyebrow: "audience scale",
    accent: "#f7e6d2",
    phase: -0.4,
    radius: 1.02,
    height: -0.16,
    speed: 1.04,
  },
  {
    id: "markets",
    label: "markets",
    title: "Markets",
    eyebrow: "audience map",
    accent: "#d8e6ff",
    phase: 1.2,
    radius: 0.84,
    height: -0.04,
    speed: 0.86,
  },
  {
    id: "collabs",
    label: "collabs",
    title: "Collabs",
    eyebrow: "selected names",
    accent: "#ffe5d3",
    phase: 2.7,
    radius: 1.1,
    height: 0.16,
    speed: 1.12,
  },
  {
    id: "terms",
    label: "terms",
    title: "Terms",
    eyebrow: "partnership details",
    accent: "#efe4ff",
    phase: 4.1,
    radius: 0.9,
    height: 0.24,
    speed: 0.94,
  },
] as const;

export function MobileMediaCardExperience() {
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const orbitClockRef = useRef(0);
  const [stageSize, setStageSize] = useState({ width: 390, height: 844 });
  const [orbitTime, setOrbitTime] = useState(0);
  const [activeArtifactId, setActiveArtifactId] = useState<OrbitArtifactId | null>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || activeArtifactId) return;

    let previousTime = performance.now();
    let frameId = 0;

    const update = (now: number) => {
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      orbitClockRef.current += dt;
      setOrbitTime(orbitClockRef.current);
      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeArtifactId, reducedMotion]);

  const artifactPositions = useMemo(() => {
    const centerX = stageSize.width * 0.5;
    const centerY = stageSize.height * 0.5;
    const orbitRadiusX = Math.min(stageSize.width * 0.34, 144);
    const orbitRadiusY = Math.min(stageSize.height * 0.135, 108);

    return ORBIT_ARTIFACTS.map((artifact) => {
      const angle = artifact.phase + (reducedMotion ? 0 : orbitTime * 0.34 * artifact.speed);
      const depth = (Math.sin(angle - Math.PI / 2.4) + 1) / 2;
      const x = centerX + Math.cos(angle) * orbitRadiusX * artifact.radius;
      const y = centerY + Math.sin(angle * 0.92) * orbitRadiusY + artifact.height * stageSize.height * 0.16;
      const scale = 0.84 + depth * 0.22;
      const opacity = 0.48 + depth * 0.42;
      const rotation = -10 + depth * 20;

      return {
        artifact,
        left: x,
        top: y,
        depth,
        scale,
        opacity,
        rotation,
        zIndex: 12 + Math.round(depth * 20),
      };
    });
  }, [orbitTime, reducedMotion, stageSize.height, stageSize.width]);

  const activeArtifact = ORBIT_ARTIFACTS.find((artifact) => artifact.id === activeArtifactId) ?? null;

  return (
    <LayoutGroup>
      <main className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-[#030307] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(224,232,255,0.15),transparent_26%),radial-gradient(circle_at_15%_22%,rgba(255,231,204,0.1),transparent_24%),radial-gradient(circle_at_80%_82%,rgba(192,170,255,0.08),transparent_24%),linear-gradient(180deg,#080811_0%,#040409_52%,#020204_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.05),transparent_18%,rgba(255,255,255,0.02)_44%,transparent_72%)]" />
          <div className="chv-mobile-grain absolute inset-0 opacity-60" />
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
              style={{ boxShadow: "0 18px 42px rgba(0,0,0,0.28), 0 0 0 1px rgba(234,216,188,0.12)" }}
            >
              <span className="inline-flex items-center gap-3">
                <span className="relative block h-7 w-7 overflow-hidden rounded-full border border-white/18">
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.96),rgba(255,255,255,0.14)_54%,transparent_76%)]" />
                </span>
                <span className="chv-mobile-body text-[0.7rem] italic tracking-[0.02em] text-white/84">back to chloeverse</span>
              </span>
            </MobileRouteLink>

            <div className="max-w-[11rem] rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-4 py-3 text-right shadow-[0_18px_48px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <p className="chv-mobile-mono text-[0.56rem] uppercase tracking-[0.34em] text-white/42">moon folio</p>
              <p className="mt-2 chv-mobile-display text-[1.55rem] leading-[0.9] tracking-[-0.06em] text-[#f7f2eb]">
                mediacard
              </p>
              <p className="mt-2 text-[0.78rem] leading-6 text-white/56">tap an orbiting brief to unfold the full card.</p>
            </div>
          </div>
        </div>

        <div ref={stageRef} className="relative z-10 h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            <MoonScene paused={Boolean(activeArtifactId)} reducedMotion={Boolean(reducedMotion)} />
          </div>

          <div className="pointer-events-none absolute inset-0 z-10">
            <OrbitTrace className="absolute left-1/2 top-1/2 h-[17.5rem] w-[17.5rem] -translate-x-1/2 -translate-y-1/2" />
            <OrbitTrace className="absolute left-1/2 top-1/2 h-[13.5rem] w-[19rem] -translate-x-1/2 -translate-y-1/2 rotate-[16deg] opacity-40" />
            <OrbitTrace className="absolute left-1/2 top-1/2 h-[11rem] w-[15rem] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] opacity-30" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+7.4rem)] z-20 flex justify-center px-6 text-center">
            <div className="max-w-[15rem] rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-2.5 backdrop-blur-lg">
              <p className="chv-mobile-body text-[0.82rem] italic tracking-[0.02em] text-white/64">
                prestige briefings orbit the moon until you bring one in.
              </p>
            </div>
          </div>

          <div className="absolute inset-0 z-20">
            {artifactPositions.map((position) => {
              const isSelected = activeArtifactId === position.artifact.id;

              if (isSelected) return null;

              return (
                <div
                  key={position.artifact.id}
                  className="absolute"
                  style={{
                    left: `${position.left}px`,
                    top: `${position.top}px`,
                    transform: `translate(-50%, -50%) scale(${position.scale})`,
                    zIndex: position.zIndex,
                    pointerEvents: activeArtifactId ? "none" : "auto",
                  }}
                >
                  <motion.button
                    layoutId={`mediacard-artifact-${position.artifact.id}`}
                    type="button"
                    onClick={() => setActiveArtifactId(position.artifact.id)}
                    className="pointer-events-auto relative block min-w-[6.8rem] overflow-hidden rounded-[1.6rem] border border-white/10 px-4 py-3 text-left backdrop-blur-[18px]"
                    style={{
                      opacity: activeArtifactId ? 0.18 : position.opacity,
                      rotate: `${position.rotation}deg`,
                      boxShadow: `0 20px 46px rgba(0,0,0,0.28), 0 0 0 1px color-mix(in srgb, ${position.artifact.accent} 16%, rgba(255,255,255,0.08))`,
                      background:
                        "radial-gradient(120% 90% at 14% 10%, rgba(255,255,255,0.16), rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03) 56%, rgba(6,7,10,0.16) 100%)",
                    }}
                    transition={{ type: "spring", stiffness: 230, damping: 26, mass: 0.95 }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
                      style={{
                        background: `radial-gradient(circle at 16% 18%, color-mix(in srgb, ${position.artifact.accent} 28%, rgba(255,255,255,0.18)) 0%, transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 48%, rgba(7,8,13,0.18) 100%)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
                      style={{
                        background:
                          "linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 52%)",
                      }}
                    />
                    <span className="relative block">
                      <span className="chv-mobile-mono block text-[0.48rem] uppercase tracking-[0.28em] text-white/42">
                        {position.artifact.eyebrow}
                      </span>
                      <span className="chv-mobile-display mt-2 block text-[1.35rem] leading-[0.9] tracking-[-0.06em] text-[#fbf6ef]">
                        {position.artifact.label}
                      </span>
                    </span>
                  </motion.button>
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] z-20 px-5">
            <div className="flex items-end justify-between gap-4">
              <div className="max-w-[12rem]">
                <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.32em] text-white/40">orbit status</p>
                <p className="mt-2 text-[0.86rem] leading-6 text-white/56">
                  {activeArtifact ? `${activeArtifact.title} is opened in the foreground.` : "four briefing cards are circling in slow orbit."}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-2 backdrop-blur-lg">
                <p className="chv-mobile-body text-[0.76rem] italic tracking-[0.02em] text-white/58">
                  {reducedMotion ? "motion softened" : "auto orbit engaged"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeArtifact ? (
            <ArtifactOverlay
              artifact={activeArtifact}
              onClose={() => setActiveArtifactId(null)}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </LayoutGroup>
  );
}

function ArtifactOverlay({
  artifact,
  onClose,
}: {
  artifact: OrbitArtifact;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgba(10,11,18,0.16),rgba(6,7,11,0.72)_44%,rgba(2,2,5,0.9)_100%)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.2rem)] pt-[calc(env(safe-area-inset-top,0px)+5.2rem)] backdrop-blur-[10px]"
    >
      <motion.div
        layoutId={`mediacard-artifact-${artifact.id}`}
        className="relative w-full max-w-[22rem] overflow-hidden rounded-[2.2rem] border border-white/10 px-5 py-5 backdrop-blur-[24px]"
        style={{
          background:
            "radial-gradient(120% 90% at 18% 10%, rgba(255,255,255,0.18), rgba(255,255,255,0) 38%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04) 54%, rgba(7,8,12,0.18) 100%)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        transition={{ type: "spring", stiffness: 230, damping: 26, mass: 0.95 }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle_at_18%_16%, color-mix(in srgb, ${artifact.accent} 26%, rgba(255,255,255,0.12)) 0%, transparent 28%), radial-gradient(circle_at_82%_18%, rgba(255,255,255,0.12), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 52%, rgba(5,6,9,0.12) 100%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[2.2rem]"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 52%)",
          }}
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.34em] text-white/42">{artifact.eyebrow}</p>
              <h2 className="chv-mobile-display mt-3 text-[2.6rem] leading-[0.88] tracking-[-0.07em] text-[#fbf6ef]">
                {artifact.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/74 backdrop-blur-lg"
              aria-label={`Close ${artifact.title}`}
            >
              ×
            </button>
          </div>

          <div className="mt-6">
            {artifact.id === "numbers" ? <NumbersCard /> : null}
            {artifact.id === "markets" ? <MarketsCard /> : null}
            {artifact.id === "collabs" ? <CollabsCard /> : null}
            {artifact.id === "terms" ? <TermsCard /> : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OrbitTrace({ className }: { className: string }) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "9999px",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 40px rgba(214,197,255,0.06)",
        maskImage:
          "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.86) 18%, rgba(255,255,255,0.86) 82%, transparent 100%)",
      }}
    />
  );
}

function NumbersCard() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MEDIACARD_METRICS.map((metric) => (
        <div
          key={metric.label}
          className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
        >
          <p className="chv-mobile-body text-[0.72rem] italic tracking-[0.02em] text-white/46">{metric.label}</p>
          <p className="chv-mobile-display mt-3 text-[2rem] leading-[0.88] tracking-[-0.06em] text-[#fff7eb]">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function MarketsCard() {
  return (
    <div>
      <p className="max-w-[15rem] text-[0.92rem] leading-7 text-white/62">
        The strongest audience pockets arranged as a compact global cluster instead of a plain list.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {MEDIACARD_AUDIENCE.map((market, index) => (
          <div
            key={market}
            className="rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] px-4 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
            style={{ marginLeft: index % 2 === 0 ? "0px" : "16px" }}
          >
            <p className="chv-mobile-display text-[1.22rem] leading-none tracking-[-0.05em] text-[#faf5ee]">{market}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollabsCard() {
  return (
    <div className="grid gap-3">
      {MEDIACARD_COLLABS.map((brand) => (
        <div
          key={brand}
          className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] px-4 py-4 shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
        >
          <div>
            <p className="chv-mobile-body text-[0.68rem] italic tracking-[0.02em] text-white/44">selected collaboration</p>
            <p className="chv-mobile-display mt-2 text-[1.48rem] leading-[0.92] tracking-[-0.05em] text-[#fbf7f0]">
              {brand}
            </p>
          </div>
          <Image
            src={`/mediacard/logos/${brand.toLowerCase().replace(/\s+/g, "")}.png`}
            alt={brand}
            width={96}
            height={40}
            sizes="96px"
            className="h-8 w-auto object-contain opacity-[0.94]"
          />
        </div>
      ))}
    </div>
  );
}

function TermsCard() {
  return (
    <div className="space-y-6">
      <section>
        <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.3em] text-white/42">brand partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.brandPartnerships.map((item) => (
            <div
              key={item}
              className="rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] px-4 py-3"
            >
              <p className="text-[0.94rem] leading-7 text-white/74">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="chv-mobile-mono text-[0.52rem] uppercase tracking-[0.3em] text-white/42">dining partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.diningPartnerships.map((item) => (
            <div
              key={item}
              className="rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] px-4 py-3"
            >
              <p className="text-[0.94rem] leading-7 text-white/74">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MoonScene({
  paused,
  reducedMotion,
}: {
  paused: boolean;
  reducedMotion: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.6], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="h-full w-full"
    >
      <color attach="background" args={["#05050a"]} />
      <fog attach="fog" args={["#05050a", 7, 14]} />
      <ambientLight intensity={1.15} color="#e7ddff" />
      <directionalLight position={[3, 4, 5]} intensity={1.55} color="#fff4e8" />
      <directionalLight position={[-4, -2, 3]} intensity={0.65} color="#c7d6ff" />
      <pointLight position={[0, 0, 2.8]} intensity={1.4} color="#f6ede2" />
      <pointLight position={[1.5, 1.2, 1.6]} intensity={0.8} color="#c9b4ff" />
      <Stars radius={18} depth={10} count={900} factor={2.2} saturation={0} fade speed={reducedMotion ? 0 : 0.45} />
      <Sparkles count={28} scale={[8, 8, 8]} size={2.2} speed={reducedMotion ? 0.08 : 0.24} color="#f5efe6" />
      <MoonBody paused={paused} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

function MoonBody({
  paused,
  reducedMotion,
}: {
  paused: boolean;
  reducedMotion: boolean;
}) {
  const moonRef = useRef<THREE.Group | null>(null);
  const haloRef = useRef<THREE.Mesh | null>(null);
  const shellRef = useRef<THREE.Mesh | null>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033);

    if (moonRef.current && !reducedMotion) {
      const motionScale = paused ? 0.18 : 1;
      moonRef.current.rotation.y += dt * 0.1 * motionScale;
      moonRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.14) * 0.06 * motionScale;
    }

    if (haloRef.current) {
      const pulse = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.035;
      const targetScale = paused ? 1.02 : 1.08 + pulse;
      haloRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 1 - Math.exp(-dt * 3.4));
    }

    if (shellRef.current && !reducedMotion) {
      shellRef.current.rotation.y -= dt * (paused ? 0.03 : 0.08);
      shellRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      <mesh ref={haloRef} scale={1.08}>
        <sphereGeometry args={[1.72, 48, 48]} />
        <meshBasicMaterial color="#d8c7ff" transparent opacity={0.08} />
      </mesh>

      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[1.34, 72, 72]} />
          <meshPhysicalMaterial
            color="#f4eee8"
            roughness={0.52}
            metalness={0.08}
            clearcoat={1}
            clearcoatRoughness={0.28}
            emissive="#16111f"
            emissiveIntensity={0.34}
          />
        </mesh>

        <mesh ref={shellRef} scale={1.012}>
          <sphereGeometry args={[1.36, 72, 72]} />
          <meshPhysicalMaterial
            color="#e6ddff"
            roughness={0.14}
            metalness={0.06}
            transmission={0.08}
            thickness={0.4}
            transparent
            opacity={0.2}
            emissive="#5e4a89"
            emissiveIntensity={0.12}
          />
        </mesh>

        <mesh position={[-0.28, 0.18, 1.04]}>
          <sphereGeometry args={[0.34, 40, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>

        <mesh position={[0.46, -0.36, 0.92]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshBasicMaterial color="#fff5ee" transparent opacity={0.08} />
        </mesh>
      </group>

      <mesh rotation={[Math.PI / 2.8, 0, Math.PI / 3.4]}>
        <torusGeometry args={[1.82, 0.018, 20, 140]} />
        <meshBasicMaterial color="#d9c8ff" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
