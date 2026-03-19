"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
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

const sheenVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sheenFragmentShader = `
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
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(11.4, -7.9);
    amplitude *= 0.53;
  }

  return value;
}

float field(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(1.0, 1.35);
  float t = uTime * 0.18 * uMotion;
  p += uFlow * 0.18;

  vec2 warp = vec2(
    fbm(p * 2.4 + vec2(0.0, t)),
    fbm(p * 2.1 - vec2(t * 0.8, -t * 0.24))
  );

  p += (warp - 0.5) * 0.72;

  float ridges = abs(sin((p.x * 8.2 + p.y * 2.8 + fbm(p * 2.2) * 4.0) + t * 5.2));
  float foil = abs(sin((p.y * 10.8 - p.x * 5.2) + t * 3.4 + fbm(p * 3.0) * 4.6));
  float pools = fbm(p * 4.4 - vec2(t * 0.55, t * 0.28));

  return ridges * 0.42 + foil * 0.28 + pools * 0.6;
}

void main() {
  vec2 uv = vUv;
  float h = field(uv);
  float epsilon = 0.0032;
  float hx = field(uv + vec2(epsilon, 0.0)) - h;
  float hy = field(uv + vec2(0.0, epsilon)) - h;

  vec3 normal = normalize(vec3(-hx * 3.2, -hy * 3.2, 1.0));
  vec3 lightA = normalize(vec3(-0.35, 0.6, 1.0));
  vec3 lightB = normalize(vec3(0.48, -0.18, 0.74));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  float diffuse = max(dot(normal, lightA), 0.0) * 0.62 + max(dot(normal, lightB), 0.0) * 0.3;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);
  float specular = pow(max(dot(reflect(-lightA, normal), viewDir), 0.0), 26.0);
  specular += pow(max(dot(reflect(-lightB, normal), viewDir), 0.0), 16.0) * 0.5;

  vec3 silverDark = vec3(0.018, 0.024, 0.032);
  vec3 silverLight = vec3(0.44, 0.54, 0.62);
  vec3 metal = mix(silverDark, silverLight, smoothstep(0.24, 1.18, h * 0.56 + diffuse * 0.58));
  metal += vec3(0.74, 0.92, 1.0) * (fresnel * 0.08 + specular * 0.12);

  float vignette = smoothstep(1.08, 0.18, length((uv - 0.5) * vec2(0.92, 1.0)));
  float alpha = (0.2 + fresnel * 0.18 + specular * 0.12) * vignette;
  alpha *= smoothstep(0.06, 0.22, uv.y) * smoothstep(0.02, 0.26, 1.0 - uv.y);

  gl_FragColor = vec4(metal, clamp(alpha, 0.0, 0.32));
}
`;

type ScrollSnapshot = {
  position: number;
  velocity: number;
};

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

function makeGlassGeometry(shape: THREE.Shape, depth: number, bevelSize: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize,
    bevelThickness: depth * 0.72,
  });
  geometry.center();
  return geometry;
}

function useSmoothSceneScroll({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    target: 0,
    current: 0,
    velocity: 0,
  });
  const [frame, setFrame] = useState<ScrollSnapshot>({ position: 0, velocity: 0 });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTop = 0;
    stateRef.current.target = 0;
    stateRef.current.current = 0;
    stateRef.current.velocity = 0;

    const handleScroll = () => {
      stateRef.current.target = element.scrollTop;
    };

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - previous, 34);
      previous = now;

      const state = stateRef.current;
      const before = state.current;
      const diff = state.target - state.current;
      const ease = reducedMotion ? 0.44 : 0.2;
      state.current += diff * ease;
      if (Math.abs(state.target - state.current) < 0.45) {
        state.current = state.target;
      }
      state.velocity = (state.current - before) / Math.max(delta / 16.67, 0.001);
      if (Math.abs(state.target - state.current) < 0.45) {
        state.velocity = 0;
      }

      setFrame({
        position: state.current,
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
  }, [reducedMotion]);

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

