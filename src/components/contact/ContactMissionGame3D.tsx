"use client";

/* eslint-disable react-hooks/immutability */

import { Html } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Silkscreen } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

import { useAudioGate } from "@/hooks/useAudioGate";
import { CONTACT_DETAILS } from "@/lib/mobile-content";

import styles from "./ContactMissionGame3D.module.css";

const MISSION_DURATION = 20;
const DOCK_DURATION = 4.8;
const MAX_INTEGRITY = 100;
const DAMAGE_PER_HIT = 22;
const DAMAGE_PER_ENEMY_SHOT = 12;
const SHOT_COOLDOWN = 0.18;
const PROJECTILE_TTL = 1.08;
const ENEMY_PROJECTILE_TTL = 1.8;
const MAX_DT = 1 / 30;
const SHIP_COLLISION_X = 0.86;
const SHIP_COLLISION_Y = 0.58;
const SHIP_COLLISION_Z = 0.72;
const PLAYER_Z = 2.35;
const PLAY_X = 4.5;
const PLAY_Y_MIN = -2.25;
const PLAY_Y_MAX = 2.15;
const RECENT_KIND_MEMORY = 4;

type ContactGamePhase = "boot" | "launch" | "flight" | "dock" | "card";
type PlanetKind =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";
type ObstacleKind = PlanetKind | "alien";

type RunStats = {
  dodges: number;
  destroyed: number;
  shipsDestroyed: number;
  integrityLeft: number;
  survivedSeconds: number;
};

type HudState = {
  integrity: number;
  dodges: number;
  destroyed: number;
  aliens: number;
  timeLeft: number;
  progress: number;
};

type ShipState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  tilt: number;
  flash: number;
  gunFlash: number;
};

type StationState = {
  x: number;
  y: number;
  z: number;
  scale: number;
  glow: number;
  bayGlow: number;
};

type Projectile = {
  id: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  life: number;
  ttl: number;
  friendly: boolean;
};

type Obstacle = {
  id: number;
  kind: ObstacleKind;
  prevX: number;
  prevY: number;
  prevZ: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  spinVelocity: number;
  wobble: number;
  wobbleSpeed: number;
  shootCooldown: number;
  hp: number;
  passed: boolean;
  destroyed: boolean;
  hitFlash: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  ttl: number;
  color: string;
};

type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type CollisionHit = {
  contact: Vec3;
  normal: Vec3;
  penetration: number;
  impactSpeed: number;
  time: number;
};

