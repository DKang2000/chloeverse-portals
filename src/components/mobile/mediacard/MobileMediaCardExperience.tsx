"use client";

import Image from "next/image";
import { Decal, RoundedBox, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";

import { MobileRouteLink } from "@/components/mobile/shared/MobileRouteLink";
import {
  MEDIACARD_AUDIENCE,
  MEDIACARD_COLLABS,
  MEDIACARD_METRICS,
  MEDIACARD_SERVICES,
} from "@/lib/mobile-content";

const ACCENT = "#f4eee6";
const CUBE_UNIT = 2.28;
const FACE_OFFSET = CUBE_UNIT / 2 + 0.02;
const BASE_YAW = -Math.PI / 4;
const BASE_PITCH = -0.48;
const BASE_ROLL = 0.56;
const MIN_PITCH = -1.2;
const MAX_PITCH = 0.5;
const IDLE_RESUME_DELAY_MS = 900;
const DRAG_ROTATION_FACTOR = 0.0095;
const TAP_DISTANCE_THRESHOLD = 10;

type FaceId = "metrics" | "markets" | "collabs" | "terms";

type CubeFace = {
  id: FaceId;
  label: string;
  detailTitle: string;
  eyebrow: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

const SIDE_FACES: CubeFace[] = [
  {
    id: "metrics",
    label: "metrics",
    detailTitle: "Metrics",
    eyebrow: "audience scale",
    position: [0, 0, FACE_OFFSET],
    rotation: [0, 0, 0],
  },
  {
    id: "markets",
    label: "markets",
    detailTitle: "Markets",
    eyebrow: "audience territories",
    position: [FACE_OFFSET, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: "collabs",
    label: "collabs",
    detailTitle: "Collabs",
    eyebrow: "selected names",
    position: [0, 0, -FACE_OFFSET],
    rotation: [0, Math.PI, 0],
  },
  {
    id: "terms",
    label: "terms",
    detailTitle: "Terms",
    eyebrow: "partnership details",
    position: [-FACE_OFFSET, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
  },
] as const;

const MARKET_LAYOUT = [
  { left: "10%", top: "16%" },
  { left: "54%", top: "12%" },
  { left: "14%", top: "60%" },
  { left: "56%", top: "56%" },
] as const;

const crystalVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vObjectPosition;
varying vec3 vNormalDir;

void main() {
  vObjectPosition = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormalDir = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const crystalNoiseShader = `
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float fbm3d(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise3d(p);
    p = p * 2.02 + vec3(7.3, -3.7, 4.6);
    amplitude *= 0.5;
  }

  return value;
}
`;

const crystalCoreFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uEnergy;

varying vec3 vWorldPosition;
varying vec3 vObjectPosition;
varying vec3 vNormalDir;

${crystalNoiseShader}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 normal = normalize(vNormalDir);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.8);

  float strata = fbm3d(vObjectPosition * 2.6 + vec3(0.0, uTime * 0.08, uTime * 0.05));
  float veins = fbm3d(vObjectPosition * 4.2 - vec3(uTime * 0.04, 0.0, uTime * 0.09));
  float pulse = sin(uTime * 1.8 + (vObjectPosition.x + vObjectPosition.y + vObjectPosition.z) * 3.6) * 0.5 + 0.5;
  float beacon = smoothstep(0.1, 1.2, 1.0 - length(vObjectPosition.xy) * 0.42);

  vec3 cold = vec3(0.78, 0.90, 1.0);
  vec3 warm = vec3(1.0, 0.96, 0.92);
  vec3 lavender = vec3(0.94, 0.90, 1.0);

  vec3 color = mix(cold, warm, strata * 0.46);
  color = mix(color, lavender, veins * 0.26);
  color += vec3(1.0) * (0.22 + beacon * 0.34 + pulse * 0.08);
  color += vec3(0.76, 0.88, 1.0) * fresnel * (0.32 + uEnergy * 0.22);
  color += vec3(1.0, 0.98, 0.95) * veins * 0.18;

  float alpha = 0.42 + fresnel * 0.32 + beacon * 0.14 + uEnergy * 0.1;
  gl_FragColor = vec4(color, alpha);
}
`;

const crystalShellFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uEnergy;

varying vec3 vWorldPosition;
varying vec3 vObjectPosition;
varying vec3 vNormalDir;

${crystalNoiseShader}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 normal = normalize(vNormalDir);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.4);
  float shimmer = fbm3d(vObjectPosition * 6.0 + vec3(uTime * 0.18, -uTime * 0.15, uTime * 0.11));
  float glint = pow(max(0.0, sin((vObjectPosition.x - vObjectPosition.z) * 12.0 + uTime * 1.8)), 10.0);
  float ridge = pow(max(abs(normal.x), max(abs(normal.y), abs(normal.z))), 14.0);

  vec3 spectral = mix(vec3(0.84, 0.92, 1.0), vec3(1.0, 0.96, 0.9), shimmer);
  vec3 color = spectral * (0.18 + fresnel * 1.1 + glint * 0.22 + ridge * 0.4);
  color += vec3(1.0) * (0.1 + uEnergy * 0.26);

  float alpha = clamp(fresnel * 0.95 + ridge * 0.16 + shimmer * 0.08 + uEnergy * 0.08, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`;

const auraVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const auraFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uEnergy;

varying vec2 vUv;

void main() {
  vec2 uv = vUv - 0.5;
  float r = length(uv);
  float ring = smoothstep(0.36, 0.0, r);
  float halo = smoothstep(0.7, 0.0, r);
  float pulse = sin(uTime * 1.2) * 0.5 + 0.5;
  float shimmer = sin((uv.x + uv.y) * 10.0 + uTime * 1.4) * 0.5 + 0.5;
  vec3 color = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.98, 0.94), shimmer * 0.45 + pulse * 0.2);
  float alpha = ring * (0.14 + uEnergy * 0.12) + halo * 0.07;
  gl_FragColor = vec4(color, alpha);
}
`;

function resolveFaceIdFromLocalPoint(point: THREE.Vector3): FaceId | null {
  const absX = Math.abs(point.x);
  const absY = Math.abs(point.y);
  const absZ = Math.abs(point.z);

  if (absY > absX && absY > absZ) {
    return null;
  }

  if (absZ >= absX) {
    return point.z >= 0 ? "metrics" : "collabs";
  }

  return point.x >= 0 ? "markets" : "terms";
}

function createFaceLabelTexture(label: string) {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '600 168px "Iowan Old Style", "Times New Roman", serif';
  context.lineJoin = "round";
  context.lineWidth = 16;
  context.strokeStyle = "rgba(255,255,255,0.42)";
  context.fillStyle = "rgba(18,18,20,0.92)";
  context.shadowColor = "rgba(255,255,255,0.15)";
  context.shadowBlur = 22;
  context.strokeText(label, canvas.width / 2, canvas.height / 2);
  context.shadowBlur = 0;
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function brandLogoPath(brand: string) {
  return `/mediacard/logos/${brand.toLowerCase().replace(/\s+/g, "")}.png`;
}

export function MobileMediaCardExperience() {
  const reducedMotion = useReducedMotion();
  const [activeFaceId, setActiveFaceId] = useState<FaceId | null>(null);
  const [hoveredFaceId, setHoveredFaceId] = useState<FaceId | null>(null);
  const [manualRotation, setManualRotation] = useState({ pitch: BASE_PITCH, yaw: BASE_YAW });
  const [isDraggingCube, setIsDraggingCube] = useState(false);
  const [lastInteractionAt, setLastInteractionAt] = useState(0);
  const visibleRotationRef = useRef({ pitch: BASE_PITCH, yaw: BASE_YAW });

  const activeFace = useMemo(
    () => SIDE_FACES.find((face) => face.id === activeFaceId) ?? null,
    [activeFaceId],
  );

  const highlightedFaceId = activeFaceId ?? hoveredFaceId;
  const handleCubeInteractionStart = () => {
    if (activeFaceId) return;

    setIsDraggingCube(true);
    setLastInteractionAt(performance.now());
    setManualRotation({
      pitch: visibleRotationRef.current.pitch,
      yaw: visibleRotationRef.current.yaw,
    });
  };

  const handleCubeInteractionEnd = () => {
    setIsDraggingCube(false);
    setLastInteractionAt(performance.now());
    setManualRotation({
      pitch: visibleRotationRef.current.pitch,
      yaw: visibleRotationRef.current.yaw,
    });
  };

  const handleRotateCube = (deltaX: number, deltaY: number) => {
    if (activeFaceId) return;

    setManualRotation((value) => ({
      pitch: THREE.MathUtils.clamp(value.pitch + deltaY * DRAG_ROTATION_FACTOR, MIN_PITCH, MAX_PITCH),
      yaw: value.yaw + deltaX * DRAG_ROTATION_FACTOR,
    }));
  };

  const pagePadding = {
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.95rem)",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.1rem)",
  } as CSSProperties;

  return (
    <main className="chv-mobile-root relative min-h-[100svh] overflow-hidden bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#030303_0%,#010101_56%,#000000_100%)]" />
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_66%)] blur-[140px]" />
        <div className="absolute left-1/2 top-[28%] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(233,240,255,0.18),transparent_72%)] blur-[120px]" />
        <div className="chv-vignette absolute inset-0 opacity-85" />
      </div>

      <MobileRouteLink
        href="/"
        accent={ACCENT}
        label="Chloeverse"
        aria-label="Return to the Chloeverse"
        className="fixed left-4 top-[calc(env(safe-area-inset-top,0px)+0.9rem)] z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(10,10,12,0.84)] text-white/84 backdrop-blur-xl"
      >
        <span aria-hidden="true" className="text-[1.25rem] leading-none">
          &#x2039;
        </span>
      </MobileRouteLink>

      <section className="relative z-10 flex min-h-[100svh] items-center justify-center px-4" style={pagePadding}>
        <motion.div
          className="relative h-[31rem] w-full max-w-[23rem] touch-none"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[2.4rem]">
            <CrystalCubeViewport
              activeFaceId={activeFaceId}
              highlightedFaceId={highlightedFaceId}
              isDraggingCube={isDraggingCube}
              lastInteractionAt={lastInteractionAt}
              manualRotation={manualRotation}
              reducedMotion={Boolean(reducedMotion)}
              onCubeInteractionEnd={handleCubeInteractionEnd}
              onCubeInteractionStart={handleCubeInteractionStart}
              onVisibleRotationChange={(pitch, yaw) => {
                visibleRotationRef.current = { pitch, yaw };
              }}
              onHoverFaceChange={setHoveredFaceId}
              onDragStateChange={setIsDraggingCube}
              onRotateCube={handleRotateCube}
              onSelectFace={setActiveFaceId}
            />
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {activeFace ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_50%_46%,rgba(255,255,255,0.08),rgba(0,0,0,0.7)_42%,rgba(0,0,0,0.92)_100%)] px-4"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 4.9rem)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.2rem)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,#ffffff_0%,#f6f2eb_100%)] px-5 py-5 text-black shadow-[0_30px_90px_rgba(0,0,0,0.3)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0)_38%,rgba(210,204,196,0.2)_100%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4 border-b border-black/8 pb-4">
                  <div>
                    <p className="chv-mobile-mono text-[0.54rem] uppercase tracking-[0.34em] text-black/34">
                      {activeFace.eyebrow}
                    </p>
                    <h2 className="mt-3 chv-mobile-display text-[2.5rem] leading-[0.9] tracking-[-0.07em] text-black/84">
                      {activeFace.detailTitle}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFaceId(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-black/62"
                    aria-label={`Close ${activeFace.detailTitle}`}
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5">
                  {activeFace.id === "metrics" ? <MetricsCard /> : null}
                  {activeFace.id === "markets" ? <MarketsCard /> : null}
                  {activeFace.id === "collabs" ? <CollabsCard /> : null}
                  {activeFace.id === "terms" ? <TermsCard /> : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function CrystalCubeViewport({
  activeFaceId,
  highlightedFaceId,
  isDraggingCube,
  lastInteractionAt,
  manualRotation,
  reducedMotion,
  onCubeInteractionEnd,
  onCubeInteractionStart,
  onVisibleRotationChange,
  onHoverFaceChange,
  onDragStateChange,
  onRotateCube,
  onSelectFace,
}: {
  activeFaceId: FaceId | null;
  highlightedFaceId: FaceId | null;
  isDraggingCube: boolean;
  lastInteractionAt: number;
  manualRotation: { pitch: number; yaw: number };
  reducedMotion: boolean;
  onCubeInteractionEnd: () => void;
  onCubeInteractionStart: () => void;
  onVisibleRotationChange: (pitch: number, yaw: number) => void;
  onHoverFaceChange: (faceId: FaceId | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onRotateCube: (deltaX: number, deltaY: number) => void;
  onSelectFace: (faceId: FaceId) => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8.2], fov: 28 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
      }}
      className="h-full w-full"
    >
      <color attach="background" args={["#020202"]} />
      <fog attach="fog" args={["#020202", 8.5, 16]} />
      <ambientLight intensity={0.32} color="#f1f5ff" />
      <hemisphereLight intensity={0.72} color="#f8fbff" groundColor="#030303" />
      <directionalLight position={[4.8, 3.6, 5.8]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[-3.8, -2.4, 3.4]} intensity={1.05} color="#d8e6ff" />
      <pointLight position={[0, 0.2, 3.1]} intensity={26} distance={14} decay={2} color="#ffffff" />
      <pointLight position={[0, 0.1, -2.8]} intensity={10} distance={10} decay={2} color="#d7e8ff" />
      <Sparkles
        count={10}
        scale={[8, 8, 8]}
        size={1.8}
        speed={reducedMotion ? 0.015 : 0.045}
        color="#ffffff"
        opacity={0.12}
      />
      <CrystalCubeStage
        activeFaceId={activeFaceId}
        highlightedFaceId={highlightedFaceId}
        isDraggingCube={isDraggingCube}
        lastInteractionAt={lastInteractionAt}
        manualRotation={manualRotation}
        reducedMotion={reducedMotion}
        onCubeInteractionEnd={onCubeInteractionEnd}
        onCubeInteractionStart={onCubeInteractionStart}
        onVisibleRotationChange={onVisibleRotationChange}
        onHoverFaceChange={onHoverFaceChange}
        onDragStateChange={onDragStateChange}
        onRotateCube={onRotateCube}
        onSelectFace={onSelectFace}
      />
    </Canvas>
  );
}

function CrystalCubeStage({
  activeFaceId,
  highlightedFaceId,
  isDraggingCube,
  lastInteractionAt,
  manualRotation,
  reducedMotion,
  onCubeInteractionEnd,
  onCubeInteractionStart,
  onVisibleRotationChange,
  onHoverFaceChange,
  onDragStateChange,
  onRotateCube,
  onSelectFace,
}: {
  activeFaceId: FaceId | null;
  highlightedFaceId: FaceId | null;
  isDraggingCube: boolean;
  lastInteractionAt: number;
  manualRotation: { pitch: number; yaw: number };
  reducedMotion: boolean;
  onCubeInteractionEnd: () => void;
  onCubeInteractionStart: () => void;
  onVisibleRotationChange: (pitch: number, yaw: number) => void;
  onHoverFaceChange: (faceId: FaceId | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onRotateCube: (deltaX: number, deltaY: number) => void;
  onSelectFace: (faceId: FaceId) => void;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const coreMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shellMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const auraMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const beamMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const idleYawOffsetRef = useRef(0);
  const currentYawRef = useRef(manualRotation.yaw);
  const currentPitchRef = useRef(manualRotation.pitch);
  const energyRef = useRef(0);

  useEffect(() => {
    if (isDraggingCube) {
      idleYawOffsetRef.current = 0;
    }
  }, [isDraggingCube]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033);
    const elapsed = state.clock.getElapsedTime();
    const paused = Boolean(activeFaceId);
    const energized = highlightedFaceId !== null;
    const idleElapsed = Math.max(performance.now() - lastInteractionAt, 0);
    const shouldIdle = !reducedMotion && !paused && !isDraggingCube && idleElapsed > IDLE_RESUME_DELAY_MS;
    const idleBlend = shouldIdle ? THREE.MathUtils.clamp((idleElapsed - IDLE_RESUME_DELAY_MS) / 900, 0, 1) : 0;

    if (shouldIdle) {
      idleYawOffsetRef.current += dt * 0.3;
    }

    const desiredYaw = manualRotation.yaw + idleYawOffsetRef.current;
    const desiredPitch = THREE.MathUtils.lerp(manualRotation.pitch, BASE_PITCH, idleBlend);
    currentYawRef.current = THREE.MathUtils.damp(currentYawRef.current, desiredYaw, paused ? 7 : isDraggingCube ? 12 : 2.4, dt);
    currentPitchRef.current = THREE.MathUtils.damp(currentPitchRef.current, desiredPitch, isDraggingCube ? 12 : 3.4, dt);
    energyRef.current = THREE.MathUtils.damp(energyRef.current, energized ? 1 : 0, 4.2, dt);

    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, currentPitchRef.current, 3.6, dt);
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        BASE_ROLL,
        2.8,
        dt,
      );
      groupRef.current.rotation.y = currentYawRef.current;
      groupRef.current.position.y = 0;
    }

    onVisibleRotationChange(currentPitchRef.current, currentYawRef.current);

    const shaderTime = elapsed;
    const energy = energyRef.current;

    if (coreMaterialRef.current) {
      coreMaterialRef.current.uniforms.uTime.value = shaderTime;
      coreMaterialRef.current.uniforms.uEnergy.value = energy;
    }

    if (shellMaterialRef.current) {
      shellMaterialRef.current.uniforms.uTime.value = shaderTime;
      shellMaterialRef.current.uniforms.uEnergy.value = energy;
    }

    if (auraMaterialRef.current) {
      auraMaterialRef.current.uniforms.uTime.value = shaderTime;
      auraMaterialRef.current.uniforms.uEnergy.value = energy;
    }

    if (beamMaterialRef.current) {
      beamMaterialRef.current.uniforms.uTime.value = shaderTime;
      beamMaterialRef.current.uniforms.uEnergy.value = energy;
    }
  });

  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0 },
    }),
    [],
  );

  return (
    <group ref={groupRef} scale={0.84}>
      <mesh position={[0, 0, -0.65]} scale={[6.2, 6.2, 1]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={auraMaterialRef}
          uniforms={shaderUniforms}
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, -0.55]} rotation={[0, 0, Math.PI / 4]} scale={[3.6, 7.2, 1]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={beamMaterialRef}
          uniforms={shaderUniforms}
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <RoundedBox args={[CUBE_UNIT * 0.72, CUBE_UNIT * 0.72, CUBE_UNIT * 0.72]} radius={0.13} smoothness={6}>
        <shaderMaterial
          ref={coreMaterialRef}
          uniforms={shaderUniforms}
          vertexShader={crystalVertexShader}
          fragmentShader={crystalCoreFragmentShader}
          transparent
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      <RoundedBox args={[CUBE_UNIT * 0.92, CUBE_UNIT * 0.92, CUBE_UNIT * 0.92]} radius={0.15} smoothness={8}>
        <meshPhysicalMaterial
          color="#fdfdfd"
          transparent
          opacity={0.92}
          roughness={0.08}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.16}
          thickness={1.8}
          reflectivity={0.85}
          ior={1.24}
        />
      </RoundedBox>

      <RoundedBox args={[CUBE_UNIT, CUBE_UNIT, CUBE_UNIT]} radius={0.16} smoothness={8} renderOrder={2}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.96}
          transmission={0.82}
          roughness={0.04}
          thickness={1.7}
          ior={1.28}
          attenuationDistance={0.8}
          attenuationColor="#ffffff"
          clearcoat={1}
          clearcoatRoughness={0.03}
          reflectivity={0.9}
        />
      </RoundedBox>

      <RoundedBox args={[CUBE_UNIT * 1.03, CUBE_UNIT * 1.03, CUBE_UNIT * 1.03]} radius={0.165} smoothness={8} renderOrder={3}>
        <shaderMaterial
          ref={shellMaterialRef}
          uniforms={shaderUniforms}
          vertexShader={crystalVertexShader}
          fragmentShader={crystalShellFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </RoundedBox>

      <CubeInteractionShell
        activeFaceId={activeFaceId}
        onCubeInteractionEnd={onCubeInteractionEnd}
        onCubeInteractionStart={onCubeInteractionStart}
        onDragStateChange={onDragStateChange}
        onHoverFaceChange={onHoverFaceChange}
        onRotateCube={onRotateCube}
        onSelectFace={onSelectFace}
      />

      {SIDE_FACES.map((face) => (
        <InteractiveFace
          key={face.id}
          face={face}
          highlighted={highlightedFaceId === face.id}
          isDraggingCube={isDraggingCube}
        />
      ))}
    </group>
  );
}

function CubeInteractionShell({
  activeFaceId,
  onCubeInteractionEnd,
  onCubeInteractionStart,
  onDragStateChange,
  onHoverFaceChange,
  onRotateCube,
  onSelectFace,
}: {
  activeFaceId: FaceId | null;
  onCubeInteractionEnd: () => void;
  onCubeInteractionStart: () => void;
  onDragStateChange: (isDragging: boolean) => void;
  onHoverFaceChange: (faceId: FaceId | null) => void;
  onRotateCube: (deltaX: number, deltaY: number) => void;
  onSelectFace: (faceId: FaceId) => void;
}) {
  const pointerStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    distance: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    distance: 0,
  });

  const capturePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.nativeEvent.target;

    if (target instanceof Element) {
      target.setPointerCapture(event.pointerId);
    }
  };

  const releasePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.nativeEvent.target;

    if (target instanceof Element && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  const resolveFaceFromEvent = (event: ThreeEvent<PointerEvent>) => {
    const localPoint = event.object.worldToLocal(event.point.clone());
    return resolveFaceIdFromLocalPoint(localPoint);
  };

  const resetPointerState = () => {
    pointerStateRef.current.pointerId = null;
    pointerStateRef.current.distance = 0;
    onDragStateChange(false);
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    if (activeFaceId) return;

    pointerStateRef.current.pointerId = event.pointerId;
    pointerStateRef.current.startX = event.clientX;
    pointerStateRef.current.startY = event.clientY;
    pointerStateRef.current.lastX = event.clientX;
    pointerStateRef.current.lastY = event.clientY;
    pointerStateRef.current.distance = 0;
    onCubeInteractionStart();
    onHoverFaceChange(resolveFaceFromEvent(event));
    capturePointer(event);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (pointerStateRef.current.pointerId !== event.pointerId || activeFaceId) return;

    event.stopPropagation();

    const deltaX = event.clientX - pointerStateRef.current.lastX;
    const deltaY = event.clientY - pointerStateRef.current.lastY;
    pointerStateRef.current.lastX = event.clientX;
    pointerStateRef.current.lastY = event.clientY;
    pointerStateRef.current.distance += Math.hypot(deltaX, deltaY);

    if (pointerStateRef.current.distance > 2) {
      onDragStateChange(true);
      onRotateCube(deltaX, deltaY);
    } else {
      onHoverFaceChange(resolveFaceFromEvent(event));
    }
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (pointerStateRef.current.pointerId !== event.pointerId) return;

    event.stopPropagation();
    releasePointer(event);

    const wasTap = pointerStateRef.current.distance < TAP_DISTANCE_THRESHOLD;
    const tappedFace = resolveFaceFromEvent(event);
    resetPointerState();
    onCubeInteractionEnd();
    onHoverFaceChange(tappedFace);

    if (wasTap && tappedFace) {
      onSelectFace(tappedFace);
    }
  };

  const handlePointerCancel = (event: ThreeEvent<PointerEvent>) => {
    if (pointerStateRef.current.pointerId !== event.pointerId) return;

    event.stopPropagation();
    releasePointer(event);
    resetPointerState();
    onCubeInteractionEnd();
    onHoverFaceChange(null);
  };

  return (
    <RoundedBox
      args={[CUBE_UNIT * 1.12, CUBE_UNIT * 1.12, CUBE_UNIT * 1.12]}
      radius={0.18}
      smoothness={4}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerOut={(event) => {
        if (pointerStateRef.current.pointerId === null) {
          event.stopPropagation();
          onHoverFaceChange(null);
        }
      }}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </RoundedBox>
  );
}

function InteractiveFace({
  face,
  highlighted,
  isDraggingCube,
}: {
  face: CubeFace;
  highlighted: boolean;
  isDraggingCube: boolean;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const plateMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const labelTexture = useMemo(() => createFaceLabelTexture(face.label), [face.label]);

  useEffect(() => {
    return () => {
      labelTexture?.dispose();
    };
  }, [labelTexture]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    const targetScale = highlighted ? 1.018 : 1;
    const currentGroup = groupRef.current;

    if (currentGroup) {
      currentGroup.scale.x = THREE.MathUtils.damp(currentGroup.scale.x, targetScale, 4, dt);
      currentGroup.scale.y = THREE.MathUtils.damp(currentGroup.scale.y, targetScale, 4, dt);
      currentGroup.scale.z = THREE.MathUtils.damp(currentGroup.scale.z, targetScale, 4, dt);
    }

    if (plateMaterialRef.current) {
      plateMaterialRef.current.opacity = THREE.MathUtils.damp(
        plateMaterialRef.current.opacity,
        highlighted ? 0.96 : 0.9,
        4,
        dt,
      );
      plateMaterialRef.current.transmission = THREE.MathUtils.damp(
        plateMaterialRef.current.transmission,
        highlighted ? 0.8 : 0.64,
        4,
        dt,
      );
      plateMaterialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        plateMaterialRef.current.emissiveIntensity,
        highlighted ? 0.12 : 0.04,
        4,
        dt,
      );
      plateMaterialRef.current.roughness = THREE.MathUtils.damp(
        plateMaterialRef.current.roughness,
        highlighted ? 0.06 : 0.12,
        4,
        dt,
      );
    }

    if (glowMaterialRef.current) {
      glowMaterialRef.current.opacity = THREE.MathUtils.damp(
        glowMaterialRef.current.opacity,
        highlighted || isDraggingCube ? 0.14 : 0.04,
        4,
        dt,
      );
    }
  });

  return (
    <group ref={groupRef} position={face.position} rotation={face.rotation}>
      <mesh position={[0, 0, -0.04]} renderOrder={0}>
        <planeGeometry args={[1.2, 0.28]} />
        <meshBasicMaterial
          ref={glowMaterialRef}
          color="#ffffff"
          transparent
          opacity={0.04}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <RoundedBox args={[1.44, 1.44, 0.05]} radius={0.1} smoothness={4} position={[0, 0, -0.005]} renderOrder={1}>
        <meshPhysicalMaterial
          ref={plateMaterialRef}
          color="#f3f6fb"
          metalness={0.02}
          roughness={0.12}
          transparent
          opacity={0.9}
          transmission={0.64}
          thickness={1.1}
          clearcoat={1}
          clearcoatRoughness={0.06}
          emissive="#ffffff"
          emissiveIntensity={0.04}
          side={THREE.FrontSide}
        />
        {labelTexture ? (
          <Decal position={[0, 0, 0.031]} scale={[1.18, 0.36, 0.45]} rotation={[0, 0, 0]}>
            <meshStandardMaterial
              map={labelTexture}
              transparent
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              roughness={0.42}
              metalness={0.08}
              color="#171719"
            />
          </Decal>
        ) : null}
      </RoundedBox>

      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.58, 1.58]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function MetricsCard() {
  const [instagram, tiktok, views, engagement] = MEDIACARD_METRICS;

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile metric={instagram} large />
      <MetricTile metric={tiktok} />
      <MetricTile metric={views} full />
      <MetricTile metric={engagement} full />
    </div>
  );
}

function MetricTile({
  metric,
  large,
  full,
}: {
  metric: (typeof MEDIACARD_METRICS)[number];
  large?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.65)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
        large ? "col-span-2" : ""
      } ${full ? "col-span-2" : ""}`}
    >
      <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.3em] text-black/34">{metric.label}</p>
      <p
        className={`mt-3 chv-mobile-display tracking-[-0.06em] text-black/84 ${
          large ? "text-[2.9rem] leading-[0.86]" : "text-[2rem] leading-[0.9]"
        }`}
      >
        {metric.value}
      </p>
    </div>
  );
}

