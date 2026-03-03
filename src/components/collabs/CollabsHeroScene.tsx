"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const LETTERS = ["C", "O", "L", "L", "A", "B", "S"] as const;
const TARGET_CAP_HEIGHT = 1.2;
const BASE_GAP = 0.18 * TARGET_CAP_HEIGHT;
const X_JITTER = 0.22 * TARGET_CAP_HEIGHT;
const Y_JITTER = 0.18 * TARGET_CAP_HEIGHT;
const Z_JITTER = 0.55 * TARGET_CAP_HEIGHT;
const ROT_X_JITTER = 0.25;
const ROT_Y_JITTER = 0.35;
const ROT_Z_JITTER = 0.3;
const MAX_DISP = 1.35 * TARGET_CAP_HEIGHT;
const MAX_VEL = 6.0;
const MAX_ANG_VEL = 4.0;
const DEV = process.env.NODE_ENV !== "production";
const UP = new THREE.Vector3(0, 1, 0);

type LetterState = {
  restPosition: THREE.Vector3;
  restQuaternion: THREE.Quaternion;
  restScale: number;
  currentScale: number;
  scaleVelocity: number;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
};

type LetterModel = {
  geometry: TextGeometry;
  bboxWidth: number;
  bboxHeight: number;
  uniformScale: number;
  scaledWidth: number;
};

type DebugStats = {
  width: number;
  height: number;
  depth: number;
  cameraDistance: number;
  maxDisp: number;
};

function hashStringSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function SceneInner({
  onHoverChange,
  onDebugUpdate,
}: {
  onHoverChange?: (hovered: boolean) => void;
  onDebugUpdate?: (stats: DebugStats) => void;
}) {
  const { gl, camera, size } = useThree();
  const [font, setFont] = useState<Font | null>(null);
  const fontLoader = useMemo(() => new FontLoader(), []);

  const rigRef = useRef<THREE.Group | null>(null);
  const lettersGroupRef = useRef<THREE.Group | null>(null);
  const letterRefs = useRef<Array<THREE.Mesh | null>>([]);
  const letterStatesRef = useRef<LetterState[]>([]);
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerSmoothRef = useRef(new THREE.Vector2(0, 0));
  const baseCameraPosRef = useRef(new THREE.Vector3(0, 0.25, 7.5));
  const wasHoveringRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const intersectablesRef = useRef<THREE.Object3D[]>([]);
  const intersectionsRef = useRef<THREE.Intersection<THREE.Object3D>[]>([]);
  const interactionPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const cursorPointRef = useRef(new THREE.Vector3(0, 0, 0));
  const prevCursorPointRef = useRef(new THREE.Vector3(0, 0, 0));
  const pointerVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const tmpVecA = useRef(new THREE.Vector3());
  const tmpVecB = useRef(new THREE.Vector3());
  const tmpVecC = useRef(new THREE.Vector3());
  const tmpTangent = useRef(new THREE.Vector3());
  const tmpEuler = useRef(new THREE.Euler());
  const tmpQuatA = useRef(new THREE.Quaternion());
  const tmpQuatB = useRef(new THREE.Quaternion());
  const tmpQuatC = useRef(new THREE.Quaternion());
  const tmpBox = useRef(new THREE.Box3());
  const tmpSphere = useRef(new THREE.Sphere());
  const debugTimerRef = useRef(0);
  const hasFramedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fontLoader.load(
      "/fonts/helvetiker_bold.typeface.json",
      (loaded) => {
        if (cancelled) return;
        setFont(loaded);
      },
      undefined,
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [fontLoader]);

  const environmentTexture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return env;
  }, [gl]);

  useEffect(() => {
    return () => environmentTexture.dispose();
  }, [environmentTexture]);

  const model = useMemo(() => {
    if (!font) return { letters: [] as LetterModel[] };
    const letters: LetterModel[] = [];

    for (let i = 0; i < LETTERS.length; i += 1) {
      const geo = new TextGeometry(LETTERS[i], {
        font,
        size: 1.0,
        depth: 0.28,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.03,
        bevelSegments: 3,
      });
      geo.computeBoundingBox();
      geo.center();
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      const box = geo.boundingBox;
      const bboxWidth = box ? box.max.x - box.min.x : 1;
      const bboxHeight = box ? box.max.y - box.min.y : 1;
      const safeHeight = Math.max(0.001, bboxHeight);
      const uniformScale = TARGET_CAP_HEIGHT / safeHeight;
      const scaledWidth = bboxWidth * uniformScale;
      letters.push({ geometry: geo, bboxWidth, bboxHeight: safeHeight, uniformScale, scaledWidth });
    }
    return { letters };
  }, [font]);

  useEffect(() => {
    return () => {
      for (const letter of model.letters) letter.geometry.dispose();
    };
  }, [model.letters]);

  const letterMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#2e68d8",
        roughness: 0.28,
        metalness: 0.14,
        clearcoat: 0.8,
        clearcoatRoughness: 0.19,
        envMapIntensity: 1.25,
        emissive: new THREE.Color("#0d1d3d"),
        emissiveIntensity: 0.025,
      }),
    [],
  );

  useEffect(() => () => letterMaterial.dispose(), [letterMaterial]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const nx = THREE.MathUtils.clamp((event.clientX / size.width) * 2 - 1, -1, 1);
      const ny = THREE.MathUtils.clamp((event.clientY / size.height) * 2 - 1, -1, 1);
      pointerTargetRef.current.set(nx, ny);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const nx = THREE.MathUtils.clamp((touch.clientX / size.width) * 2 - 1, -1, 1);
      const ny = THREE.MathUtils.clamp((touch.clientY / size.height) * 2 - 1, -1, 1);
      pointerTargetRef.current.set(nx, ny);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [size.height, size.width]);

  const autoFrame = useMemo(
    () => () => {
      const group = lettersGroupRef.current;
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      if (!group || !perspectiveCamera || model.letters.length !== LETTERS.length) return;
      tmpBox.current.setFromObject(group);
      tmpBox.current.getBoundingSphere(tmpSphere.current);
      const center = tmpSphere.current.center;
      const radius = Math.max(0.001, tmpSphere.current.radius);
      const fovRad = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
      const rawDist = (radius / Math.sin(fovRad)) * 1.25;
      const dist = THREE.MathUtils.clamp(rawDist, 4.5, 14.0);
      perspectiveCamera.position.set(0, 0.25, dist);
      perspectiveCamera.lookAt(center);
      perspectiveCamera.updateProjectionMatrix();
      baseCameraPosRef.current.set(0, 0.25, dist);

      const sizeBox = tmpBox.current.getSize(tmpVecA.current);
      onDebugUpdate?.({
        width: sizeBox.x,
        height: sizeBox.y,
        depth: sizeBox.z,
        cameraDistance: dist,
        maxDisp: 0,
      });
    },
    [camera, model.letters.length, onDebugUpdate],
  );

  useLayoutEffect(() => {
    if (!lettersGroupRef.current || model.letters.length !== LETTERS.length) return;

    const rng = mulberry32(hashStringSeed("COLLABS_V1"));
    const restX: number[] = [];
    let xCursor = 0;
    for (let i = 0; i < model.letters.length; i += 1) {
      const halfWidth = model.letters[i].scaledWidth * 0.5;
      restX.push(xCursor + halfWidth);
      xCursor += model.letters[i].scaledWidth + (i === model.letters.length - 1 ? 0 : BASE_GAP);
    }
    const mid = xCursor * 0.5;

    letterStatesRef.current = [];
    lettersGroupRef.current.scale.setScalar(1);

    for (let i = 0; i < model.letters.length; i += 1) {
      const mesh = letterRefs.current[i];
      if (!mesh) continue;

      const restXPos = restX[i] - mid + (rng() * 2 - 1) * X_JITTER;
      const restYPos = (rng() * 2 - 1) * Y_JITTER;
      const restZPos = (rng() * 2 - 1) * Z_JITTER;
      tmpEuler.current.set(
        (rng() * 2 - 1) * ROT_X_JITTER,
        (rng() * 2 - 1) * ROT_Y_JITTER,
        (rng() * 2 - 1) * ROT_Z_JITTER,
      );
      const restQuat = new THREE.Quaternion().setFromEuler(tmpEuler.current);
      const restScale = model.letters[i].uniformScale;
      letterStatesRef.current.push({
        restPosition: new THREE.Vector3(restXPos, restYPos, restZPos),
        restQuaternion: restQuat,
        restScale,
        currentScale: restScale,
        scaleVelocity: 0,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
      });

      mesh.position.set(restXPos, restYPos, restZPos);
      mesh.quaternion.copy(restQuat);
      mesh.scale.setScalar(restScale);
      if (DEV) {
        const sx = mesh.scale.x;
        const sy = mesh.scale.y;
        const sz = mesh.scale.z;
        if (Math.abs(sx - sy) > 1e-3 || Math.abs(sx - sz) > 1e-3) {
          console.error("[Collabs] Non-uniform letter scale detected, forcing uniform scale.", { index: i, sx, sy, sz });
          mesh.scale.setScalar((sx + sy + sz) / 3);
        }
      }
    }

    intersectablesRef.current = letterRefs.current.filter((mesh): mesh is THREE.Mesh => Boolean(mesh));

    tmpBox.current.setFromObject(lettersGroupRef.current);
    const restSize = tmpBox.current.getSize(tmpVecA.current);
    if (restSize.x > 9.0 || restSize.y > 4.0) {
      const downScale = THREE.MathUtils.clamp(Math.min(7.0 / Math.max(restSize.x, 0.001), 4.0 / Math.max(restSize.y, 0.001)), 0.2, 1);
      lettersGroupRef.current.scale.multiplyScalar(downScale);
    }

    autoFrame();
    hasFramedRef.current = true;
  }, [autoFrame, model.letters]);

  useLayoutEffect(() => {
    if (!hasFramedRef.current) return;
    autoFrame();
  }, [autoFrame, size.height, size.width]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  useFrame((frameState) => {
    const delta = Math.min(frameState.clock.getDelta(), 1 / 30);
    if (!font || model.letters.length !== LETTERS.length || letterStatesRef.current.length !== LETTERS.length) return;

    pointerSmoothRef.current.x = THREE.MathUtils.damp(pointerSmoothRef.current.x, pointerTargetRef.current.x, 10, delta);
    pointerSmoothRef.current.y = THREE.MathUtils.damp(pointerSmoothRef.current.y, pointerTargetRef.current.y, 10, delta);

    raycasterRef.current.setFromCamera(pointerSmoothRef.current, camera);
    raycasterRef.current.ray.intersectPlane(interactionPlaneRef.current, cursorPointRef.current);

    const intersections = intersectionsRef.current;
    intersections.length = 0;
    raycasterRef.current.intersectObjects(intersectablesRef.current, false, intersections);
    const hovered = intersections.length > 0;
    let hoveredIndex = -1;
    if (hovered) {
      hoveredIndex = letterRefs.current.indexOf(intersections[0].object as THREE.Mesh);
    }
    if (hovered !== wasHoveringRef.current) {
      wasHoveringRef.current = hovered;
      document.body.style.cursor = hovered ? "pointer" : "";
      onHoverChange?.(hovered);
    }

    const pointerX = pointerSmoothRef.current.x;
    const pointerY = pointerSmoothRef.current.y;
    const safeDelta = Math.max(delta, 0.0001);
    tmpVecA.current.copy(cursorPointRef.current).sub(prevCursorPointRef.current).multiplyScalar(1 / safeDelta);
    const pointerVelBlend = 1 - Math.exp(-9 * delta);
    pointerVelocityRef.current.lerp(tmpVecA.current, pointerVelBlend);
    pointerVelocityRef.current.clampLength(0, 2.4);
    prevCursorPointRef.current.copy(cursorPointRef.current);

    if (rigRef.current) {
      rigRef.current.rotation.x = THREE.MathUtils.damp(rigRef.current.rotation.x, -pointerY * 0.06, 4, delta);
      rigRef.current.rotation.y = THREE.MathUtils.damp(rigRef.current.rotation.y, pointerX * 0.08, 4, delta);
      rigRef.current.position.x = THREE.MathUtils.damp(
        rigRef.current.position.x,
        baseCameraPosRef.current.x + pointerX * 0.14,
        3.4,
        delta,
      );
      rigRef.current.position.y = THREE.MathUtils.damp(
        rigRef.current.position.y,
        0.02 + baseCameraPosRef.current.y + pointerY * 0.09,
        3.4,
        delta,
      );
    }

    const springStrength = 20;
    const springDamping = Math.exp(-7.2 * delta);
    const globalStrength = 1.2;
    const swirlStrength = 0.35;
    const pointerImpulse = 0.1;
    const hoverBoost = 2.8;
    const rotationSpring = 20;
    const rotationDamping = Math.exp(-7.5 * delta);
    const scaleSpring = 36;
    const scaleDamping = Math.exp(-10 * delta);
    let maxCurrentDisp = 0;

    for (let i = 0; i < LETTERS.length; i += 1) {
      const mesh = letterRefs.current[i];
      const letter = letterStatesRef.current[i];
      if (!mesh || !letter) continue;

      tmpVecB.current.copy(letter.restPosition).sub(mesh.position);
      letter.velocity.addScaledVector(tmpVecB.current, springStrength * delta);

      tmpVecB.current.copy(mesh.position).sub(cursorPointRef.current);
      const d2 = Math.max(0.0001, tmpVecB.current.lengthSq());
      const invLen = 1 / Math.sqrt(d2);
      const falloff = 1 / (1 + d2 * 0.9);
      const boost = hoveredIndex === i ? hoverBoost : 1;
      tmpVecB.current.multiplyScalar(invLen);

      letter.velocity.addScaledVector(tmpVecB.current, globalStrength * falloff * boost * delta);
      tmpTangent.current.copy(tmpVecB.current).cross(UP);
      letter.velocity.addScaledVector(tmpTangent.current, swirlStrength * falloff * boost * delta);
      letter.velocity.addScaledVector(pointerVelocityRef.current, pointerImpulse * falloff * boost * delta);

      letter.angularVelocity.x += -tmpVecB.current.y * 2.8 * falloff * boost * delta;
      letter.angularVelocity.y += tmpVecB.current.x * 3.2 * falloff * boost * delta;
      letter.angularVelocity.z += tmpTangent.current.x * 2.2 * falloff * boost * delta;

      letter.velocity.multiplyScalar(springDamping);
      if (letter.velocity.lengthSq() > MAX_VEL * MAX_VEL) {
        letter.velocity.setLength(MAX_VEL);
      }
      mesh.position.addScaledVector(letter.velocity, delta);

      tmpVecA.current.copy(mesh.position).sub(letter.restPosition);
      const currentDisp = tmpVecA.current.length();
      if (currentDisp > maxCurrentDisp) maxCurrentDisp = currentDisp;
      if (currentDisp > MAX_DISP) {
        mesh.position.lerp(letter.restPosition, 0.25);
        letter.velocity.multiplyScalar(0.25);
      }

      tmpQuatA.current.copy(mesh.quaternion).invert();
      tmpQuatB.current.copy(tmpQuatA.current).multiply(letter.restQuaternion);
      if (tmpQuatB.current.w < 0) {
        tmpQuatB.current.x = -tmpQuatB.current.x;
        tmpQuatB.current.y = -tmpQuatB.current.y;
        tmpQuatB.current.z = -tmpQuatB.current.z;
        tmpQuatB.current.w = -tmpQuatB.current.w;
      }
      const clampedW = THREE.MathUtils.clamp(tmpQuatB.current.w, -1, 1);
      let angle = 2 * Math.acos(clampedW);
      if (angle > Math.PI) angle -= Math.PI * 2;
      const sinHalf = Math.sqrt(Math.max(0, 1 - clampedW * clampedW));
      if (sinHalf > 0.0005) {
        tmpVecC.current.set(tmpQuatB.current.x / sinHalf, tmpQuatB.current.y / sinHalf, tmpQuatB.current.z / sinHalf);
      } else {
        tmpVecC.current.set(tmpQuatB.current.x, tmpQuatB.current.y, tmpQuatB.current.z);
      }
      letter.angularVelocity.addScaledVector(tmpVecC.current, angle * rotationSpring * delta);
      letter.angularVelocity.multiplyScalar(rotationDamping);
      if (letter.angularVelocity.lengthSq() > MAX_ANG_VEL * MAX_ANG_VEL) {
        letter.angularVelocity.setLength(MAX_ANG_VEL);
      }

      tmpVecA.current.copy(letter.angularVelocity).multiplyScalar(delta);
      const step = tmpVecA.current.length();
      if (step > 0.000001) {
        tmpVecA.current.multiplyScalar(1 / step);
        tmpQuatC.current.setFromAxisAngle(tmpVecA.current, step);
        mesh.quaternion.multiply(tmpQuatC.current).normalize();
      }

      const targetScale = hoveredIndex === i ? letter.restScale * 1.03 : letter.restScale;
      letter.scaleVelocity += (targetScale - letter.currentScale) * scaleSpring * delta;
      letter.scaleVelocity *= scaleDamping;
      letter.scaleVelocity = THREE.MathUtils.clamp(letter.scaleVelocity, -1.2, 1.2);
      letter.currentScale += letter.scaleVelocity * delta;
      letter.currentScale = THREE.MathUtils.clamp(letter.currentScale, letter.restScale * 0.97, letter.restScale * 1.03);
      mesh.scale.setScalar(letter.currentScale);

      if (DEV) {
        const sx = mesh.scale.x;
        const sy = mesh.scale.y;
        const sz = mesh.scale.z;
        if (Math.abs(sx - sy) > 1e-3 || Math.abs(sx - sz) > 1e-3) {
          console.error("[Collabs] Non-uniform scale detected during simulation, forcing scalar.", { index: i, sx, sy, sz });
          mesh.scale.setScalar((sx + sy + sz) / 3);
        }
      }
    }

    debugTimerRef.current += delta;
    if (debugTimerRef.current > 0.16) {
      debugTimerRef.current = 0;
      if (lettersGroupRef.current) {
        tmpBox.current.setFromObject(lettersGroupRef.current);
        const sizeBox = tmpBox.current.getSize(tmpVecA.current);
        onDebugUpdate?.({
          width: sizeBox.x,
          height: sizeBox.y,
          depth: sizeBox.z,
          cameraDistance: baseCameraPosRef.current.z,
          maxDisp: maxCurrentDisp,
        });
      }
    }
  });

  if (!font || model.letters.length === 0) return null;

  return (
    <>
      <primitive attach="environment" object={environmentTexture} />

      <ambientLight intensity={0.62} color="#f8f9ff" />
      <hemisphereLight intensity={0.45} color="#fffdf8" groundColor="#d8e2ff" />
      <directionalLight intensity={1.65} position={[3.2, 4.8, 5.6]} color="#ffffff" castShadow />
      <directionalLight intensity={0.68} position={[-4, 1.8, 4]} color="#d7e1ff" />

      <group ref={rigRef} position={[0, 0.06, 0]}>
        <group ref={lettersGroupRef}>
          {model.letters.map((letter, index) => (
            <mesh
              key={`collabs-letter-${index}`}
              ref={(node) => {
                letterRefs.current[index] = node;
                if (node) {
                  intersectablesRef.current[index] = node;
                }
              }}
              geometry={letter.geometry}
              material={letterMaterial}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      </group>

      <ContactShadows
        position={[0, -1.4, 0]}
        opacity={0.18}
        scale={20}
        blur={2.4}
        far={7}
        resolution={1024}
        color="#1f315d"
      />
    </>
  );
}

export default function CollabsHeroScene({ onHoverChange }: { onHoverChange?: (hovered: boolean) => void }) {
  const [debugStats, setDebugStats] = useState<DebugStats | null>(null);
  const showDebug = process.env.NODE_ENV !== "production";

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 35, position: [0, 0.25, 7.5], near: 0.1, far: 100 }}
        onCreated={(state) => {
          const glRenderer = state.gl as THREE.WebGLRenderer & {
            physicallyCorrectLights?: boolean;
            useLegacyLights?: boolean;
          };
          if (typeof glRenderer.physicallyCorrectLights === "boolean") {
            glRenderer.physicallyCorrectLights = true;
          } else if (typeof glRenderer.useLegacyLights === "boolean") {
            glRenderer.useLegacyLights = false;
          }
          state.gl.outputColorSpace = THREE.SRGBColorSpace;
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = 1.16;
          state.gl.setClearColor(0x000000, 0);
          state.camera.lookAt(0, 0, 0);
        }}
      >
        <Suspense fallback={null}>
          <SceneInner onHoverChange={onHoverChange} onDebugUpdate={setDebugStats} />
        </Suspense>
      </Canvas>
      {showDebug && debugStats ? (
        <div className="pointer-events-none absolute left-2 top-2 z-40 rounded bg-black/50 px-2 py-1 font-mono text-[10px] text-white/90">
          <div>{`bbox w:${debugStats.width.toFixed(2)} h:${debugStats.height.toFixed(2)} d:${debugStats.depth.toFixed(2)}`}</div>
          <div>{`cam dist:${debugStats.cameraDistance.toFixed(2)}`}</div>
          <div>{`max disp:${debugStats.maxDisp.toFixed(2)}`}</div>
        </div>
      ) : null}
    </div>
  );
}
