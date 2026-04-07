"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type DesktopAstroFieldProps = {
  className?: string;
  onReady?: () => void;
  onPerformanceFail?: () => void;
};

type ParticleConfig = {
  x: number;
  y: number;
  z: number;
  speed: number;
  driftX: number;
  driftY: number;
  driftFreqX: number;
  driftFreqY: number;
  phase: number;
  size: number;
  alpha: number;
  hue: THREE.Color;
};

type StreakConfig = {
  x: number;
  y: number;
  z: number;
  speed: number;
  driftX: number;
  driftY: number;
  phase: number;
  width: number;
  height: number;
  opacity: number;
  color: THREE.Color;
};

export const ASTRO_FIELD_TUNING = {
  farCount: 1250,
  orbCount: 78,
  streakCount: 14,
  farDepth: 54,
  orbDepth: 40,
  streakDepth: 28,
  farSpeed: 8.8,
  orbSpeed: 11.6,
  streakSpeed: 17.2,
  parallaxStrengthX: 0.24,
  parallaxStrengthY: 0.18,
  backdropDrift: 0.032,
  backdropWarp: 0.082,
  pocketCenterY: 0.58,
  pocketRadiusX: 1.22,
  pocketRadiusY: 0.48,
  pocketDarkness: 0.62,
  farPointScale: 1.0,
  orbPointScale: 1.42,
  baseFieldOpacity: 0.95,
  palette: [
    "#6dd3ff",
    "#7f8cff",
    "#d06cff",
    "#ff7eb6",
    "#ffb566",
    "#ffe06b",
  ] as const,
} as const;

const fullscreenVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const backdropFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uFieldOpacity;
uniform float uBackdropDrift;
uniform float uBackdropWarp;
uniform float uPocketCenterY;
uniform float uPocketRadiusX;
uniform float uPocketRadiusY;
uniform float uPocketDarkness;
uniform vec3 uBaseA;
uniform vec3 uBaseB;
uniform vec3 uBaseC;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
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
    p = p * 2.02 + vec2(17.2, -11.4);
    amplitude *= 0.52;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = uv - 0.5;
  p.x *= aspect;

  vec2 pointerOffset = (uPointer - 0.5) * vec2(aspect, 1.0) * 0.12;
  float t = uTime * uBackdropDrift;
  vec2 flowUv = p * 1.18 + pointerOffset;
  vec2 warpUv = flowUv * 1.9;

  vec2 warp = vec2(
    fbm(warpUv + vec2(t * 0.9, -t * 0.2)),
    fbm(warpUv - vec2(t * 0.3, t * 0.8))
  ) - 0.5;

  flowUv += warp * uBackdropWarp;

  float nebulaA = fbm(flowUv * 2.1 + vec2(t * 0.85, -t * 0.35));
  float nebulaB = fbm(flowUv * 3.4 - vec2(t * 0.55, -t * 0.72));
  float nebulaC = fbm(flowUv * 5.8 + warp * 1.7 + vec2(-t * 1.05, t * 0.64));

  vec3 color = vec3(0.005, 0.008, 0.014);
  color += uBaseA * pow(max(nebulaA - 0.42, 0.0), 1.8) * 0.22;
  color += uBaseB * pow(max(nebulaB - 0.54, 0.0), 1.75) * 0.16;
  color += uBaseC * pow(max(nebulaC - 0.63, 0.0), 2.2) * 0.12;

  float starHash = hash21(floor((flowUv + 6.0) * 42.0));
  float stardust = smoothstep(0.985, 1.0, starHash) * (0.1 + nebulaC * 0.12);
  color += vec3(stardust);

  vec2 pocketUv = uv - vec2(0.5, uPocketCenterY);
  float pocket = exp(
    -(
      (pocketUv.x * pocketUv.x) / max(uPocketRadiusX, 0.0001) +
      (pocketUv.y * pocketUv.y) / max(uPocketRadiusY, 0.0001)
    )
  );
  color *= 1.0 - (pocket * uPocketDarkness);

  float vignette = smoothstep(1.36, 0.22, length(p * vec2(0.92, 1.12)));
  color *= mix(0.3, 1.0, vignette);

  float dither = (hash21(gl_FragCoord.xy * 0.25 + uTime) - 0.5) * 0.018;
  color += dither;
  color = clamp(color, 0.0, 1.0) * uFieldOpacity;

  gl_FragColor = vec4(color, 1.0);
}
`;

const particleVertexShader = `
precision highp float;

uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;

attribute float aSize;
attribute float aAlpha;
attribute float aTwinkle;

varying vec3 vColor;
varying float vAlpha;
varying float vTwinkle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(1.0, -mvPosition.z);
  float twinkle = 0.86 + sin(uTime * 0.85 + aTwinkle) * 0.14;
  gl_PointSize = clamp(aSize * uPixelRatio * uScale * twinkle * (22.0 / dist), 1.0, 180.0);
  gl_Position = projectionMatrix * mvPosition;

  vColor = color;
  vAlpha = aAlpha;
  vTwinkle = twinkle;
}
`;

const particleFragmentShader = `
precision highp float;

uniform float uIntensity;
uniform float uSoftness;
uniform float uCoreBoost;

varying vec3 vColor;
varying float vAlpha;
varying float vTwinkle;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float radius = length(uv);
  float halo = smoothstep(0.62 + uSoftness, 0.02, radius);
  float core = smoothstep(0.14 + (uSoftness * 0.18), 0.0, radius);
  float sparkle = smoothstep(0.72 + uSoftness, 0.12, radius);
  float bloom = smoothstep(0.98, 0.18, radius);

  float alpha = (halo + (bloom * 0.28)) * vAlpha * uIntensity;
  vec3 color = vColor * (0.74 + core * uCoreBoost + sparkle * 0.22 + bloom * 0.18) * vTwinkle;

  gl_FragColor = vec4(color, alpha);
}
`;

function createRng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function pickColor(rng: () => number) {
  const color = ASTRO_FIELD_TUNING.palette[Math.floor(rng() * ASTRO_FIELD_TUNING.palette.length)] ?? ASTRO_FIELD_TUNING.palette[0];
  return new THREE.Color(color);
}

function buildParticleConfigs({
  count,
  seed,
  depth,
  speed,
  spreadX,
  spreadY,
  sizeMin,
  sizeMax,
  alphaMin,
  alphaMax,
  drift,
}: {
  count: number;
  seed: number;
  depth: number;
  speed: number;
  spreadX: number;
  spreadY: number;
  sizeMin: number;
  sizeMax: number;
  alphaMin: number;
  alphaMax: number;
  drift: number;
}) {
  const rng = createRng(seed);
  const configs: ParticleConfig[] = [];

  for (let i = 0; i < count; i += 1) {
    configs.push({
      x: (rng() * 2 - 1) * spreadX,
      y: (rng() * 2 - 1) * spreadY,
      z: -rng() * depth,
      speed: speed * (0.7 + rng() * 0.6),
      driftX: (rng() * 2 - 1) * drift,
      driftY: (rng() * 2 - 1) * drift,
      driftFreqX: 0.22 + rng() * 0.7,
      driftFreqY: 0.2 + rng() * 0.62,
      phase: rng() * Math.PI * 2,
      size: sizeMin + rng() * (sizeMax - sizeMin),
      alpha: alphaMin + rng() * (alphaMax - alphaMin),
      hue: pickColor(rng),
    });
  }

  return configs;
}

function buildStreakConfigs(count: number) {
  const rng = createRng(321791);
  const configs: StreakConfig[] = [];

  for (let i = 0; i < count; i += 1) {
    configs.push({
      x: (rng() * 2 - 1) * 8.5,
      y: (rng() * 2 - 1) * 5.2,
      z: -rng() * ASTRO_FIELD_TUNING.streakDepth,
      speed: ASTRO_FIELD_TUNING.streakSpeed * (0.72 + rng() * 0.56),
      driftX: (rng() * 2 - 1) * 0.24,
      driftY: (rng() * 2 - 1) * 0.16,
      phase: rng() * Math.PI * 2,
      width: 0.32 + rng() * 0.34,
      height: 0.8 + rng() * 1.1,
      opacity: 0.04 + rng() * 0.08,
      color: pickColor(rng),
    });
  }

  return configs;
}

function createStreakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Texture();
  }

  context.fillStyle = "rgba(0,0,0,0)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "lighter";

  const outerGlow = context.createRadialGradient(64, 64, 8, 64, 64, 52);
  outerGlow.addColorStop(0, "rgba(255,255,255,0.92)");
  outerGlow.addColorStop(0.34, "rgba(255,255,255,0.38)");
  outerGlow.addColorStop(0.74, "rgba(255,255,255,0.08)");
  outerGlow.addColorStop(1, "rgba(255,255,255,0.0)");
  context.fillStyle = outerGlow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const elongatedGlow = context.createRadialGradient(64, 64, 10, 64, 64, 46);
  elongatedGlow.addColorStop(0, "rgba(255,255,255,0.7)");
  elongatedGlow.addColorStop(0.42, "rgba(255,255,255,0.2)");
  elongatedGlow.addColorStop(1, "rgba(255,255,255,0.0)");
  context.save();
  context.translate(64, 64);
  context.scale(1, 1.8);
  context.translate(-64, -64);
  context.fillStyle = elongatedGlow;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function CameraRig() {
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.1, -14), []);
  const nextPositionRef = useRef(new THREE.Vector3(0, 0, 7.4));
  const { camera } = useThree();

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const x = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const y = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      pointerTargetRef.current.set(x, y);
    };

    const onPointerLeave = () => {
      pointerTargetRef.current.set(0, 0);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  useFrame((_, delta) => {
    const smoothing = 1 - Math.exp(-delta * 2.2);
    pointerCurrentRef.current.lerp(pointerTargetRef.current, smoothing);

    const nextPosition = nextPositionRef.current;
    nextPosition.set(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
    nextPosition.x = THREE.MathUtils.lerp(
      nextPosition.x,
      pointerCurrentRef.current.x * ASTRO_FIELD_TUNING.parallaxStrengthX,
      smoothing,
    );
    nextPosition.y = THREE.MathUtils.lerp(
      nextPosition.y,
      -pointerCurrentRef.current.y * ASTRO_FIELD_TUNING.parallaxStrengthY,
      smoothing,
    );
    camera.position.copy(nextPosition);
    camera.lookAt(lookTarget);
  });

  return null;
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const readyRef = useRef(false);

  useFrame(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  });

  return null;
}

function FieldBackdrop() {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uFieldOpacity: { value: ASTRO_FIELD_TUNING.baseFieldOpacity },
      uBackdropDrift: { value: ASTRO_FIELD_TUNING.backdropDrift },
      uBackdropWarp: { value: ASTRO_FIELD_TUNING.backdropWarp },
      uPocketCenterY: { value: ASTRO_FIELD_TUNING.pocketCenterY },
      uPocketRadiusX: { value: ASTRO_FIELD_TUNING.pocketRadiusX },
      uPocketRadiusY: { value: ASTRO_FIELD_TUNING.pocketRadiusY },
      uPocketDarkness: { value: ASTRO_FIELD_TUNING.pocketDarkness },
      uBaseA: { value: new THREE.Color("#07111a") },
      uBaseB: { value: new THREE.Color("#140d1f") },
      uBaseC: { value: new THREE.Color("#1a1014") },
    }),
    [],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      uniforms.uPointer.value.set(
        event.clientX / Math.max(window.innerWidth, 1),
        event.clientY / Math.max(window.innerHeight, 1),
      );
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [uniforms]);

  useEffect(() => {
    const material = materialRef.current;
    return () => material?.dispose();
  }, []);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={fullscreenVertexShader}
        fragmentShader={backdropFragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function ParticleField({
  configs,
  scale,
  intensity,
  softness,
  coreBoost,
}: {
  configs: ParticleConfig[];
  scale: number;
  intensity: number;
  softness: number;
  coreBoost: number;
}) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const configsRef = useRef(configs);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const positions = new Float32Array(configs.length * 3);
    const colors = new Float32Array(configs.length * 3);
    const sizes = new Float32Array(configs.length);
    const alphas = new Float32Array(configs.length);
    const twinkles = new Float32Array(configs.length);

    configs.forEach((config, index) => {
      const stride = index * 3;
      positions[stride] = config.x;
      positions[stride + 1] = config.y;
      positions[stride + 2] = config.z;
      colors[stride] = config.hue.r;
      colors[stride + 1] = config.hue.g;
      colors[stride + 2] = config.hue.b;
      sizes[index] = config.size;
      alphas[index] = config.alpha;
      twinkles[index] = config.phase;
    });

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    particleGeometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkles, 1));

    return particleGeometry;
  }, [configs]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uScale: { value: scale },
      uIntensity: { value: intensity },
      uSoftness: { value: softness },
      uCoreBoost: { value: coreBoost },
    }),
    [coreBoost, gl, intensity, scale, softness],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useEffect(() => {
    const material = materialRef.current;
    return () => material?.dispose();
  }, []);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    const positions = points.geometry.attributes.position.array as Float32Array;
    const elapsed = state.clock.getElapsedTime();

    configsRef.current.forEach((config, index) => {
      const stride = index * 3;

      config.z += config.speed * delta;
      if (config.z > 8) {
        config.z = -(
          (config.speed > ASTRO_FIELD_TUNING.orbSpeed ? ASTRO_FIELD_TUNING.orbDepth : ASTRO_FIELD_TUNING.farDepth)
          * (0.9 + ((index % 13) / 13) * 0.18)
        );
      }

      positions[stride] = config.x + Math.sin(elapsed * config.driftFreqX + config.phase) * config.driftX;
      positions[stride + 1] = config.y + Math.cos(elapsed * config.driftFreqY + config.phase * 0.7) * config.driftY;
      positions[stride + 2] = config.z;
    });

    points.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        vertexColors
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function StreakField() {
  const groupRef = useRef<THREE.Group | null>(null);
  const materialRefs = useRef<Array<THREE.SpriteMaterial | null>>([]);
  const streakConfigs = useMemo(() => buildStreakConfigs(ASTRO_FIELD_TUNING.streakCount), []);
  const configsRef = useRef(
    streakConfigs.map((config) => ({
      ...config,
      color: config.color.clone(),
    })),
  );
  const texture = useMemo(() => createStreakTexture(), []);

  useEffect(() => {
    const materials = materialRefs.current;
    return () => {
      texture.dispose();
      for (const material of materials) {
        material?.dispose();
      }
    };
  }, [texture]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const elapsed = state.clock.getElapsedTime();

    group.children.forEach((child, index) => {
      const config = configsRef.current[index];
      const material = materialRefs.current[index];
      if (!(child instanceof THREE.Sprite) || !config || !material) return;

      config.z += config.speed * delta;
      if (config.z > 6) {
        config.z = -(ASTRO_FIELD_TUNING.streakDepth * (0.82 + ((index % 7) / 7) * 0.24));
      }

      child.position.set(
        config.x + Math.sin(elapsed * 0.52 + config.phase) * config.driftX,
        config.y + Math.cos(elapsed * 0.68 + config.phase * 0.6) * config.driftY,
        config.z,
      );

      const depthMix = THREE.MathUtils.clamp((config.z + ASTRO_FIELD_TUNING.streakDepth) / ASTRO_FIELD_TUNING.streakDepth, 0, 1);
      const width = config.width * THREE.MathUtils.lerp(0.92, 1.7, depthMix);
      const height = config.height * THREE.MathUtils.lerp(0.94, 1.6, depthMix);
      child.scale.set(width, height, 1);
      child.material.rotation = Math.sin(elapsed * 0.18 + config.phase) * 0.03;
      material.opacity = config.opacity * THREE.MathUtils.lerp(0.3, 0.72, depthMix);
    });
  });

  return (
    <group ref={groupRef}>
      {streakConfigs.map((config, index) => (
        <sprite
          key={`streak-${index}`}
          position={[config.x, config.y, config.z]}
          scale={[config.width, config.height, 1]}
          renderOrder={12}
        >
          <spriteMaterial
            ref={(node) => {
              materialRefs.current[index] = node;
            }}
            map={texture}
            color={config.color}
            transparent
            opacity={config.opacity}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

function AstroFieldScene({
  onReady,
  onPerformanceFail,
}: {
  onReady?: () => void;
  onPerformanceFail?: () => void;
}) {
  const farConfigs = useMemo(
    () =>
      buildParticleConfigs({
        count: ASTRO_FIELD_TUNING.farCount,
        seed: 71331,
        depth: ASTRO_FIELD_TUNING.farDepth,
        speed: ASTRO_FIELD_TUNING.farSpeed,
        spreadX: 10.5,
        spreadY: 6.6,
        sizeMin: 10,
        sizeMax: 30,
        alphaMin: 0.16,
        alphaMax: 0.42,
        drift: 0.12,
      }),
    [],
  );
  const orbConfigs = useMemo(
    () =>
      buildParticleConfigs({
        count: ASTRO_FIELD_TUNING.orbCount,
        seed: 913337,
        depth: ASTRO_FIELD_TUNING.orbDepth,
        speed: ASTRO_FIELD_TUNING.orbSpeed,
        spreadX: 8.2,
        spreadY: 4.8,
        sizeMin: 48,
        sizeMax: 105,
        alphaMin: 0.06,
        alphaMax: 0.16,
        drift: 0.34,
      }),
    [],
  );

  return (
    <>
      <PerformanceMonitor
        ms={350}
        threshold={0.94}
        bounds={() => [28, 58]}
        onDecline={() => onPerformanceFail?.()}
      />
      <ReadySignal onReady={onReady} />
      <CameraRig />
      <FieldBackdrop />
      <ParticleField
        configs={farConfigs}
        scale={ASTRO_FIELD_TUNING.farPointScale}
        intensity={0.78}
        softness={0.06}
        coreBoost={0.42}
      />
      <ParticleField
        configs={orbConfigs}
        scale={ASTRO_FIELD_TUNING.orbPointScale}
        intensity={0.42}
        softness={0.34}
        coreBoost={0.14}
      />
      <ParticleField
        configs={orbConfigs}
        scale={ASTRO_FIELD_TUNING.orbPointScale * 2.15}
        intensity={0.2}
        softness={0.62}
        coreBoost={0.05}
      />
      <StreakField />
    </>
  );
}

export function DesktopAstroField({
  className,
  onReady,
  onPerformanceFail,
}: DesktopAstroFieldProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ alpha: false, antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 7.4], fov: 48, near: 0.1, far: 90 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.setClearColor("#010103", 1);
        }}
        eventSource={typeof document !== "undefined" ? document.documentElement : undefined}
        eventPrefix="client"
      >
        <AstroFieldScene onReady={onReady} onPerformanceFail={onPerformanceFail} />
      </Canvas>
      <div className="chv-home-astro-pocket" />
      <div className="chv-home-astro-veil" />
    </div>
  );
}
