"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uAccent;
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

vec3 spectral(float x) {
  vec3 cyan = vec3(0.26, 0.72, 1.0);
  vec3 amber = vec3(1.0, 0.78, 0.46);
  vec3 violet = vec3(0.82, 0.50, 1.0);
  vec3 aqua = vec3(0.38, 1.0, 0.84);

  if (x < 0.33) {
    return mix(cyan, amber, smoothstep(0.0, 0.33, x));
  }
  if (x < 0.66) {
    return mix(amber, violet, smoothstep(0.33, 0.66, x));
  }
  return mix(violet, aqua, smoothstep(0.66, 1.0, x));
}

float heightField(vec2 uv) {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect * 1.35;
  float t = uTime * 0.22 * uMotion;

  vec2 warp = vec2(
    fbm(p * 2.6 + vec2(0.0, t)),
    fbm(p * 2.2 - vec2(t * 0.8, -t * 0.2))
  );

  p += (warp - 0.5) * 0.95;

  float folds = sin((p.x * 9.0 + p.y * 2.8 + fbm(p * 1.8) * 4.0) + t * 6.2);
  float foil = sin((p.y * 11.0 - p.x * 5.6) + t * 3.8 + fbm(p * 3.4) * 5.0);
  float pools = fbm(p * 4.6 - vec2(t * 0.7, t * 0.35));

  return abs(folds) * 0.55 + abs(foil) * 0.35 + pools * 0.75;
}

void main() {
  vec2 uv = vUv;
  float h = heightField(uv);
  float epsilon = 0.0035;
  float hx = heightField(uv + vec2(epsilon, 0.0)) - h;
  float hy = heightField(uv + vec2(0.0, epsilon)) - h;

  vec3 normal = normalize(vec3(-hx * 3.8, -hy * 3.8, 1.0));
  vec3 lightA = normalize(vec3(-0.35, 0.55, 1.0));
  vec3 lightB = normalize(vec3(0.45, -0.2, 0.75));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  float diffuse = max(dot(normal, lightA), 0.0) * 0.65 + max(dot(normal, lightB), 0.0) * 0.35;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.6);
  float specular = pow(max(dot(reflect(-lightA, normal), viewDir), 0.0), 28.0);
  specular += pow(max(dot(reflect(-lightB, normal), viewDir), 0.0), 18.0) * 0.6;

  float band = sin(h * 6.5 + uTime * 0.28 * uMotion + uv.y * 5.0) * 0.5 + 0.5;
  vec3 iridescence = spectral(fract(h * 0.38 + band * 0.42 + uTime * 0.045 * uMotion));
  iridescence = mix(iridescence, mix(iridescence, uAccent, 0.22), 0.55);

  vec3 silverDark = vec3(0.014, 0.018, 0.03);
  vec3 silverLight = vec3(0.52, 0.58, 0.68);
  vec3 metal = mix(silverDark, silverLight, smoothstep(0.3, 1.28, h * 0.52 + diffuse * 0.68));

  metal += specular * 0.34;
  metal += iridescence * (0.09 + fresnel * 0.26 + band * 0.04);
  metal = mix(metal, metal * vec3(0.72, 0.78, 0.88), smoothstep(0.0, 1.0, uv.y * 0.4 + 0.1));
  metal *= 0.66;

  float vignette = smoothstep(1.18, 0.16, length((uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0)));
  metal *= mix(0.56, 1.0, vignette);
  metal = pow(clamp(metal, 0.0, 1.45), vec3(0.92));

  gl_FragColor = vec4(metal, 1.0);
}
`;

function ChromePlane({
  accent,
  reducedMotion,
  onReady,
}: {
  accent: string;
  reducedMotion: boolean;
  onReady?: () => void;
}) {
  const readyRef = useRef(false);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uAccent: { value: new THREE.Color(accent) },
      uMotion: { value: reducedMotion ? 0.28 : 1 },
    }),
    [accent, reducedMotion],
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

    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}

export function MobileLiquidChromeShader({
  accent,
  reducedMotion,
  onReady,
}: {
  accent: string;
  reducedMotion: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: false, antialias: false, powerPreference: "high-performance" }}
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
      className="absolute inset-0 h-full w-full"
    >
      <ChromePlane accent={accent} reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  );
}
