"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

import { MobileRouteFrame } from "@/components/mobile/shared/MobileRouteFrame";
import { WORK_ENTRIES, WORK_ROLE_STACK, type WorkEntry } from "@/lib/mobile-content";

const WORK_ACCENT = "#d4fff6";

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

const cardLanes = [
  { x: 0, width: 87, rotateZ: -1.4 },
  { x: 10, width: 85, rotateZ: 1.8 },
  { x: -8, width: 86, rotateZ: -1.7 },
  { x: 12, width: 84, rotateZ: 1.6 },
  { x: -11, width: 85, rotateZ: -1.4 },
  { x: 6, width: 86, rotateZ: 1.1 },
] as const;

const smokeVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const smokeFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uFlow;
uniform float uMotion;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
    p = p * 2.04 + vec2(11.2, -6.4);
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv - 0.5;
  float time = uTime * 0.08 * uMotion;
  vec2 flow = uFlow * 0.16;

  vec2 p = uv * vec2(0.8, 1.15);
  p += flow;
  p += vec2(sin(time + uv.y * 4.0), cos(time * 0.8 + uv.x * 3.2)) * 0.06;

  float wisps = fbm(p * 2.4 + vec2(time * 0.6, -time * 0.35));
  float mist = fbm(p * 4.2 - vec2(time * 0.28, time * 0.22));
  float alpha = smoothstep(0.38, 0.82, wisps * 0.72 + mist * 0.38);
  alpha *= smoothstep(1.12, 0.18, length(uv * vec2(1.15, 0.95)));
  alpha *= 0.16;

  vec3 color = mix(vec3(0.88, 0.94, 0.96), vec3(0.78, 0.84, 0.88), mist);
  gl_FragColor = vec4(color, alpha);
}
`;

type ScrollSnapshot = {
  position: number;
  velocity: number;
};

type WorkSceneItem =
  | { kind: "intro"; id: string }
  | { kind: "entry"; id: string; entry: WorkEntry };

function modulo(value: number, length: number) {
  if (length === 0) return 0;
  return ((value % length) + length) % length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededNoise(seed: number) {
  const raw = Math.sin(seed * 127.1) * 43758.5453123;
  return raw - Math.floor(raw);
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

function makeShardShape(seed: number) {
  const pointCount = 3 + Math.floor(seededNoise(seed * 2.1) * 4);
  const points: THREE.Vector2[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * Math.PI * 2 + seededNoise(seed + index * 4.13) * 0.34;
    const radius = 0.42 + seededNoise(seed * 1.72 + index * 1.37) * 1.2;
    points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }

  const shape = new THREE.Shape();
  shape.moveTo(points[0]!.x, points[0]!.y);
  points.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function makeRadialShardShape(seed: number) {
  const length = 1.8 + seededNoise(seed * 1.93) * 2.8;
  const inner = 0.12 + seededNoise(seed * 3.11) * 0.16;
  const outer = 0.18 + seededNoise(seed * 4.27) * 0.32;
  const skew = seededNoise(seed * 5.17) * 0.42 - 0.21;
  const taper = seededNoise(seed * 6.61) * 0.24 - 0.12;

  const shape = new THREE.Shape();
  shape.moveTo(-inner, 0.0);
  shape.lineTo(inner, 0.0);
  shape.lineTo(outer + taper, length * 0.78);
  shape.lineTo(skew, length);
  shape.lineTo(-outer + taper * 0.3, length * 0.82);
  shape.closePath();

  return shape;
}

function useInfiniteSmoothScroll({
  loopLength,
  viewportHeight,
  reducedMotion,
}: {
  loopLength: number;
  viewportHeight: number;
  reducedMotion: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    target: 0,
    current: 0,
    velocity: 0,
    virtualOffset: 0,
  });
  const [frame, setFrame] = useState<ScrollSnapshot>({ position: 0, velocity: 0 });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || loopLength <= 0) return;

    const initial = loopLength;
    element.scrollTop = initial;
    stateRef.current.target = 0;
    stateRef.current.current = 0;
    stateRef.current.velocity = 0;
    stateRef.current.virtualOffset = 0;

    const handleScroll = () => {
      let top = element.scrollTop;

      if (top < loopLength * 0.55) {
        top += loopLength;
        element.scrollTop = top;
        stateRef.current.virtualOffset -= loopLength;
      } else if (top > loopLength * 1.45) {
        top -= loopLength;
        element.scrollTop = top;
        stateRef.current.virtualOffset += loopLength;
      }

      stateRef.current.target = stateRef.current.virtualOffset + (top - loopLength);
    };

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - previous, 34);
      previous = now;

      const state = stateRef.current;
      const before = state.current;
      const ease = reducedMotion ? 0.22 : 0.095;
      state.current += (state.target - state.current) * ease;
      state.velocity = (state.current - before) / Math.max(delta / 16.67, 0.001);

      setFrame({
        position: modulo(state.current, loopLength),
        velocity: state.velocity,
      });

      frameId = window.requestAnimationFrame(tick);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    frameId = window.requestAnimationFrame(tick);

    return () => {
      element.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frameId);
    };
  }, [loopLength, reducedMotion, viewportHeight]);

  return { frame, scrollRef };
}

function SmokePlane({
  scrollRef,
  reducedMotion,
}: {
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
  reducedMotion: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlow: { value: new THREE.Vector2(0, 0) },
      uMotion: { value: reducedMotion ? 0.28 : 1 },
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
    material.uniforms.uFlow.value.set(
      clamp(scrollRef.current.velocity * 0.012, -0.28, 0.28),
      modulo(scrollRef.current.position, 2400) / 2400 - 0.5,
    );
  });

  return (
    <mesh position={[0, 0, -18]} scale={[16, 24, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={materialRef} transparent depthWrite={false} uniforms={uniforms} vertexShader={smokeVertexShader} fragmentShader={smokeFragmentShader} />
    </mesh>
  );
}

function GlassShard({
  seed,
  scrollRef,
}: {
  seed: number;
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const edgeRef = useRef<THREE.LineSegments | null>(null);

  const shape = useMemo(() => makeShardShape(seed), [seed]);
  const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 14), [geometry]);
  const config = useMemo(() => {
    const angle = seededNoise(seed * 2.3) * Math.PI * 2;
    const radius = 4.2 + seededNoise(seed * 4.9) * 5.8;
    return {
      angle,
      radius,
      x: Math.cos(angle) * radius * (0.86 + seededNoise(seed * 8.1) * 0.34),
      y: Math.sin(angle) * radius * (1.1 + seededNoise(seed * 5.7) * 0.48),
      z: -0.6 - seededNoise(seed * 6.3) * 9.4,
      scale: 0.8 + seededNoise(seed * 7.9) * 2.2,
      rotX: -0.9 + seededNoise(seed * 9.4) * 1.8,
      rotY: -1.0 + seededNoise(seed * 10.3) * 2.0,
      rotZ: seededNoise(seed * 11.8) * Math.PI * 2,
      opacity: 0.14 + seededNoise(seed * 12.9) * 0.16,
    };
  }, [seed]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
    };
  }, [edgeGeometry, geometry]);

  useFrame((state) => {
    const group = groupRef.current;
    const edge = edgeRef.current;
    if (!group || !edge) return;

    const drift = clamp(scrollRef.current.velocity * 0.018, -0.35, 0.35);
    const time = state.clock.getElapsedTime();
    const loopPhase = modulo(scrollRef.current.position, 2600) / 2600;

    group.position.x = config.x - drift * (1.8 + config.scale) + Math.sin(time * 0.12 + seed) * 0.08;
    group.position.y = config.y + Math.cos(time * 0.1 + seed * 0.43 + loopPhase * Math.PI * 2) * 0.12;
    group.rotation.x = config.rotX + Math.sin(time * 0.08 + seed * 0.3) * 0.08;
    group.rotation.y = config.rotY + Math.cos(time * 0.09 + seed * 0.2) * 0.1;
    group.rotation.z = config.rotZ + loopPhase * 0.14 + Math.sin(time * 0.05 + seed) * 0.03;

    const material = edge.material as THREE.LineBasicMaterial;
    material.opacity = clamp(0.12 + (10 - Math.abs(config.z)) * 0.018, 0.12, 0.28);
  });

  return (
    <group ref={groupRef} position={[config.x, config.y, config.z]} scale={config.scale}>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshPhysicalMaterial
          color="#eefcff"
          transparent
          opacity={config.opacity}
          transmission={0.96}
          roughness={0.05}
          metalness={0.03}
          ior={1.09}
          thickness={1.35}
          clearcoat={1}
          clearcoatRoughness={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#f8feff" transparent opacity={0.22} />
      </lineSegments>
    </group>
  );
}

function RadialGlassShard({
  seed,
  scrollRef,
}: {
  seed: number;
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const edgeRef = useRef<THREE.LineSegments | null>(null);

  const shape = useMemo(() => makeRadialShardShape(seed), [seed]);
  const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 8), [geometry]);
  const config = useMemo(() => {
    const angle = seededNoise(seed * 3.2) * Math.PI * 2;
    const radius = 0.58 + seededNoise(seed * 5.8) * 1.8;
    return {
      angle,
      radius,
      x: Math.cos(angle) * radius * 0.7,
      y: Math.sin(angle) * radius * 0.96,
      z: -0.4 - seededNoise(seed * 6.4) * 4.8,
      scale: 1.6 + seededNoise(seed * 8.2) * 2.2,
      tilt: -0.28 + seededNoise(seed * 9.7) * 0.56,
      opacity: 0.18 + seededNoise(seed * 10.3) * 0.16,
    };
  }, [seed]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
    };
  }, [edgeGeometry, geometry]);

  useFrame((state) => {
    const group = groupRef.current;
    const edge = edgeRef.current;
    if (!group || !edge) return;

    const drift = clamp(scrollRef.current.velocity * 0.016, -0.3, 0.3);
    const time = state.clock.getElapsedTime();

    group.rotation.z = config.angle + Math.sin(time * 0.04 + seed) * 0.04;
    group.rotation.x = config.tilt + Math.cos(time * 0.06 + seed * 0.4) * 0.06;
    group.rotation.y = drift * 0.18;
    group.position.x = config.x - drift * 0.22;
    group.position.y = config.y + Math.sin(time * 0.05 + seed * 0.2) * 0.05;

    const material = edge.material as THREE.LineBasicMaterial;
    material.opacity = clamp(0.5 - Math.abs(drift) * 0.12, 0.34, 0.56);
  });

  return (
    <group ref={groupRef} position={[config.x, config.y, config.z]} scale={config.scale}>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshPhysicalMaterial
          color="#eafcff"
          transparent
          opacity={config.opacity}
          transmission={0.94}
          roughness={0.04}
          metalness={0.02}
          ior={1.09}
          thickness={1.15}
          clearcoat={1}
          clearcoatRoughness={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.52} />
      </lineSegments>
    </group>
  );
}

function RiftScene({
  reducedMotion,
  scrollRef,
}: {
  reducedMotion: boolean;
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const floatingShards = useMemo(() => Array.from({ length: 18 }, (_, index) => index + 1), []);
  const radialShards = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 101), []);
  const rigRef = useRef<THREE.Group | null>(null);

  function SceneRig() {
    useFrame((state) => {
      const rig = rigRef.current;
      if (!rig) return;

      const time = state.clock.getElapsedTime();
      const drift = clamp(scrollRef.current.velocity * 0.016, -0.34, 0.34);
      const phase = modulo(scrollRef.current.position, 2800) / 2800;

      rig.position.x += ((drift * 0.7 + Math.sin(time * 0.06) * 0.06) - rig.position.x) * 0.08;
      rig.position.y += ((Math.cos(time * 0.08 + phase * Math.PI * 2) * 0.08) - rig.position.y) * 0.08;
      rig.rotation.z += ((drift * -0.05) - rig.rotation.z) * 0.08;
    });

    return (
      <group ref={rigRef}>
        <SmokePlane scrollRef={scrollRef} reducedMotion={reducedMotion} />
        <mesh position={[0, 0.2, -12]} scale={[3.5, 5.1, 1]}>
          <circleGeometry args={[1, 72]} />
          <meshBasicMaterial color="#020406" transparent opacity={0.98} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.2, -11.8]} scale={[4.5, 6.2, 1]}>
          <circleGeometry args={[1, 72]} />
          <meshBasicMaterial color="#071017" transparent opacity={0.12} depthWrite={false} />
        </mesh>
        {radialShards.map((seed) => (
          <RadialGlassShard key={seed} seed={seed} scrollRef={scrollRef} />
        ))}
        {floatingShards.map((seed) => (
          <GlassShard key={seed} seed={seed} scrollRef={scrollRef} />
        ))}
      </group>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 9], fov: 34, near: 0.1, far: 50 }}
        className="absolute inset-0 h-full w-full"
      >
        <color attach="background" args={["#020406"]} />
        <fog attach="fog" args={["#020406", 8, 19]} />
        <ambientLight intensity={0.28} color="#dff9ff" />
        <directionalLight position={[2.8, 4.2, 6]} intensity={1.15} color="#f7ffff" />
        <pointLight position={[-4, 1, 3]} intensity={1.05} color="#c1f5ff" />
        <pointLight position={[4, -3, 4]} intensity={0.82} color="#f5ffff" />
        <pointLight position={[0, 0, 6]} intensity={0.6} color="#ffffff" />
        <SceneRig />
      </Canvas>

      <ShatteredGlassOverlay scrollRef={scrollRef} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.24)_12%,rgba(0,0,0,0.0)_24%),radial-gradient(circle_at_50%_10%,rgba(224,255,250,0.08),transparent_28%),linear-gradient(180deg,rgba(1,4,8,0.12)_0%,rgba(1,4,8,0.02)_26%,rgba(1,4,8,0.62)_74%,rgba(1,4,8,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.02)_100%)] mix-blend-screen opacity-45" />
    </div>
  );
}

function ShatteredGlassOverlay({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      const drift = clamp(scrollRef.current.velocity * 12, -16, 16);
      rootRef.current?.style.setProperty("--rift-drift", `${drift}px`);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [scrollRef]);

  const majorShards = [
    { top: "1%", left: "40%", width: "20%", height: "36%", rotate: "-10deg", clip: "polygon(26% 0%, 62% 6%, 100% 92%, 40% 100%, 0% 70%)", drift: 0.28 },
    { top: "5%", left: "60%", width: "18%", height: "30%", rotate: "18deg", clip: "polygon(12% 0%, 100% 20%, 74% 100%, 0% 72%)", drift: 0.22 },
    { top: "8%", left: "18%", width: "16%", height: "26%", rotate: "-22deg", clip: "polygon(34% 0%, 100% 18%, 62% 100%, 0% 76%)", drift: 0.18 },
    { top: "20%", left: "68%", width: "22%", height: "32%", rotate: "28deg", clip: "polygon(10% 0%, 100% 24%, 74% 100%, 0% 66%)", drift: 0.26 },
    { top: "24%", left: "8%", width: "20%", height: "34%", rotate: "-30deg", clip: "polygon(32% 0%, 100% 16%, 68% 100%, 0% 74%)", drift: 0.24 },
    { top: "50%", left: "72%", width: "18%", height: "32%", rotate: "22deg", clip: "polygon(16% 0%, 100% 22%, 72% 100%, 0% 72%)", drift: 0.22 },
    { top: "54%", left: "10%", width: "20%", height: "32%", rotate: "-20deg", clip: "polygon(28% 0%, 100% 20%, 70% 100%, 0% 72%)", drift: 0.22 },
    { top: "64%", left: "42%", width: "24%", height: "32%", rotate: "4deg", clip: "polygon(18% 0%, 82% 8%, 96% 100%, 0% 84%)", drift: 0.18 },
  ] as const;

  const nearShards = [
    { top: "-6%", left: "-8%", width: "34%", height: "26%", rotate: "-16deg", clip: "polygon(0% 10%, 88% 0%, 100% 78%, 10% 100%)", drift: 0.06 },
    { top: "12%", left: "78%", width: "26%", height: "24%", rotate: "18deg", clip: "polygon(6% 0%, 100% 18%, 88% 100%, 0% 72%)", drift: 0.06 },
    { top: "76%", left: "-10%", width: "32%", height: "22%", rotate: "-12deg", clip: "polygon(0% 14%, 90% 0%, 100% 80%, 8% 100%)", drift: 0.05 },
    { top: "72%", left: "74%", width: "30%", height: "24%", rotate: "16deg", clip: "polygon(8% 0%, 100% 14%, 92% 100%, 0% 78%)", drift: 0.05 },
  ] as const;

  const fragments = [
    { top: "12%", left: "18%", width: "8%", height: "10%", rotate: "-12deg", clip: "polygon(24% 0%, 100% 24%, 60% 100%, 0% 70%)", drift: 0.14 },
    { top: "16%", left: "80%", width: "7%", height: "9%", rotate: "18deg", clip: "polygon(16% 0%, 100% 28%, 74% 100%, 0% 62%)", drift: 0.1 },
    { top: "34%", left: "12%", width: "6%", height: "8%", rotate: "-26deg", clip: "polygon(42% 0%, 100% 18%, 62% 100%, 0% 78%)", drift: 0.14 },
    { top: "38%", left: "84%", width: "8%", height: "9%", rotate: "22deg", clip: "polygon(18% 0%, 100% 26%, 58% 100%, 0% 62%)", drift: 0.12 },
    { top: "64%", left: "20%", width: "7%", height: "10%", rotate: "-16deg", clip: "polygon(34% 0%, 100% 22%, 66% 100%, 0% 70%)", drift: 0.12 },
    { top: "74%", left: "78%", width: "8%", height: "10%", rotate: "14deg", clip: "polygon(22% 0%, 100% 18%, 74% 100%, 0% 72%)", drift: 0.1 },
    { top: "48%", left: "30%", width: "6%", height: "8%", rotate: "-10deg", clip: "polygon(20% 0%, 100% 20%, 70% 100%, 0% 68%)", drift: 0.16 },
    { top: "50%", left: "68%", width: "6%", height: "8%", rotate: "18deg", clip: "polygon(20% 0%, 100% 20%, 70% 100%, 0% 68%)", drift: 0.16 },
  ] as const;

  const spokes = [
    { top: "6%", left: "50%", width: "0.22rem", height: "33%", rotate: "0deg", glow: 0.74 },
    { top: "10%", left: "61%", width: "0.18rem", height: "28%", rotate: "18deg", glow: 0.66 },
    { top: "10%", left: "39%", width: "0.18rem", height: "28%", rotate: "-18deg", glow: 0.66 },
    { top: "26%", left: "74%", width: "0.16rem", height: "24%", rotate: "34deg", glow: 0.58 },
    { top: "26%", left: "26%", width: "0.16rem", height: "24%", rotate: "-34deg", glow: 0.58 },
    { top: "56%", left: "50%", width: "0.18rem", height: "26%", rotate: "2deg", glow: 0.62 },
  ] as const;

  const sparks = [
    { top: "18%", left: "58%" },
    { top: "28%", left: "32%" },
    { top: "42%", left: "68%" },
    { top: "58%", left: "36%" },
    { top: "70%", left: "62%" },
  ] as const;

  return (
    <div ref={rootRef} className="absolute inset-0 [--rift-drift:0px]">
      <div
        className="absolute left-1/2 top-[47%] h-[42%] w-[52%] -translate-x-1/2 -translate-y-1/2 bg-black"
        style={{
          clipPath: "polygon(26% 0%, 56% 6%, 86% 18%, 100% 46%, 84% 82%, 58% 100%, 18% 92%, 0% 56%, 8% 22%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.16), 0 0 140px rgba(0,0,0,0.98)",
        }}
      />
      <div
        className="absolute left-1/2 top-[47%] h-[50%] w-[58%] -translate-x-1/2 -translate-y-1/2 opacity-90"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 34%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute left-1/2 top-[47%] h-[43%] w-[54%] -translate-x-1/2 -translate-y-1/2 opacity-70"
        style={{
          clipPath: "polygon(26% 0%, 56% 6%, 86% 18%, 100% 46%, 84% 82%, 58% 100%, 18% 92%, 0% 56%, 8% 22%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.42), 0 0 22px rgba(220,248,255,0.28)",
        }}
      />

      {nearShards.map((panel) => (
        <div
          key={`${panel.top}-${panel.left}`}
          className="absolute"
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
            transform: `translate3d(calc(var(--rift-drift) * ${panel.drift}), 0, 0) rotate(${panel.rotate})`,
          }}
        >
          <div
            className="absolute inset-0 border border-white/12 bg-[linear-gradient(150deg,rgba(240,252,255,0.06)_0%,rgba(0,0,0,0.24)_34%,rgba(0,0,0,0.56)_100%)]"
            style={{
              clipPath: panel.clip,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 24px 80px rgba(0,0,0,0.52)",
            }}
          />
        </div>
      ))}

      {spokes.map((line) => (
        <div
          key={`${line.top}-${line.left}`}
          className="absolute rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.0),rgba(244,252,255,1),rgba(255,255,255,0.0))] blur-[0.4px]"
          style={{
            top: line.top,
            left: line.left,
            width: line.width,
            height: line.height,
            transform: `translate3d(calc(var(--rift-drift) * 0.18), 0, 0) rotate(${line.rotate})`,
            opacity: line.glow,
            boxShadow: "0 0 18px rgba(214,246,255,0.36)",
          }}
        />
      ))}

      {majorShards.map((shard) => (
        <div
          key={`${shard.top}-${shard.left}`}
          className="absolute"
          style={{
            top: shard.top,
            left: shard.left,
            width: shard.width,
            height: shard.height,
            transform: `translate3d(calc(var(--rift-drift) * ${shard.drift}), 0, 0) rotate(${shard.rotate})`,
          }}
        >
          <div
            className="absolute inset-0 border border-white/52 bg-[linear-gradient(158deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.08)_10%,rgba(18,26,32,0.48)_28%,rgba(0,0,0,0.88)_100%)]"
            style={{
              clipPath: shard.clip,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(255,255,255,0.08), 0 24px 72px rgba(0,0,0,0.54)",
            }}
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(132deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.08)_18%,transparent_44%,rgba(255,255,255,0.06)_100%)] opacity-90"
            style={{ clipPath: shard.clip }}
          />
          <div
            className="absolute inset-0 opacity-80"
            style={{
              clipPath: shard.clip,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 18px rgba(226,248,255,0.12)",
            }}
          />
        </div>
      ))}

      {fragments.map((shard) => (
        <div
          key={`${shard.top}-${shard.left}`}
          className="absolute"
          style={{
            top: shard.top,
            left: shard.left,
            width: shard.width,
            height: shard.height,
            transform: `translate3d(calc(var(--rift-drift) * ${shard.drift}), 0, 0) rotate(${shard.rotate})`,
            opacity: 0.88,
          }}
        >
          <div
            className="absolute inset-0 border border-white/36 bg-[linear-gradient(150deg,rgba(245,252,255,0.14)_0%,rgba(255,255,255,0.03)_22%,rgba(0,0,0,0.52)_100%)]"
            style={{
              clipPath: shard.clip,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24), 0 0 18px rgba(220,244,255,0.08)",
            }}
          />
        </div>
      ))}

      {sparks.map((spark) => (
        <div
          key={`${spark.top}-${spark.left}`}
          className="absolute h-2 w-2 rounded-full bg-white"
          style={{
            top: spark.top,
            left: spark.left,
            boxShadow: "0 0 18px rgba(255,255,255,0.92), 0 0 36px rgba(210,244,255,0.42)",
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_47%,rgba(255,255,255,0.24),transparent_10%),radial-gradient(circle_at_50%_47%,rgba(255,255,255,0.06),transparent_22%)] opacity-80" />
    </div>
  );
}

function IntroCard({
  y,
  viewportHeight,
  velocity,
}: {
  y: number;
  viewportHeight: number;
  velocity: number;
}) {
  const center = y + viewportHeight * 0.28;
  const progress = (center - viewportHeight * 0.56) / viewportHeight;
  const focus = 1 - clamp(Math.abs(progress) / 0.94, 0, 1);
  const curve = Math.sin(progress * Math.PI * 0.72);
  const x = curve * 18 - velocity * 6;
  const depth = clamp(112 - Math.abs(progress) * 210, -84, 126);
  const scale = 0.68 + focus * 0.34;
  const opacity = 0.2 + focus * 0.8;
  const blur = clamp(Math.abs(progress) * 0.7, 0, 1.05);

  return (
    <article
      className="absolute left-1/2 top-0 will-change-transform"
      style={{
        width: "88%",
        transform: `translate3d(calc(-50% + ${x}px), ${y}px, ${depth}px) scale(${scale}) rotateX(${clamp(progress * 18, -18, 18)}deg) rotateY(${clamp(curve * -9 + velocity * 5, -14, 14)}deg) rotateZ(${curve * -1.5}deg)`,
        transformOrigin: "50% 35%",
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      <CardShell className="px-5 py-5">
        <p className="chv-mobile-mono text-[0.58rem] uppercase tracking-[0.34em] text-[rgba(228,251,250,0.72)]">
          Work dossier
        </p>
        <h1 className="mt-4 text-[1.52rem] leading-[0.92] tracking-[-0.06em] text-white">Chloe Kang</h1>
        <p className="mt-3 max-w-[16rem] text-[0.9rem] leading-6 text-[rgba(228,241,244,0.76)]">
          A continuous reverse-chronological resume loop drifting through fractured glass.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {WORK_ROLE_STACK.map((role) => (
            <span
              key={role}
              className="rounded-full border border-white/16 bg-white/[0.07] px-3 py-2 text-[0.56rem] uppercase tracking-[0.24em] text-white/76"
            >
              {role}
            </span>
          ))}
        </div>
      </CardShell>
    </article>
  );
}

function EntryCard({
  entry,
  index,
  y,
  viewportHeight,
  velocity,
}: {
  entry: WorkEntry;
  index: number;
  y: number;
  viewportHeight: number;
  velocity: number;
}) {
  const layout = cardLanes[index % cardLanes.length];
  const { company, role } = splitRoleTitle(entry.title);
  const center = y + viewportHeight * 0.28;
  const progress = (center - viewportHeight * 0.56) / viewportHeight;
  const focus = 1 - clamp(Math.abs(progress) / 0.98, 0, 1);
  const curve = Math.sin(progress * Math.PI * 0.68);
  const x = layout.x + curve * 18 - velocity * 6;
  const depth = clamp(96 - Math.abs(progress) * 220 + focus * 12, -88, 118);
  const scale = 0.74 + focus * 0.26;
  const opacity = 0.18 + focus * 0.82;
  const blur = clamp(Math.abs(progress) * 0.78, 0, 1.15);
  const locationLine = normalizeLocation(entry.location);

  return (
    <article
      className="absolute left-1/2 top-0 will-change-transform"
      style={{
        width: `${layout.width}%`,
        transform: `translate3d(calc(-50% + ${x}px), ${y}px, ${depth}px) scale(${scale}) rotateX(${clamp(progress * 18, -18, 18)}deg) rotateY(${clamp(curve * -8 + layout.x * 0.24 - velocity * 4, -16, 16)}deg) rotateZ(${layout.rotateZ + curve * 0.8}deg)`,
        transformOrigin: "50% 35%",
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      <CardShell className="px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="chv-mobile-mono text-[0.56rem] uppercase tracking-[0.32em] text-[rgba(232,252,250,0.74)]">
              {entry.date}
            </p>
            <h2 className="mt-3 text-[1.2rem] leading-[1.01] tracking-[-0.05em] text-white">{role}</h2>
            <p className="mt-1 text-[0.82rem] uppercase tracking-[0.18em] text-[rgba(224,250,255,0.68)]">{company}</p>
          </div>
          {entry.type ? (
            <span className="rounded-full border border-white/14 bg-white/[0.07] px-2.5 py-1 text-[0.54rem] uppercase tracking-[0.24em] text-white/70">
              {entry.type}
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,16,24,0.16),rgba(5,12,18,0.06))] px-3.5 py-3">
          <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.28em] text-white/48">location</p>
          <p className="mt-1 text-[0.82rem] leading-6 text-[rgba(230,243,247,0.8)]">{locationLine}</p>
        </div>

        <div className="mt-4 space-y-2.5">
          {entry.bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,30,0.18),rgba(7,12,18,0.08))] px-3.5 py-3.5"
            >
              <p className="text-[0.9rem] leading-6 text-[rgba(245,248,250,0.92)]">{bullet}</p>
            </div>
          ))}
        </div>
      </CardShell>
    </article>
  );
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_6%,rgba(210,255,244,0.24),transparent_52%)] blur-3xl" />
      <div className="absolute inset-x-[14%] -bottom-5 h-9 rounded-full bg-black/34 blur-3xl" />
      <div className={`relative overflow-hidden rounded-[2rem] border border-white/22 bg-[linear-gradient(180deg,rgba(252,255,255,0.36)_0%,rgba(232,247,255,0.22)_18%,rgba(150,192,208,0.12)_46%,rgba(10,18,27,0.36)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(196,248,255,0.12)] backdrop-blur-[34px] ${className}`}>
        <div className="absolute inset-0 bg-[linear-gradient(126deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.14)_18%,transparent_44%,rgba(165,240,255,0.14)_74%,rgba(255,255,255,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(255,255,255,0.3),transparent_16%),radial-gradient(circle_at_84%_88%,rgba(176,255,243,0.14),transparent_24%)]" />
        <div className="absolute inset-x-[6%] top-[7%] h-[26%] rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.0))] opacity-70 blur-2xl" />
        <div className="absolute left-[10%] top-0 h-full w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent_22%,transparent_78%,rgba(255,255,255,0.14))]" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function renderSceneItem({
  item,
  y,
  viewportHeight,
  velocity,
  index,
}: {
  item: WorkSceneItem;
  y: number;
  viewportHeight: number;
  velocity: number;
  index: number;
}) {
  if (item.kind === "intro") {
    return <IntroCard y={y} viewportHeight={viewportHeight} velocity={velocity} />;
  }

  return <EntryCard entry={item.entry} index={index} y={y} viewportHeight={viewportHeight} velocity={velocity} />;
}

export function MobileWorkExperience() {
  const reducedMotion = useReducedMotion() ?? false;
  const [viewportHeight, setViewportHeight] = useState(820);
  const sceneScrollRef = useRef<ScrollSnapshot>({ position: 0, velocity: 0 });

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

  const items = useMemo<WorkSceneItem[]>(
    () => [
      { kind: "intro", id: "intro" },
      ...sortedEntries.map((entry) => ({
        kind: "entry" as const,
        id: entry.title,
        entry,
      })),
    ],
    [sortedEntries],
  );

  const itemSpan = Math.max(360, viewportHeight * 0.66);
  const loopLength = items.length * itemSpan;
  const { frame, scrollRef } = useInfiniteSmoothScroll({
    loopLength,
    viewportHeight,
    reducedMotion,
  });

  useEffect(() => {
    sceneScrollRef.current = frame;
  }, [frame]);

  const repeatedItems = useMemo(
    () =>
      [-1, 0, 1].flatMap((copy) =>
        items.map((item, index) => ({
          item,
          index,
          key: `${copy}-${item.id}`,
          y: viewportHeight * 0.22 + (copy * items.length + index) * itemSpan - frame.position,
        })),
      ),
    [frame.position, itemSpan, items, viewportHeight],
  );

  const scrollGhostStyle = {
    height: `${loopLength * 3 + viewportHeight}px`,
  } satisfies CSSProperties;

  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Work"
      title="where i've been"
      description="Scroll the work timeline."
      accent={WORK_ACCENT}
      showHeader={false}
      ambient={<RiftScene reducedMotion={reducedMotion} scrollRef={sceneScrollRef} />}
      contentClassName="h-[100svh] !px-0 !pb-0 !pt-0"
    >
      <section className="relative h-[100svh] overflow-hidden">
        <div
          ref={scrollRef}
          className="absolute inset-0 z-40 overflow-y-auto overscroll-none"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div style={scrollGhostStyle} />
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(2,5,9,0.1)_40%,rgba(2,5,9,0.62)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-[linear-gradient(180deg,rgba(2,5,9,0.94)_0%,rgba(2,5,9,0.56)_32%,rgba(2,5,9,0.0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44 bg-[linear-gradient(180deg,rgba(2,5,9,0.0)_0%,rgba(2,5,9,0.78)_70%,rgba(2,5,9,0.95)_100%)]" />

        <div
          className="pointer-events-none absolute inset-0 z-30"
          style={{ perspective: "2200px", transformStyle: "preserve-3d" }}
        >
          {repeatedItems.map(({ item, index, key, y }) => (
            <div key={key}>
              {renderSceneItem({
                item,
                y,
                viewportHeight,
                velocity: frame.velocity,
                index,
              })}
            </div>
          ))}
        </div>
      </section>
    </MobileRouteFrame>
  );
}