type GameState = {
  phase: ContactGamePhase;
  phaseElapsed: number;
  flightElapsed: number;
  ship: ShipState;
  station: StationState;
  particles: Particle[];
  projectiles: Projectile[];
  obstacles: Obstacle[];
  obstacleId: number;
  projectileId: number;
  particleId: number;
  recentKinds: PlanetKind[];
  spawnTimer: number;
  shootCooldown: number;
  collisionCooldown: number;
  integrity: number;
  dodgeCount: number;
  destroyCount: number;
  alienDestroyCount: number;
  planetSpawnCount: number;
  alienSpawnCount: number;
  cameraShake: number;
  flash: number;
  dockOrigin: { x: number; y: number; z: number };
  cardPulse: number;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const PLANET_ORDER: PlanetKind[] = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

const PLANET_COLORS: Record<PlanetKind, { body: string; shade: string; accent: string; glow: string }> = {
  mercury: { body: "#b79275", shade: "#61453a", accent: "#f0cfbb", glow: "#f0cebb" },
  venus: { body: "#deb472", shade: "#8b6132", accent: "#fff0ca", glow: "#ffe4b6" },
  earth: { body: "#3f7fe5", shade: "#14365e", accent: "#61bf7a", glow: "#7ab0ff" },
  mars: { body: "#c86d57", shade: "#6b3026", accent: "#ffd0ba", glow: "#ffbfac" },
  jupiter: { body: "#d0a171", shade: "#7c5132", accent: "#fff0d7", glow: "#ffe0c5" },
  saturn: { body: "#d9be92", shade: "#7f6846", accent: "#fff3da", glow: "#ffe9c5" },
  uranus: { body: "#8fd0d4", shade: "#2b6063", accent: "#ecffff", glow: "#bef9ff" },
  neptune: { body: "#5f79f2", shade: "#1e2d74", accent: "#dce7ff", glow: "#92aeff" },
  pluto: { body: "#d9c7b9", shade: "#5c4a53", accent: "#c493b7", glow: "#fff1dc" },
};

const SOCIAL_LINKS = [
  { label: "Instagram", href: CONTACT_DETAILS.instagram },
  { label: "TikTok", href: CONTACT_DETAILS.tiktok },
  { label: "LinkedIn", href: CONTACT_DETAILS.linkedin },
  { label: "X", href: CONTACT_DETAILS.x },
] as const;

const VOXEL_ASSET_BASE = "/contact/voxel/sprites";

const VOXEL_SPRITES = {
  player: `${VOXEL_ASSET_BASE}/player-rear.png`,
  playerBankLeft: `${VOXEL_ASSET_BASE}/player-bank-left.png`,
  playerBankRight: `${VOXEL_ASSET_BASE}/player-bank-right.png`,
  enemyEngine: `${VOXEL_ASSET_BASE}/engine-twin-cyan.png`,
  playerEngine: `${VOXEL_ASSET_BASE}/engine-twin-amber.png`,
  playerTrail: `${VOXEL_ASSET_BASE}/engine-trail-amber.png`,
  friendlyShot: `${VOXEL_ASSET_BASE}/projectile-amber.png`,
  enemyShot: `${VOXEL_ASSET_BASE}/projectile-cyan.png`,
  muzzleFlash: `${VOXEL_ASSET_BASE}/muzzle-flash.png`,
  impact: `${VOXEL_ASSET_BASE}/impact-small.png`,
  explosion: `${VOXEL_ASSET_BASE}/explosion-large.png`,
  shieldRing: `${VOXEL_ASSET_BASE}/shield-ring.png`,
  station: `${VOXEL_ASSET_BASE}/station-platform.png`,
  terminal: `${VOXEL_ASSET_BASE}/terminal-distant.png`,
  projectionBase: `${VOXEL_ASSET_BASE}/projection-base.png`,
  cardFrame: `${VOXEL_ASSET_BASE}/hologram-card-frame.png`,
  sparkle: `${VOXEL_ASSET_BASE}/hologram-sparkle.png`,
  asteroidDark: `${VOXEL_ASSET_BASE}/asteroid-dark.png`,
  asteroidLight: `${VOXEL_ASSET_BASE}/asteroid-light.png`,
  asteroidShard: `${VOXEL_ASSET_BASE}/asteroid-shard.png`,
} as const;

const FORWARD_ALIEN_SPRITES = [
  `${VOXEL_ASSET_BASE}/alien-heavy-front.png`,
] as const;

const PLANET_SPRITES: Record<PlanetKind, string> = {
  mercury: `${VOXEL_ASSET_BASE}/mercury.png`,
  venus: `${VOXEL_ASSET_BASE}/venus.png`,
  earth: `${VOXEL_ASSET_BASE}/earth.png`,
  mars: `${VOXEL_ASSET_BASE}/mars.png`,
  jupiter: `${VOXEL_ASSET_BASE}/jupiter.png`,
  saturn: `${VOXEL_ASSET_BASE}/saturn-body.png`,
  uranus: `${VOXEL_ASSET_BASE}/uranus-body.png`,
  neptune: `${VOXEL_ASSET_BASE}/neptune.png`,
  pluto: `${VOXEL_ASSET_BASE}/pluto.png`,
};

const PLANET_SPRITE_ASPECT: Record<PlanetKind, number> = {
  mercury: 257 / 257,
  venus: 282 / 282,
  earth: 282 / 286,
  mars: 285 / 284,
  jupiter: 317 / 316,
  saturn: 2.08,
  uranus: 2.14,
  neptune: 264 / 261,
  pluto: 215 / 213,
};

const ALL_VOXEL_TEXTURES = Array.from(
  new Set([
    ...Object.values(VOXEL_SPRITES),
    ...FORWARD_ALIEN_SPRITES,
    ...Object.values(PLANET_SPRITES),
  ]),
);

useLoader.preload(THREE.TextureLoader, ALL_VOXEL_TEXTURES);

const VoxelTextureContext = createContext<Map<string, THREE.Texture> | null>(null);

const pixelFont = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function prepareVoxelTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

function usePreparedVoxelTextures() {
  const textures = useLoader(THREE.TextureLoader, ALL_VOXEL_TEXTURES);

  return useMemo(() => {
    const textureMap = new Map<string, THREE.Texture>();
    textures.forEach((texture, index) => {
      prepareVoxelTexture(texture);
      const src = ALL_VOXEL_TEXTURES[index];
      if (src) textureMap.set(src, texture);
    });
    return textureMap;
  }, [textures]);
}

function useVoxelTexture(src: string) {
  const textureMap = useContext(VoxelTextureContext);
  const texture = textureMap?.get(src);
  if (!texture) throw new Error(`Missing preloaded voxel texture: ${src}`);
  return texture;
}

function useRoundPointTexture() {
  return useMemo(() => {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x + 0.5 - size / 2) / (size / 2);
        const dy = (y + 0.5 - size / 2) / (size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const alpha = clamp(1 - distance, 0, 1) ** 1.8;
        const index = (y * size + x) * 4;
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(alpha * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function getTextureAspect(texture: THREE.Texture) {
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (!image?.width || !image.height) return 1;
  return image.width / image.height;
}

function getObstacleCollisionSize(obstacle: Obstacle) {
  const visualScale = obstacle.kind === "alien" ? 1.16 : 1.04;
  return {
    x: obstacle.radius * visualScale,
    y: obstacle.radius * visualScale,
    z: obstacle.radius * (obstacle.kind === "alien" ? 0.72 : 0.86),
  };
}

function isRingedPlanet(kind: ObstacleKind): kind is "saturn" | "uranus" {
  return kind === "saturn" || kind === "uranus";
}

function getObstacleVisualHalfBounds(kind: ObstacleKind, radius: number) {
  if (isRingedPlanet(kind)) {
    return {
      x: radius * 2.68,
      y: radius * 1.36,
    };
  }

  const height = radius * 2.42;
  const aspect = kind === "alien" ? 1.42 : PLANET_SPRITE_ASPECT[kind];
  return {
    x: (height * aspect) / 2,
    y: height / 2,
  };
}

function getObstaclePlayBounds(kind: ObstacleKind, radius: number) {
  const half = getObstacleVisualHalfBounds(kind, radius);
  const margin = kind === "alien" ? 0.12 : isRingedPlanet(kind) ? 0.72 : 0.28;
  return {
    minX: -PLAY_X + half.x + margin,
    maxX: PLAY_X - half.x - margin,
    minY: PLAY_Y_MIN + half.y + margin,
    maxY: PLAY_Y_MAX - half.y - margin,
  };
}

function clampObstacleToPlayBounds(obstacle: Obstacle) {
  const bounds = getObstaclePlayBounds(obstacle.kind, obstacle.radius);
  const minX = Math.min(bounds.minX, bounds.maxX);
  const maxX = Math.max(bounds.minX, bounds.maxX);
  const minY = Math.min(bounds.minY, bounds.maxY);
  const maxY = Math.max(bounds.minY, bounds.maxY);
  const nextX = clamp(obstacle.x, minX, maxX);
  const nextY = clamp(obstacle.y, minY, maxY);
  if (nextX !== obstacle.x) {
    obstacle.x = nextX;
    obstacle.vx *= -0.34;
  }
  if (nextY !== obstacle.y) {
    obstacle.y = nextY;
    obstacle.vy *= -0.34;
  }
}

function randomObstaclePosition(kind: ObstacleKind, radius: number, minY: number, maxY: number) {
  const bounds = getObstaclePlayBounds(kind, radius);
  const minX = Math.min(bounds.minX, bounds.maxX);
  const maxX = Math.max(bounds.minX, bounds.maxX);
  const safeMinY = Math.max(minY, Math.min(bounds.minY, bounds.maxY));
  const safeMaxY = Math.min(maxY, Math.max(bounds.minY, bounds.maxY));
  const yMin = Math.min(safeMinY, safeMaxY);
  const yMax = Math.max(safeMinY, safeMaxY);
  return {
    x: minX + Math.random() * Math.max(0.01, maxX - minX),
    y: yMin + Math.random() * Math.max(0.01, yMax - yMin),
  };
}

function normalizeVec3(vector: Vec3, fallback: Vec3 = { x: 0, y: 1, z: 0 }) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < 0.0001) return fallback;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function closestSegmentTimeToOrigin(start: Vec3, end: Vec3) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  if (lengthSq < 0.000001) return 1;
  return clamp(-(start.x * dx + start.y * dy + start.z * dz) / lengthSq, 0, 1);
}

function segmentUnitSphereTime(start: Vec3, end: Vec3) {
  const sx = start.x;
  const sy = start.y;
  const sz = start.z;
  const dx = end.x - sx;
  const dy = end.y - sy;
  const dz = end.z - sz;
  const a = dx * dx + dy * dy + dz * dz;
  const c = sx * sx + sy * sy + sz * sz - 1;
  if (c <= 0) return 0;
  if (a < 0.000001) return null;
  const b = 2 * (sx * dx + sy * dy + sz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t < 0 || t > 1) return null;
  return t;
}

function makeShipObstacleCollision(previousShip: Vec3, ship: ShipState, obstacle: Obstacle): CollisionHit | null {
  const obstacleSize = getObstacleCollisionSize(obstacle);
  const axes = {
    x: SHIP_COLLISION_X + obstacleSize.x,
    y: SHIP_COLLISION_Y + obstacleSize.y,
    z: SHIP_COLLISION_Z + obstacleSize.z,
  };
  const start = {
    x: (obstacle.prevX - previousShip.x) / axes.x,
    y: (obstacle.prevY - previousShip.y) / axes.y,
    z: (obstacle.prevZ - previousShip.z) / axes.z,
  };
  const end = {
    x: (obstacle.x - ship.x) / axes.x,
    y: (obstacle.y - ship.y) / axes.y,
    z: (obstacle.z - ship.z) / axes.z,
  };
  const distanceSq = end.x * end.x + end.y * end.y + end.z * end.z;
  const hitTime = distanceSq <= 1 ? 1 : segmentUnitSphereTime(start, end);
  if (hitTime === null) return null;

  const closestTime = distanceSq <= 1 ? 1 : closestSegmentTimeToOrigin(start, end);
  const impactShip = {
    x: lerp(previousShip.x, ship.x, closestTime),
    y: lerp(previousShip.y, ship.y, closestTime),
    z: lerp(previousShip.z, ship.z, closestTime),
  };
  const impactObstacle = {
    x: lerp(obstacle.prevX, obstacle.x, closestTime),
    y: lerp(obstacle.prevY, obstacle.y, closestTime),
    z: lerp(obstacle.prevZ, obstacle.z, closestTime),
  };
  const normal = normalizeVec3(
    {
      x: impactShip.x - impactObstacle.x,
      y: impactShip.y - impactObstacle.y,
      z: impactShip.z - impactObstacle.z,
    },
    { x: ship.x >= obstacle.x ? 1 : -1, y: 0, z: -0.22 },
  );
  const currentDistance = Math.sqrt(Math.max(0.000001, distanceSq));
  const penetration = Math.max(0, 1 - currentDistance) * Math.min(axes.x, axes.y, axes.z);
  const relativeVelocity = {
    x: ship.vx - obstacle.vx,
    y: ship.vy - obstacle.vy,
    z: -obstacle.vz,
  };
  const impactSpeed = Math.abs(relativeVelocity.x * normal.x + relativeVelocity.y * normal.y + relativeVelocity.z * normal.z);

  return {
    contact: {
      x: (impactShip.x + impactObstacle.x) * 0.5,
      y: (impactShip.y + impactObstacle.y) * 0.5,
      z: (impactShip.z + impactObstacle.z) * 0.5,
    },
    normal,
    penetration,
    impactSpeed,
    time: hitTime,
  };
}

function makeShipProjectileCollision(previousShip: Vec3, ship: ShipState, projectile: Projectile): CollisionHit | null {
  const axes = {
    x: SHIP_COLLISION_X + projectile.radius,
    y: SHIP_COLLISION_Y + projectile.radius,
    z: SHIP_COLLISION_Z + projectile.radius,
  };
  const start = {
    x: (projectile.prevX - previousShip.x) / axes.x,
    y: (projectile.prevY - previousShip.y) / axes.y,
    z: (projectile.prevZ - previousShip.z) / axes.z,
  };
  const end = {
    x: (projectile.x - ship.x) / axes.x,
    y: (projectile.y - ship.y) / axes.y,
    z: (projectile.z - ship.z) / axes.z,
  };
  const hitTime = segmentUnitSphereTime(start, end);
  const endDistanceSq = end.x * end.x + end.y * end.y + end.z * end.z;
  if (hitTime === null && endDistanceSq > 1) return null;
  const time = hitTime ?? 1;
  const impactProjectile = {
    x: lerp(projectile.prevX, projectile.x, time),
    y: lerp(projectile.prevY, projectile.y, time),
    z: lerp(projectile.prevZ, projectile.z, time),
  };
  const impactShip = {
    x: lerp(previousShip.x, ship.x, time),
    y: lerp(previousShip.y, ship.y, time),
    z: lerp(previousShip.z, ship.z, time),
  };
  const normal = normalizeVec3({
    x: impactShip.x - impactProjectile.x,
    y: impactShip.y - impactProjectile.y,
    z: impactShip.z - impactProjectile.z,
  });

  return {
    contact: impactProjectile,
    normal,
    penetration: Math.max(0, 1 - Math.sqrt(endDistanceSq)) * Math.min(axes.x, axes.y, axes.z),
    impactSpeed: Math.hypot(projectile.vx - ship.vx, projectile.vy - ship.vy, projectile.vz),
    time,
  };
}

function makeProjectileObstacleCollision(projectile: Projectile, obstacle: Obstacle): CollisionHit | null {
  const obstacleSize = getObstacleCollisionSize(obstacle);
  const axes = {
    x: obstacleSize.x + projectile.radius,
    y: obstacleSize.y + projectile.radius,
    z: obstacleSize.z + projectile.radius * 1.6,
  };
  const start = {
    x: (projectile.prevX - obstacle.prevX) / axes.x,
    y: (projectile.prevY - obstacle.prevY) / axes.y,
    z: (projectile.prevZ - obstacle.prevZ) / axes.z,
  };
  const end = {
    x: (projectile.x - obstacle.x) / axes.x,
    y: (projectile.y - obstacle.y) / axes.y,
    z: (projectile.z - obstacle.z) / axes.z,
  };
  const hitTime = segmentUnitSphereTime(start, end);
  const endDistanceSq = end.x * end.x + end.y * end.y + end.z * end.z;
  if (hitTime === null && endDistanceSq > 1) return null;
  const time = hitTime ?? 1;
  const impactProjectile = {
    x: lerp(projectile.prevX, projectile.x, time),
    y: lerp(projectile.prevY, projectile.y, time),
    z: lerp(projectile.prevZ, projectile.z, time),
  };
  const impactObstacle = {
    x: lerp(obstacle.prevX, obstacle.x, time),
    y: lerp(obstacle.prevY, obstacle.y, time),
    z: lerp(obstacle.prevZ, obstacle.z, time),
  };
  const normal = normalizeVec3({
    x: impactProjectile.x - impactObstacle.x,
    y: impactProjectile.y - impactObstacle.y,
    z: impactProjectile.z - impactObstacle.z,
  });

  return {
    contact: impactProjectile,
    normal,
    penetration: Math.max(0, 1 - Math.sqrt(endDistanceSq)) * Math.min(axes.x, axes.y, axes.z),
    impactSpeed: Math.hypot(projectile.vx - obstacle.vx, projectile.vy - obstacle.vy, projectile.vz - obstacle.vz),
    time,
  };
}

function applyShipObstaclePhysics(game: GameState, obstacle: Obstacle, hit: CollisionHit) {
  const mass = obstacle.kind === "alien" ? 0.74 : 1.35 + obstacle.radius * 1.1;
  const restitution = obstacle.kind === "alien" ? 0.62 : 0.46;
  const impulse = Math.max(1.4, hit.impactSpeed * restitution);
  const separation = hit.penetration + 0.08;

  game.ship.x = clamp(game.ship.x + hit.normal.x * separation, -PLAY_X, PLAY_X);
  game.ship.y = clamp(game.ship.y + hit.normal.y * separation, PLAY_Y_MIN, PLAY_Y_MAX);
  game.ship.vx = clamp(game.ship.vx + hit.normal.x * impulse * 1.15, -8.6, 8.6);
  game.ship.vy = clamp(game.ship.vy + hit.normal.y * impulse * 0.96, -7.4, 7.4);
  obstacle.vx -= (hit.normal.x * impulse) / mass;
  obstacle.vy -= (hit.normal.y * impulse) / mass;
  obstacle.vz = Math.max(1.4, obstacle.vz - Math.abs(hit.normal.z) * impulse * 0.32);
  obstacle.spinVelocity += clamp((-hit.normal.x * game.ship.vy + hit.normal.y * game.ship.vx) * 0.24, -2.2, 2.2);
}

function createInitialState(phase: ContactGamePhase = "boot"): GameState {
  return {
    phase,
    phaseElapsed: 0,
    flightElapsed: 0,
    ship: {
      x: 0,
      y: -1.85,
      z: PLAYER_Z,
      vx: 0,
      vy: 0,
      tilt: 0,
      flash: 0,
      gunFlash: 0,
    },
    station: {
      x: 0,
      y: 0.3,
      z: -18,
      scale: 0.42,
      glow: 0,
      bayGlow: 0,
    },
    particles: [],
    projectiles: [],
    obstacles: [],
    obstacleId: 0,
    projectileId: 0,
    particleId: 0,
    recentKinds: [],
    spawnTimer: 0.52,
    shootCooldown: 0,
    collisionCooldown: 0,
    integrity: MAX_INTEGRITY,
    dodgeCount: 0,
    destroyCount: 0,
    alienDestroyCount: 0,
    planetSpawnCount: 0,
    alienSpawnCount: 0,
    cameraShake: 0,
    flash: 0,
    dockOrigin: { x: 0, y: -1.85, z: PLAYER_Z },
    cardPulse: 0,
  };
}

function makeStats(game: GameState): RunStats {
  return {
    dodges: game.dodgeCount,
    destroyed: game.destroyCount,
    shipsDestroyed: game.alienDestroyCount,
    integrityLeft: Math.max(0, Math.round(game.integrity)),
    survivedSeconds: Number(game.flightElapsed.toFixed(1)),
  };
}

function makeHudState(game: GameState): HudState {
  return {
    integrity: Math.max(0, Math.round(game.integrity)),
    dodges: game.dodgeCount,
    destroyed: game.destroyCount,
    aliens: game.alienDestroyCount,
    timeLeft: Number(Math.max(0, MISSION_DURATION - game.flightElapsed).toFixed(1)),
    progress: clamp(game.flightElapsed / MISSION_DURATION, 0, 1),
  };
}

function spawnBurst(game: GameState, x: number, y: number, z: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
    const lift = -0.7 + Math.random() * 1.4;
    const velocity = 1.1 + Math.random() * 2.9;
    game.particles.push({
      id: game.particleId,
      x,
      y,
      z,
      vx: Math.cos(angle) * velocity,
      vy: lift,
      vz: Math.sin(angle) * velocity,
      size: 0.035 + Math.random() * 0.055,
      life: 0,
      ttl: 0.25 + Math.random() * 0.35,
      color,
    });
    game.particleId += 1;
  }
}

function spawnExhaust(game: GameState, intensity = 1) {
  const ship = game.ship;
  game.particles.push({
    id: game.particleId,
    x: ship.x + (Math.random() - 0.5) * 0.12,
    y: ship.y - 0.32,
    z: ship.z + 0.22,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (-0.45 - Math.random() * 0.55) * intensity,
    vz: (1.25 + Math.random() * 1.2) * intensity,
    size: 0.035 + Math.random() * 0.035,
    life: 0,
    ttl: 0.16 + Math.random() * 0.2,
    color: Math.random() > 0.5 ? "#ffd3a1" : "#ff8a5c",
  });
  game.particleId += 1;
}

function spawnProjectile(game: GameState) {
  const ship = game.ship;
  const x = ship.x + Math.sin(ship.tilt) * 0.08;
  const y = ship.y + 0.18;
  const z = ship.z - 0.58;
  game.projectiles.push({
    id: game.projectileId,
    prevX: x,
    prevY: y,
    prevZ: z,
    x,
    y,
    z,
    vx: Math.sin(ship.tilt) * 0.45,
    vy: ship.vy * 0.08,
    vz: -12.4,
    radius: 0.12,
    life: 0,
    ttl: PROJECTILE_TTL,
    friendly: true,
  });
  game.projectileId += 1;
  game.ship.gunFlash = 1;
  spawnBurst(game, ship.x, ship.y + 0.22, ship.z - 0.52, "#ffe9b8", 5);
}

function spawnAlienProjectile(game: GameState, obstacle: Obstacle) {
  const dx = game.ship.x - obstacle.x;
  const dy = game.ship.y - obstacle.y;
  const dz = game.ship.z - obstacle.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  const intensity = clamp(game.flightElapsed / MISSION_DURATION, 0, 1);
  const speed = 4.8 + intensity * 1.3;
  const x = obstacle.x;
  const y = obstacle.y - obstacle.radius * 0.2;
  const z = obstacle.z + obstacle.radius * 0.3;

  game.projectiles.push({
    id: game.projectileId,
    prevX: x,
    prevY: y,
    prevZ: z,
    x,
    y,
    z,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    vz: (dz / length) * speed,
    radius: 0.095,
    life: 0,
    ttl: ENEMY_PROJECTILE_TTL,
    friendly: false,
  });
  game.projectileId += 1;
  obstacle.hitFlash = Math.max(obstacle.hitFlash, 0.42);
}

function choosePlanet(intensity: number, recentKinds: PlanetKind[], usedKinds: PlanetKind[]): PlanetKind {
  const giantPool: PlanetKind[] = intensity > 0.72 ? ["jupiter", "saturn"] : [];
  const weightedPool = Array.from(new Set([...PLANET_ORDER, ...giantPool]));
  const fresh = weightedPool.filter((kind) => !recentKinds.includes(kind) && !usedKinds.includes(kind));
  if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)] ?? "mars";
  const unused = weightedPool.filter((kind) => !usedKinds.includes(kind));
  if (unused.length > 0) return unused[Math.floor(Math.random() * unused.length)] ?? "mars";
  return weightedPool[Math.floor(Math.random() * weightedPool.length)] ?? "mars";
}