function MarketsCard() {
  return (
    <div className="relative min-h-[15rem] overflow-hidden rounded-[1.5rem] border border-black/8 bg-[rgba(255,255,255,0.68)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="absolute left-1/2 top-[14%] bottom-[12%] w-px -translate-x-1/2 bg-black/8" />
      {MEDIACARD_AUDIENCE.map((market, index) => (
        <div
          key={market}
          className="absolute"
          style={MARKET_LAYOUT[index] as CSSProperties}
        >
          <div className="flex items-center gap-2">
            <span className="block h-2.5 w-2.5 rounded-full bg-black/60" />
            <div className="rounded-full border border-black/8 bg-white/72 px-3 py-2">
              <p className="chv-mobile-display text-[1.08rem] leading-none tracking-[-0.05em] text-black/78">{market}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollabsCard() {
  return (
    <div className="grid gap-3">
      {MEDIACARD_COLLABS.map((brand) => (
        <div
          key={brand}
          className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-black/8 bg-[rgba(255,255,255,0.68)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          <div>
            <p className="chv-mobile-mono text-[0.48rem] uppercase tracking-[0.28em] text-black/32">selected collaboration</p>
            <p className="mt-2 chv-mobile-display text-[1.42rem] leading-[0.92] tracking-[-0.05em] text-black/78">{brand}</p>
          </div>
          <Image
            src={brandLogoPath(brand)}
            alt={brand}
            width={100}
            height={38}
            sizes="100px"
            className="h-8 w-auto object-contain opacity-[0.88]"
          />
        </div>
      ))}
    </div>
  );
}

function TermsCard() {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.68)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.3em] text-black/34">brand partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.brandPartnerships.map((item, index) => (
            <div key={item} className="flex gap-3">
              <span className="chv-mobile-mono pt-[1px] text-[0.56rem] uppercase tracking-[0.2em] text-black/28">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="flex-1 text-[0.86rem] leading-6 text-black/70">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.68)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <p className="chv-mobile-mono text-[0.5rem] uppercase tracking-[0.3em] text-black/34">dining partnerships</p>
        <div className="mt-4 space-y-3">
          {MEDIACARD_SERVICES.diningPartnerships.map((item) => (
            <p key={item} className="text-[0.86rem] leading-6 text-black/70">
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
