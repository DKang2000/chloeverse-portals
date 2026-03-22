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

const glassFresnelVertexShader = `
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const glassFresnelFragmentShader = `
precision highp float;

uniform vec3 uColor;
uniform float uOpacity;

varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDirection)), 0.0), 2.6);
  float rim = smoothstep(0.08, 1.0, fresnel);
  vec3 color = mix(uColor * 0.22, uColor, rim);
  gl_FragColor = vec4(color, rim * uOpacity);
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
  snapPointsRef,
}: {
  reducedMotion: boolean;
  snapPointsRef: React.MutableRefObject<number[]>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    target: 0,
    current: 0,
    velocity: 0,
    isTouching: false,
    lastScrollAt: 0,
    snappingTo: null as number | null,
    lockedTo: null as number | null,
    activeIndex: 0,
    gestureStartY: 0,
    gestureStartIndex: 0,
    gestureDeltaY: 0,
    lastWheelStepAt: 0,
  });
  const [frame, setFrame] = useState<ScrollSnapshot>({ position: 0, velocity: 0 });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTop = 0;
    stateRef.current.target = 0;
    stateRef.current.current = 0;
    stateRef.current.velocity = 0;
    stateRef.current.isTouching = false;
    stateRef.current.lastScrollAt = performance.now();
    stateRef.current.snappingTo = null;
    stateRef.current.lockedTo = 0;
    stateRef.current.activeIndex = 0;
    stateRef.current.gestureStartY = 0;
    stateRef.current.gestureStartIndex = 0;
    stateRef.current.gestureDeltaY = 0;
    stateRef.current.lastWheelStepAt = 0;

    const clampSnapIndex = (value: number) => {
      const snapPoints = snapPointsRef.current;
      return clamp(value, 0, Math.max(snapPoints.length - 1, 0));
    };

    const nearestSnapIndex = (value: number) => {
      const snapPoints = snapPointsRef.current;
      if (!snapPoints.length) return 0;

      let nearestIndex = 0;
      let smallestDistance = Math.abs((snapPoints[0] ?? value) - value);

      for (let index = 1; index < snapPoints.length; index += 1) {
        const point = snapPoints[index] ?? value;
        const distance = Math.abs(point - value);
        if (distance < smallestDistance) {
          nearestIndex = index;
          smallestDistance = distance;
        }
      }

      return nearestIndex;
    };

    const snapPointAtIndex = (index: number) => {
      const snapPoints = snapPointsRef.current;
      if (!snapPoints.length) return 0;
      const nearest = snapPoints[clampSnapIndex(index)] ?? 0;
      const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
      return clamp(nearest, 0, maxScroll);
    };

    const lockToIndex = (index: number) => {
      const lockedPoint = snapPointAtIndex(index);
      stateRef.current.activeIndex = clampSnapIndex(index);
      stateRef.current.lockedTo = lockedPoint;
      stateRef.current.snappingTo = null;
      stateRef.current.target = lockedPoint;
      stateRef.current.current = lockedPoint;
      stateRef.current.velocity = 0;
      if (Math.abs(element.scrollTop - lockedPoint) > 0.5) {
        element.scrollTop = lockedPoint;
      }
    };

    const snapToIndex = (index: number, behavior: ScrollBehavior) => {
      const snappedIndex = clampSnapIndex(index);
      const snapTarget = snapPointAtIndex(snappedIndex);
      stateRef.current.activeIndex = snappedIndex;
      stateRef.current.lockedTo = null;
      stateRef.current.snappingTo = snapTarget;
      stateRef.current.target = snapTarget;
      element.scrollTo({
        top: snapTarget,
        behavior,
      });
    };

    const handleScroll = () => {
      const state = stateRef.current;

      if (!state.isTouching && state.lockedTo !== null && state.snappingTo === null) {
        if (Math.abs(element.scrollTop - state.lockedTo) > 0.5) {
          element.scrollTop = state.lockedTo;
        }
        state.target = state.lockedTo;
        state.current = state.lockedTo;
        state.velocity = 0;
        return;
      }

      state.target = element.scrollTop;
      state.lastScrollAt = performance.now();
      if (state.snappingTo !== null && Math.abs(element.scrollTop - state.snappingTo) < 1.25) {
        lockToIndex(state.activeIndex);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const state = stateRef.current;
      state.isTouching = true;
      state.snappingTo = null;
      state.lockedTo = null;
      state.gestureStartY = event.touches[0]?.clientY ?? 0;
      state.gestureDeltaY = 0;
      state.gestureStartIndex = nearestSnapIndex(element.scrollTop);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const state = stateRef.current;
      state.gestureDeltaY = (event.touches[0]?.clientY ?? state.gestureStartY) - state.gestureStartY;
    };

    const handleTouchEnd = () => {
      const state = stateRef.current;
      state.isTouching = false;
      state.lastScrollAt = performance.now();

      const currentPoint = snapPointAtIndex(state.gestureStartIndex);
      const movedForward = element.scrollTop - currentPoint > 18 || state.gestureDeltaY < -20;
      const movedBackward = currentPoint - element.scrollTop > 18 || state.gestureDeltaY > 20;
      const direction = movedForward ? 1 : movedBackward ? -1 : 0;

      snapToIndex(state.gestureStartIndex + direction, reducedMotion ? "auto" : "smooth");
    };

    const handleWheel = (event: WheelEvent) => {
      const state = stateRef.current;
      const now = performance.now();
      if (Math.abs(event.deltaY) < 4 || now - state.lastWheelStepAt < 320) {
        event.preventDefault();
        return;
      }

      state.lastWheelStepAt = now;
      state.isTouching = false;
      state.snappingTo = null;
      state.lockedTo = null;
      const currentIndex = nearestSnapIndex(element.scrollTop);
      const direction = event.deltaY > 0 ? 1 : -1;
      snapToIndex(currentIndex + direction, reducedMotion ? "auto" : "smooth");
      event.preventDefault();
    };

    let frameId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - previous, 34);
      previous = now;

      const state = stateRef.current;
      const before = state.current;
      if (state.snappingTo !== null && Math.abs(element.scrollTop - state.snappingTo) < 0.85) {
        lockToIndex(state.activeIndex);
      } else if (!state.isTouching && state.lockedTo === null && state.snappingTo === null && now - state.lastScrollAt > 85) {
        const snapIndex = nearestSnapIndex(element.scrollTop);
        const snapTarget = snapPointAtIndex(snapIndex);
        state.activeIndex = snapIndex;
        if (Math.abs(element.scrollTop - snapTarget) > 4) {
          snapToIndex(snapIndex, reducedMotion ? "auto" : "smooth");
        } else {
          lockToIndex(snapIndex);
        }
      }

      const diff = state.target - state.current;
      const ease = reducedMotion ? 0.5 : 0.26;
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
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    element.addEventListener("wheel", handleWheel, { passive: false });
    frameId = window.requestAnimationFrame(tick);

    return () => {
      element.removeEventListener("scroll", handleScroll);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
      element.removeEventListener("wheel", handleWheel);
      window.cancelAnimationFrame(frameId);
    };
  }, [reducedMotion, snapPointsRef]);

  return { frame, scrollRef };
}

