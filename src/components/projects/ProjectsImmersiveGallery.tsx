"use client";

import Image from "next/image";
import Link from "next/link";
import { Html, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Josefin_Sans } from "next/font/google";
import { type CSSProperties, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

import { DESKTOP_PROJECT_REEL_ORDER, PROJECT_REELS } from "@/lib/mobile-content";

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

type DesktopProjectReel = (typeof PROJECT_REELS)[number] & {
  title: string;
  label: string;
  descriptor: string;
  format: string;
  year: string;
  edition: string;
};

type RoomSlot = {
  position: [number, number, number];
  rotation: [number, number, number];
  artSize: [number, number];
};

type HomeFocusEntry = {
  index: number;
  plaqueSelected: boolean;
};

type FootprintState = {
  id: number;
  side: "left" | "right";
  bornAt: number;
  position: [number, number, number];
  rotationY: number;
};

type FootprintRuntime = {
  id: number;
  bornAt: number;
  group: THREE.Group;
  material: THREE.ShaderMaterial;
};

const LEFT_WALL_X = -2;
const RIGHT_WALL_X = 2;
const WALL_SLOT_Z_POSITIONS = [-0.88, -3.04, -5.2, -7.36, -9.52] as const;

const DESKTOP_PROJECT_REELS: DesktopProjectReel[] = DESKTOP_PROJECT_REEL_ORDER.map((id) => {
  const reel = PROJECT_REELS.find((entry) => entry.id === id);
  if (!reel) {
    throw new Error(`Missing project reel for desktop order: ${id}`);
  }
  return reel;
}).map((reel, index) => ({
  ...reel,
  title: `Project Reel ${String(index + 1).padStart(2, "0")}`,
  label: `R-${String(index + 1).padStart(2, "0")}`,
  descriptor: [
    "Portrait performance loop",
    "Editorial motion study",
    "Vertical diary fragment",
    "Quick-cut montage",
    "Cinematic social short",
    "Studio vignette",
    "Movement archive",
    "Screen test transfer",
    "Portrait loop composition",
  ][index] ?? "Digital reel composition",
  format: "9:16 digital transfer",
  year: "2025",
  edition: "Single-channel loop",
}));

const ROOM_SLOTS: RoomSlot[] = [
  ...WALL_SLOT_Z_POSITIONS.map((z) => ({
    position: [LEFT_WALL_X, 1.14, z] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
    artSize: [1, 1.42] as [number, number],
  })),
  ...WALL_SLOT_Z_POSITIONS.map((z) => ({
    position: [RIGHT_WALL_X, 1.14, z] as [number, number, number],
    rotation: [0, -Math.PI / 2, 0] as [number, number, number],
    artSize: [1, 1.42] as [number, number],
  })),
];
const HOME_FRAME_COUNT = ROOM_SLOTS.length;
const PLAQUE_TITLE = "Projects";
const PLAQUE_BODY = "A smattering of works that show who I am!";
const PLAQUE_CANVAS_WIDTH = 1800;
const PLAQUE_CANVAS_HEIGHT = 1440;
const PLAQUE_LINKS = [
  {
    label: "chloeverse.io",
    href: "https://chloeverse.io",
    x: 208,
    y: 904,
    hitWidth: 476,
    hitHeight: 84,
  },
  {
    label: "imchloekang.com",
    href: "https://imchloekang.com",
    x: 208,
    y: 1014,
    hitWidth: 562,
    hitHeight: 84,
  },
] as const;

const DETAIL_NAV_LOCK_MS = 360;
const HOME_CAMERA_BASE = new THREE.Vector3(0, 1.03, 3.72);
const HOME_CAMERA_LERP = 0.022;
const HOME_LOOK_TARGET = new THREE.Vector3(0, 0.62, -1.02);
const HOME_CAMERA_X_FOLLOW = 0.42;
const HOME_LOOK_X_FOLLOW = 0.66;
const HOME_CAMERA_Z_OFFSET = 3.52;
const HOME_LOOK_Z_OFFSET = -0.54;
const HOME_DESCRIPTION_POSITION = new THREE.Vector3(0, 1.43, -11.46);
const HOME_DESCRIPTION_SCALE: [number, number] = [1.92, 1.54];
const HOME_PANEL_SCALE: [number, number] = [0.6, 0.3];
const HOME_RING_DESCRIPTION = new THREE.Vector3(0, 0.01, -10.88);
const HOME_FOCUS_RADIUS = 0.25;
const HOME_FOCUS_FRAME_DISTANCE = 3.2;
const HOME_FOCUS_PLAQUE_DISTANCE = 5;
const HOME_SPOTLIGHTS = ROOM_SLOTS.map((slot) => {
  const isRightWall = slot.position[0] > 0;
  const lightX = isRightWall ? -0.08755937443028984 : 0.08787382247833649;
  const lightY = isRightWall ? 2.300290206711419 : 2.2973295169098713;
  const targetX = slot.position[0] + lightX;
  const targetY = lightY - 1;
  const targetZ = slot.position[2] + (isRightWall ? -0.07450998533669977 : 0.07200103807277528);

  return {
    position: [lightX, lightY, targetZ] as [number, number, number],
    target: [targetX, targetY, targetZ] as [number, number, number],
  };
});
const FRAME_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAME_FRAGMENT_SHADER = `
uniform sampler2D uMap;
uniform vec2 uUvScale;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * uUvScale + 0.5;
  vec4 texel = texture2D(uMap, uv);
  float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
  vec3 graded = vec3(mix(luma * 0.82, luma * 1.08, smoothstep(0.2, 0.85, luma)));
  gl_FragColor = vec4(graded, texel.a);
}
`;

const FRAME_DRAW_SURFACE_ASPECT = 4.2 / 6;
const DETAIL_MEDIA_WIDTH = "min(34rem, 38vw, calc((100svh - 10.5rem) * 0.5625))";

const FOOTPRINT_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;
  vUv = uv;
}
`;

const FOOTPRINT_FRAGMENT_SHADER = `
varying vec2 vUv;
uniform float u_progress;
uniform sampler2D u_tex;
uniform sampler2D u_noise;

