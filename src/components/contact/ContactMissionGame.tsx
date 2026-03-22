"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Silkscreen } from "next/font/google";
import { useRouter } from "next/navigation";

import { useAudioGate } from "@/hooks/useAudioGate";
import { CONTACT_DETAILS } from "@/lib/mobile-content";

import styles from "./ContactMissionGame.module.css";

const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;
const SHIP_RADIUS = 9;
const FLIGHT_DURATION = 13;
const CRASH_DURATION = 4.4;
const MAX_INTEGRITY = 100;
const DAMAGE_PER_HIT = 24;
const MAX_DT = 1 / 30;
const RECENT_KIND_MEMORY = 4;

type ContactGamePhase = "boot" | "launch" | "flight" | "crash" | "card";
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

type ContactArtKey = PlanetKind | "ship";
type ContactArtMap = Partial<Record<ContactArtKey, HTMLImageElement>>;
type ContactArtSourceMap = Record<ContactArtKey, string[]>;

type PlanetPalette = {
  body: string;
  shadow: string;
  highlight: string;
  accent: string;
  glow: string;
  ring?: string;
};

type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
};

type Cloud = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  hue: string;
  drift: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  ttl: number;
  color: string;
};

type Obstacle = {
  id: number;
  kind: PlanetKind;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  spin: number;
  spinVelocity: number;
  passed: boolean;
  hitFlash: number;
};

type ShipState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  flash: number;
};

type PlutoState = {
  x: number;
  y: number;
  radius: number;
  glow: number;
};

type RunStats = {
  dodges: number;
  nearMisses: number;
  integrityLeft: number;
  survivedSeconds: number;
};

type GameState = {
  phase: ContactGamePhase;
  phaseElapsed: number;
  flightElapsed: number;
  ship: ShipState;
  stars: Star[];
  clouds: Cloud[];
  particles: Particle[];
  obstacles: Obstacle[];
  obstacleId: number;
  recentKinds: PlanetKind[];
  spawnTimer: number;
  collisionCooldown: number;
  integrity: number;
  dodgeCount: number;
  nearMissCount: number;
  cameraShake: number;
  flash: number;
  pluto: PlutoState;
  crashOrigin: { x: number; y: number };
  cardPulse: number;
};

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

const CONTACT_ART_PATHS: ContactArtSourceMap = {
  ship: ["/contact/planet-dodge/ship.png", "/contact/planet-dodge/ship.svg"],
  mercury: ["/contact/planet-dodge/mercury.png", "/contact/planet-dodge/mercury.svg"],
  venus: ["/contact/planet-dodge/venus.png", "/contact/planet-dodge/venus.svg"],
  earth: ["/contact/planet-dodge/earth.png", "/contact/planet-dodge/earth.svg"],
  mars: ["/contact/planet-dodge/mars.png", "/contact/planet-dodge/mars.svg"],
  jupiter: ["/contact/planet-dodge/jupiter.png", "/contact/planet-dodge/jupiter.svg"],
  saturn: ["/contact/planet-dodge/saturn.png", "/contact/planet-dodge/saturn.svg"],
  uranus: ["/contact/planet-dodge/uranus.png", "/contact/planet-dodge/uranus.svg"],
  neptune: ["/contact/planet-dodge/neptune.png", "/contact/planet-dodge/neptune.svg"],
  pluto: ["/contact/planet-dodge/pluto.png", "/contact/planet-dodge/pluto.svg"],
};