function chooseObstacleKind(game: GameState, usedKinds: ObstacleKind[], intensity: number): ObstacleKind {
  if (game.alienSpawnCount < game.planetSpawnCount && !usedKinds.includes("alien")) return "alien";
  if (game.planetSpawnCount < game.alienSpawnCount) {
    return choosePlanet(intensity, game.recentKinds, usedKinds.filter((kind): kind is PlanetKind => kind !== "alien"));
  }
  if (Math.random() > 0.5 && !usedKinds.includes("alien")) return "alien";
  return choosePlanet(intensity, game.recentKinds, usedKinds.filter((kind): kind is PlanetKind => kind !== "alien"));
}

function spawnObstacle(game: GameState) {
  const intensity = clamp(game.flightElapsed / MISSION_DURATION, 0, 1);
  const count = intensity > 0.22 && Math.random() > 0.38 ? 2 : 1;
  const positions: number[] = [];
  const usedKinds: ObstacleKind[] = [];

  for (let index = 0; index < count; index += 1) {
    const kind = chooseObstacleKind(game, usedKinds, intensity);
    usedKinds.push(kind);
    const radius =
      kind === "alien"
        ? 0.38 + intensity * 0.13 + Math.random() * 0.08
        : 0.38 +
          intensity * 0.28 +
          Math.random() * 0.22 +
          (kind === "jupiter" ? 0.28 : 0) +
          (kind === "saturn" ? 0.22 : 0);
    const yRange =
      kind === "alien"
        ? { min: PLAY_Y_MIN + 0.35, max: PLAY_Y_MAX - 0.15 }
        : { min: PLAY_Y_MIN + 0.25, max: PLAY_Y_MAX - 0.1 };
    let position = randomObstaclePosition(kind, radius, yRange.min, yRange.max);
    let x = position.x;
    let attempts = 0;
    while (positions.some((existing) => Math.abs(existing - x) < 1.72) && attempts < 8) {
      position = randomObstaclePosition(kind, radius, yRange.min, yRange.max);
      x = position.x;
      attempts += 1;
    }
    positions.push(x);

    if (kind === "alien") {
      const y = position.y;
      const z = -17.5 - Math.random() * 4;
      game.obstacles.push({
        id: game.obstacleId,
        kind,
        prevX: x,
        prevY: y,
        prevZ: z,
        x,
        y,
        z,
        radius,
        vx: (-0.82 + Math.random() * 1.64) * (0.55 + intensity * 0.4),
        vy: (-0.22 + Math.random() * 0.44) * (0.35 + intensity * 0.4),
        vz: 5.7 + intensity * 3.7 + Math.random() * 0.8,
        spin: 0,
        spinVelocity: -0.6 + Math.random() * 1.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 2.2 + Math.random() * 1.4,
        shootCooldown: 0.45 + Math.random() * 0.4,
        hp: 1,
        passed: false,
        destroyed: false,
        hitFlash: 0,
      });
      game.alienSpawnCount += 1;
    } else {
      const y = position.y;
      const z = -18 - Math.random() * 4.6;
      game.obstacles.push({
        id: game.obstacleId,
        kind,
        prevX: x,
        prevY: y,
        prevZ: z,
        x,
        y,
        z,
        radius,
        vx: (-0.4 + Math.random() * 0.8) * (0.35 + intensity * 0.65),
        vy: (-0.14 + Math.random() * 0.28) * (0.3 + intensity * 0.6),
        vz: 4.8 + intensity * 4.2 + Math.random() * 1.2,
        spin: Math.random() * Math.PI * 2,
        spinVelocity: -1.1 + Math.random() * 2.2,
        wobble: 0,
        wobbleSpeed: 0,
        shootCooldown: 0,
        hp: kind === "jupiter" || kind === "saturn" ? 2 : 1,
        passed: false,
        destroyed: false,
        hitFlash: 0,
      });
      game.planetSpawnCount += 1;
      game.recentKinds.push(kind);
      if (game.recentKinds.length > RECENT_KIND_MEMORY) game.recentKinds = game.recentKinds.slice(-RECENT_KIND_MEMORY);
    }

    game.obstacleId += 1;
  }
}