function FractureBackdropPlane({
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
      clamp(scrollRef.current.velocity * 0.012, -0.24, 0.24),
      modulo(scrollRef.current.position, 2400) / 2400 - 0.5,
    );
  });

  return (
    <mesh position={[0, 0, -22]} scale={[19, 28, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={smokeVertexShader}
        fragmentShader={`
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
            vec2 p = (uv - 0.5) * vec2(0.84, 1.54);
            float t = uTime * 0.11 * uMotion;
            p += uFlow * 0.08;

            vec2 warp = vec2(
              fbm(p * 2.2 + vec2(0.0, t)),
              fbm(p * 1.9 - vec2(t * 0.45, -t * 0.16))
            );

            p += (warp - 0.5) * 0.38;

            float ridges = abs(sin((p.x * 6.6 + p.y * 1.8 + fbm(p * 1.6) * 3.8) + t * 2.8));
            float foil = abs(sin((p.y * 8.2 - p.x * 3.8) + t * 1.8 + fbm(p * 2.4) * 4.1));
            float pools = fbm(p * 3.6 - vec2(t * 0.32, t * 0.18));

            return ridges * 0.24 + foil * 0.2 + pools * 0.56;
          }

          void main() {
            vec2 uv = vUv;
            vec2 p = uv - 0.5;
            float h = field(uv);
            float column = exp(-abs(p.x) * 8.5);
            float pocket = smoothstep(1.16, 0.08, length(p * vec2(0.72, 1.22)));
            float smoke = smoothstep(0.24, 0.82, h) * pocket;
            float shimmer = pow(abs(sin((p.y * 22.0 + fbm(p * 2.2) * 7.0) - uTime * 0.08 * uMotion)), 12.0);
            float streak = pow(max(0.0, 1.0 - abs(fract((p.y + h * 0.12) * 12.0) - 0.5) * 2.0), 14.0) * column;

            vec3 color = vec3(0.004, 0.005, 0.008);
            color += vec3(0.02, 0.03, 0.05) * smoke * 0.42;
            color += vec3(0.08, 0.12, 0.18) * pocket * column * 0.12;
            color += vec3(0.64, 0.82, 0.96) * streak * 0.045;
            color += vec3(0.98, 1.0, 1.0) * shimmer * pocket * 0.01;

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function GlassDustField({
  scrollRef,
  reducedMotion,
}: {
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const count = 220;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const angle = seededNoise(index * 3.1) * Math.PI * 2;
      const radius = Math.pow(seededNoise(index * 4.7), 2.4) * 4.2;
      const xBias = (seededNoise(index * 5.1) - 0.5) * 1.4;
      positions[index * 3] = Math.cos(angle) * radius * 0.92 + xBias;
      positions[index * 3 + 1] = (seededNoise(index * 6.3) - 0.5) * 14.5;
      positions[index * 3 + 2] = -0.8 - seededNoise(index * 7.7) * 17.0;
      scales[index] = 3 + seededNoise(index * 8.9) * 10;
      seeds[index] = seededNoise(index * 9.7);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    buffer.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return buffer;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDrift: { value: 0 },
      uMotion: { value: reducedMotion ? 0.28 : 1 },
    }),
    [reducedMotion],
  );

  useEffect(() => {
    const material = materialRef.current;
    return () => {
      geometry.dispose();
      material?.dispose();
    };
  }, [geometry]);

  useFrame((state) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    if (!material || !points) return;

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uDrift.value = clamp(scrollRef.current.velocity * 0.12, -1.2, 1.2);

    points.rotation.z += (clamp(scrollRef.current.velocity * -0.006, -0.03, 0.03) - points.rotation.z) * 0.06;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          precision highp float;

          attribute float aScale;
          attribute float aSeed;

          uniform float uTime;
          uniform float uDrift;
          uniform float uMotion;

          varying float vSeed;
          varying float vDepth;

          void main() {
            vec3 transformed = position;
            float t = uTime * 0.18 * uMotion;

            transformed.x += sin(t + aSeed * 18.0 + position.y * 0.18) * 0.08 + uDrift * (0.14 + aSeed * 0.18);
            transformed.y += cos(t * 0.8 + aSeed * 22.0 + position.x * 0.24) * 0.06;

            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aScale * (160.0 / max(40.0, -mvPosition.z * 26.0));
            vSeed = aSeed;
            vDepth = clamp((-mvPosition.z - 1.0) / 16.0, 0.0, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;

          varying float vSeed;
          varying float vDepth;

          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float dist = length(p);
            float core = smoothstep(0.26, 0.0, dist);
            float halo = smoothstep(0.5, 0.14, dist);
            float sparkle = smoothstep(0.24, 0.0, abs(p.x + p.y * 0.6)) * smoothstep(0.22, 0.0, abs(p.y - p.x * 0.5));
            float alpha = core * 0.8 + halo * 0.22 + sparkle * 0.18;
            alpha *= mix(0.12, 0.78, vDepth);

            vec3 color = mix(vec3(0.42, 0.52, 0.62), vec3(0.96, 0.99, 1.0), core + sparkle * 0.4);
            color += vec3(0.82, 0.92, 1.0) * sparkle * 0.24;

            gl_FragColor = vec4(color, alpha * (0.34 + vSeed * 0.28));
          }
        `}
      />
    </points>
  );
}

function AnimatedCinematicGlassShard({
  seed,
  position,
  rotation,
  scale,
  opacity,
  edgeOpacity,
  driftFactor,
  scrollRef,
}: {
  seed: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  opacity: number;
  edgeOpacity: number;
  driftFactor: number;
  scrollRef: React.MutableRefObject<ScrollSnapshot>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const edgeRef = useRef<THREE.LineSegments | null>(null);
  const glowMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shape = useMemo(() => makeShardShape(seed), [seed]);
  const geometry = useMemo(
    () => makeGlassGeometry(shape, 0.12 + seededNoise(seed * 11.7) * 0.18, 0.03 + seededNoise(seed * 9.1) * 0.03),
    [seed, shape],
  );
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 12), [geometry]);
  const glowUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#eefcff") },
      uOpacity: { value: Math.min(0.5, opacity * 0.88) },
    }),
    [opacity],
  );

  useEffect(() => {
    const glowMaterial = glowMaterialRef.current;
    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
      glowMaterial?.dispose();
    };
  }, [edgeGeometry, geometry]);

  useFrame((state) => {
    const group = groupRef.current;
    const edge = edgeRef.current;
    if (!group || !edge) return;

    const time = state.clock.getElapsedTime();
    const drift = clamp(scrollRef.current.velocity * 0.02, -0.42, 0.42);

    group.position.x = position[0] - drift * driftFactor + Math.sin(time * (0.05 + driftFactor * 0.01) + seed) * 0.04;
    group.position.y = position[1] + Math.cos(time * (0.04 + driftFactor * 0.008) + seed * 0.4) * 0.06;
    group.position.z = position[2] + Math.sin(time * 0.03 + seed * 0.2) * 0.05;
    group.rotation.x = rotation[0] + Math.sin(time * 0.04 + seed * 0.3) * 0.03;
    group.rotation.y = rotation[1] + drift * 0.1 + Math.cos(time * 0.05 + seed * 0.2) * 0.04;
    group.rotation.z = rotation[2] + Math.sin(time * 0.03 + seed) * 0.03;

    const material = edge.material as THREE.LineBasicMaterial;
    material.opacity = edgeOpacity + Math.abs(drift) * 0.03;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#f8fdff"
          transparent
          opacity={opacity}
          transmission={0.9}
          roughness={0.045}
          metalness={0.02}
          ior={1.2}
          thickness={6.2}
          attenuationDistance={0.7}
          attenuationColor="#dff6ff"
          envMapIntensity={1.1}
          clearcoat={1}
          clearcoatRoughness={0.022}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={glowMaterialRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={glowUniforms}
          vertexShader={glassFresnelVertexShader}
          fragmentShader={glassFresnelFragmentShader}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={edgeOpacity * 0.76} />
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
  const shardConfigs = useMemo(
    () => {
      const heroShards = [
        { seed: 1, position: [-3.35, 4.9, 1.6] as [number, number, number], rotation: [0.26, 0.72, -0.54] as [number, number, number], scale: [0.78, 4.9, 0.96] as [number, number, number], opacity: 0.48, edgeOpacity: 0.24, driftFactor: 2.2 },
        { seed: 2, position: [-2.5, 2.1, 0.2] as [number, number, number], rotation: [0.34, 0.44, -0.28] as [number, number, number], scale: [1.24, 3.5, 1.0] as [number, number, number], opacity: 0.4, edgeOpacity: 0.18, driftFactor: 1.8 },
        { seed: 3, position: [1.9, 2.8, -1.4] as [number, number, number], rotation: [-0.24, -0.38, 0.42] as [number, number, number], scale: [1.7, 2.6, 1.0] as [number, number, number], opacity: 0.34, edgeOpacity: 0.14, driftFactor: 1.6 },
        { seed: 4, position: [3.4, 0.2, 1.2] as [number, number, number], rotation: [-0.18, -0.3, 0.3] as [number, number, number], scale: [1.1, 2.7, 1.0] as [number, number, number], opacity: 0.36, edgeOpacity: 0.18, driftFactor: 1.8 },
        { seed: 5, position: [0.3, 0.6, -2.6] as [number, number, number], rotation: [0.18, 0.2, -0.18] as [number, number, number], scale: [1.2, 2.0, 0.9] as [number, number, number], opacity: 0.28, edgeOpacity: 0.1, driftFactor: 1.2 },
        { seed: 6, position: [-0.5, -2.1, -1.8] as [number, number, number], rotation: [-0.16, 0.2, 0.18] as [number, number, number], scale: [1.9, 3.1, 1.0] as [number, number, number], opacity: 0.32, edgeOpacity: 0.12, driftFactor: 1.3 },
        { seed: 7, position: [-2.7, -4.0, 0.4] as [number, number, number], rotation: [0.14, 0.28, -0.36] as [number, number, number], scale: [1.45, 2.8, 1.0] as [number, number, number], opacity: 0.34, edgeOpacity: 0.16, driftFactor: 1.6 },
        { seed: 8, position: [3.3, -4.4, -0.7] as [number, number, number], rotation: [0.24, -0.26, 0.36] as [number, number, number], scale: [1.1, 2.2, 0.92] as [number, number, number], opacity: 0.3, edgeOpacity: 0.14, driftFactor: 1.5 },
        { seed: 9, position: [-5.1, 1.0, 2.8] as [number, number, number], rotation: [0.08, 0.42, -0.44] as [number, number, number], scale: [1.8, 4.4, 1.1] as [number, number, number], opacity: 0.18, edgeOpacity: 0.12, driftFactor: 2.4 },
        { seed: 10, position: [5.2, -1.3, 2.6] as [number, number, number], rotation: [-0.12, -0.36, 0.52] as [number, number, number], scale: [1.6, 3.8, 1.0] as [number, number, number], opacity: 0.18, edgeOpacity: 0.12, driftFactor: 2.4 },
      ];

      const smallFragments = Array.from({ length: 18 }, (_, index) => {
        const seed = 101 + index;
        return {
          seed,
          position: [
            (seededNoise(seed * 2.8) - 0.5) * 7.4,
            (seededNoise(seed * 3.7) - 0.5) * 13.2,
            -0.8 - seededNoise(seed * 4.3) * 11.0,
          ] as [number, number, number],
          rotation: [
            seededNoise(seed * 5.2) * 0.6 - 0.3,
            seededNoise(seed * 6.1) * 0.9 - 0.45,
            seededNoise(seed * 7.3) * Math.PI * 2,
          ] as [number, number, number],
          scale: [
            0.24 + seededNoise(seed * 8.1) * 0.56,
            0.36 + seededNoise(seed * 9.2) * 1.2,
            0.42 + seededNoise(seed * 10.1) * 0.36,
          ] as [number, number, number],
          opacity: 0.08 + seededNoise(seed * 11.7) * 0.14,
          edgeOpacity: 0.04 + seededNoise(seed * 12.5) * 0.06,
          driftFactor: 0.8 + seededNoise(seed * 13.7) * 0.8,
        };
      });

      return [...heroShards, ...smallFragments];
    },
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

      rig.position.x += ((drift * 0.42 + Math.sin(time * 0.04) * 0.04) - rig.position.x) * 0.08;
      rig.position.y += ((Math.cos(time * 0.05 + phase * Math.PI * 2) * 0.04) - rig.position.y) * 0.08;

      state.camera.position.x += ((drift * 0.7 + Math.sin(time * 0.04) * 0.08) - state.camera.position.x) * 0.05;
      state.camera.position.y += ((Math.cos(time * 0.05 + phase * Math.PI * 2) * 0.08) - state.camera.position.y) * 0.05;
      state.camera.position.z += ((8.6 - Math.abs(drift) * 0.22) - state.camera.position.z) * 0.08;
      state.camera.lookAt(0, 0, -4.6);
    });

    return (
      <group ref={rigRef}>
        <FractureBackdropPlane scrollRef={scrollRef} reducedMotion={reducedMotion} />
        <GlassDustField scrollRef={scrollRef} reducedMotion={reducedMotion} />
        <mesh position={[0, -4.2, -13.6]} rotation={[-1.22, 0, 0]} scale={[24, 18, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshPhysicalMaterial
            color="#020407"
            transparent
            opacity={0.22}
            roughness={0.06}
            transmission={0.12}
            metalness={0.03}
            clearcoat={1}
            clearcoatRoughness={0.04}
          />
        </mesh>
        {shardConfigs.map((config) => (
          <AnimatedCinematicGlassShard key={config.seed} scrollRef={scrollRef} {...config} />
        ))}
      </group>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 8.6], fov: 32, near: 0.1, far: 60 }}
        className="absolute inset-0 h-full w-full"
      >
        <color attach="background" args={["#010204"]} />
        <fog attach="fog" args={["#010204", 7, 26]} />
        <ambientLight intensity={0.08} color="#d8ecff" />
        <directionalLight position={[-3.8, 6.4, 7.2]} intensity={1.7} color="#fbfdff" />
        <directionalLight position={[4.6, -3.8, 4.4]} intensity={0.92} color="#cdefff" />
        <pointLight position={[-5.6, 4.4, 2.8]} intensity={1.05} color="#f9fdff" />
        <pointLight position={[5.2, -1.4, 3.2]} intensity={0.68} color="#d7f3ff" />
        <pointLight position={[0.2, 0.4, 5.4]} intensity={0.34} color="#ffffff" />
        <pointLight position={[0, 7.2, -3.4]} intensity={0.22} color="#b9d9ff" />
        <SceneRig />
      </Canvas>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(1,4,8,0.18)_0%,rgba(1,4,8,0.1)_24%,rgba(1,4,8,0.54)_76%,rgba(1,4,8,0.9)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,transparent_0%,rgba(255,255,255,0.04)_18%,transparent_34%,transparent_100%)] mix-blend-screen opacity-40" />
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
  const snapPointsRef = useRef<number[]>([]);
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
    snapPointsRef,
  });

  useEffect(() => {
    sceneScrollRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const update = () => {
      setContentHeight(element.getBoundingClientRect().height);

      const snapPoints = Array.from(element.children)
        .map((child) => {
          const card = child as HTMLDivElement;
          const center = card.offsetTop + card.offsetHeight / 2;
          return Math.max(0, center - viewportHeight * 0.31);
        })
        .sort((a, b) => a - b);

      snapPointsRef.current = snapPoints;
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);
    Array.from(element.children).forEach((child) => observer.observe(child as Element));

    return () => observer.disconnect();
  }, [sortedEntries, viewportHeight]);

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
          className="fixed left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[rgba(10,10,12,0.82)] text-white/84 backdrop-blur-xl"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.9rem)" }}
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