function FractureSheenPlane({
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
      uMotion: { value: reducedMotion ? 0.24 : 1 },
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
      clamp(scrollRef.current.velocity * 0.016, -0.32, 0.32),
      modulo(scrollRef.current.position, 2400) / 2400 - 0.5,
    );
  });

  return (
    <mesh position={[0, -0.2, -16.5]} scale={[18, 24, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={sheenVertexShader}
        fragmentShader={sheenFragmentShader}
      />
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
  const geometry = useMemo(
    () => makeGlassGeometry(shape, 0.08 + seededNoise(seed * 13.2) * 0.12, 0.03 + seededNoise(seed * 7.7) * 0.02),
    [seed, shape],
  );
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 14), [geometry]);
  const config = useMemo(() => {
    const angle = seededNoise(seed * 2.3) * Math.PI * 2;
    const radius = 4.2 + seededNoise(seed * 4.9) * 5.8;
    return {
      angle,
      radius,
      x: Math.cos(angle) * radius * (0.86 + seededNoise(seed * 8.1) * 0.34),
      y: Math.sin(angle) * radius * (1.1 + seededNoise(seed * 5.7) * 0.48),
      z: -1.2 - seededNoise(seed * 6.3) * 7.4,
      scale: 0.95 + seededNoise(seed * 7.9) * 2.9,
      rotX: -0.9 + seededNoise(seed * 9.4) * 1.8,
      rotY: -1.0 + seededNoise(seed * 10.3) * 2.0,
      rotZ: seededNoise(seed * 11.8) * Math.PI * 2,
      opacity: 0.14 + seededNoise(seed * 12.9) * 0.12,
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
    material.opacity = clamp(0.16 + (10 - Math.abs(config.z)) * 0.015, 0.16, 0.34);
  });

  return (
    <group ref={groupRef} position={[config.x, config.y, config.z]} scale={config.scale}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#eaf8ff"
          transparent
          opacity={config.opacity}
          transmission={0.98}
          roughness={0.02}
          metalness={0.02}
          ior={1.16}
          thickness={2.4}
          clearcoat={1}
          clearcoatRoughness={0.015}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#f9fdff" transparent opacity={0.22} />
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
  const geometry = useMemo(
    () => makeGlassGeometry(shape, 0.1 + seededNoise(seed * 2.9) * 0.14, 0.02 + seededNoise(seed * 8.1) * 0.03),
    [seed, shape],
  );
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 8), [geometry]);
  const config = useMemo(() => {
    const angle = seededNoise(seed * 3.2) * Math.PI * 2;
    const radius = 0.58 + seededNoise(seed * 5.8) * 1.8;
    return {
      angle,
      radius,
      x: Math.cos(angle) * radius * 0.7,
      y: Math.sin(angle) * radius * 0.96,
      z: -0.3 - seededNoise(seed * 6.4) * 3.6,
      scale: 2.4 + seededNoise(seed * 8.2) * 3.2,
      tilt: -0.28 + seededNoise(seed * 9.7) * 0.56,
      opacity: 0.16 + seededNoise(seed * 10.3) * 0.14,
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
    material.opacity = clamp(0.3 - Math.abs(drift) * 0.06, 0.22, 0.38);
  });

  return (
    <group ref={groupRef} position={[config.x, config.y, config.z]} scale={config.scale}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#fbfeff"
          transparent
          opacity={config.opacity}
          transmission={0.99}
          roughness={0.018}
          metalness={0.02}
          ior={1.14}
          thickness={3.4}
          clearcoat={1}
          clearcoatRoughness={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}

function FramingGlassShard({
  seed,
  x,
  y,
  z,
  scale,
  rotation,
  scrollRef,
}: {
  seed: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: [number, number, number];
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const edgeRef = useRef<THREE.LineSegments | null>(null);
  const shape = useMemo(() => makeShardShape(seed), [seed]);
  const geometry = useMemo(() => makeGlassGeometry(shape, 0.18, 0.05), [shape]);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 10), [geometry]);

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

    const time = state.clock.getElapsedTime();
    const drift = clamp(scrollRef.current.velocity * 0.03, -0.7, 0.7);
    group.position.x = x - drift * (0.7 + scale * 0.12);
    group.position.y = y + Math.sin(time * 0.05 + seed) * 0.08;
    group.rotation.x = rotation[0] + Math.sin(time * 0.04 + seed * 0.2) * 0.05;
    group.rotation.y = rotation[1] + drift * 0.06;
    group.rotation.z = rotation[2] + Math.cos(time * 0.04 + seed * 0.18) * 0.04;

    const material = edge.material as THREE.LineBasicMaterial;
    material.opacity = 0.28 + Math.abs(drift) * 0.04;
  });

  return (
    <group ref={groupRef} position={[x, y, z]} scale={scale}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#f7fdff"
          transparent
          opacity={0.2}
          transmission={0.99}
          roughness={0.016}
          metalness={0.02}
          ior={1.18}
          thickness={4.8}
          clearcoat={1}
          clearcoatRoughness={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.28} />
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
  const floatingShards = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const radialShards = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 101), []);
  const framingShards = useMemo(
    () => [
      { seed: 201, x: -7.2, y: 4.8, z: 2.2, scale: 3.9, rotation: [-0.18, 0.42, -0.38] as [number, number, number] },
      { seed: 202, x: 7.4, y: 4.2, z: 1.8, scale: 3.6, rotation: [0.24, -0.36, 0.44] as [number, number, number] },
      { seed: 203, x: -8.1, y: -0.4, z: 1.4, scale: 4.6, rotation: [-0.12, 0.34, -0.52] as [number, number, number] },
      { seed: 204, x: 8.4, y: -1.0, z: 1.1, scale: 4.8, rotation: [0.18, -0.28, 0.58] as [number, number, number] },
      { seed: 205, x: -6.6, y: -5.6, z: 2.4, scale: 3.5, rotation: [0.14, 0.26, -0.26] as [number, number, number] },
      { seed: 206, x: 6.8, y: -5.2, z: 2.1, scale: 3.4, rotation: [-0.18, -0.22, 0.22] as [number, number, number] },
    ],
    [],
  );
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

      state.camera.position.x += ((drift * 0.9 + Math.sin(time * 0.05) * 0.12) - state.camera.position.x) * 0.06;
      state.camera.position.y += ((Math.cos(time * 0.06 + phase * Math.PI * 2) * 0.18) - state.camera.position.y) * 0.06;
      state.camera.position.z += ((9 - Math.abs(drift) * 0.35) - state.camera.position.z) * 0.08;
      state.camera.lookAt(0, 0, -2.8);
    });

    return (
      <group ref={rigRef}>
        <SmokePlane scrollRef={scrollRef} reducedMotion={reducedMotion} />
        <FractureSheenPlane scrollRef={scrollRef} reducedMotion={reducedMotion} />
        <mesh position={[0, 0.18, -12.4]} scale={[3.1, 4.2, 1]}>
          <circleGeometry args={[1, 7]} />
          <meshBasicMaterial color="#010204" transparent opacity={0.98} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.18, -12.1]} scale={[4.3, 5.9, 1]}>
          <circleGeometry args={[1, 72]} />
          <meshBasicMaterial color="#d7f7ff" transparent opacity={0.1} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.18, -10.9]} scale={[6.6, 8.5, 1]}>
          <circleGeometry args={[1, 72]} />
          <meshBasicMaterial color="#020406" transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <mesh position={[0, -3.4, -9.5]} rotation={[-1.25, 0, 0]} scale={[18, 18, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshPhysicalMaterial
            color="#04080c"
            transparent
            opacity={0.52}
            roughness={0.08}
            transmission={0.22}
            metalness={0.06}
            clearcoat={1}
            clearcoatRoughness={0.06}
          />
        </mesh>
        {radialShards.map((seed) => (
          <RadialGlassShard key={seed} seed={seed} scrollRef={scrollRef} />
        ))}
        {floatingShards.map((seed) => (
          <GlassShard key={seed} seed={seed} scrollRef={scrollRef} />
        ))}
        {framingShards.map((shard) => (
          <FramingGlassShard key={shard.seed} scrollRef={scrollRef} {...shard} />
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
        <fog attach="fog" args={["#020406", 7, 18]} />
        <ambientLight intensity={0.2} color="#dff9ff" />
        <directionalLight position={[2.2, 4.8, 6]} intensity={1.25} color="#f7ffff" />
        <pointLight position={[-4, 1, 3]} intensity={0.92} color="#d5f7ff" />
        <pointLight position={[4, -3, 4]} intensity={0.74} color="#f5ffff" />
        <pointLight position={[0, 0.4, 5.5]} intensity={0.8} color="#ffffff" />
        <SceneRig />
      </Canvas>

      <ShatteredGlassOverlay scrollRef={scrollRef} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.38)_14%,rgba(0,0,0,0.0)_28%),radial-gradient(circle_at_50%_10%,rgba(224,255,250,0.06),transparent_24%),linear-gradient(180deg,rgba(1,4,8,0.18)_0%,rgba(1,4,8,0.04)_28%,rgba(1,4,8,0.68)_76%,rgba(1,4,8,0.94)_100%)]" />
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
    { top: "-1%", left: "40%", width: "20%", height: "38%", rotate: "-9deg", clip: "polygon(28% 0%, 58% 4%, 100% 96%, 38% 100%, 0% 64%)", drift: 0.16 },
    { top: "8%", left: "61%", width: "18%", height: "28%", rotate: "18deg", clip: "polygon(12% 0%, 100% 18%, 74% 100%, 0% 74%)", drift: 0.14 },
    { top: "9%", left: "19%", width: "16%", height: "28%", rotate: "-18deg", clip: "polygon(34% 0%, 100% 18%, 62% 100%, 0% 76%)", drift: 0.14 },
  ] as const;

  const nearShards = [
    { top: "-6%", left: "-8%", width: "34%", height: "26%", rotate: "-16deg", clip: "polygon(0% 10%, 88% 0%, 100% 78%, 10% 100%)", drift: 0.04 },
    { top: "72%", left: "74%", width: "30%", height: "24%", rotate: "16deg", clip: "polygon(8% 0%, 100% 14%, 92% 100%, 0% 78%)", drift: 0.04 },
  ] as const;

  const fragments = [
    { top: "15%", left: "81%", width: "6%", height: "9%", rotate: "18deg", clip: "polygon(16% 0%, 100% 28%, 74% 100%, 0% 62%)", drift: 0.05 },
    { top: "40%", left: "83%", width: "7%", height: "9%", rotate: "22deg", clip: "polygon(18% 0%, 100% 26%, 58% 100%, 0% 62%)", drift: 0.05 },
    { top: "68%", left: "20%", width: "6%", height: "10%", rotate: "-16deg", clip: "polygon(34% 0%, 100% 22%, 66% 100%, 0% 70%)", drift: 0.05 },
    { top: "74%", left: "78%", width: "7%", height: "10%", rotate: "14deg", clip: "polygon(22% 0%, 100% 18%, 74% 100%, 0% 72%)", drift: 0.05 },
  ] as const;

  const glints = [
    { top: "22%", left: "59%" },
    { top: "28%", left: "34%" },
    { top: "45%", left: "69%" },
    { top: "59%", left: "37%" },
    { top: "72%", left: "62%" },
  ] as const;

  return (
    <div ref={rootRef} className="absolute inset-0 [--rift-drift:0px]">
      <div
        className="absolute left-1/2 top-[47%] h-[42%] w-[52%] -translate-x-1/2 -translate-y-1/2 bg-black"
        style={{
          clipPath: "polygon(24% 0%, 54% 6%, 80% 18%, 100% 44%, 82% 82%, 56% 100%, 20% 94%, 0% 58%, 8% 20%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.24), 0 0 180px rgba(0,0,0,0.98)",
        }}
      />
      <div
        className="absolute left-1/2 top-[47%] h-[50%] w-[58%] -translate-x-1/2 -translate-y-1/2 opacity-90"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16), rgba(255,255,255,0.0) 32%)",
          filter: "blur(18px)",
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
            className="absolute inset-0 border border-white/12 bg-[linear-gradient(150deg,rgba(240,252,255,0.08)_0%,rgba(16,22,28,0.36)_30%,rgba(0,0,0,0.72)_100%)]"
            style={{
              clipPath: panel.clip,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 60px rgba(0,0,0,0.52)",
              opacity: 0.6,
            }}
          />
        </div>
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
              boxShadow: "0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(255,255,255,0.06), 0 18px 54px rgba(0,0,0,0.46)",
              opacity: 0.72,
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

      {glints.map((spark) => (
        <div
          key={`${spark.top}-${spark.left}`}
          className="absolute h-1.5 w-1.5 rounded-full bg-white"
          style={{
            top: spark.top,
            left: spark.left,
            boxShadow: "0 0 14px rgba(255,255,255,0.92), 0 0 28px rgba(210,244,255,0.36)",
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_47%,rgba(255,255,255,0.2),transparent_9%),radial-gradient(circle_at_50%_47%,rgba(255,255,255,0.04),transparent_20%)] opacity-70" />
    </div>
  );
}

function RollingCard({
  children,
  railOffset,
  viewportHeight,
  order,
}: {
  children: React.ReactNode;
  railOffset: number;
  viewportHeight: number;
  order: number;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const update = () => {
      setMetrics({
        top: element.offsetTop,
        height: element.offsetHeight,
      });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const cardCenter = railOffset + metrics.top + metrics.height / 2;
  const progress = metrics.height
    ? (cardCenter - viewportHeight * 0.53) / (viewportHeight * 0.5)
    : 0;
  const distance = clamp(Math.abs(progress), 0, 1.45);
  const flatten = clamp((distance - 0.06) / 1.08, 0, 1);
  const rotateX = progress * -20;
  const scale = 1 - flatten * 0.12;
  const depth = (1 - flatten) * 74 - flatten * 42;
  const yShift = progress * flatten * 18;
  const blur = Math.max(distance - 0.18, 0) * 1.8;
  const opacity = clamp(1.02 - flatten * 0.78, 0.12, 1);

  return (
    <div
      ref={rootRef}
      className="relative will-change-transform"
      style={{
        opacity,
        filter: `blur(${blur}px) saturate(${1.04 - flatten * 0.08})`,
        transform: `translate3d(0, ${yShift}px, ${depth}px) rotateX(${rotateX}deg) scale(${scale})`,
        transformOrigin: progress < 0 ? "50% 100%" : "50% 0%",
        transformStyle: "preserve-3d",
        zIndex: 200 - order,
      }}
    >
      {children}
    </div>
  );
}

function IntroCard() {
  return (
    <article className="will-change-transform">
      <CardShell className="px-5 py-5">
        <p className="chv-mobile-mono text-[0.58rem] uppercase tracking-[0.34em] text-[rgba(228,251,250,0.72)]">
          Work dossier
        </p>
        <h1 className="mt-4 text-[1.52rem] leading-[0.92] tracking-[-0.06em] text-white">Chloe Kang</h1>
        <p className="mt-3 max-w-[16rem] text-[0.9rem] leading-6 text-[rgba(228,241,244,0.76)]">
          A reverse-chronological resume field drifting through fractured glass.
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
}: {
  entry: WorkEntry;
}) {
  const { company, role } = splitRoleTitle(entry.title);
  const locationLine = normalizeLocation(entry.location);

  return (
    <article className="will-change-transform">
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
      <div className={`relative overflow-hidden rounded-[2rem] border border-white/22 bg-[linear-gradient(180deg,rgba(252,255,255,0.38)_0%,rgba(232,247,255,0.22)_16%,rgba(150,192,208,0.12)_42%,rgba(10,18,27,0.42)_100%)] shadow-[0_22px_72px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(196,248,255,0.12)] backdrop-blur-[34px] ${className}`}>
        <div className="absolute inset-0 bg-[linear-gradient(126deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.14)_18%,transparent_44%,rgba(165,240,255,0.14)_74%,rgba(255,255,255,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(255,255,255,0.3),transparent_16%),radial-gradient(circle_at_84%_88%,rgba(176,255,243,0.14),transparent_24%)]" />
        <div className="absolute inset-x-[6%] top-[7%] h-[26%] rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.0))] opacity-70 blur-2xl" />
        <div className="absolute left-[10%] top-0 h-full w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent_22%,transparent_78%,rgba(255,255,255,0.14))]" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export function MobileWorkExperience() {
  const reducedMotion = useReducedMotion() ?? false;
  const [viewportHeight, setViewportHeight] = useState(820);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
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

  const { frame, scrollRef } = useSmoothSceneScroll({
    reducedMotion,
  });

  useEffect(() => {
    sceneScrollRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const update = () => setContentHeight(element.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);

    return () => observer.disconnect();
  }, [sortedEntries]);

  const railOffset = viewportHeight * 0.22 - frame.position;

  const scrollGhostStyle = {
    height: `${Math.max(contentHeight + viewportHeight * 0.9, viewportHeight * 1.6)}px`,
  } satisfies CSSProperties;

  return (
    <MobileRouteFrame
      currentPath="/work"
      eyebrow="Work"
      title="where i've been"
      description="Scroll the work timeline."
      accent={WORK_ACCENT}
      showHeader={false}
      showReturnSigil={false}
      ambient={<RiftScene reducedMotion={reducedMotion} scrollRef={sceneScrollRef} />}
      contentClassName="h-[100svh] !px-0 !pb-0 !pt-0"
    >
      <section className="relative h-[100svh] overflow-hidden">
        <MobileRouteLink
          href="/"
          accent={WORK_ACCENT}
          label="Chloeverse"
          aria-label="Return to the Chloeverse"
          className="fixed left-4 top-[calc(env(safe-area-inset-top,0px)+0.9rem)] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(10,10,12,0.82)] text-white/84 backdrop-blur-xl"
        >
          <span aria-hidden="true" className="text-[1.25rem] leading-none">
            &#x2039;
          </span>
        </MobileRouteLink>

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
          className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
          style={{
            perspective: "1200px",
            perspectiveOrigin: "50% 48%",
            maskImage: "linear-gradient(180deg, transparent 0%, black 12%, black 82%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 12%, black 82%, transparent 100%)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0"
            style={{
              transform: `translate3d(0, ${railOffset}px, 0)`,
              willChange: "transform",
              transformStyle: "preserve-3d",
            }}
          >
            <div ref={contentRef} className="mx-auto flex w-full max-w-[27rem] flex-col gap-3 px-5 pb-[32svh] pt-[16svh]">
              <RollingCard railOffset={railOffset} viewportHeight={viewportHeight} order={0}>
                <IntroCard />
              </RollingCard>
              {sortedEntries.map((entry, index) => (
                <RollingCard key={entry.title} railOffset={railOffset} viewportHeight={viewportHeight} order={index + 1}>
                  <EntryCard entry={entry} />
                </RollingCard>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MobileRouteFrame>
  );
}