function makeGameTextSnapshot(game: GameState, hud: HudState, stats: RunStats | null) {
  return JSON.stringify({
    coordinateSystem: "Deep-space 3D play volume, x left/right, y up/down, z depth; ship stays near z=2.35 and hazards approach from negative z",
    phase: game.phase,
    hud,
    ship: {
      x: Number(game.ship.x.toFixed(2)),
      y: Number(game.ship.y.toFixed(2)),
      z: Number(game.ship.z.toFixed(2)),
      vx: Number(game.ship.vx.toFixed(2)),
      vy: Number(game.ship.vy.toFixed(2)),
      cooldown: Number(game.shootCooldown.toFixed(2)),
    },
    obstacles: game.obstacles.slice(0, 8).map((obstacle) => ({
      kind: obstacle.kind,
      x: Number(obstacle.x.toFixed(2)),
      y: Number(obstacle.y.toFixed(2)),
      z: Number(obstacle.z.toFixed(2)),
      hp: obstacle.hp,
    })),
    projectiles: game.projectiles.length,
    stats,
  });
}

type ContactSceneProps = {
  gameRef: MutableRefObject<GameState>;
  inputRef: MutableRefObject<InputState>;
  phase: ContactGamePhase;
  stats: RunStats | null;
  copyState: "idle" | "copied" | "failed";
  resetToken: number;
  setHud: (hud: HudState) => void;
  setStats: (stats: RunStats | null) => void;
  setWash: (opacity: number) => void;
  updatePhase: (phase: ContactGamePhase) => void;
  playFocusWhoosh: (intensity?: number) => void;
  playOpenBloom: () => void;
  playHoverChime: () => void;
  copyEmail: () => void;
  restartGame: () => void;
};