// Fallback palette metadata used for glow and procedural backup rendering.
const PLANET_PALETTES: Record<PlanetKind, PlanetPalette> = {
  mercury: {
    body: "#b79275",
    shadow: "#61453a",
    highlight: "#f0cfbb",
    accent: "#8b6451",
    glow: "rgba(240, 206, 187, 0.16)",
  },
  venus: {
    body: "#deb472",
    shadow: "#8b6132",
    highlight: "#fff0ca",
    accent: "#f6d18a",
    glow: "rgba(255, 228, 182, 0.16)",
  },
  earth: {
    body: "#3f7fe5",
    shadow: "#14365e",
    highlight: "#d5f2ff",
    accent: "#61bf7a",
    glow: "rgba(122, 176, 255, 0.18)",
  },
  mars: {
    body: "#c86d57",
    shadow: "#6b3026",
    highlight: "#ffd0ba",
    accent: "#f3a685",
    glow: "rgba(255, 191, 172, 0.14)",
  },
  jupiter: {
    body: "#d0a171",
    shadow: "#7c5132",
    highlight: "#fff0d7",
    accent: "#b46b46",
    glow: "rgba(255, 224, 197, 0.18)",
  },
  saturn: {
    body: "#d9be92",
    shadow: "#7f6846",
    highlight: "#fff3da",
    accent: "#b89a6f",
    glow: "rgba(255, 233, 197, 0.14)",
    ring: "#d8c19a",
  },
  uranus: {
    body: "#8fd0d4",
    shadow: "#2b6063",
    highlight: "#ecffff",
    accent: "#b6f1f3",
    glow: "rgba(190, 249, 255, 0.14)",
  },
  neptune: {
    body: "#5f79f2",
    shadow: "#1e2d74",
    highlight: "#dce7ff",
    accent: "#92aeff",
    glow: "rgba(146, 174, 255, 0.16)",
  },
  pluto: {
    body: "#d9c7b9",
    shadow: "#5c4a53",
    highlight: "#fff7ec",
    accent: "#c493b7",
    glow: "rgba(255, 241, 220, 0.22)",
  },
};

const SOCIAL_LINKS = [
  { label: "Instagram", href: CONTACT_DETAILS.instagram },
  { label: "TikTok", href: CONTACT_DETAILS.tiktok },
  { label: "LinkedIn", href: CONTACT_DETAILS.linkedin },
  { label: "X", href: CONTACT_DETAILS.x },
] as const;

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

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    size: Math.random() > 0.78 ? 2 : 1,
    speed: 12 + Math.random() * 55,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

function createClouds(count: number): Cloud[] {
  const hues = ["rgba(79,118,220,0.12)", "rgba(204,144,255,0.08)", "rgba(255,192,140,0.07)"];
  return Array.from({ length: count }, (_, index) => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT * 0.7,
    radius: 36 + Math.random() * 68,
    alpha: 0.28 + Math.random() * 0.22,
    hue: hues[index % hues.length] ?? hues[0],
    drift: -6 + Math.random() * 12,
  }));
}

function createInitialState(phase: ContactGamePhase = "boot"): GameState {
  return {
    phase,
    phaseElapsed: 0,
    flightElapsed: 0,
    ship: {
      x: GAME_WIDTH * 0.5,
      y: GAME_HEIGHT * 0.76,
      vx: 0,
      vy: 0,
      tilt: 0,
      flash: 0,
    },
    stars: createStars(96),
    clouds: createClouds(9),
    particles: [],
    obstacles: [],
    obstacleId: 0,
    recentKinds: [],
    spawnTimer: 0.9,
    collisionCooldown: 0,
    integrity: MAX_INTEGRITY,
    dodgeCount: 0,
    nearMissCount: 0,
    cameraShake: 0,
    flash: 0,
    pluto: {
      x: GAME_WIDTH * 0.5,
      y: -90,
      radius: 28,
      glow: 0,
    },
    crashOrigin: {
      x: GAME_WIDTH * 0.5,
      y: GAME_HEIGHT * 0.28,
    },
    cardPulse: 0,
  };
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function spawnBurst(game: GameState, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5;
    const velocity = 20 + Math.random() * 70;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 1 + Math.floor(Math.random() * 3),
      life: 0,
      ttl: 0.25 + Math.random() * 0.35,
      color,
    });
  }
}

function spawnExhaust(game: GameState) {
  const x = game.ship.x;
  const y = game.ship.y + 9;
  game.particles.push({
    x: x - 1 + Math.random() * 2,
    y,
    vx: -4 + Math.random() * 8,
    vy: 18 + Math.random() * 32,
    size: 1 + Math.floor(Math.random() * 2),
    life: 0,
    ttl: 0.2 + Math.random() * 0.22,
    color: Math.random() > 0.5 ? "#ffd3a1" : "#ff8a5c",
  });
}

function choosePlanet(intensity: number, recentKinds: PlanetKind[], usedKinds: PlanetKind[]): PlanetKind {
  const giantPool: PlanetKind[] = intensity > 0.72 ? ["jupiter", "saturn"] : [];
  const weightedPool = [...PLANET_ORDER, ...giantPool];
  const uniquePool = Array.from(new Set(weightedPool));

  const notRecentlySeen = uniquePool.filter((kind) => !recentKinds.includes(kind) && !usedKinds.includes(kind));
  if (notRecentlySeen.length > 0) {
    return notRecentlySeen[Math.floor(Math.random() * notRecentlySeen.length)] ?? "mars";
  }

  const notUsedThisWave = uniquePool.filter((kind) => !usedKinds.includes(kind));
  if (notUsedThisWave.length > 0) {
    return notUsedThisWave[Math.floor(Math.random() * notUsedThisWave.length)] ?? "mars";
  }

  return uniquePool[Math.floor(Math.random() * uniquePool.length)] ?? "mars";
}