void main() {
  float scale = 0.3 + u_progress * 0.02;
  vec2 ndc = (vUv - 0.5) / scale + 0.5;
  vec2 dir = normalize(vUv - 0.5);
  float noise = texture2D(u_noise, ndc).r;
  ndc -= dir * noise * u_progress * 0.1;
  float tex = texture2D(u_tex, ndc).r * 1.5;
  float alpha = 1.0 - u_progress;
  gl_FragColor = vec4(vec3(tex), (1.0 - tex) * alpha);
}
`;

const AVATAR_FADE_DURATION = 0.2;
const AVATAR_WALK_ROTATE_STEP = 0.15;
const AVATAR_WALK_SPEED = 1;
const AVATAR_WALK_TIMESCALE = 5;
const AVATAR_FOOTPRINT_LIFETIME = 3;
const AVATAR_FOOTPRINT_MAX_COUNT = 36;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const HOME_WALK_BOUNDS = {
  minX: -1.28,
  maxX: 1.28,
  minZ: -11.18,
  maxZ: 0.25,
};
const HOME_CONTROL_KEYS = ["keyw", "keya", "keys", "keyd", "arrowleft", "arrowright", "arrowup", "arrowdown"] as const;

function clampIndex(index: number) {
  return Math.max(0, Math.min(DESKTOP_PROJECT_REELS.length - 1, index));
}

function clampHomeIndex(index: number) {
  return Math.max(0, Math.min(HOME_FRAME_COUNT - 1, index));
}

function getHomeDirectionOffset(keyPressed: Record<string, boolean>) {
  let offset = 0;

  if (keyPressed.keys || keyPressed.arrowdown) {
    if (keyPressed.keyd || keyPressed.arrowright) {
      offset = Math.PI / 4;
    } else if (keyPressed.keya || keyPressed.arrowleft) {
      offset = -Math.PI / 4;
    }
  } else if (keyPressed.keyw || keyPressed.arrowup) {
    if (keyPressed.keyd || keyPressed.arrowright) {
      offset = Math.PI / 4 + Math.PI / 2;
    } else if (keyPressed.keya || keyPressed.arrowleft) {
      offset = -Math.PI / 4 - Math.PI / 2;
    } else {
      offset = Math.PI;
    }
  } else if (keyPressed.keyd || keyPressed.arrowright) {
    offset = Math.PI / 2;
  } else if (keyPressed.keya || keyPressed.arrowleft) {
    offset = -Math.PI / 2;
  }

  return offset;
}

function getHomeRingPosition(slot: RoomSlot) {
  if (Math.abs(slot.position[0]) < 0.01) {
    return HOME_RING_DESCRIPTION.clone();
  }
  return new THREE.Vector3(slot.position[0] > 0 ? 1.2 : -1.2, 0.01, slot.position[2]);
}

function getNearestHomeSelection(position: THREE.Vector3) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPlaque = false;

  const plaqueDistance = position.distanceToSquared(HOME_RING_DESCRIPTION);
  if (plaqueDistance < nearestDistance) {
    nearestDistance = plaqueDistance;
    nearestIndex = 0;
    nearestPlaque = true;
  }

  ROOM_SLOTS.forEach((slot, index) => {
    const distance = position.distanceToSquared(getHomeRingPosition(slot));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
      nearestPlaque = false;
    }
  });

  return {
    index: nearestIndex,
    plaqueSelected: nearestPlaque,
  };
}

function getHomeFocusEntry(position: THREE.Vector3) {
  const nextSelection = getNearestHomeSelection(position);
  const focusPosition = nextSelection.plaqueSelected
    ? HOME_RING_DESCRIPTION
    : getHomeRingPosition(ROOM_SLOTS[nextSelection.index]);

  if (position.distanceTo(focusPosition) > HOME_FOCUS_RADIUS) {
    return null;
  }

  return nextSelection;
}

function getHomeCameraFocusTarget(focusEntry: HomeFocusEntry) {
  const sourcePosition = focusEntry.plaqueSelected
    ? HOME_DESCRIPTION_POSITION
    : new THREE.Vector3(...ROOM_SLOTS[focusEntry.index].position);
  const rotation = focusEntry.plaqueSelected ? 0 : ROOM_SLOTS[focusEntry.index].rotation[1];
  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(WORLD_UP, rotation).normalize();

  return {
    position: sourcePosition,
    forward,
    distance: focusEntry.plaqueSelected ? HOME_FOCUS_PLAQUE_DISTANCE : HOME_FOCUS_FRAME_DISTANCE,
  };
}

function wrapPlaqueText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (!currentLine || context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }
    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function plaqueCanvasRectToLocal(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return {
    position: [
      (centerX / PLAQUE_CANVAS_WIDTH - 0.5) * HOME_DESCRIPTION_SCALE[0],
      (0.5 - centerY / PLAQUE_CANVAS_HEIGHT) * HOME_DESCRIPTION_SCALE[1],
      0.002,
    ] as [number, number, number],
    size: [
      (width / PLAQUE_CANVAS_WIDTH) * HOME_DESCRIPTION_SCALE[0],
      (height / PLAQUE_CANVAS_HEIGHT) * HOME_DESCRIPTION_SCALE[1],
    ] as [number, number],
  };
}

function createPlaqueTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = PLAQUE_CANVAS_WIDTH;
  canvas.height = PLAQUE_CANVAS_HEIGHT;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(17,17,17,0.9)";
  context.lineWidth = 7;
  context.lineCap = "square";
  context.lineJoin = "miter";
  context.beginPath();
  context.moveTo(610, 268);
  context.lineTo(1370, 268);
  context.stroke();

  context.fillStyle = "#111111";
  context.textAlign = "left";
  context.textBaseline = "top";

  context.font = "700 158px Arial";
  context.fillText(PLAQUE_TITLE, 210, 78);

  context.font = "700 72px Arial";
  const bodyLines = wrapPlaqueText(context, PLAQUE_BODY, 1120);
  bodyLines.forEach((line, index) => {
    context.fillText(line, 208, 412 + index * 98);
  });

  context.font = "600 58px Arial";
  PLAQUE_LINKS.forEach(({ label, x, y }) => {
    context.fillStyle = "rgba(17,17,17,0.9)";
    context.fillText(label, x, y);
    const linkWidth = context.measureText(label).width;

    context.lineWidth = 4;
    context.strokeStyle = "rgba(17,17,17,0.72)";
    context.beginPath();
    context.moveTo(x, y + 66);
    context.lineTo(x + linkWidth, y + 66);
    context.stroke();
  });

  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(1232, 1118);
  context.lineTo(1568, 1118);
  context.lineTo(1568, 678);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createSidePanelTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 600;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = "700 156px Arial";
  context.fillText(label, 212, 238);

  context.lineWidth = 10;
  context.strokeStyle = "rgba(17,17,17,0.92)";
  context.beginPath();
  context.moveTo(214, 388);
  context.lineTo(332, 486);
  context.lineTo(332, 390);
  context.lineTo(540, 390);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function getImageDimensions(source: CanvasImageSource) {
  const width = "naturalWidth" in source ? source.naturalWidth : "videoWidth" in source ? source.videoWidth : (source as { width?: number }).width;
  const height =
    "naturalHeight" in source ? source.naturalHeight : "videoHeight" in source ? source.videoHeight : (source as { height?: number }).height;

  if (!width || !height) {
    return null;
  }

  return { width, height };
}

function createFootprintAlphaTexture(texture: THREE.Texture, noiseTexture?: THREE.Texture) {
  if (typeof document === "undefined") {
    return texture;
  }

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = 220;
  outputCanvas.height = 220;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) {
    return texture;
  }

  outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  const smudgeClouds = [
    { alpha: 1, blur: 16, x: 110, y: 112, radiusX: 40, radiusY: 30, rotation: 0.04 },
    { alpha: 0.74, blur: 18, x: 110, y: 144, radiusX: 32, radiusY: 22, rotation: -0.04 },
    { alpha: 0.62, blur: 18, x: 110, y: 82, radiusX: 30, radiusY: 22, rotation: 0.08 },
    { alpha: 0.24, blur: 18, x: 88, y: 114, radiusX: 18, radiusY: 24, rotation: -0.18 },
    { alpha: 0.24, blur: 18, x: 132, y: 114, radiusX: 18, radiusY: 24, rotation: 0.18 },
  ] as const;

  outputContext.fillStyle = "#6f6f6f";
  smudgeClouds.forEach(({ alpha, blur, x, y, radiusX, radiusY, rotation }) => {
    outputContext.save();
    outputContext.filter = `blur(${blur}px)`;
    outputContext.globalAlpha = alpha;
    outputContext.beginPath();
    outputContext.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    outputContext.fill();
    outputContext.restore();
  });

  outputContext.save();
  outputContext.filter = "blur(12px)";
  outputContext.globalAlpha = 0.2;
  outputContext.lineWidth = 10;
  outputContext.lineCap = "round";
  outputContext.beginPath();
  outputContext.moveTo(92, 116);
  outputContext.lineTo(128, 110);
  outputContext.strokeStyle = "#6f6f6f";
  outputContext.stroke();
  outputContext.restore();
  outputContext.filter = "none";
  outputContext.globalAlpha = 1;

  const alphaTexture = new THREE.CanvasTexture(outputCanvas);
  alphaTexture.colorSpace = THREE.NoColorSpace;
  alphaTexture.anisotropy = 8;
  return alphaTexture;
}

function findAvatarAnchor(root: THREE.Object3D, candidates: string[]) {
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  let match: THREE.Object3D | null = null;
  let bestScore = -1;

  root.traverse((child) => {
    const normalizedName = child.name.toLowerCase();
    const candidateIndex = normalizedCandidates.findIndex(
      (candidate) =>
        normalizedName === candidate ||
        normalizedName.endsWith(candidate) ||
        normalizedName.startsWith(candidate) ||
        normalizedName.includes(candidate),
    );

    if (candidateIndex === -1) {
      return;
    }

    let score = normalizedCandidates.length - candidateIndex;
    if (normalizedName === normalizedCandidates[candidateIndex]) {
      score += 6;
    } else if (normalizedName.endsWith(normalizedCandidates[candidateIndex]) || normalizedName.startsWith(normalizedCandidates[candidateIndex])) {
      score += 4;
    } else {
      score += 2;
    }
    if (child instanceof THREE.Bone) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      match = child;
    }
  });

  return match;
}

function SmallAvatarMesh({
  controlsEnabled,
  selectionEnabled,
  movementKeysRef,
  avatarPositionRef,
  onPilot,
  onSelectionChange,
  onFocusChange,
}: {
  controlsEnabled: boolean;
  selectionEnabled: boolean;
  movementKeysRef: MutableRefObject<Record<string, boolean>>;
  avatarPositionRef: MutableRefObject<THREE.Vector3>;
  onPilot: () => void;
  onSelectionChange: (index: number, plaqueSelected: boolean) => void;
  onFocusChange: (focusEntry: HomeFocusEntry | null) => void;
}) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const footprintRootRef = useRef<THREE.Group | null>(null);
  const avatarGltf = useGLTF("/projects/reference/models/personnage_opti.glb");
  const [footprintLeftTexture, footprintRightTexture, footprintNoiseTexture] = useTexture([
    "/projects/reference/textures/footprintL2.png",
    "/projects/reference/textures/footprintR2.png",
    "/projects/reference/textures/noise.png",
  ]);
  const avatar = useMemo(() => SkeletonUtils.clone(avatarGltf.scene) as THREE.Group, [avatarGltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(avatar), [avatar]);
  const footprintPlaneGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const footprintsRef = useRef<FootprintRuntime[]>([]);
  const actionsRef = useRef<{ idle: THREE.AnimationAction | null; walk: THREE.AnimationAction | null }>({
    idle: null,
    walk: null,
  });
  const currentActionRef = useRef<"idle" | "walk" | null>(null);
  const rotationTargetRef = useRef(new THREE.Quaternion());
  const walkDirectionRef = useRef(new THREE.Vector3());
  const pilotedRef = useRef(false);
  const lastSelectionRef = useRef<{ index: number; plaqueSelected: boolean } | null>(null);
  const lastFocusRef = useRef<HomeFocusEntry | null>(null);
  const lastFootprintIdRef = useRef(0);
  const lastWalkProgressRef = useRef<number | null>(null);
  const footprintFramesRef = useRef([
    { progress: 9.4, foot: "left" as const, done: false },
    { progress: 56, foot: "right" as const, done: false },
  ]);

  useMemo(() => {
    avatar.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = new THREE.MeshBasicMaterial({ color: "#000000" });
      child.castShadow = true;
      child.receiveShadow = false;
    });
  }, [avatar]);

  useEffect(
    () => () => {
      footprintPlaneGeometry.dispose();
      footprintsRef.current.forEach((footprint) => {
        footprint.group.removeFromParent();
        footprint.material.dispose();
      });
      footprintsRef.current = [];
    },
    [footprintPlaneGeometry],
  );

  const playAvatarAction = useCallback((nextAction: "idle" | "walk") => {
    if (currentActionRef.current === nextAction) return;

    const previousAction = currentActionRef.current ? actionsRef.current[currentActionRef.current] : null;
    const next = actionsRef.current[nextAction];
    if (!next) return;

    previousAction?.fadeOut(AVATAR_FADE_DURATION);
    next.reset().fadeIn(AVATAR_FADE_DURATION).play();
    currentActionRef.current = nextAction;
  }, []);

  useEffect(() => {
    const idleClip =
      avatarGltf.animations.find((clip) => clip.name === "wait" || clip.name === "stay") ?? avatarGltf.animations[0];
    const walkClip = avatarGltf.animations.find((clip) => clip.name === "walk") ?? avatarGltf.animations[1] ?? idleClip;
    if (!idleClip || !walkClip) return;

    const idleAction = mixer.clipAction(idleClip, avatar);
    const walkAction = mixer.clipAction(walkClip, avatar);
    walkAction.timeScale = AVATAR_WALK_TIMESCALE * AVATAR_WALK_SPEED;
    actionsRef.current = {
      idle: idleAction,
      walk: walkAction,
    };
    currentActionRef.current = null;
    playAvatarAction("idle");

    return () => {
      idleAction.fadeOut(AVATAR_FADE_DURATION);
      walkAction.fadeOut(AVATAR_FADE_DURATION);
      actionsRef.current = { idle: null, walk: null };
      currentActionRef.current = null;
      mixer.stopAllAction();
    };
  }, [avatar, avatarGltf.animations, mixer, playAvatarAction]);

  const spawnFootprint = useCallback((side: "left" | "right", bornAt: number) => {
    const group = groupRef.current;
    const footprintRoot = footprintRootRef.current;
    const texture = side === "left" ? footprintLeftTexture : footprintRightTexture;
    if (!group || !footprintRoot || !texture || !footprintNoiseTexture) return;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader: FOOTPRINT_VERTEX_SHADER,
      fragmentShader: FOOTPRINT_FRAGMENT_SHADER,
      uniforms: {
        u_tex: { value: texture },
        u_noise: { value: footprintNoiseTexture },
        u_progress: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(footprintPlaneGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(side === "left" ? 0.025 : -0.025, 0, 0.03);
    mesh.renderOrder = 5;

    const footprintGroup = new THREE.Group();
    footprintGroup.position.copy(group.position);
    footprintGroup.rotation.copy(group.rotation);
    footprintGroup.add(mesh);
    footprintRoot.add(footprintGroup);

    const nextFootprint: FootprintRuntime = {
      id: lastFootprintIdRef.current++,
      bornAt,
      group: footprintGroup,
      material,
    };
    footprintsRef.current.push(nextFootprint);

    if (footprintsRef.current.length > AVATAR_FOOTPRINT_MAX_COUNT) {
      const expired = footprintsRef.current.shift();
      expired?.group.removeFromParent();
      expired?.material.dispose();
    }
  }, [footprintLeftTexture, footprintNoiseTexture, footprintPlaneGeometry, footprintRightTexture]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    mixer.update(delta);

    for (let index = footprintsRef.current.length - 1; index >= 0; index -= 1) {
      const footprint = footprintsRef.current[index];
      const progress = THREE.MathUtils.clamp((state.clock.elapsedTime - footprint.bornAt) / AVATAR_FOOTPRINT_LIFETIME, 0, 1);
      const easedProgress =
        progress < 0.5
          ? 8 * Math.pow(progress, 4)
          : 1 - Math.pow(-2 * progress + 2, 4) / 2;
      footprint.material.uniforms.u_progress.value = easedProgress;
      if (progress >= 1) {
        footprint.group.removeFromParent();
        footprint.material.dispose();
        footprintsRef.current.splice(index, 1);
      }
    }

    const keyPressed = movementKeysRef.current;
    const directionPressed = controlsEnabled && HOME_CONTROL_KEYS.some((key) => keyPressed[key]);

    if (directionPressed) {
      if (!pilotedRef.current) {
        pilotedRef.current = true;
        onPilot();
      }

      playAvatarAction("walk");

      const angleYCameraDirection = Math.atan2(
        camera.position.x - group.position.x,
        camera.position.z - group.position.z,
      );
      const directionOffset = getHomeDirectionOffset(keyPressed);

      rotationTargetRef.current.setFromAxisAngle(WORLD_UP, angleYCameraDirection + directionOffset);
      group.quaternion.rotateTowards(rotationTargetRef.current, AVATAR_WALK_ROTATE_STEP);

      camera.getWorldDirection(walkDirectionRef.current);
      walkDirectionRef.current.y = 0;
      walkDirectionRef.current.normalize();
      walkDirectionRef.current.applyAxisAngle(WORLD_UP, directionOffset);

      group.position.x = THREE.MathUtils.clamp(
        group.position.x - walkDirectionRef.current.x * AVATAR_WALK_SPEED * delta,
        HOME_WALK_BOUNDS.minX,
        HOME_WALK_BOUNDS.maxX,
      );
      group.position.z = THREE.MathUtils.clamp(
        group.position.z - walkDirectionRef.current.z * AVATAR_WALK_SPEED * delta,
        HOME_WALK_BOUNDS.minZ,
        HOME_WALK_BOUNDS.maxZ,
      );
    } else if (currentActionRef.current !== "idle") {
      playAvatarAction("idle");
    }

    avatarPositionRef.current.copy(group.position);

    if (selectionEnabled) {
      const nextSelection = getNearestHomeSelection(group.position);
      if (
        !lastSelectionRef.current ||
        lastSelectionRef.current.index !== nextSelection.index ||
        lastSelectionRef.current.plaqueSelected !== nextSelection.plaqueSelected
      ) {
        lastSelectionRef.current = nextSelection;
        onSelectionChange(nextSelection.index, nextSelection.plaqueSelected);
      }
    }

    const walkAction = actionsRef.current.walk;
    if (walkAction && currentActionRef.current === "walk") {
      const progress = (walkAction.time * 100) / Math.max(walkAction.getClip().duration, 0.0001);
      if (lastWalkProgressRef.current !== null && progress < lastWalkProgressRef.current) {
        footprintFramesRef.current.forEach((frame) => {
          frame.done = false;
        });
      }

      footprintFramesRef.current.forEach((frame) => {
        if (!frame.done && progress >= frame.progress) {
          frame.done = true;
          spawnFootprint(frame.foot, state.clock.elapsedTime);
        }
      });
      lastWalkProgressRef.current = progress;
    } else {
      lastWalkProgressRef.current = null;
      footprintFramesRef.current.forEach((frame) => {
        frame.done = false;
      });
    }

    const nextFocus = selectionEnabled ? getHomeFocusEntry(group.position) : null;
    if (
      lastFocusRef.current?.index !== nextFocus?.index ||
      lastFocusRef.current?.plaqueSelected !== nextFocus?.plaqueSelected
    ) {
      lastFocusRef.current = nextFocus;
      onFocusChange(nextFocus);
    }
  });

  return (
    <>
      <group ref={footprintRootRef} />
      <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={avatar} scale={0.08} />
      <mesh rotation={[-Math.PI / 2, 0, -0.08]} position={[0.18, -0.02, 0.2]} receiveShadow>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.045} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.14]} position={[-0.2, -0.02, 0.1]} receiveShadow>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.035} />
      </mesh>
      </group>
    </>
  );
}

function CenterPlaqueEntry({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={HOME_DESCRIPTION_POSITION.toArray() as [number, number, number]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          if (selected) return;
          onSelect();
        }}
      >
        <planeGeometry args={HOME_DESCRIPTION_SCALE} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {PLAQUE_LINKS.map(({ href, x, y, hitWidth, hitHeight }) => {
        const linkRect = plaqueCanvasRectToLocal(x, y, hitWidth, hitHeight);
        return (
          <mesh
            key={href}
            position={linkRect.position}
            onClick={(event) => {
              event.stopPropagation();
              window.open(href, "_blank", "noopener,noreferrer");
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <planeGeometry args={linkRect.size} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function CameraRig({
  avatarPositionRef,
  focusedHomeEntry,
}: {
  avatarPositionRef: MutableRefObject<THREE.Vector3>;
  focusedHomeEntry: HomeFocusEntry | null;
}) {
  const { camera } = useThree();
  const lookAtRef = useRef(HOME_LOOK_TARGET.clone());
  const desiredPositionRef = useRef(HOME_CAMERA_BASE.clone());
  const desiredLookAtRef = useRef(HOME_LOOK_TARGET.clone());

  useFrame(() => {
    if (focusedHomeEntry) {
      const focusTarget = getHomeCameraFocusTarget(focusedHomeEntry);
      desiredPositionRef.current.copy(focusTarget.position).addScaledVector(focusTarget.forward, focusTarget.distance);
      desiredLookAtRef.current.copy(focusTarget.position);
    } else {
      const avatar = avatarPositionRef.current;
      desiredPositionRef.current.set(-avatar.x * HOME_CAMERA_X_FOLLOW, avatar.y + 1, avatar.z + HOME_CAMERA_Z_OFFSET);
      desiredLookAtRef.current.set(avatar.x * HOME_LOOK_X_FOLLOW, avatar.y + 0.6, avatar.z + HOME_LOOK_Z_OFFSET);
    }

    camera.position.lerp(desiredPositionRef.current, HOME_CAMERA_LERP);
    lookAtRef.current.lerp(desiredLookAtRef.current, HOME_CAMERA_LERP);

    camera.lookAt(lookAtRef.current);
  });

  return null;
}

function RoomFrame({
  slot,
  index,
  selected,
  texture,
  onSelect,
  onInspect,
  labelOpen,
}: {
  slot: RoomSlot;
  index: number;
  selected: boolean;
  texture: THREE.Texture;
  onSelect: (index: number) => void;
  onInspect: (index: number) => void;
  labelOpen: boolean;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const frameGltf = useGLTF("/projects/reference/models/cadre.glb");
  const frame = useMemo(() => frameGltf.scene.clone(true), [frameGltf.scene]);
  const coverAspect = useMemo(() => {
    const source = texture.source.data as { width?: number; height?: number } | null | undefined;
    if (!source || typeof source.width !== "number" || typeof source.height !== "number" || source.height === 0) {
      return 9 / 16;
    }
    return source.width / source.height;
  }, [texture]);
  const uvScale = useMemo(() => {
    if (coverAspect > FRAME_DRAW_SURFACE_ASPECT) {
      return new THREE.Vector2(FRAME_DRAW_SURFACE_ASPECT / coverAspect, 1);
    }

    return new THREE.Vector2(1, coverAspect / FRAME_DRAW_SURFACE_ASPECT);
  }, [coverAspect]);
  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uUvScale: { value: uvScale },
    }),
    [texture, uvScale],
  );

  useMemo(() => {
    // eslint-disable-next-line react-hooks/immutability
    texture.colorSpace = THREE.SRGBColorSpace;
    // eslint-disable-next-line react-hooks/immutability
    texture.anisotropy = 8;
    const draw = frame.getObjectByName("draw");
    if (draw instanceof THREE.Mesh) {
      draw.material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: FRAME_VERTEX_SHADER,
        fragmentShader: FRAME_FRAGMENT_SHADER,
        toneMapped: false,
      });
    }
    const cadre = frame.getObjectByName("cadre");
    if (cadre instanceof THREE.Mesh) {
      cadre.material = new THREE.MeshStandardMaterial({
        color: "#000000",
        roughness: 0.5,
        metalness: 0,
      });
    }
    const marieLouise = frame.getObjectByName("marieLouise");
    if (marieLouise instanceof THREE.Mesh) {
      marieLouise.material = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 1,
        metalness: 0,
      });
    }
  }, [frame, texture, uniforms]);

  useMemo(() => {
    frame.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });
  }, [frame]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    void state;
    const targetScale = 0.24;
    group.scale.x = THREE.MathUtils.damp(group.scale.x, targetScale, 5.6, delta);
    group.scale.y = THREE.MathUtils.damp(group.scale.y, targetScale, 5.6, delta);
    group.scale.z = THREE.MathUtils.damp(group.scale.z, targetScale, 5.6, delta);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, slot.rotation[2], 5.2, delta);
  });

  return (
    <group
      ref={groupRef}
      position={slot.position}
      rotation={slot.rotation}
      onClick={(event) => {
        event.stopPropagation();
        if (selected) {
          onInspect(index);
          return;
        }
        onSelect(index);
      }}
    >
      <primitive object={frame} />

      {labelOpen ? (
        <Html
          transform
          center
          position={[0, 1, slot.rotation[1] > 0 ? 0.5 : -0.5]}
          distanceFactor={4.2}
          zIndexRange={[20, 0]}
          occlude={false}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInspect(index);
            }}
            aria-label="Open reel"
            className="flex items-center justify-center bg-transparent p-0 text-black"
          >
            <span
              className="block h-[11px] w-[11px] bg-[url('/projects/reference/images/enter.svg')] bg-contain bg-center bg-no-repeat opacity-80"
              aria-hidden="true"
            />
          </button>
        </Html>
      ) : null}
    </group>
  );
}

function RoomShell() {
  const galleryGltf = useGLTF("/projects/reference/models/galerie.glb");
  const [marbleColor, marbleNormal, marbleRoughness, platreColor, platreNormal, platreRoughness] = useTexture([
    "/projects/reference/textures/marble-color.png",
    "/projects/reference/textures/marble-normal.png",
    "/projects/reference/textures/marble-roughness.png",
    "/projects/reference/textures/platre-color.jpg",
    "/projects/reference/textures/platre-normal.jpg",
    "/projects/reference/textures/platre-roughness.jpg",
  ]);
  const plaqueTexture = useMemo(() => createPlaqueTexture(), []);
  const leftPanelTexture = useMemo(() => createSidePanelTexture("Chloeverse"), []);
  const gallery = useMemo(() => {
    const scene = galleryGltf.scene.clone(true);
    const allTextures = [marbleColor, marbleNormal, marbleRoughness, platreColor, platreNormal, platreRoughness];
    allTextures.forEach((map) => {
      map.colorSpace = map === marbleColor || map === platreColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: marbleColor,
      normalMap: marbleNormal,
      roughnessMap: marbleRoughness,
      roughness: 1,
      metalness: 0,
    });
    const plasterMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: platreColor,
      normalMap: platreNormal,
      roughnessMap: platreRoughness,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.35, 0.35),
    });
    const blackMetalMaterial = new THREE.MeshStandardMaterial({
      color: "#000000",
      roughness: 0.2,
      metalness: 0.8,
    });
    const glassMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });

    scene.position.y = -0.001;
    scene.scale.setScalar(0.08);
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name === "floor") {
        child.material = floorMaterial;
      } else if (child.name === "roof") {
        child.material = plasterMaterial;
      } else if (child.name === "vitre") {
        child.material = glassMaterial;
      } else {
        child.material = child.name.endsWith("_1") ? plasterMaterial : blackMetalMaterial;
      }

      child.castShadow = child.name === "barriere";
      child.receiveShadow = child.name === "floor" || child.name === "roof";
    });

    return scene;
  }, [galleryGltf.scene, marbleColor, marbleNormal, marbleRoughness, platreColor, platreNormal, platreRoughness]);

  useEffect(() => {
    return () => {
      plaqueTexture.dispose();
      leftPanelTexture.dispose();
    };
  }, [leftPanelTexture, plaqueTexture]);

  return (
    <>
      <primitive object={gallery} />

      <mesh position={HOME_DESCRIPTION_POSITION.toArray() as [number, number, number]}>
        <planeGeometry args={HOME_DESCRIPTION_SCALE} />
        <meshBasicMaterial map={plaqueTexture} transparent toneMapped={false} depthWrite={false} />
      </mesh>

      <mesh
        position={[-0.72, 2.06, 0.92]}
        rotation={[0, Math.PI, 0]}
        onClick={(event) => {
          event.stopPropagation();
          window.open("https://chloeverse.io", "_blank", "noopener,noreferrer");
        }}
      >
        <planeGeometry args={HOME_PANEL_SCALE} />
        <meshBasicMaterial map={leftPanelTexture} transparent toneMapped={false} depthWrite={false} />
      </mesh>

    </>
  );
}

function HomeFloorMarker({ position, active }: { position: [number, number, number]; active: boolean }) {
  const innerRef = useRef<THREE.Mesh | null>(null);

  useFrame((_, delta) => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.position.y = THREE.MathUtils.damp(inner.position.y, active ? 0.1 : 0, 5.5, delta);
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.21, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.21, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function ReferenceLights() {
  const dirOneRef = useRef<THREE.DirectionalLight | null>(null);
  const dirTwoRef = useRef<THREE.DirectionalLight | null>(null);
  const dirOneTarget = useRef<THREE.Object3D | null>(null);
  const dirTwoTarget = useRef<THREE.Object3D | null>(null);
  const spotlightRefs = useRef<(THREE.SpotLight | null)[]>([]);
  const spotlightTargets = useRef<(THREE.Object3D | null)[]>([]);
  const { scene } = useThree();

  useEffect(() => {
    if (dirOneRef.current && dirOneTarget.current) {
      dirOneRef.current.target = dirOneTarget.current;
      scene.add(dirOneTarget.current);
    }
    if (dirTwoRef.current && dirTwoTarget.current) {
      dirTwoRef.current.target = dirTwoTarget.current;
      scene.add(dirTwoTarget.current);
    }
    spotlightRefs.current.forEach((light, index) => {
      const target = spotlightTargets.current[index];
      if (!light || !target) return;
      light.target = target;
      scene.add(target);
    });

    return () => {
      if (dirOneTarget.current) scene.remove(dirOneTarget.current);
      if (dirTwoTarget.current) scene.remove(dirTwoTarget.current);
      spotlightTargets.current.forEach((target) => {
        if (target) scene.remove(target);
      });
    };
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.5} color="#ffffff" />
      <object3D ref={dirOneTarget} position={[-1.2, 0, -0.8]} />
      <directionalLight
        ref={dirOneRef}
        position={[0.9, 2.6, 0]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <object3D ref={dirTwoTarget} position={[1.2, 0, 0]} />
      <directionalLight
        ref={dirTwoRef}
        position={[-0.9, 2.6, 0]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      {HOME_SPOTLIGHTS.map((light, index) => (
        <group key={`${light.position.join("-")}`}>
          <object3D ref={(node) => { spotlightTargets.current[index] = node; }} position={light.target as [number, number, number]} />
          <spotLight
            ref={(node) => { spotlightRefs.current[index] = node; }}
            position={light.position as [number, number, number]}
            intensity={5}
            distance={6}
            angle={Math.PI / 6}
            penumbra={0.4}
            decay={1}
            castShadow={false}
            color="#ffffff"
          />
        </group>
      ))}
    </>
  );
}

function HomeGalleryContents({
  selectedIndex,
  plaqueSelected,
  focusedHomeEntry,
  hasNavigated,
  controlsEnabled,
  movementKeysRef,
  onSelect,
  onSelectPlaque,
  onInspect,
  onPilot,
  onSelectionChange,
  onFocusChange,
}: {
  selectedIndex: number;
  plaqueSelected: boolean;
  focusedHomeEntry: HomeFocusEntry | null;
  hasNavigated: boolean;
  controlsEnabled: boolean;
  movementKeysRef: MutableRefObject<Record<string, boolean>>;
  onSelect: (index: number) => void;
  onSelectPlaque: () => void;
  onInspect: (index: number) => void;
  onPilot: () => void;
  onSelectionChange: (index: number, plaqueSelected: boolean) => void;
  onFocusChange: (focusEntry: HomeFocusEntry | null) => void;
}) {
  const textures = useTexture(DESKTOP_PROJECT_REELS.map((reel) => reel.coverImage));
  const avatarPositionRef = useRef(new THREE.Vector3());

  return (
    <>
      <CameraRig avatarPositionRef={avatarPositionRef} focusedHomeEntry={focusedHomeEntry} />
      <RoomShell />

      <HomeFloorMarker
        position={HOME_RING_DESCRIPTION.toArray() as [number, number, number]}
        active={hasNavigated && plaqueSelected}
      />
      {ROOM_SLOTS.map((slot, index) => (
        <HomeFloorMarker
          key={`ring-${index}`}
          position={getHomeRingPosition(slot).toArray() as [number, number, number]}
          active={hasNavigated && selectedIndex === index}
        />
      ))}

      {DESKTOP_PROJECT_REELS.slice(0, HOME_FRAME_COUNT).map((reel, index) => (
        <RoomFrame
          key={reel.id}
          slot={ROOM_SLOTS[index]}
          index={index}
          selected={index === selectedIndex}
          texture={textures[index]}
          onSelect={onSelect}
          onInspect={onInspect}
          labelOpen={focusedHomeEntry?.index === index && !focusedHomeEntry.plaqueSelected}
        />
      ))}

      <CenterPlaqueEntry
        selected={plaqueSelected}
        onSelect={onSelectPlaque}
      />

      <SmallAvatarMesh
        controlsEnabled={controlsEnabled}
        selectionEnabled={hasNavigated}
        movementKeysRef={movementKeysRef}
        avatarPositionRef={avatarPositionRef}
        onPilot={onPilot}
        onSelectionChange={onSelectionChange}
        onFocusChange={onFocusChange}
      />
    </>
  );
}

function HomeGalleryScene({
  selectedIndex,
  plaqueSelected,
  focusedHomeEntry,
  hasNavigated,
  controlsEnabled,
  movementKeysRef,
  onSelect,
  onSelectPlaque,
  onInspect,
  onPilot,
  onSelectionChange,
  onFocusChange,
}: {
  selectedIndex: number;
  plaqueSelected: boolean;
  focusedHomeEntry: HomeFocusEntry | null;
  hasNavigated: boolean;
  controlsEnabled: boolean;
  movementKeysRef: MutableRefObject<Record<string, boolean>>;
  onSelect: (index: number) => void;
  onSelectPlaque: () => void;
  onInspect: (index: number) => void;
  onPilot: () => void;
  onSelectionChange: (index: number, plaqueSelected: boolean) => void;
  onFocusChange: (focusEntry: HomeFocusEntry | null) => void;
}) {

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.CineonToneMapping;
        gl.toneMappingExposure = 1.75;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      camera={{ position: HOME_CAMERA_BASE.toArray() as [number, number, number], fov: 35, near: 0.1, far: 60 }}
      className="absolute inset-0 h-full w-full"
    >
      <color attach="background" args={["#ffffff"]} />
      <ReferenceLights />
      <HomeGalleryContents
        selectedIndex={selectedIndex}
        plaqueSelected={plaqueSelected}
        focusedHomeEntry={focusedHomeEntry}
        hasNavigated={hasNavigated}
        controlsEnabled={controlsEnabled}
        movementKeysRef={movementKeysRef}
        onSelect={onSelect}
        onSelectPlaque={onSelectPlaque}
        onInspect={onInspect}
        onPilot={onPilot}
        onSelectionChange={onSelectionChange}
        onFocusChange={onFocusChange}
      />
    </Canvas>
  );
}

function OverlayAvatarModel({ variant = "menu" }: { variant?: "menu" | "detail" }) {
  const avatarGltf = useGLTF("/projects/reference/models/personnage_opti.glb");
  const avatar = useMemo(() => SkeletonUtils.clone(avatarGltf.scene) as THREE.Group, [avatarGltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(avatar), [avatar]);
  const isDetail = variant === "detail";
  const baseY = isDetail ? -0.56 : -0.08;

  useMemo(() => {
    avatar.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = new THREE.MeshBasicMaterial({ color: "#000000" });
    });
  }, [avatar]);

  useEffect(() => {
    const idleClip =
      avatarGltf.animations.find((clip) => clip.name === "wait" || clip.name === "stay") ?? avatarGltf.animations[0];
    if (!idleClip) return;
    const idleAction = mixer.clipAction(idleClip, avatar);
    idleAction.reset().fadeIn(0.2).play();
    return () => {
      idleAction.fadeOut(0.2);
      mixer.stopAllAction();
    };
  }, [avatar, avatarGltf.animations, mixer]);

  useFrame((state, delta) => {
    mixer.update(delta);
    avatar.position.set(isDetail ? 0.02 : 0, baseY + Math.sin(state.clock.elapsedTime * 1.2) * 0.01, isDetail ? 0.1 : 0);
    avatar.rotation.y = isDetail ? -0.12 : 0;
  });

  return <primitive object={avatar} scale={isDetail ? 0.132 : 0.08} />;
}

function OverlayAvatarDecoration({
  className,
  style,
  variant = "menu",
}: {
  className?: string;
  style?: CSSProperties;
  variant?: "menu" | "detail";
}) {
  const isDetail = variant === "detail";
  return (
    <div className={className} style={style}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: isDetail ? [0, 0.95, 2.15] : [0, 1, 3], fov: isDetail ? 29 : 35, near: 0.1, far: 20 }}
        className="h-full w-full"
      >
        <OverlayAvatarModel variant={variant} />
      </Canvas>
    </div>
  );
}

export function ProjectsImmersiveGallery() {
  const [homeIndex, setHomeIndex] = useState(4);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [plaqueSelected, setPlaqueSelected] = useState(false);
  const [focusedHomeEntry, setFocusedHomeEntry] = useState<HomeFocusEntry | null>(null);
  const [query, setQuery] = useState("");
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const homeMovementKeysRef = useRef<Record<string, boolean>>({});
  const lastNavAtRef = useRef(0);

  const homeSelectionIndex = homeIndex;
  const activeIndex = detailIndex ?? homeSelectionIndex;
  const activeReel = DESKTOP_PROJECT_REELS[activeIndex] ?? DESKTOP_PROJECT_REELS[0];
  const previewIndex = hoveredMenuIndex ?? homeSelectionIndex;
  const previewReel = DESKTOP_PROJECT_REELS[previewIndex] ?? DESKTOP_PROJECT_REELS[0];
  const detailMediaLabel = !videoStarted ? "Watch reel" : videoPaused ? "Play reel" : "Pause reel";
  const showHomeControls = detailIndex === null && !menuOpen && !focusedHomeEntry;

  const filteredReels = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return DESKTOP_PROJECT_REELS;
    return DESKTOP_PROJECT_REELS.filter((reel) =>
      `${reel.title} ${reel.label} ${reel.descriptor} ${reel.id}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  const resetDetailPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setSoundOn(false);
    setVideoStarted(false);
    setVideoPaused(false);
    setVideoReady(false);
  }, []);

  const navigateToIndex = useCallback((index: number) => {
    const nextIndex = clampHomeIndex(index);
    setHasNavigated(true);
    setPlaqueSelected(false);
    setHomeIndex(nextIndex);
    setHoveredMenuIndex(null);
    setVideoReady(false);
  }, []);

  const selectPlaque = useCallback(() => {
    setHasNavigated(true);
    setPlaqueSelected(true);
    setHoveredMenuIndex(null);
    setVideoReady(false);
  }, []);

  const handleHomePilot = useCallback(() => {
    setHasNavigated(true);
  }, []);

  const syncSelectionFromAvatar = useCallback((index: number, nextPlaqueSelected: boolean) => {
    setHasNavigated(true);
    if (nextPlaqueSelected) {
      setPlaqueSelected((current) => (current ? current : true));
      return;
    }

    setPlaqueSelected((current) => (current ? false : current));
    setHomeIndex((current) => (current === index ? current : clampHomeIndex(index)));
  }, []);

  const syncFocusFromAvatar = useCallback((nextFocus: HomeFocusEntry | null) => {
    setFocusedHomeEntry((current) => {
      if (current?.index === nextFocus?.index && current?.plaqueSelected === nextFocus?.plaqueSelected) {
        return current;
      }
      return nextFocus;
    });
  }, []);

  const stepIndex = useCallback(
    (delta: number) => {
      const now = Date.now();
      if (now < lastNavAtRef.current) return;

      if (detailIndex !== null) {
        const nextIndex = clampIndex(detailIndex + delta);
        if (nextIndex === detailIndex) return;
        lastNavAtRef.current = now + DETAIL_NAV_LOCK_MS;
        setHomeIndex(clampHomeIndex(nextIndex));
        setPlaqueSelected(false);
        setDetailIndex(nextIndex);
        setHasNavigated(true);
        setHoveredMenuIndex(null);
        resetDetailPlayback();
        return;
      }

      const nextIndex = clampHomeIndex(homeIndex + delta);
      if (nextIndex === homeIndex && !plaqueSelected) return;
      navigateToIndex(nextIndex);
    },
    [detailIndex, homeIndex, navigateToIndex, plaqueSelected, resetDetailPlayback],
  );

  const openDetail = useCallback((index: number) => {
    const next = clampIndex(index);
    setHasNavigated(true);
    setHomeIndex(clampHomeIndex(next));
    setPlaqueSelected(false);
    setDetailIndex(next);
    setMenuOpen(false);
    setHoveredMenuIndex(null);
    resetDetailPlayback();
  }, [resetDetailPlayback]);

  const closeDetail = useCallback(() => {
    setDetailIndex(null);
    resetDetailPlayback();
  }, [resetDetailPlayback]);

  useEffect(() => {
    if (!menuOpen) return;
    searchRef.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    const clearKeys = () => {
      HOME_CONTROL_KEYS.forEach((key) => {
        homeMovementKeysRef.current[key] = false;
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const code = event.code.toLowerCase();
      if (!HOME_CONTROL_KEYS.includes(code as (typeof HOME_CONTROL_KEYS)[number])) return;
      if (menuOpen || detailIndex !== null) return;

      homeMovementKeysRef.current[code] = true;
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const code = event.code.toLowerCase();
      if (!HOME_CONTROL_KEYS.includes(code as (typeof HOME_CONTROL_KEYS)[number])) return;

      homeMovementKeysRef.current[code] = false;
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      clearKeys();
    };
  }, [detailIndex, menuOpen]);

  useEffect(() => {
    resetDetailPlayback();
  }, [activeReel.videoSrc, detailIndex, resetDetailPlayback]);

  useEffect(() => {
    if (detailIndex !== null || menuOpen) {
      setFocusedHomeEntry(null);
    }
  }, [detailIndex, menuOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || detailIndex === null) return;

    video.loop = true;
    video.playsInline = true;
    video.muted = !soundOn;
    if (!videoStarted) {
      video.pause();
      if (video.currentTime > 0) {
        video.currentTime = 0;
      }
      return;
    }

    if (videoPaused) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (!playPromise) return;

    void playPromise.catch(() => {
      video.pause();
      setSoundOn(false);
      setVideoPaused(true);
    });
  }, [detailIndex, soundOn, activeReel.videoSrc, videoPaused, videoStarted]);

  const handleDetailMediaToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!videoStarted) {
      video.currentTime = 0;
      video.muted = false;
      setSoundOn(true);
      setVideoStarted(true);
      setVideoPaused(false);
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch(() => {
          video.pause();
          video.muted = true;
          setSoundOn(false);
          setVideoPaused(true);
        });
      }
      return;
    }

    if (video.paused || videoPaused) {
      setVideoPaused(false);
      return;
    }

    video.pause();
    setVideoPaused(true);
  }, [videoPaused, videoStarted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        if (detailIndex !== null) {
          closeDetail();
        }
        return;
      }

      if (event.key.toLowerCase() === "m" && detailIndex === null) {
        setMenuOpen((current) => !current);
        return;
      }

      if (menuOpen) return;

      if (detailIndex !== null && event.key === "ArrowLeft") {
        event.preventDefault();
        stepIndex(-1);
        return;
      }

      if (detailIndex !== null && event.key === "ArrowRight") {
        event.preventDefault();
        stepIndex(1);
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && detailIndex === null) {
        event.preventDefault();
        if (plaqueSelected) return;
        openDetail(homeSelectionIndex);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetail, detailIndex, homeSelectionIndex, menuOpen, openDetail, plaqueSelected, stepIndex]);

  return (
    <main
      className={`${josefinSans.className} relative h-screen overflow-hidden supports-[height:100svh]:h-[100svh] ${
        menuOpen ? "bg-black text-white" : "bg-[#f6f4ee] text-[#111]"
      }`}
    >
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.24)_1px,transparent_0)] [background-size:12px_12px]" />

      <div className="absolute z-50 text-right" style={{ top: menuOpen ? "38px" : "38px", right: "52px" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className={`uppercase leading-none transition ${
            menuOpen ? "text-white hover:opacity-65" : "text-black/80 hover:text-black"
          }`}
          style={{ fontSize: "21.076px" }}
        >
          {menuOpen ? "CLOSE" : "MENU"}
        </button>
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          detailIndex === null && !menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <HomeGalleryScene
          selectedIndex={homeIndex}
          plaqueSelected={plaqueSelected}
          focusedHomeEntry={focusedHomeEntry}
          hasNavigated={hasNavigated}
          controlsEnabled={detailIndex === null && !menuOpen}
          movementKeysRef={homeMovementKeysRef}
          onSelect={navigateToIndex}
          onSelectPlaque={selectPlaque}
          onInspect={openDetail}
          onPilot={handleHomePilot}
          onSelectionChange={syncSelectionFromAvatar}
          onFocusChange={syncFocusFromAvatar}
        />

        <div
          className={`pointer-events-none absolute left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap text-black/76 transition-opacity duration-300 ${
            showHomeControls ? "opacity-100" : "opacity-0"
          }`}
          style={{ bottom: "86px", width: "780px", fontSize: "18.5px", letterSpacing: "0.01em", fontWeight: 500 }}
        >
          <div className="flex items-end justify-center gap-[3.05rem]">
            <div className="flex items-end gap-[1.15rem]">
              <div className="pb-[0.7rem] leading-none text-black/82">Move</div>
              <div className="flex flex-col gap-[0.22rem]">
                <div className="flex justify-center">
                  <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 leading-none text-black/82">
                    &uarr;
                  </span>
                </div>
                <div className="flex gap-[0.22rem]">
                  <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 leading-none text-black/82">
                    &larr;
                  </span>
                  <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 leading-none text-black/82">
                    &darr;
                  </span>
                  <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 leading-none text-black/82">
                    &rarr;
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-[1rem]">
              <div className="pb-[0.7rem] leading-none text-black/82">Open/Close Menu</div>
              <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 text-[0.74em] leading-none text-black/82">
                ESC
              </span>
            </div>

            <div className="flex items-end gap-[1rem]">
              <div className="pb-[0.7rem] leading-none text-black/82">See details</div>
              <span className="flex h-[2.62rem] w-[2.62rem] items-center justify-center border border-black/50 leading-none text-black/82">
                &#8629;
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-0 z-40 transition-opacity duration-500 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/95" onClick={() => setMenuOpen(false)} />

        <div className="absolute inset-0">
          <div
            className="absolute leading-none"
            style={{ left: "52px", top: "42px", fontSize: "24px", lineHeight: "0.96", letterSpacing: "-0.04em" }}
          >
            <Link href="/" className="block text-white transition hover:opacity-72">
              Chloeverse
            </Link>
          </div>

          <div className="absolute w-px bg-white/42" style={{ left: "184px", top: "42px", bottom: "43px" }} />

          <div className="absolute" style={{ left: "212px", top: "42px", width: "340px", maxHeight: "682px" }}>
            <ul className="overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "682px", fontSize: "17px", lineHeight: "1.02" }}>
              {filteredReels.length ? (
                filteredReels.map((reel) => {
                  const index = DESKTOP_PROJECT_REELS.findIndex((item) => item.id === reel.id);
                  const active = index === previewIndex;

                  return (
                    <li key={reel.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredMenuIndex(index)}
                        onFocus={() => setHoveredMenuIndex(index)}
                        onClick={() => openDetail(index)}
                        className={`group relative block w-full text-left transition ${
                          active ? "text-white" : "text-white/92 hover:text-white"
                        }`}
                        style={{ padding: "0 1px 1px" }}
                      >
                        <span>{reel.title}</span>
                        <span
                          className={`absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] transition ${
                            active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                          style={{ width: "146px" }}
                        />
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-[0.1rem] py-1 text-[1rem] text-white/48">No reels found.</li>
              )}
            </ul>
          </div>

          <div className="absolute flex items-center gap-2 text-white/90" style={{ left: "212px", bottom: "42px" }}>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-[1rem] w-[1rem] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="8.25" cy="8.25" r="4.75" />
              <path d="M11.9 11.9 16 16" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search an artwork"
              className="border-none bg-transparent font-light text-white outline-none placeholder:text-white/70"
              style={{ width: "210px", fontSize: "16px" }}
            />
          </div>

          <div className="absolute flex items-end gap-4" style={{ right: "40px", bottom: "38px" }}>
            <div className="text-right" style={{ paddingBottom: "6px" }}>
              <Link
                href={previewReel.instagramUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="block text-white/82 transition hover:text-white"
                style={{ fontSize: "12px" }}
              >
                Instagram
              </Link>
              <Link
                href="https://imchloekang.com"
                className="mt-2 block text-white/66 transition hover:text-white"
                style={{ fontSize: "12px" }}
              >
                Candy Castle
              </Link>
            </div>
            <OverlayAvatarDecoration className="pointer-events-none" style={{ width: "104px", height: "150px", opacity: 0.16 }} />
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-0 z-30 transition-opacity duration-500 ${
          detailIndex !== null ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#f3f0eb",
            backgroundImage: "url('/projects/reference/textures/platre-color.jpg')",
            backgroundSize: "480px 480px",
            backgroundBlendMode: "multiply",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.05)_48%,rgba(255,255,255,0)_80%)]" />

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div
            className="bg-[#717171] shadow-[0_28px_60px_rgba(0,0,0,0.14)]"
            style={{ padding: "clamp(12px, 1.4vw, 18px)" }}
          >
            <div
              className="border-black bg-white"
              style={{ borderWidth: "clamp(4px, 0.36vw, 5px)", padding: "clamp(14px, 1.55vw, 21px)" }}
            >
              <div className="border border-black/35 bg-[#efede8]" style={{ padding: "clamp(14px, 1.55vw, 21px)" }}>
                <div className="relative aspect-[9/16] overflow-hidden bg-black" style={{ width: DETAIL_MEDIA_WIDTH }}>
                  <video
                    ref={videoRef}
                    src={activeReel.videoSrc}
                    poster={activeReel.coverImage}
                    playsInline
                    loop
                    muted
                    preload={detailIndex !== null ? "metadata" : "none"}
                    onCanPlay={() => setVideoReady(true)}
                    onPlaying={() => setVideoPaused(false)}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                      videoStarted ? "opacity-100" : "opacity-0"
                    }`}
                    aria-label={`${activeReel.title} playback`}
                  />
                  <Image
                    src={activeReel.coverImage}
                    alt={activeReel.posterAlt}
                    fill
                    sizes="(min-width: 1200px) 480px, 320px"
                    className={`object-cover grayscale transition-opacity duration-300 ${
                      videoStarted ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_20%,transparent_80%,rgba(0,0,0,0.22))]" />
                  <button
                    type="button"
                    onClick={handleDetailMediaToggle}
                    className="absolute inset-0 z-10 block"
                    aria-label={detailMediaLabel}
                  >
                    <span
                      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-white/55 bg-black/42 px-4 py-2 text-[11px] tracking-[0.22em] text-white backdrop-blur-sm transition-opacity duration-200 ${
                        videoStarted && !videoPaused ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      {!videoStarted ? "WATCH REEL" : "PLAY REEL"}
                    </span>
                  </button>
                  <div className="absolute left-3 top-3 z-20">
                    <span className="inline-flex items-center border border-white/35 bg-black/36 px-2.5 py-1 text-[10px] tracking-[0.18em] text-white/90 backdrop-blur-sm">
                      {activeReel.durationLabel}
                    </span>
                  </div>
                  {videoStarted ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSoundOn((current) => !current);
                      }}
                      className="absolute right-3 top-3 z-20 inline-flex items-center border border-white/35 bg-black/36 px-2.5 py-1 text-[10px] tracking-[0.18em] text-white/90 backdrop-blur-sm transition hover:bg-black/48"
                    >
                      {soundOn ? "SOUND ON" : "SOUND OFF"}
                    </button>
                  ) : null}
                  {videoStarted && !videoReady ? (
                    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
                      <span className="inline-flex items-center border border-white/30 bg-black/36 px-3 py-1 text-[10px] tracking-[0.16em] text-white/86 backdrop-blur-sm">
                        LOADING REEL
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 z-20 -translate-y-1/2" style={{ left: "154px" }}>
          <button
            type="button"
            onClick={() => stepIndex(-1)}
            disabled={activeIndex <= 0}
            className={`leading-none text-black transition ${
              activeIndex <= 0 ? "cursor-not-allowed opacity-18" : "opacity-88 hover:opacity-100"
            }`}
            style={{
              width: "44px",
              height: "44px",
              fontSize: 0,
              color: "transparent",
              backgroundImage: "url('/projects/reels/arrow-left.svg')",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
              filter: "invert(1)",
            }}
            aria-label="Previous reel"
          >
            Prev
          </button>
        </div>

        <div className="absolute top-1/2 z-20 -translate-y-1/2" style={{ right: "154px" }}>
          <button
            type="button"
            onClick={() => stepIndex(1)}
            disabled={activeIndex >= DESKTOP_PROJECT_REELS.length - 1}
            className={`leading-none text-black transition ${
              activeIndex >= DESKTOP_PROJECT_REELS.length - 1 ? "cursor-not-allowed opacity-18" : "opacity-88 hover:opacity-100"
            }`}
            style={{
              width: "44px",
              height: "44px",
              fontSize: 0,
              color: "transparent",
              backgroundImage: "url('/projects/reels/arrow-right.svg')",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
              filter: "invert(1)",
            }}
            aria-label="Next reel"
          >
            Next
          </button>
        </div>

        <div className="absolute z-20 flex items-end gap-2" style={{ right: "18px", bottom: "10px" }}>
          <div className="text-right text-[#111]" style={{ paddingBottom: "9px" }}>
            <Link
              href={activeReel.instagramUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="block transition hover:opacity-60"
              style={{ fontSize: "12px" }}
            >
              Instagram
            </Link>
            <Link
              href="https://imchloekang.com"
              className="mt-2 block text-black/68 transition hover:opacity-60"
              style={{ fontSize: "12px" }}
            >
              Candy Castle
            </Link>
          </div>
          <OverlayAvatarDecoration
            variant="detail"
            className="pointer-events-none"
            style={{ width: "136px", height: "224px", opacity: 1 }}
          />
        </div>
      </div>
    </main>
  );
}