function ContactScene({
  gameRef,
  inputRef,
  phase,
  stats,
  copyState,
  resetToken,
  setHud,
  setStats,
  setWash,
  updatePhase,
  playFocusWhoosh,
  playOpenBloom,
  playHoverChime,
  copyEmail,
  restartGame,
}: ContactSceneProps) {
  const { camera } = useThree();
  const voxelTextures = usePreparedVoxelTextures();
  const [, setEntityVersion] = useState(0);
  const hudKeyRef = useRef("");
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const stationLightRef = useRef<THREE.PointLight | null>(null);

  const markEntitiesDirty = useCallback(() => {
    setEntityVersion((value) => value + 1);
  }, []);

  const stepGame = useCallback(
    (rawDt: number) => {
      const dt = Math.min(MAX_DT, Math.max(0, rawDt));
      const game = gameRef.current;
      let entitiesChanged = false;

      game.phaseElapsed += dt;
      game.cardPulse += dt;
      game.cameraShake = Math.max(0, game.cameraShake - dt * 2.5);
      game.flash = Math.max(0, game.flash - dt * 1.25);
      game.ship.flash = Math.max(0, game.ship.flash - dt * 2.8);
      game.ship.gunFlash = Math.max(0, game.ship.gunFlash - dt * 6.4);
      game.collisionCooldown = Math.max(0, game.collisionCooldown - dt);
      game.shootCooldown = Math.max(0, game.shootCooldown - dt);

      if (game.phase === "launch") {
        game.ship.y = lerp(game.ship.y, -1.45, 0.08);
        spawnExhaust(game, 0.85);
        entitiesChanged = true;

        if (game.phaseElapsed > 1.05) {
          game.phase = "flight";
          game.phaseElapsed = 0;
          updatePhase("flight");
          playFocusWhoosh(0.6);
        }
      }

      if (game.phase === "flight") {
        game.flightElapsed += dt;
        const previousShip = { x: game.ship.x, y: game.ship.y, z: game.ship.z };
        const inputX = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const inputY = (inputRef.current.up ? 1 : 0) - (inputRef.current.down ? 1 : 0);
        const intensity = clamp(game.flightElapsed / MISSION_DURATION, 0, 1);
        const targetVx = inputX * (4.7 + intensity * 1.7);
        const targetVy = inputY * (3.65 + intensity * 0.9);

        game.ship.vx = lerp(game.ship.vx, targetVx, 0.12);
        game.ship.vy = lerp(game.ship.vy, targetVy, 0.12);
        game.ship.x = clamp(game.ship.x + game.ship.vx * dt, -PLAY_X, PLAY_X);
        game.ship.y = clamp(game.ship.y + game.ship.vy * dt, PLAY_Y_MIN, PLAY_Y_MAX);
        game.ship.tilt = lerp(game.ship.tilt, game.ship.vx / 9.5, 0.16);

        if (inputRef.current.fire && game.shootCooldown <= 0) {
          spawnProjectile(game);
          game.shootCooldown = SHOT_COOLDOWN;
          entitiesChanged = true;
        }

        spawnExhaust(game);
        entitiesChanged = true;

        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) {
          spawnObstacle(game);
          game.spawnTimer = 0.68 - intensity * 0.2 + Math.random() * 0.14;
          entitiesChanged = true;
        }

        for (const projectile of game.projectiles) {
          projectile.prevX = projectile.x;
          projectile.prevY = projectile.y;
          projectile.prevZ = projectile.z;
          projectile.life += dt;
          projectile.x += projectile.vx * dt;
          projectile.y += projectile.vy * dt;
          projectile.z += projectile.vz * dt;
        }

        let alienProjectileBudget = Math.max(
          0,
          4 - game.projectiles.filter((projectile) => !projectile.friendly && projectile.life < projectile.ttl).length,
        );

        for (const obstacle of game.obstacles) {
          if (obstacle.destroyed) continue;

          const wobbleOffset =
            obstacle.kind === "alien"
              ? Math.sin(game.flightElapsed * obstacle.wobbleSpeed + obstacle.wobble) * (0.28 + obstacle.radius * 0.24)
              : 0;
          obstacle.prevX = obstacle.x;
          obstacle.prevY = obstacle.y;
          obstacle.prevZ = obstacle.z;
          obstacle.x += obstacle.vx * dt + wobbleOffset * dt;
          obstacle.y += obstacle.vy * dt;
          obstacle.z += obstacle.vz * dt;
          clampObstacleToPlayBounds(obstacle);
          obstacle.spin += obstacle.spinVelocity * dt;
          obstacle.hitFlash = Math.max(0, obstacle.hitFlash - dt * 3.4);
          obstacle.shootCooldown = Math.max(0, obstacle.shootCooldown - dt);

          if (
            obstacle.kind === "alien" &&
            alienProjectileBudget > 0 &&
            obstacle.shootCooldown <= 0 &&
            obstacle.z > -11 &&
            obstacle.z < PLAYER_Z + 0.2 &&
            Math.abs(obstacle.x - game.ship.x) < 2.8
          ) {
            spawnAlienProjectile(game, obstacle);
            obstacle.shootCooldown = 0.55 + Math.random() * 0.35;
            alienProjectileBudget -= 1;
            entitiesChanged = true;
          }

          const shipObstacleHit = !obstacle.passed ? makeShipObstacleCollision(previousShip, game.ship, obstacle) : null;
          if (shipObstacleHit && game.collisionCooldown <= 0) {
            const impactDamage = Math.round(clamp(DAMAGE_PER_HIT * (0.72 + shipObstacleHit.impactSpeed * 0.055), 14, 32));
            game.integrity = clamp(game.integrity - impactDamage, 0, MAX_INTEGRITY);
            game.cameraShake = 1;
            game.flash = 0.72;
            game.ship.flash = 1;
            game.collisionCooldown = 0.46;
            obstacle.hitFlash = 1;
            applyShipObstaclePhysics(game, obstacle, shipObstacleHit);
            spawnBurst(
              game,
              shipObstacleHit.contact.x,
              shipObstacleHit.contact.y,
              shipObstacleHit.contact.z,
              obstacle.kind === "alien" ? "#afffe6" : "#ffd3bf",
              14 + Math.round(clamp(shipObstacleHit.impactSpeed, 0, 12)),
            );
            playFocusWhoosh(1.1);
            entitiesChanged = true;
          } else if (shipObstacleHit && shipObstacleHit.penetration > 0.02) {
            const separation = shipObstacleHit.penetration + 0.04;
            game.ship.x = clamp(game.ship.x + shipObstacleHit.normal.x * separation, -PLAY_X, PLAY_X);
            game.ship.y = clamp(game.ship.y + shipObstacleHit.normal.y * separation, PLAY_Y_MIN, PLAY_Y_MAX);
            obstacle.hitFlash = Math.max(obstacle.hitFlash, 0.24);
            entitiesChanged = true;
          }

          if (!obstacle.passed && obstacle.z > game.ship.z + obstacle.radius * 0.5) {
            obstacle.passed = true;
            game.dodgeCount += 1;
          }
        }

        for (const projectile of game.projectiles) {
          if (projectile.life >= projectile.ttl) continue;

          if (!projectile.friendly) {
            const shipProjectileHit = makeShipProjectileCollision(previousShip, game.ship, projectile);
            if (game.collisionCooldown <= 0 && shipProjectileHit) {
              projectile.life = projectile.ttl;
              const impactDamage = Math.round(clamp(DAMAGE_PER_ENEMY_SHOT * (0.8 + shipProjectileHit.impactSpeed * 0.035), 8, 20));
              game.integrity = clamp(game.integrity - impactDamage, 0, MAX_INTEGRITY);
              game.cameraShake = Math.max(game.cameraShake, 0.42);
              game.flash = Math.max(game.flash, 0.34);
              game.ship.flash = 1;
              game.collisionCooldown = 0.48;
              game.ship.vx = clamp(game.ship.vx + shipProjectileHit.normal.x * 1.6, -8.6, 8.6);
              game.ship.vy = clamp(game.ship.vy + shipProjectileHit.normal.y * 1.2, -7.4, 7.4);
              spawnBurst(game, shipProjectileHit.contact.x, shipProjectileHit.contact.y, shipProjectileHit.contact.z, "#b9f2ff", 9);
              playFocusWhoosh(0.86);
              entitiesChanged = true;
            }
            continue;
          }

          for (const obstacle of game.obstacles) {
            if (obstacle.destroyed) continue;
            const projectileHit = makeProjectileObstacleCollision(projectile, obstacle);
            if (!projectileHit) continue;

            projectile.life = projectile.ttl;
            obstacle.hitFlash = 1;
            obstacle.hp -= 1;
            obstacle.vx += projectileHit.normal.x * 0.42;
            obstacle.vy += projectileHit.normal.y * 0.32;
            obstacle.vz += projectileHit.normal.z * 0.18;
            obstacle.spinVelocity += clamp(projectileHit.normal.x * 0.8 - projectileHit.normal.y * 0.5, -1.4, 1.4);

            if (obstacle.hp <= 0) {
              obstacle.destroyed = true;
              game.destroyCount += 1;
              if (obstacle.kind === "alien") game.alienDestroyCount += 1;
              game.cameraShake = Math.max(game.cameraShake, 0.24);
              game.flash = Math.max(game.flash, 0.14);
              spawnBurst(game, projectileHit.contact.x, projectileHit.contact.y, projectileHit.contact.z, obstacle.kind === "alien" ? "#a2ffe0" : "#ffd7b6", 16);
            } else {
              spawnBurst(game, projectileHit.contact.x, projectileHit.contact.y, projectileHit.contact.z, "#ffe2c1", 7);
            }
            entitiesChanged = true;
            break;
          }
        }

        const projectileCount = game.projectiles.length;
        const obstacleCount = game.obstacles.length;
        game.projectiles = game.projectiles.filter(
          (projectile) =>
            projectile.life < projectile.ttl &&
            projectile.z > -24 &&
            projectile.z < 5.8 &&
            Math.abs(projectile.x) < 7.5 &&
            projectile.y > -4 &&
            projectile.y < 4,
        );
        game.obstacles = game.obstacles.filter((obstacle) => !obstacle.destroyed && obstacle.z < PLAYER_Z + obstacle.radius * 0.72 + 0.55);
        if (projectileCount !== game.projectiles.length || obstacleCount !== game.obstacles.length) entitiesChanged = true;

        if (game.flightElapsed >= MISSION_DURATION) {
          game.phase = "dock";
          game.phaseElapsed = 0;
          game.dockOrigin = { x: game.ship.x, y: game.ship.y, z: game.ship.z };
          game.obstacles = [];
          game.projectiles = [];
          updatePhase("dock");
          playFocusWhoosh(1.26);
          entitiesChanged = true;
        }
      }

      if (game.phase === "dock") {
        const progress = clamp(game.phaseElapsed / DOCK_DURATION, 0, 1);
        const stationEase = easeOutCubic(progress);
        const shipEase = easeInOutSine(clamp(progress / 0.82, 0, 1));

        game.station.x = Math.sin(progress * 5.4) * 0.12 * (1 - progress);
        game.station.y = lerp(2.6, 0.22, stationEase);
        game.station.z = lerp(-18, -2.85, stationEase);
        game.station.scale = lerp(0.42, 1.78, stationEase);
        game.station.glow = progress;
        game.station.bayGlow = clamp((progress - 0.38) / 0.62, 0, 1);

        game.ship.x = lerp(game.dockOrigin.x, game.station.x, shipEase);
        game.ship.y = lerp(game.dockOrigin.y, game.station.y - 0.22, shipEase);
        game.ship.z = lerp(game.dockOrigin.z, game.station.z + 0.78, shipEase);
        game.ship.tilt = lerp(game.ship.tilt, 0, 0.12);

        if (progress < 0.86) {
          spawnExhaust(game, 0.55);
          entitiesChanged = true;
        }

        if (progress > 0.72) game.flash = Math.max(game.flash, (progress - 0.72) * 1.5);

        if (progress >= 1) {
          game.phase = "card";
          game.phaseElapsed = 0;
          const nextStats = makeStats(game);
          setStats(nextStats);
          updatePhase("card");
          playOpenBloom();
        }
      }

      if (game.phase === "card") {
        game.ship.tilt = lerp(game.ship.tilt, 0, 0.1);
        game.station.y = lerp(game.station.y, 0.22, 0.06);
        game.station.z = lerp(game.station.z, -2.85, 0.06);
        game.station.scale = lerp(game.station.scale, 1.78, 0.06);
        game.station.glow = lerp(game.station.glow, 0.74, 0.06);
        game.station.bayGlow = lerp(game.station.bayGlow, 0.58, 0.06);
      }

      for (const particle of game.particles) {
        particle.life += dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
        particle.vx *= 0.985;
        particle.vy *= 0.986;
        particle.vz *= 0.985;
      }
      const particleCount = game.particles.length;
      game.particles = game.particles.filter((particle) => particle.life < particle.ttl);
      if (particleCount !== game.particles.length) entitiesChanged = true;

      if (game.phase === "launch" || game.phase === "flight" || game.phase === "dock") {
        const nextHud = makeHudState(game);
        const nextHudKey = [
          nextHud.integrity,
          nextHud.dodges,
          nextHud.destroyed,
          nextHud.aliens,
          nextHud.timeLeft.toFixed(1),
          nextHud.progress.toFixed(3),
        ].join("|");
        if (nextHudKey !== hudKeyRef.current) {
          hudKeyRef.current = nextHudKey;
          setHud(nextHud);
        }
      }

      const wash = game.phase === "dock" ? clamp(game.flash, 0, 0.68) : game.phase === "card" ? 0 : clamp(game.flash * 0.42, 0, 0.34);
      setWash(wash);

      if (sceneGroupRef.current) {
        const shake = game.cameraShake * 0.035;
        sceneGroupRef.current.position.x = (Math.random() - 0.5) * shake;
        sceneGroupRef.current.position.y = (Math.random() - 0.5) * shake;
      }

      if (stationLightRef.current) {
        stationLightRef.current.intensity = 8 + game.station.glow * 42 + game.station.bayGlow * 22;
        stationLightRef.current.position.set(game.station.x, game.station.y, game.station.z + 0.4);
      }

      const targetCameraZ = game.phase === "dock" ? lerp(8.4, 6.7, clamp(game.phaseElapsed / DOCK_DURATION, 0, 1)) : 8.4;
      camera.position.set(
        lerp(camera.position.x, game.ship.x * 0.04, 0.045),
        lerp(camera.position.y, 0.42 + game.ship.y * 0.025, 0.045),
        lerp(camera.position.z, targetCameraZ, 0.045),
      );
      camera.lookAt(game.ship.x * 0.05, game.ship.y * 0.04, -5.2);

      if (entitiesChanged) markEntitiesDirty();
    },
    [
      camera,
      gameRef,
      inputRef,
      markEntitiesDirty,
      playFocusWhoosh,
      playOpenBloom,
      setHud,
      setStats,
      setWash,
      updatePhase,
    ],
  );

  useEffect(() => {
    hudKeyRef.current = "";
    markEntitiesDirty();
  }, [markEntitiesDirty, resetToken]);

  useEffect(() => {
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) stepGame(1 / 60);
    };

    return () => {
      if (window.advanceTime) delete window.advanceTime;
    };
  }, [stepGame]);

  useFrame((_, delta) => {
    stepGame(delta);
  });

  const game = gameRef.current;

  return (
    <VoxelTextureContext.Provider value={voxelTextures}>
      <group ref={sceneGroupRef}>
      <color attach="background" args={["#0c1c32"]} />
      <fog attach="fog" args={["#14314d", 14, 42]} />
      <ambientLight intensity={0.9} color="#c2d8ff" />
      <hemisphereLight args={["#e8f1ff", "#241926", 1.02]} />
      <directionalLight position={[-4.5, 5.8, 5.5]} intensity={1.96} color="#ffe1b4" />
      <directionalLight position={[5, -1, 3]} intensity={0.92} color="#8eeaff" />
      <pointLight ref={stationLightRef} position={[0, 0.2, -3]} intensity={12} color="#bff8ff" distance={17} />
      <pointLight position={[4, -2, 2]} intensity={6.4} color="#ffb86f" distance={12} />

      <StarField phase={phase} />
      <AtmosphericDust phase={phase} />
      <SpaceGlowField phase={phase} />
      <SetDressingAsteroids phase={phase} />
      <StationMesh station={game.station} />
      <ShipMesh ship={game.ship} visible={phase !== "card"} />

      {game.obstacles.map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}
      {game.projectiles.map((projectile) => (
        <ProjectileMesh key={projectile.id} projectile={projectile} />
      ))}
      {game.particles.map((particle) => (
        <ParticleMesh key={particle.id} particle={particle} />
      ))}

      {phase === "card" ? (
        <ContactCardTerminal
          gameRef={gameRef}
          stats={stats}
          copyState={copyState}
          copyEmail={copyEmail}
          restartGame={restartGame}
          playHoverChime={playHoverChime}
        />
      ) : null}
      </group>
    </VoxelTextureContext.Provider>
  );
}