function spawnObstacle(game: GameState) {
  const intensity = clamp(game.flightElapsed / FLIGHT_DURATION, 0, 1);
  const count = intensity > 0.58 && Math.random() > 0.46 ? 2 : 1;
  const laneWidth = GAME_WIDTH - 110;
  const radiusBase = 13 + intensity * 12;
  const positions: number[] = [];
  const usedKinds: PlanetKind[] = [];

  for (let index = 0; index < count; index += 1) {
    let x = 55 + Math.random() * laneWidth;
    let attempts = 0;
    while (positions.some((existing) => Math.abs(existing - x) < 86) && attempts < 8) {
      x = 55 + Math.random() * laneWidth;
      attempts += 1;
    }
    positions.push(x);

    const kind = choosePlanet(intensity, game.recentKinds, usedKinds);
    usedKinds.push(kind);
    const radius = radiusBase + Math.random() * 11 + (kind === "jupiter" ? 10 : 0) + (kind === "saturn" ? 8 : 0);
    game.obstacles.push({
      id: game.obstacleId,
      kind,
      x,
      y: -radius - 22 - Math.random() * 60,
      radius,
      vx: (-24 + Math.random() * 48) * (0.3 + intensity * 0.6),
      vy: 44 + intensity * 84 + Math.random() * 30,
      spin: Math.random() * Math.PI * 2,
      spinVelocity: -0.7 + Math.random() * 1.4,
      passed: false,
      hitFlash: 0,
    });
    game.obstacleId += 1;
    game.recentKinds.push(kind);
    if (game.recentKinds.length > RECENT_KIND_MEMORY) {
      game.recentKinds = game.recentKinds.slice(-RECENT_KIND_MEMORY);
    }
  }
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  kind: PlanetKind,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  glowBoost = 0,
) {
  const palette = PLANET_PALETTES[kind];

  ctx.save();
  ctx.translate(x, y);

  if (kind === "saturn" && palette.ring) {
    ctx.strokeStyle = palette.ring;
    ctx.lineWidth = Math.max(2, radius * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.5, radius * 0.54, rotation * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 16 + glowBoost * 18;
  drawCircle(ctx, 0, 0, radius, palette.body);
  ctx.shadowBlur = 0;

  drawCircle(ctx, radius * 0.12, radius * 0.16, radius * 0.8, palette.shadow);
  drawCircle(ctx, -radius * 0.22, -radius * 0.28, radius * 0.48, palette.highlight);

  ctx.fillStyle = palette.accent;
  const craterCount = kind === "jupiter" ? 5 : kind === "saturn" ? 4 : 3;
  for (let index = 0; index < craterCount; index += 1) {
    const angle = rotation + index * 2.1;
    const craterRadius = Math.max(2, radius * (kind === "jupiter" ? 0.14 : 0.12));
    ctx.globalAlpha = 0.42;
    drawCircle(
      ctx,
      Math.cos(angle) * radius * 0.34,
      Math.sin(angle * 1.3) * radius * 0.26,
      craterRadius,
      palette.accent,
    );
  }
  ctx.globalAlpha = 1;

  if (kind === "earth") {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-radius * 0.5, radius * 0.02, radius * 0.42, radius * 0.18);
    ctx.fillRect(radius * 0.06, -radius * 0.18, radius * 0.3, radius * 0.18);
  }

  if (kind === "jupiter") {
    ctx.fillStyle = "rgba(255,245,235,0.2)";
    for (let band = -2; band <= 2; band += 1) {
      ctx.fillRect(-radius, band * radius * 0.28, radius * 2, radius * 0.13);
    }
  }

  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, ship: ShipState, flightBoost: number) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.tilt);

  const flashMix = ship.flash * 0.6;
  ctx.fillStyle = flashMix > 0.1 ? "#fff6ef" : "#efe2cc";
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 6);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6c5768";
  ctx.fillRect(-3, 1, 6, 8);

  ctx.fillStyle = "#fff4e3";
  ctx.fillRect(-1, -4, 2, 3);

  ctx.fillStyle = "#ffb06c";
  ctx.fillRect(-3, 10, 2, 4 + flightBoost * 6);
  ctx.fillRect(1, 10, 2, 4 + flightBoost * 6);

  ctx.fillStyle = "#ffd6a7";
  ctx.fillRect(-2, 11, 4, 2 + flightBoost * 4);

  ctx.restore();
}

function drawPlanetMotionOverlay(
  ctx: CanvasRenderingContext2D,
  kind: PlanetKind,
  radius: number,
  rotation: number,
) {
  ctx.save();
  ctx.rotate(rotation * 0.45);

  if (kind === "venus" || kind === "jupiter" || kind === "saturn" || kind === "uranus" || kind === "neptune") {
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.strokeStyle = "rgba(255, 248, 236, 0.22)";
    ctx.globalAlpha = 0.8;

    for (let band = -2; band <= 2; band += 1) {
      const y = band * radius * 0.22;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.72, y);
      ctx.bezierCurveTo(-radius * 0.22, y - radius * 0.1, radius * 0.18, y + radius * 0.12, radius * 0.7, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(255, 244, 232, 0.18)";
    ctx.globalAlpha = 0.9;

    for (let index = 0; index < 4; index += 1) {
      const angle = rotation + index * 1.4;
      const craterRadius = Math.max(2, radius * 0.09);
      drawCircle(
        ctx,
        Math.cos(angle) * radius * 0.32,
        Math.sin(angle * 1.12) * radius * 0.25,
        craterRadius,
        "rgba(255, 244, 232, 0.14)",
      );
    }

    if (kind === "pluto") {
      ctx.fillStyle = "rgba(255, 232, 245, 0.26)";
      ctx.beginPath();
      ctx.ellipse(-radius * 0.12, -radius * 0.08, radius * 0.18, radius * 0.13, rotation * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPlanetVisual(
  ctx: CanvasRenderingContext2D,
  art: ContactArtMap,
  kind: PlanetKind,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  glowBoost = 0,
) {
  const sprite = art[kind];
  if (!sprite) {
    drawPlanet(ctx, kind, x, y, radius, rotation, glowBoost);
    return;
  }

  const palette = PLANET_PALETTES[kind];
  const scale = kind === "saturn" ? 3.05 : kind === "jupiter" ? 2.85 : kind === "pluto" ? 2.9 : 2.65;
  const size = radius * scale;

  ctx.save();
  ctx.translate(x, y);

  const auraRadius = kind === "saturn" ? size * 0.28 : size * 0.24;
  ctx.globalAlpha = 0.3 + glowBoost * 0.2;
  drawCircle(ctx, 0, 0, auraRadius, palette.glow);
  ctx.globalAlpha = 1;

  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 16 + glowBoost * 18;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.shadowBlur = 0;
  drawPlanetMotionOverlay(ctx, kind, radius * 0.92, rotation);
  if (glowBoost > 0) {
    ctx.globalAlpha = Math.min(0.46, glowBoost * 0.32);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
  ctx.restore();
}

function drawShipVisual(
  ctx: CanvasRenderingContext2D,
  art: ContactArtMap,
  ship: ShipState,
  flightBoost: number,
) {
  const sprite = art.ship;
  if (!sprite) {
    drawShip(ctx, ship, flightBoost);
    return;
  }

  const size = 31 + flightBoost * 6;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.tilt);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  if (ship.flash > 0.04) {
    ctx.globalAlpha = Math.min(0.52, ship.flash * 0.45);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.save();
  ctx.font = '10px "Silkscreen", monospace';
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText("PLUTO VECTOR", 16, 14);

  ctx.fillStyle = "rgba(255,222,196,0.8)";
  const integrityLabel = `HULL ${Math.max(0, Math.round(game.integrity)).toString().padStart(3, "0")}%`;
  ctx.fillText(integrityLabel, 16, 30);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(16, 46, 116, 6);
  ctx.fillStyle = game.integrity > 48 ? "#ffd099" : "#ff916d";
  ctx.fillRect(16, 46, 116 * clamp(game.integrity / MAX_INTEGRITY, 0, 1), 6);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(`THREADS ${game.dodgeCount.toString().padStart(2, "0")}`, 16, 60);
  ctx.fillText(`CLOSE ${game.nearMissCount.toString().padStart(2, "0")}`, 16, 74);
  ctx.fillText(`T-PLUTO ${(Math.max(0, FLIGHT_DURATION - game.flightElapsed)).toFixed(1)}s`, GAME_WIDTH - 118, 14);

  const progress = clamp(game.flightElapsed / FLIGHT_DURATION, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(GAME_WIDTH - 126, 30, 108, 5);
  ctx.fillStyle = "#ddd4ff";
  ctx.fillRect(GAME_WIDTH - 126, 30, 108 * progress, 5);

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  gradient.addColorStop(0, "#0e1630");
  gradient.addColorStop(0.55, "#0a1120");
  gradient.addColorStop(1, "#03050a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (const cloud of game.clouds) {
    cloud.x += cloud.drift * 0.0025;
    if (cloud.x < -cloud.radius * 2) cloud.x = GAME_WIDTH + cloud.radius;
    if (cloud.x > GAME_WIDTH + cloud.radius * 2) cloud.x = -cloud.radius;
    ctx.fillStyle = cloud.hue;
    ctx.globalAlpha = cloud.alpha;
    drawCircle(ctx, cloud.x, cloud.y, cloud.radius, cloud.hue);
  }
  ctx.globalAlpha = 1;

  for (const star of game.stars) {
    const speedBoost = game.phase === "crash" ? 2.6 : game.phase === "flight" ? 1.45 : 0.45;
    star.y += star.speed * speedBoost * 0.006;
    if (star.y > GAME_HEIGHT + 4) {
      star.y = -4;
      star.x = Math.random() * GAME_WIDTH;
    }

    const pulse = 0.55 + Math.sin(time * 2.1 + star.twinkle) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${clamp(pulse, 0.25, 0.95)})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    if (game.phase !== "boot") {
      ctx.fillStyle = "rgba(164,190,255,0.14)";
      ctx.fillRect(star.x, star.y - star.size * 3, star.size, star.size * 2);
    }
  }

  ctx.fillStyle = "rgba(255, 214, 176, 0.08)";
  ctx.fillRect(0, GAME_HEIGHT - 48, GAME_WIDTH, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 1);
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    const alpha = clamp(1 - particle.life / particle.ttl, 0, 1);
    ctx.fillStyle = particle.color.startsWith("rgba")
      ? particle.color.replace(/\d?\.\d+\)$/u, `${alpha})`)
      : particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function makeStats(game: GameState): RunStats {
  return {
    dodges: game.dodgeCount,
    nearMisses: game.nearMissCount,
    integrityLeft: Math.max(0, Math.round(game.integrity)),
    survivedSeconds: Number(game.flightElapsed.toFixed(1)),
  };
}

export default function ContactMissionGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createInitialState());
  const artRef = useRef<ContactArtMap>({});
  const rafRef = useRef<number | null>(null);
  const phaseStateRef = useRef<ContactGamePhase>("boot");
  const startedAudioRef = useRef(false);
  const keyStateRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const copyTimeoutRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ContactGamePhase>("boot");
  const [stats, setStats] = useState<RunStats | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [artReady, setArtReady] = useState(false);

  const {
    muted,
    requestStart,
    toggleMuted,
    playHoverChime,
    playFocusWhoosh,
    playOpenBloom,
  } = useAudioGate({
    volume: 0.18,
    ambientLevel: 0.24,
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
    setStats(null);
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

    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
    }, 1400);
  }, [startAudio]);

  useEffect(() => {
    let cancelled = false;

    const loadAsset = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load ${src}`));
      image.src = src;
    });

    const loadAssetCandidates = async (sources: string[]) => {
      for (const source of sources) {
        try {
          return await loadAsset(source);
        } catch {
          continue;
        }
      }
      throw new Error(`Failed to load any art source: ${sources.join(", ")}`);
    };

    void Promise.allSettled(
      Object.entries(CONTACT_ART_PATHS).map(async ([key, sources]) => {
        const image = await loadAssetCandidates(sources);
        if (!cancelled) {
          artRef.current[key as ContactArtKey] = image;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const loadedCount = results.filter((result) => result.status === "fulfilled").length;
      setArtReady(loadedCount === Object.keys(CONTACT_ART_PATHS).length);
    });

    return () => {
      cancelled = true;
      artRef.current = {};
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "r"].includes(key)) {
        startAudio();
      }

      if (phaseStateRef.current === "boot" && (key === " " || key === "enter" || ["w", "a", "s", "d"].includes(key))) {
        restartGame();
        return;
      }

      if (phaseStateRef.current === "card" && key === "r") {
        restartGame();
        return;
      }

      if (key === "w" || key === "arrowup") keyStateRef.current.up = true;
      if (key === "s" || key === "arrowdown") keyStateRef.current.down = true;
      if (key === "a" || key === "arrowleft") keyStateRef.current.left = true;
      if (key === "d" || key === "arrowright") keyStateRef.current.right = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") keyStateRef.current.up = false;
      if (key === "s" || key === "arrowdown") keyStateRef.current.down = false;
      if (key === "a" || key === "arrowleft") keyStateRef.current.left = false;
      if (key === "d" || key === "arrowright") keyStateRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [restartGame, startAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.imageSmoothingEnabled = false;

    let lastTime = performance.now();

    const step = (frameTime: number) => {
      const dt = Math.min(MAX_DT, (frameTime - lastTime) / 1000 || 0.016);
      lastTime = frameTime;

      const game = gameRef.current;
      game.phaseElapsed += dt;
      game.cardPulse += dt;
      game.cameraShake = Math.max(0, game.cameraShake - dt * 2.5);
      game.flash = Math.max(0, game.flash - dt * 1.4);
      game.ship.flash = Math.max(0, game.ship.flash - dt * 2.8);
      game.collisionCooldown = Math.max(0, game.collisionCooldown - dt);

      if (game.phase === "launch") {
        game.ship.y = lerp(game.ship.y, GAME_HEIGHT * 0.72, 0.08);
        spawnExhaust(game);

        if (game.phaseElapsed > 1.2) {
          game.phase = "flight";
          game.phaseElapsed = 0;
          updatePhase("flight");
          playFocusWhoosh(0.6);
        }
      }

      if (game.phase === "flight") {
        game.flightElapsed += dt;
        const inputX = (keyStateRef.current.right ? 1 : 0) - (keyStateRef.current.left ? 1 : 0);
        const inputY = (keyStateRef.current.down ? 1 : 0) - (keyStateRef.current.up ? 1 : 0);
        const intensity = clamp(game.flightElapsed / FLIGHT_DURATION, 0, 1);
        const targetVx = inputX * (116 + intensity * 36);
        const targetVy = inputY * (88 + intensity * 18);

        game.ship.vx = lerp(game.ship.vx, targetVx, 0.12);
        game.ship.vy = lerp(game.ship.vy, targetVy, 0.12);
        game.ship.x = clamp(game.ship.x + game.ship.vx * dt, 22, GAME_WIDTH - 22);
        game.ship.y = clamp(game.ship.y + game.ship.vy * dt, GAME_HEIGHT * 0.36, GAME_HEIGHT - 24);
        game.ship.tilt = lerp(game.ship.tilt, game.ship.vx / 240, 0.16);

        spawnExhaust(game);

        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) {
          spawnObstacle(game);
          game.spawnTimer = 0.94 - intensity * 0.48 + Math.random() * 0.22;
        }

        for (const obstacle of game.obstacles) {
          obstacle.x += obstacle.vx * dt;
          obstacle.y += obstacle.vy * dt;
          obstacle.spin += obstacle.spinVelocity * dt;
          obstacle.hitFlash = Math.max(0, obstacle.hitFlash - dt * 3.2);

          const dx = obstacle.x - game.ship.x;
          const dy = obstacle.y - game.ship.y;
          const distance = Math.hypot(dx, dy);
          const collisionDistance = obstacle.radius + SHIP_RADIUS - 3;

          if (game.collisionCooldown <= 0 && distance < collisionDistance) {
            game.integrity = clamp(game.integrity - DAMAGE_PER_HIT, 0, MAX_INTEGRITY);
            game.cameraShake = 1;
            game.flash = 0.75;
            game.ship.flash = 1;
            game.collisionCooldown = 0.68;
            obstacle.hitFlash = 1;
            game.ship.vx -= dx * 1.6;
            game.ship.vy -= dy * 1.1;
            spawnBurst(game, obstacle.x, obstacle.y, "#ffd3bf", 14);
            playFocusWhoosh(1.15);
          }

          if (!obstacle.passed && obstacle.y > game.ship.y + obstacle.radius + 10) {
            obstacle.passed = true;
            game.dodgeCount += 1;
            if (distance < obstacle.radius + SHIP_RADIUS + 14) {
              game.nearMissCount += 1;
              game.flash = Math.max(game.flash, 0.16);
              playFocusWhoosh(0.55);
            }
          }
        }

        game.obstacles = game.obstacles.filter((obstacle) => obstacle.y < GAME_HEIGHT + obstacle.radius + 22);

        if (game.flightElapsed >= FLIGHT_DURATION) {
          game.phase = "crash";
          game.phaseElapsed = 0;
          game.crashOrigin = {
            x: game.ship.x,
            y: game.ship.y,
          };
          game.obstacles = [];
          updatePhase("crash");
          playFocusWhoosh(1.35);
        }
      }

      if (game.phase === "crash") {
        const progress = clamp(game.phaseElapsed / CRASH_DURATION, 0, 1);
        const orbitEase = easeOutCubic(clamp(progress / 0.72, 0, 1));
        const shipEase = easeInOutSine(clamp(progress / 0.76, 0, 1));

        game.pluto.x = GAME_WIDTH * 0.5 + Math.sin(progress * 9) * 5 * (1 - progress);
        game.pluto.y = lerp(-86, GAME_HEIGHT * 0.34, orbitEase);
        game.pluto.radius = lerp(34, 116, orbitEase);
        game.pluto.glow = progress;
        game.ship.x = lerp(game.crashOrigin.x, game.pluto.x, shipEase);
        game.ship.y = lerp(game.crashOrigin.y, game.pluto.y + 12, shipEase);
        game.ship.tilt = lerp(game.ship.tilt, 0.8 + Math.sin(progress * 12) * 0.1, 0.08);

        spawnExhaust(game);

        if (progress > 0.48) {
          game.cameraShake = Math.max(game.cameraShake, 0.28 + (progress - 0.48) * 2.4);
          game.flash = Math.max(game.flash, progress > 0.82 ? (progress - 0.82) * 3.8 : 0);
          if (Math.random() > 0.55) {
            spawnBurst(game, game.ship.x, game.ship.y, "#fff0df", 4);
          }
        }

        if (progress >= 1) {
          game.phase = "card";
          game.phaseElapsed = 0;
          setStats(makeStats(game));
          updatePhase("card");
          playOpenBloom();
        }
      }

      if (game.phase === "card") {
        game.ship.tilt = lerp(game.ship.tilt, 0, 0.1);
        game.pluto.y = lerp(game.pluto.y, GAME_HEIGHT * 0.36, 0.06);
        game.pluto.radius = lerp(game.pluto.radius, 104, 0.06);
        game.pluto.glow = lerp(game.pluto.glow, 0.72, 0.06);
      }

      for (const particle of game.particles) {
        particle.life += dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.985;
        particle.vy *= 0.986;
      }
      game.particles = game.particles.filter((particle) => particle.life < particle.ttl);

      context.save();
      const shakeX = (Math.random() - 0.5) * game.cameraShake * 12;
      const shakeY = (Math.random() - 0.5) * game.cameraShake * 12;
      context.translate(shakeX, shakeY);

      drawBackground(context, game, frameTime / 1000);

      if (game.phase === "crash" || game.phase === "card") {
        context.save();
        context.globalAlpha = 0.28 + game.pluto.glow * 0.24;
        drawCircle(context, game.pluto.x, game.pluto.y, game.pluto.radius * 1.34, "rgba(255,244,225,0.12)");
        context.restore();
        drawPlanetVisual(context, artRef.current, "pluto", game.pluto.x, game.pluto.y, game.pluto.radius, frameTime / 800, game.pluto.glow);
      }

      for (const obstacle of game.obstacles) {
        context.save();
        if (obstacle.hitFlash > 0) {
          context.globalAlpha = 0.55 + obstacle.hitFlash * 0.45;
        }
        drawPlanetVisual(context, artRef.current, obstacle.kind, obstacle.x, obstacle.y, obstacle.radius, obstacle.spin, obstacle.hitFlash * 0.8);
        context.restore();
      }

      drawParticles(context, game.particles);
      drawShipVisual(
        context,
        artRef.current,
        game.ship,
        game.phase === "boot" ? 0 : game.phase === "crash" ? 1 : 0.45 + clamp(game.flightElapsed / FLIGHT_DURATION, 0, 1) * 0.35,
      );

      if (game.phase !== "boot" && game.phase !== "card") {
        drawHud(context, game);
      }

      if (game.phase === "boot") {
        context.save();
        context.fillStyle = "rgba(255,255,255,0.85)";
        context.font = '11px "Silkscreen", monospace';
        context.fillText("CONTACT MISSION", 16, 18);
        context.fillStyle = "rgba(255,214,184,0.72)";
        context.fillText("PRESS ANY KEY TO START", 16, 34);
        context.restore();
      }

      if (game.phase === "crash") {
        context.save();
        context.globalAlpha = clamp(game.flash, 0, 0.92);
        context.fillStyle = "#fff8ef";
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        context.restore();
      }

      if (game.phase === "card") {
        context.save();
        const pulse = 0.12 + Math.sin(game.cardPulse * 1.4) * 0.03;
        context.strokeStyle = `rgba(255,245,232,${0.18 + pulse})`;
        context.strokeRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48);
        context.restore();
      }

      context.restore();

      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playFocusWhoosh, playOpenBloom, updatePhase]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className={`${styles.shell} ${pixelFont.className}`}>
      <div
        className={styles.topBar}
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
      >
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

      <div className={styles.stageWrap}>
        <div className={styles.viewport}>
          <div className={styles.screen}>
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              className={styles.canvas}
              aria-label="Playable contact page where you steer through planets and arrive at Pluto."
            />

            <div className={styles.bottomStrip}>
              {phase === "boot" ? (
                <div className={styles.bottomRow}>
                  <a
                    href={CONTACT_DETAILS.candy}
                    target="_blank"
                    rel="noreferrer"
                    onMouseEnter={playHoverChime}
                    className={styles.bottomUtilityLink}
                  >
                    return to candy castle
                  </a>
                </div>
              ) : phase !== "card" ? (
                <div className={styles.bottomRow}>
                  <div className={styles.bottomSpacer} />
                  <div className={styles.controlsCopy}>
                    <div>wasd / arrows</div>
                    <div>dodge planets</div>
                  </div>
                </div>
              ) : null}
            </div>

            {phase === "boot" ? (
              <div className={styles.bootOverlay}>
                <div className={styles.bootPanel}>
                  <h1 className={styles.bootTitle}>
                    <span>Dodge planets to make it to Pluto.</span>
                    <span>Reward: Chloe&apos;s contact info!</span>
                  </h1>
                  <p className={styles.bootBody}>WASD/arrow keys to move</p>
                  <div className={styles.bootActions}>
                    <button
                      type="button"
                      onClick={restartGame}
                      onMouseEnter={playHoverChime}
                      className={styles.bootButton}
                    >
                      begin mission
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {phase === "launch" ? (
              <div className={styles.launchOverlay}>
                <div className={styles.launchChip}>
                  thrusters warming
                </div>
              </div>
            ) : null}

            <div className={styles.cardDock}>
              <div
                className={`${styles.cardPanel} ${phase === "card" ? styles.cardPanelVisible : styles.cardPanelHidden}`}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardIdentityRow}>
                    <div className={styles.cardIdentity}>
                      <h2 className={styles.cardTitle}>CHLOE KANG</h2>
                      <p className={styles.cardEmail}>{CONTACT_DETAILS.email}</p>
                    </div>

                    {stats ? (
                      <div className={styles.cardStats}>
                        <div className={styles.cardStatChip}>
                          <span>threads</span>
                          <strong>{stats.dodges}</strong>
                        </div>
                        <div className={styles.cardStatChip}>
                          <span>close calls</span>
                          <strong>{stats.nearMisses}</strong>
                        </div>
                        <div className={styles.cardStatChip}>
                          <span>hull left</span>
                          <strong>{stats.integrityLeft}%</strong>
                        </div>
                        <div className={styles.cardStatChip}>
                          <span>time held</span>
                          <strong>{stats.survivedSeconds}s</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.cardActionGrid}>
                    <a
                      href={`mailto:${CONTACT_DETAILS.email}`}
                      onMouseEnter={playHoverChime}
                      className={styles.cardPrimaryAction}
                    >
                      send signal
                    </a>
                    <button
                      type="button"
                      onClick={copyEmail}
                      onMouseEnter={playHoverChime}
                      className={styles.cardSecondaryAction}
                    >
                      {copyState === "copied" ? "address copied" : copyState === "failed" ? "copy failed" : "copy address"}
                    </button>
                  </div>

                  <div className={styles.cardLinkRow}>
                    {SOCIAL_LINKS.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        onMouseEnter={playHoverChime}
                        className={styles.cardMiniLink}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>

                  <div className={styles.cardFooterRow}>
                    <button
                      type="button"
                      onClick={restartGame}
                      onMouseEnter={playHoverChime}
                      className={styles.cardFooterButton}
                    >
                      rerun mission
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