function StarField({ phase }: { phase: ContactGamePhase }) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const dotTexture = useRoundPointTexture();
  const geometry = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color("#fff3d8");
    const cool = new THREE.Color("#b9f2ff");
    const lilac = new THREE.Color("#d8d1ff");

    for (let index = 0; index < count; index += 1) {
      const depth = seededRandom(index * 3 + 3);
      const spread = 1 + depth * 0.52;
      positions[index * 3] = (seededRandom(index * 3 + 1) - 0.5) * 42 * spread;
      positions[index * 3 + 1] = (seededRandom(index * 3 + 2) - 0.46) * 21;
      positions[index * 3 + 2] = -1.2 - depth * 48;

      const color = cool.clone().lerp(warm, seededRandom(index * 7 + 4) * 0.62);
      color.lerp(lilac, seededRandom(index * 11 + 5) * 0.22);
      const brightness = 0.72 + seededRandom(index * 13 + 6) * 0.44;
      colors[index * 3] = color.r * brightness;
      colors[index * 3 + 1] = color.g * brightness;
      colors[index * 3 + 2] = color.b * brightness;
    }
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const speed = phase === "flight" ? 2.8 : phase === "dock" ? 1.15 : 0.32;
    const attribute = pointsRef.current.geometry.getAttribute("position");
    for (let index = 0; index < attribute.count; index += 1) {
      const z = attribute.getZ(index) + delta * speed;
      attribute.setZ(index, z > 5 ? -38 : z);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={dotTexture}
        size={0.062}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function AtmosphericDust({ phase }: { phase: ContactGamePhase }) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const dotTexture = useRoundPointTexture();
  const geometry = useMemo(() => {
    const count = 640;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color("#ffd7a6");
    const cool = new THREE.Color("#86d8ff");
    const violet = new THREE.Color("#b6a7ff");
    for (let index = 0; index < count; index += 1) {
      const depth = seededRandom(index * 11 + 3);
      const spread = 0.72 + depth * 0.62;
      positions[index * 3] = (seededRandom(index * 5 + 1) - 0.5) * 34 * spread;
      positions[index * 3 + 1] = (seededRandom(index * 7 + 2) - 0.48) * 17;
      positions[index * 3 + 2] = -2.2 - depth * 38;
      const color = warm.clone().lerp(cool, seededRandom(index * 13 + 4));
      color.lerp(violet, seededRandom(index * 17 + 5) * 0.28);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const attribute = pointsRef.current.geometry.getAttribute("position");
    const speed = phase === "flight" ? 1.5 : phase === "dock" ? 0.72 : 0.18;
    for (let index = 0; index < attribute.count; index += 1) {
      const z = attribute.getZ(index) + delta * speed;
      attribute.setZ(index, z > 4 ? -28 : z);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={dotTexture}
        size={0.12}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.38}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function SpaceGlowField({ phase }: { phase: ContactGamePhase }) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const dotTexture = useRoundPointTexture();
  const geometry = useMemo(() => {
    const count = 760;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const clusters = [
      {
        center: new THREE.Vector3(-8.6, 3.8, -24),
        spread: new THREE.Vector3(9.2, 3.2, 10.5),
        inner: new THREE.Color("#6edcff"),
        outer: new THREE.Color("#1f447f"),
      },
      {
        center: new THREE.Vector3(8.4, -1.4, -31),
        spread: new THREE.Vector3(8.6, 4.4, 12),
        inner: new THREE.Color("#987dff"),
        outer: new THREE.Color("#1a2b68"),
      },
      {
        center: new THREE.Vector3(1.8, 5.4, -42),
        spread: new THREE.Vector3(13.5, 3.8, 8.5),
        inner: new THREE.Color("#ffba7d"),
        outer: new THREE.Color("#26356d"),
      },
    ] as const;

    for (let index = 0; index < count; index += 1) {
      const cluster = clusters[index % clusters.length];
      const angle = seededRandom(index * 7 + 2) * Math.PI * 2;
      const radius = Math.sqrt(seededRandom(index * 5 + 1));
      const vertical = (seededRandom(index * 11 + 3) - 0.5) * 2;
      const depth = (seededRandom(index * 13 + 4) - 0.5) * 2;
      const turbulence = seededRandom(index * 17 + 5) * Math.PI * 2;

      positions[index * 3] =
        cluster.center.x +
        Math.cos(angle) * radius * cluster.spread.x +
        Math.sin(turbulence) * 1.6;
      positions[index * 3 + 1] =
        cluster.center.y +
        vertical * cluster.spread.y * (0.4 + radius * 0.6) +
        Math.cos(turbulence * 0.7) * 0.7;
      positions[index * 3 + 2] =
        cluster.center.z +
        depth * cluster.spread.z * (0.35 + radius * 0.65);

      const color = cluster.outer.clone().lerp(cluster.inner, 0.24 + (1 - radius) * 0.58);
      const brightness = 0.24 + (1 - radius) * 0.42;
      colors[index * 3] = color.r * brightness;
      colors[index * 3 + 1] = color.g * brightness;
      colors[index * 3 + 2] = color.b * brightness;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.04) * 0.018;
    const attribute = pointsRef.current.geometry.getAttribute("position");
    const speed = phase === "flight" ? 0.72 : phase === "dock" ? 0.36 : 0.08;
    for (let index = 0; index < attribute.count; index += 1) {
      const z = attribute.getZ(index) + delta * speed;
      attribute.setZ(index, z > 4 ? -36 : z);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={-2}>
      <pointsMaterial
        map={dotTexture}
        size={0.4}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.24}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function VoxelPlane({
  src,
  height,
  width,
  opacity = 1,
  additive = false,
  alphaTest,
  renderOrder = 0,
}: {
  src: string;
  height: number;
  width?: number;
  opacity?: number;
  additive?: boolean;
  alphaTest?: number;
  renderOrder?: number;
}) {
  const texture = useVoxelTexture(src);
  const planeWidth = width ?? height * getTextureAspect(texture);
  const materialAlphaTest = alphaTest ?? (additive ? 0.02 : 0.16);

  return (
    <mesh renderOrder={renderOrder}>
      <planeGeometry args={[planeWidth, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={materialAlphaTest}
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

function SetDressingAsteroids({ phase }: { phase: ContactGamePhase }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();
  const rocks = useMemo(
    () => [
      { src: VOXEL_SPRITES.asteroidDark, x: -6.6, y: 2.4, z: -9.4, size: 0.82, spin: 0.12 },
      { src: VOXEL_SPRITES.asteroidLight, x: 5.8, y: -1.2, z: -13.2, size: 0.62, spin: -0.16 },
      { src: VOXEL_SPRITES.asteroidShard, x: -4.8, y: -2.6, z: -5.8, size: 0.9, spin: 0.2 },
      { src: VOXEL_SPRITES.asteroidDark, x: 6.2, y: 2.8, z: -20.4, size: 0.68, spin: -0.11 },
      { src: VOXEL_SPRITES.asteroidLight, x: -7.2, y: 0.4, z: -23.2, size: 0.52, spin: 0.18 },
    ],
    [],
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.z += delta * (phase === "flight" ? 1.1 : 0.22);
    if (groupRef.current.position.z > 5) groupRef.current.position.z = 0;
    for (const child of groupRef.current.children) {
      child.quaternion.copy(camera.quaternion);
      child.rotateZ(delta * ((child.userData.spin as number | undefined) ?? 0));
    }
  });

  return (
    <group ref={groupRef}>
      {rocks.map((rock, index) => (
        <group key={`${rock.src}-${index}`} position={[rock.x, rock.y, rock.z]} userData={{ spin: rock.spin }}>
          <VoxelPlane src={rock.src} height={rock.size} opacity={0.72} />
        </group>
      ))}
    </group>
  );
}

function ShipMesh({ ship, visible }: { ship: ShipState; visible: boolean }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const exhaustRef = useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.visible = visible;
    groupRef.current.position.set(ship.x, ship.y, ship.z);
    groupRef.current.rotation.set(0.02 + ship.vy * -0.012, 0, -ship.tilt * 0.9);
    const pulse = 1 + Math.sin(clock.elapsedTime * 24) * 0.08;
    groupRef.current.scale.setScalar(1.06 + ship.flash * 0.06);
    if (exhaustRef.current) exhaustRef.current.scale.set(0.84 * pulse, 1.05 + Math.abs(ship.vx) * 0.04, 0.84 * pulse);
  });

  return (
    <group ref={groupRef}>
      <group ref={exhaustRef} position={[0, -0.58, 0.03]}>
        <VoxelPlane src={VOXEL_SPRITES.playerTrail} height={1.05} opacity={0.5} additive renderOrder={6} />
      </group>
      <group position={[0, -0.01, 0.08]}>
        <VoxelPlane src={VOXEL_SPRITES.player} height={1.82} renderOrder={8} />
      </group>
      <group position={[0, -0.54, 0.12]}>
        <VoxelPlane src={VOXEL_SPRITES.playerEngine} height={0.52} opacity={0.82} additive renderOrder={9} />
      </group>
      {ship.gunFlash > 0.01 ? (
        <group position={[0, 0.48, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <VoxelPlane src={VOXEL_SPRITES.muzzleFlash} height={0.34} opacity={0.42 + ship.gunFlash * 0.5} additive alphaTest={0.08} renderOrder={10} />
        </group>
      ) : null}
    </group>
  );
}

function StationMesh({ station }: { station: StationState }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const beaconRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.set(station.x, station.y, station.z);
    groupRef.current.scale.setScalar(station.scale);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.rotateZ(Math.sin(clock.elapsedTime * 0.8) * 0.012);
    if (beaconRef.current) beaconRef.current.scale.setScalar(0.78 + station.bayGlow * 0.34 + Math.sin(clock.elapsedTime * 5) * station.bayGlow * 0.05);
  });

  return (
    <group ref={groupRef}>
      <group position={[0, -0.42, 0.04]}>
        <VoxelPlane src={VOXEL_SPRITES.station} height={1.58} opacity={0.94} renderOrder={4} />
      </group>
      <group position={[0, 0.58, 0.12]}>
        <VoxelPlane src={VOXEL_SPRITES.terminal} height={2.32} opacity={0.82 + station.glow * 0.18} additive renderOrder={6} />
      </group>
      <group ref={beaconRef} position={[0, -0.36, 0.18]}>
        <VoxelPlane src={VOXEL_SPRITES.projectionBase} height={1.28} opacity={0.34 + station.bayGlow * 0.36} additive renderOrder={7} />
      </group>
      <pointLight color="#9ff7ff" intensity={station.glow * 12 + 2} distance={7} />
    </group>
  );
}

function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.set(obstacle.x, obstacle.y, obstacle.z);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.rotateZ(obstacle.kind === "alien" ? Math.sin(clock.elapsedTime * obstacle.wobbleSpeed + obstacle.wobble) * 0.16 : obstacle.spin * 0.2);
    groupRef.current.scale.setScalar(1 + obstacle.hitFlash * 0.1);
  });

  if (obstacle.kind === "alien") {
    const sprite = FORWARD_ALIEN_SPRITES[obstacle.id % FORWARD_ALIEN_SPRITES.length] ?? FORWARD_ALIEN_SPRITES[0];
    return (
      <group ref={groupRef}>
        <VoxelPlane src={sprite} height={obstacle.radius * 2.42} renderOrder={7} />
        {obstacle.hitFlash > 0.02 ? (
          <group position={[0, 0, 0.11]}>
            <VoxelPlane src={VOXEL_SPRITES.shieldRing} height={obstacle.radius * 2.25} opacity={0.4} additive renderOrder={9} />
          </group>
        ) : null}
        <pointLight color="#79ffe3" intensity={3.2 + obstacle.hitFlash * 9} distance={3.1} />
      </group>
    );
  }

  const palette = PLANET_COLORS[obstacle.kind];

  return (
    <group ref={groupRef}>
      {isRingedPlanet(obstacle.kind) ? <PlanetRingMesh kind={obstacle.kind} radius={obstacle.radius} layer="back" /> : null}
      <VoxelPlane src={PLANET_SPRITES[obstacle.kind]} height={obstacle.radius * 2.42} renderOrder={6} />
      {isRingedPlanet(obstacle.kind) ? <PlanetRingMesh kind={obstacle.kind} radius={obstacle.radius} layer="front" /> : null}
      {obstacle.hitFlash > 0.02 ? <VoxelPlane src={VOXEL_SPRITES.impact} height={obstacle.radius * 1.16} opacity={0.62} additive renderOrder={9} /> : null}
      <pointLight color={palette.glow} intensity={2 + obstacle.hitFlash * 6.5} distance={obstacle.radius * 5.2} />
    </group>
  );
}

function PlanetRingMesh({ kind, radius, layer }: { kind: "saturn" | "uranus"; radius: number; layer: "back" | "front" }) {
  const color = kind === "saturn" ? "#e2b36f" : "#bdeee9";
  const opacity = layer === "back" ? 0.32 : 0.42;
  const z = layer === "back" ? -0.045 : 0.08;
  const scaleY = kind === "saturn" ? 0.34 : 0.3;

  return (
    <mesh position={[0, 0, z]} rotation={[0, 0, kind === "saturn" ? -0.24 : -0.32]} scale={[1.58, scaleY, 1]} renderOrder={layer === "back" ? 5 : 7}>
      <ringGeometry args={[radius * 1.43, radius * 1.62, 72]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ProjectileMesh({ projectile }: { projectile: Projectile }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(projectile.x, projectile.y, projectile.z);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.rotateZ(projectile.friendly ? -0.22 : Math.PI + 0.18);
    groupRef.current.scale.setScalar(clamp(1 - projectile.life / projectile.ttl, 0.16, 1));
  });

  const color = projectile.friendly ? "#fff1ba" : "#9fe7ff";
  const glow = projectile.friendly ? "#ffc071" : "#7ee7ff";
  const sprite = projectile.friendly ? VOXEL_SPRITES.friendlyShot : VOXEL_SPRITES.enemyShot;

  return (
    <group ref={groupRef}>
      <VoxelPlane src={sprite} height={projectile.radius * 2.35} opacity={0.9} additive renderOrder={8} />
      <mesh>
        <circleGeometry args={[projectile.radius * 1.05, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.26} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={glow} intensity={2.3} distance={1.9} />
    </group>
  );
}

function ParticleMesh({ particle }: { particle: Particle }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  useFrame(() => {
    if (!meshRef.current) return;
    const alpha = clamp(1 - particle.life / particle.ttl, 0, 1);
    meshRef.current.position.set(particle.x, particle.y, particle.z);
    meshRef.current.rotation.x += 0.05;
    meshRef.current.rotation.y += 0.07;
    meshRef.current.scale.setScalar(alpha);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = alpha;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[particle.size * 1.45, 0]} />
      <meshBasicMaterial color={particle.color} transparent opacity={0.9} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function ContactCardTerminal({
  gameRef,
  stats,
  copyState,
  copyEmail,
  restartGame,
  playHoverChime,
}: {
  gameRef: MutableRefObject<GameState>;
  stats: RunStats | null;
  copyState: "idle" | "copied" | "failed";
  copyEmail: () => void;
  restartGame: () => void;
  playHoverChime: () => void;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const cardDomRef = useRef<HTMLDivElement | null>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const game = gameRef.current;
    const emergenceRaw = clamp(game.phaseElapsed / 1.9, 0, 1);
    const emergence = easeOutCubic(clamp((emergenceRaw - 0.1) / 0.9, 0, 1));
    const source = {
      x: game.station.x,
      y: game.station.y + game.station.scale * 0.58,
      z: game.station.z + game.station.scale * 0.1,
    };
    const target = {
      x: 0,
      y: 0.18 + Math.sin(clock.elapsedTime * 1.24) * 0.026,
      z: -2.12,
    };

    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.position.set(
      lerp(source.x, target.x, emergence),
      lerp(source.y, target.y, emergence),
      lerp(source.z, target.z, emergence),
    );
    const scale = lerp(0.055, 1, emergence);
    const settlePulse = emergence >= 1 ? Math.sin(clock.elapsedTime * 2.1) * 0.012 : 0;
    groupRef.current.scale.setScalar(scale + settlePulse);

    if (cardDomRef.current) {
      cardDomRef.current.style.opacity = String(clamp((emergence - 0.34) / 0.42, 0, 1));
      cardDomRef.current.style.pointerEvents = emergence > 0.92 ? "auto" : "none";
    }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, 0, -0.18]}>
        <VoxelPlane src={VOXEL_SPRITES.cardFrame} height={4.08} opacity={0.5} additive renderOrder={10} />
      </group>
      <mesh position={[0, 0, -0.12]} renderOrder={9}>
        <ringGeometry args={[2.08, 2.34, 6]} />
        <meshBasicMaterial color="#9fe7ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.1]} rotation={[0, 0, Math.PI / 4]} renderOrder={9}>
        <ringGeometry args={[2.18, 2.36, 4]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.06]} renderOrder={10}>
        <boxGeometry args={[6.7, 3.72, 0.12]} />
        <meshBasicMaterial color="#bff3ff" transparent opacity={0.12} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0, -0.14]} renderOrder={9}>
        <boxGeometry args={[7.05, 4.06, 0.08]} />
        <meshBasicMaterial color="#fff1cf" transparent opacity={0.08} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -2.36, -0.2]} rotation={[Math.PI / 2, 0, 0]} renderOrder={8}>
        <ringGeometry args={[1.38, 2.42, 6]} />
        <meshBasicMaterial color="#8eeaff" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -2.31, -0.18]} rotation={[Math.PI / 2, 0, 0]} renderOrder={8}>
        <circleGeometry args={[2.05, 6]} />
        <meshBasicMaterial color="#9fe7ff" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group position={[2.52, 1.62, 0.04]}>
        <VoxelPlane src={VOXEL_SPRITES.sparkle} height={0.78} opacity={0.54} additive renderOrder={11} />
      </group>
      <group position={[-2.56, -1.46, 0.04]}>
        <VoxelPlane src={VOXEL_SPRITES.sparkle} height={0.58} opacity={0.42} additive renderOrder={11} />
      </group>
      <Html transform position={[0, 0, 0.05]} distanceFactor={4.7} zIndexRange={[30, 0]}>
        <div ref={cardDomRef} className={styles.cardStage}>
          <div className={styles.cardPanel}>
            <div className={styles.cardContent}>
              <div className={styles.cardIdentityRow}>
                <div className={styles.cardIdentity}>
                  <h2 className={styles.cardTitle}>CHLOE KANG</h2>
                  <p className={styles.cardEmail}>{CONTACT_DETAILS.email}</p>
                </div>
                <div className={styles.cardStats}>
                  <div className={styles.cardStatChip}>
                    <span>dodges</span>
                    <strong>{stats?.dodges ?? 0}</strong>
                  </div>
                  <div className={styles.cardStatChip}>
                    <span>targets down</span>
                    <strong>{stats?.destroyed ?? 0}</strong>
                  </div>
                  <div className={styles.cardStatChip}>
                    <span>ships cleared</span>
                    <strong>{stats?.shipsDestroyed ?? 0}</strong>
                  </div>
                  <div className={styles.cardStatChip}>
                    <span>hull left</span>
                    <strong>{stats?.integrityLeft ?? 100}%</strong>
                  </div>
                </div>
              </div>

              <div className={styles.cardActionGrid}>
                <a href={`mailto:${CONTACT_DETAILS.email}`} onMouseEnter={playHoverChime} className={styles.cardButton}>
                  send signal
                </a>
                <button type="button" onClick={copyEmail} onMouseEnter={playHoverChime} className={styles.cardButton}>
                  {copyState === "copied" ? "address copied" : copyState === "failed" ? "copy failed" : "copy address"}
                </button>
              </div>

              <div className={styles.cardLinkRow}>
                {SOCIAL_LINKS.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" onMouseEnter={playHoverChime} className={styles.cardMiniButton}>
                    {link.label}
                  </a>
                ))}
              </div>

              <button type="button" onClick={restartGame} onMouseEnter={playHoverChime} className={styles.cardFooterButton}>
                rerun mission
              </button>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function ContactMissionGame3D() {
  const router = useRouter();
  const [initialGameState] = useState<GameState>(() => createInitialState());
  const gameRef = useRef<GameState>(initialGameState);
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, fire: false });
  const phaseStateRef = useRef<ContactGamePhase>("boot");
  const startedAudioRef = useRef(false);
  const copyTimeoutRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ContactGamePhase>("boot");
  const [stats, setStats] = useState<RunStats | null>(null);
  const [hud, setHud] = useState<HudState>(() => makeHudState(initialGameState));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [wash, setWash] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const {
    muted,
    requestStart,
    toggleMuted,
    playHoverChime,
    playFocusWhoosh,
    playOpenBloom,
  } = useAudioGate({
    volume: 0.32,
    ambientLevel: 0.34,
    style: "arcade",
  });

  const updatePhase = useCallback((nextPhase: ContactGamePhase) => {
    if (phaseStateRef.current === nextPhase) return;
    phaseStateRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const startAudio = useCallback(() => {
    if (startedAudioRef.current) return;
    startedAudioRef.current = true;
    void requestStart();
  }, [requestStart]);

  const restartGame = useCallback(() => {
    startAudio();
    const nextState = createInitialState("launch");
    nextState.phaseElapsed = 0;
    gameRef.current = nextState;
    inputRef.current.fire = false;
    setHud(makeHudState(nextState));
    setStats(null);
    setWash(0);
    setCopyState("idle");
    setResetToken((value) => value + 1);
    updatePhase("launch");
    playFocusWhoosh(0.7);
  }, [playFocusWhoosh, startAudio, updatePhase]);

  const copyEmail = useCallback(async () => {
    startAudio();
    try {
      await navigator.clipboard.writeText(CONTACT_DETAILS.email);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopyState("idle"), 1400);
  }, [startAudio]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
      return;
    }
    void document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    window.render_game_to_text = () => makeGameTextSnapshot(gameRef.current, hud, stats);
    return () => {
      if (window.render_game_to_text) delete window.render_game_to_text;
    };
  }, [hud, stats]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "r", "f"].includes(key)) {
        event.preventDefault();
        startAudio();
      }

      if (key === "f") {
        toggleFullscreen();
        return;
      }

      if (phaseStateRef.current === "boot" && (key === " " || key === "enter" || ["w", "a", "s", "d"].includes(key))) {
        restartGame();
        return;
      }

      if (phaseStateRef.current === "card" && key === "r") {
        restartGame();
        return;
      }

      if (key === "w" || key === "arrowup") inputRef.current.up = true;
      if (key === "s" || key === "arrowdown") inputRef.current.down = true;
      if (key === "a" || key === "arrowleft") inputRef.current.left = true;
      if (key === "d" || key === "arrowright") inputRef.current.right = true;
      if (key === " ") inputRef.current.fire = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") inputRef.current.up = false;
      if (key === "s" || key === "arrowdown") inputRef.current.down = false;
      if (key === "a" || key === "arrowleft") inputRef.current.left = false;
      if (key === "d" || key === "arrowright") inputRef.current.right = false;
      if (key === " ") inputRef.current.fire = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [restartGame, startAudio, toggleFullscreen]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const showHud = phase === "launch" || phase === "flight" || phase === "dock";

  return (
    <section className={`${styles.shell} ${pixelFont.className}`}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.1, far: 70 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ContactScene
            gameRef={gameRef}
            inputRef={inputRef}
            phase={phase}
            stats={stats}
            copyState={copyState}
            resetToken={resetToken}
            setHud={setHud}
            setStats={setStats}
            setWash={setWash}
            updatePhase={updatePhase}
            playFocusWhoosh={playFocusWhoosh}
            playOpenBloom={playOpenBloom}
            playHoverChime={playHoverChime}
            copyEmail={copyEmail}
            restartGame={restartGame}
          />
        </Suspense>
      </Canvas>

      <div className={styles.screenBloom} />
      <div className={styles.grain} />
      <div className={styles.vignette} />
      <div className={styles.whiteWash} style={{ "--wash": wash } as CSSProperties} />

      <div className={styles.topBar}>
        <button
          type="button"
          onClick={() => {
            startAudio();
            router.push("/");
          }}
          onMouseEnter={playHoverChime}
          className={styles.topButton}
        >
          return to chloeverse
        </button>
        <button
          type="button"
          onClick={() => {
            startAudio();
            toggleMuted();
          }}
          onMouseEnter={playHoverChime}
          className={styles.topButton}
        >
          {muted ? "audio:off" : "audio:on"}
        </button>
      </div>

      {showHud ? (
        <div className={styles.hud}>
          <div className={styles.hudBlock}>
            <p className={styles.hudLabel}>dock vector</p>
            <p className={styles.hudValue}>hull {hud.integrity.toString().padStart(3, "0")}%</p>
            <div className={styles.hudBar}>
              <div className={styles.hudBarFill} style={{ width: `${clamp(hud.integrity, 0, 100)}%` }} />
            </div>
            <p className={styles.hudMeta}>dodges {hud.dodges.toString().padStart(2, "0")}</p>
            <p className={styles.hudMeta}>down {hud.destroyed.toString().padStart(2, "0")}</p>
            {phase === "dock" ? <p className={styles.hudMeta}>docking lock / beacon hold</p> : null}
          </div>

          <div className={`${styles.hudBlock} ${styles.hudRight}`}>
            <p className={styles.hudValue}>t-dock {hud.timeLeft.toFixed(1)}s</p>
            <div className={styles.hudBar}>
              <div className={`${styles.hudBarFill} ${styles.hudBarProgress}`} style={{ width: `${clamp(hud.progress * 100, 0, 100)}%` }} />
            </div>
            <p className={styles.hudMeta}>aliens {hud.aliens.toString().padStart(2, "0")}</p>
          </div>
        </div>
      ) : null}

      {phase === "boot" ? (
        <div className={styles.bootOverlay}>
          <div className={styles.bootPanel}>
            <h1 className={styles.bootTitle}>
              <span>pilot the relay corridor to pluto.</span>
              <span>dock cleanly to unlock chloe&apos;s contact card.</span>
            </h1>
            <p className={styles.bootBody}>WASD or arrow keys move. Space shoots. F opens fullscreen.</p>
            <div className={styles.bootActions}>
              <button id="contact-3d-start" type="button" onClick={restartGame} onMouseEnter={playHoverChime} className={styles.bootButton}>
                begin mission
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "launch" ? <div className={styles.launchChip}>weapons primed</div> : null}

      <div className={styles.bottomStrip}>
        {phase === "boot" ? (
          <a href={CONTACT_DETAILS.candy} target="_blank" rel="noreferrer" onMouseEnter={playHoverChime} className={styles.bottomLink}>
            return to candy castle
          </a>
        ) : (
          <span />
        )}
        <span />
      </div>
    </section>
  );
}
