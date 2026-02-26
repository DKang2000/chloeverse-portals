"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const W = 400;
const H = 225;
const LW = 200;
const LH = 113;
const DEV = process.env.NODE_ENV !== "production";
const MANIFEST_PATH = "/contact/mission_v6/manifest.json";
const STAMP = "CONTACT MISSION";
const INTERNAL_VERSION = "v6.11.4";
const SOUND_RECT = { x: W - 64, y: 8, w: 58, h: 16 };
const SOUND_FONT_SCALE = 1;
const SOUND_PAD_X = 4;
const SOUND_PAD_Y = 2;
const INTRO_TIMING_MS = { pad: 1200, ignite: 800, ascent: 2000, blend: 1200 } as const;
const PLANET_HOLD_TIGHTEN = 0.88;
const EXPLOSION_BREATH_MS = 120;
const MAX_GLOW_ALPHA = 0.82;
const CARD_DISPLAY_SCALE = 1;
const CORRIDOR_FLOW = { x: 0, y: 1 } as const;
const PAINTED_BONK_FRAME_COUNT = 8;
const PAINTED_BONK_TOTAL_MS = 180;
const PAINTED_BONK_FRAME_MS = PAINTED_BONK_TOTAL_MS / PAINTED_BONK_FRAME_COUNT;
const PAINTED_BONK_OVERLAP_MS = 40;
const PAINTED_EXPLOSION_DUR_MS = 1400;
const PAINTED_EXPLOSION_FRAME_COUNT = 12;
const PAINTED_EXPLOSION_FRAME_MS = PAINTED_EXPLOSION_DUR_MS / PAINTED_EXPLOSION_FRAME_COUNT;
const PAINTED_EXPLOSION_TOTAL_MS = PAINTED_EXPLOSION_DUR_MS;
const PAINTED_EXPLOSION_PERSIST_MS = PAINTED_EXPLOSION_DUR_MS;
const PAINTED_CRASH_FREEZE_MS = 260;
const MIN_EXP_BEFORE_CARD_MS = 650;
const PAINTED_CARD_POP_START_SCALE = 0.28125;
const CORRIDOR_MIST_ALPHA_CAP = 0.16;

const CONTACT = {
  name: "Chloe Kang",
  email: "ugcbychloekang@gmail.com",
  instagram: "https://instagram.com/imchloekang",
  tiktok: "https://www.tiktok.com/@imchloekang",
  linkedin: "https://www.linkedin.com/in/chloekang",
  x: "https://x.com/imchloekang",
  portals: "/",
  candy: "https://imchloekang.com",
} as const;

const PLANETS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
type Planet = (typeof PLANETS)[number];
type Phase = "prestart" | "loading" | "countdown" | "liftoff" | "montage" | "crash" | "explosion" | "card";
type BgMode = "PRESTART" | "PAINTED_LAUNCH" | "PAINTED_CORRIDOR" | "PIXEL";
type HoverId = "soundToggle" | "openEmail" | "copyEmail" | "social1" | "social2" | "social3" | "social4" | "backToPortals" | "candyCastle" | null;
type ActionId = Exclude<HoverId, "soundToggle" | null>;
type ScreenHitboxId = Exclude<HoverId, null>;
type SceneKey = "launch_pad" | "liftoff" | "atmosphere" | "deep_space" | Planet | "explosion_bg" | "card_bg";
type ProceduralPlanet = "mercury" | "venus" | "pluto";
type IntroStateName = "INTRO_PAD" | "INTRO_IGNITE" | "INTRO_ASCENT" | "INTRO_BLEND_TO_CORRIDOR";

interface Rect { x: number; y: number; w: number; h: number; }
interface ManifestRaw {
  sceneAtlas: { path: string; frameW: number; frameH: number; cols: number; rows: number; order: string[]; frameIndices?: Record<string, number> };
  fxAtlas: { path: string; tile: number; cols: number; rows: number; tiles: Record<string, number> };
  scenes?: Record<string, number>;
  frame_indices?: Record<string, number>;
  frameIndices?: Record<string, number>;
  timingsMs?: Partial<{ countdownTotal: number; liftoffToSpace: number; planetHold: number; planetXFade: number; crash: number; explosion: number }>;
  card?: { hitboxes?: Partial<Record<ActionId, Rect>> };
}
interface ManifestResolved {
  raw: ManifestRaw;
  sceneName: Record<SceneKey, string>;
  sceneIndex: Record<string, number>;
  times: { countdownTotal: number; liftoffToSpace: number; planetHold: number; planetXFade: number; crash: number; explosion: number };
  hitboxes: Record<ActionId, Rect>;
}
interface Assets { manifest: ManifestResolved; scenes: HTMLImageElement; fx: HTMLImageElement; }
type PaintedImage = HTMLImageElement | ImageBitmap;
type PaintedLaunchLayerId = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
type PaintedCorridorLayerId = "L0" | "L1" | "L2" | "L3";
interface PaintedLayerSet {
  launch: Record<PaintedLaunchLayerId, PaintedImage>;
  corridor: Record<PaintedCorridorLayerId, PaintedImage>;
  pluto: PaintedImage;
  bonkFrames: PaintedImage[];
  explosionFrames: Array<PaintedImage | null>;
  explosionLoadedCount: number;
  explosionLoadErrors: string[];
}
interface Particle { kind: "trail" | "smoke" | "dust" | "spark"; x: number; y: number; vx: number; vy: number; g: number; size: number; life: number; max: number; alpha: number; rot: number; spin: number; front: boolean; tile?: string; color?: string; }
interface ImpactDust { x: number; y: number; vx: number; vy: number; life: number; ttl: number; size: number; color: string; }
interface MusicState {
  ctx: AudioContext | null;
  master: GainNode | null;
  timer: number | null;
  nextTime: number;
  step: number;
  noise: AudioBuffer | null;
}
interface RocketPose { x: number; y: number; rot: number; size: number; exhaust: number; thrust: boolean; visible: boolean; }
interface Timeline { phase: Phase; elapsed: number; local: number; planetIndex: number; planetLocal: number; }
interface MontageVignetteInfo { x: number; y: number; w: number; h: number; centerX: number; centerY: number; approach: number; hold: number; exit: number; alpha: number; radius: number; }
interface PlanetSprite { name: string; canvas: HTMLCanvasElement; w: number; h: number; alphaPx: number; palette: [number, number, number][]; }
interface PlanetFlybyInfo { planet: Planet; drawX: number; drawY: number; drawW: number; drawH: number; centerX: number; centerY: number; u: number; approach: number; hold: number; exit: number; scale: number; spriteAlphaPx: number; spriteReady: boolean; }

const PLANET_CROPS: Partial<Record<Planet, Rect>> = {
  earth: { x: 149, y: 0, w: 200, h: 200 },
  mars: { x: 147, y: 0, w: 200, h: 200 },
  jupiter: { x: 20, y: 0, w: 220, h: 180 },
  saturn: { x: 0, y: 0, w: 300, h: 200 },
  uranus: { x: 66, y: 0, w: 200, h: 200 },
  neptune: { x: 83, y: 0, w: 200, h: 200 },
};

const isLaunchPhase = (phase: Phase): boolean => (
  phase === "countdown" || phase === "liftoff"
);

const isCorridorPhase = (phase: Phase): boolean => (
  phase === "montage"
  || phase === "crash"
  || phase === "explosion"
  || phase === "card"
);

const getBgMode = (phase: Phase, paintedMode: boolean, assetsReady: boolean): BgMode => {
  if (phase === "prestart") return "PRESTART";
  if (!paintedMode || !assetsReady) return "PIXEL";
  if (isLaunchPhase(phase)) return "PAINTED_LAUNCH";
  if (isCorridorPhase(phase)) return "PAINTED_CORRIDOR";
  return "PIXEL";
};

const PLANET_SAMPLE_CROPS: Record<ProceduralPlanet, Rect> = {
  mercury: { x: 70, y: 0, w: 240, h: 180 },
  venus: { x: 90, y: 0, w: 240, h: 180 },
  pluto: { x: 90, y: 0, w: 240, h: 180 },
};

const CARD_PANEL_RECT: Rect = { x: 20, y: 18, w: 360, h: 182 };
const CARD_ACTION_RECTS: Record<ActionId, Rect> = {
  openEmail: { x: 18, y: 84, w: 154, h: 30 },
  copyEmail: { x: 188, y: 84, w: 154, h: 30 },
  social1: { x: 92, y: 116, w: 32, h: 32 },
  social2: { x: 140, y: 116, w: 32, h: 32 },
  social3: { x: 188, y: 116, w: 32, h: 32 },
  social4: { x: 236, y: 116, w: 32, h: 32 },
  backToPortals: { x: 18, y: 152, w: 164, h: 24 },
  candyCastle: { x: 188, y: 152, w: 154, h: 24 },
};

const DEFAULT_HITBOXES: Record<ActionId, Rect> = {
  openEmail: { x: 40, y: 80, w: 150, h: 28 }, copyEmail: { x: 210, y: 80, w: 150, h: 28 },
  social1: { x: 70, y: 118, w: 34, h: 34 }, social2: { x: 130, y: 118, w: 34, h: 34 },
  social3: { x: 190, y: 118, w: 34, h: 34 }, social4: { x: 250, y: 118, w: 34, h: 34 },
  backToPortals: { x: 40, y: 160, w: 140, h: 34 }, candyCastle: { x: 200, y: 160, w: 160, h: 34 },
};

const FONT: Record<string, number[]> = {
  " ":[0,0,0,0,0,0,0],"!":[4,4,4,4,4,0,4],".":[0,0,0,0,0,4,0],":":[0,4,0,0,4,0,0],"/":[1,2,4,8,16,0,0],"-":[0,0,0,31,0,0,0],"+":[0,4,4,31,4,4,0],"(":[2,4,8,8,8,4,2],")":[8,4,2,2,2,4,8],"@":[14,17,23,21,23,16,14],"_":[0,0,0,0,0,0,31],"?":[14,17,1,2,4,0,4],
  "0":[14,17,19,21,25,17,14],"1":[4,12,4,4,4,4,14],"2":[14,17,1,2,4,8,31],"3":[30,1,1,14,1,1,30],"4":[2,6,10,18,31,2,2],"5":[31,16,16,30,1,1,30],"6":[14,16,16,30,17,17,14],"7":[31,1,2,4,8,8,8],"8":[14,17,17,14,17,17,14],"9":[14,17,17,15,1,2,28],
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,14],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31]
};
for (const ch of "abcdefghijklmnopqrstuvwxyz") FONT[ch] = FONT[ch.toUpperCase()];

const UI_GLYPH_W = 6;
const UI_GLYPH_H = 8;
const UI_GLYPH_ADV = 7;
const uiBits6 = (rows: string[]): number[] => rows.map((row) => {
  let bits = 0;
  for (let i = 0; i < UI_GLYPH_W; i += 1) if (row[i] === "#") bits |= 1 << (UI_GLYPH_W - 1 - i);
  return bits;
});
const uiFrom5x7 = (glyph?: number[]): number[] => {
  const src = glyph ?? FONT["?"];
  const rows = new Array<number>(UI_GLYPH_H).fill(0);
  for (let r = 0; r < 7; r += 1) {
    const bits5 = src[r] ?? 0;
    let bits6 = 0;
    for (let c = 0; c < 5; c += 1) if ((bits5 >> (4 - c)) & 1) bits6 |= 1 << (UI_GLYPH_W - 1 - c);
    // Slight horizontal embolden while preserving the final spacing column.
    rows[r] = bits6 | ((bits6 >> 1) & 0b111110);
  }
  return rows;
};
const UI_FONT: Record<string, number[]> = (() => {
  const out: Record<string, number[]> = {};
  for (const [k, g] of Object.entries(FONT)) out[k] = uiFrom5x7(g);
  out[" "] = new Array<number>(UI_GLYPH_H).fill(0);
  // Readability-critical overrides (true 6x8 UI glyphs, thicker and clearer).
  out["@"] = uiBits6([
    ".####.",
    "##..##",
    "##.###",
    "##.#.#",
    "##.###",
    "##....",
    ".####.",
    "...##.",
  ]);
  out["."] = uiBits6([
    "......",
    "......",
    "......",
    "......",
    "......",
    ".##...",
    ".##...",
    "......",
  ]);
  out[":"] = uiBits6([
    "......",
    ".##...",
    ".##...",
    "......",
    ".##...",
    ".##...",
    "......",
    "......",
  ]);
  out["-"] = uiBits6([
    "......",
    "......",
    "......",
    "####..",
    "####..",
    "......",
    "......",
    "......",
  ]);
  out["_"] = uiBits6([
    "......",
    "......",
    "......",
    "......",
    "......",
    "......",
    "######",
    "......",
  ]);
  out["/"] = uiBits6([
    "....##",
    "...##.",
    "..##..",
    "..##..",
    ".##...",
    "##....",
    "##....",
    "......",
  ]);
  out["1"] = uiBits6([
    "..##..",
    ".###..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    ".####.",
    "......",
  ]);
  out["I"] = uiBits6([
    ".####.",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    ".####.",
    "......",
  ]);
  out["?"] = uiBits6([
    ".####.",
    "##..##",
    "...##.",
    "..##..",
    "..##..",
    "......",
    "..##..",
    "......",
  ]);
  for (const ch of "abcdefghijklmnopqrstuvwxyz") out[ch] = out[ch.toUpperCase()];
  return out;
})();

const SCENE_ALIAS: Record<SceneKey, string[]> = {
  launch_pad:["launch_pad","launchpad","launch","pad"], liftoff:["liftoff","blastoff"], atmosphere:["atmosphere","atmo"], deep_space:["deep_space","deepspace","space"],
  mercury:["mercury"], venus:["venus"], earth:["earth"], mars:["mars"], jupiter:["jupiter"], saturn:["saturn"], uranus:["uranus"], neptune:["neptune"], pluto:["pluto"],
  explosion_bg:["explosion_bg","explosion"], card_bg:["card_bg","card","contact"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;
const easeInOut = (t: number) => { const x = clamp(t, 0, 1); return x < 0.5 ? 4*x*x*x : 1 - ((-2*x + 2) ** 3) / 2; };
const easeBack = (t: number) => { const x = clamp(t, 0, 1); const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3*(x-1)**3 + c1*(x-1)**2; };
const smoothstep = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const hit = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const sx = (n: number) => Math.round((n / W) * LW);
const sy = (n: number) => Math.round((n / H) * LH);
const sw = (n: number) => Math.max(1, Math.round((n / W) * LW));
const sh = (n: number) => Math.max(1, Math.round((n / H) * LH));
const rectL = (r: Rect): Rect => ({ x: sx(r.x), y: sy(r.y), w: sw(r.w), h: sh(r.h) });
const textW = (s: string, sc = 1) => (s.length ? (s.length * 6 - 1) * sc : 0);
const uiTextW = (s: string, sc = 1) => (s.length ? (((s.length - 1) * UI_GLYPH_ADV) + UI_GLYPH_W) * sc : 0);
const uiTextWTracked = (s: string, sc = 1, tracking = 0) => (s.length ? (uiTextW(s, sc) + (s.length - 1) * tracking * sc) : 0);
const PAINTED_LAUNCH_LAYER_PATHS = [
  ["L0", "/contact/painted/launch/L0_sky_gradient_1280x720.png"],
  ["L1", "/contact/painted/launch/L1_clouds_far_1280x720.png"],
  ["L2", "/contact/painted/launch/L2_clouds_mid_1280x720.png"],
  ["L3", "/contact/painted/launch/L3_clouds_near_1280x720.png"],
  ["L4", "/contact/painted/launch/L4_haze_horizon_1280x720.png"],
  ["L5", "/contact/painted/launch/L5_sparkles_stars_1280x720.png"],
  ["L6", "/contact/painted/launch/L6_ground_launchpad_1280x720.png"],
] as const satisfies ReadonlyArray<readonly [PaintedLaunchLayerId, string]>;
const PAINTED_CORRIDOR_LAYER_PATHS = [
  ["L0", "/contact/painted/corridor/L0_base_tunnel_1280x720.png"],
  ["L1", "/contact/painted/corridor/L1_nebula_wisps_1280x720.png"],
  ["L2", "/contact/painted/corridor/L2_mist_haze_1280x720.png"],
  ["L3", "/contact/painted/corridor/L3_streaks_stars_1280x720.png"],
] as const satisfies ReadonlyArray<readonly [PaintedCorridorLayerId, string]>;
const PAINTED_PLUTO_PATH = "/contact/painted/pluto/PLUTO_320.png";
const PAINTED_BONK_FRAME_PATHS = Array.from(
  { length: PAINTED_BONK_FRAME_COUNT },
  (_, i) => `/contact/painted/fx/bonk/BONK_${String(i).padStart(2, "0")}.png`,
);
const PAINTED_EXPLOSION_FRAME_PATHS = Array.from(
  { length: PAINTED_EXPLOSION_FRAME_COUNT },
  (_, i) => `/contact/painted/fx/explosion/EXPLOSION_${String(i).padStart(2, "0")}.png`,
);
type PaintedAssetManifestEntry =
  | { kind: "launch"; id: PaintedLaunchLayerId; src: string }
  | { kind: "corridor"; id: PaintedCorridorLayerId; src: string }
  | { kind: "pluto"; id: "PLUTO"; src: string }
  | { kind: "bonk"; id: number; src: string }
  | { kind: "explosion"; id: number; src: string };
const PAINTED_ASSET_MANIFEST: readonly PaintedAssetManifestEntry[] = [
  ...PAINTED_LAUNCH_LAYER_PATHS.map(([id, src]) => ({ kind: "launch" as const, id, src })),
  ...PAINTED_CORRIDOR_LAYER_PATHS.map(([id, src]) => ({ kind: "corridor" as const, id, src })),
  { kind: "pluto", id: "PLUTO", src: PAINTED_PLUTO_PATH },
  ...PAINTED_BONK_FRAME_PATHS.map((src, i) => ({ kind: "bonk" as const, id: i, src })),
  ...PAINTED_EXPLOSION_FRAME_PATHS.map((src, i) => ({ kind: "explosion" as const, id: i, src })),
];
const PAINTED_ASSET_TOTAL_COUNT = PAINTED_ASSET_MANIFEST.length;
const paintedImageCache = new Map<string, Promise<PaintedImage>>();
type PaintedPreloadSnapshot = {
  total: number;
  loaded: number; // settled count (success + error)
  succeeded: number;
  errors: string[];
  ready: boolean;
  started: boolean;
  layers: PaintedLayerSet | null;
};
const paintedPreloadListeners = new Set<() => void>();
let paintedPreloadSnapshotState: PaintedPreloadSnapshot = {
  total: PAINTED_ASSET_TOTAL_COUNT,
  loaded: 0,
  succeeded: 0,
  errors: [],
  ready: false,
  started: false,
  layers: null,
};
let paintedPreloadPromise: Promise<void> | null = null;
const emitPaintedPreloadSnapshot = (): void => {
  for (const listener of paintedPreloadListeners) listener();
};
const setPaintedPreloadSnapshot = (patch: Partial<PaintedPreloadSnapshot>): void => {
  paintedPreloadSnapshotState = {
    ...paintedPreloadSnapshotState,
    ...patch,
  };
  emitPaintedPreloadSnapshot();
};
const paintedPreloadStore = {
  subscribe(listener: () => void): () => void {
    paintedPreloadListeners.add(listener);
    return () => {
      paintedPreloadListeners.delete(listener);
    };
  },
  getSnapshot(): PaintedPreloadSnapshot {
    return paintedPreloadSnapshotState;
  },
  start(): Promise<void> {
    if (paintedPreloadPromise) return paintedPreloadPromise;
    if (paintedPreloadSnapshotState.ready && paintedPreloadSnapshotState.layers) {
      return Promise.resolve();
    }
    setPaintedPreloadSnapshot({
      started: true,
      total: PAINTED_ASSET_TOTAL_COUNT,
    });
    paintedPreloadPromise = loadPaintedLayers((info) => {
      setPaintedPreloadSnapshot({
        total: info.totalCount,
        loaded: info.attemptedCount,
        succeeded: info.loadedCount,
        errors: info.errors,
        ready: info.attemptedCount === info.totalCount && info.errors.length === 0,
      });
    })
      .then((layers) => {
        setPaintedPreloadSnapshot({
          started: true,
          total: PAINTED_ASSET_TOTAL_COUNT,
          loaded: PAINTED_ASSET_TOTAL_COUNT,
          succeeded: PAINTED_ASSET_TOTAL_COUNT,
          errors: [],
          ready: true,
          layers,
        });
      })
      .catch((err) => {
        const snap = paintedPreloadSnapshotState;
        const errors = Array.isArray((err as { paintedAssetErrors?: unknown })?.paintedAssetErrors)
          ? ((err as { paintedAssetErrors?: string[] }).paintedAssetErrors ?? [])
          : snap.errors;
        const total = typeof (err as { paintedTotalCount?: unknown })?.paintedTotalCount === "number"
          ? ((err as { paintedTotalCount?: number }).paintedTotalCount ?? PAINTED_ASSET_TOTAL_COUNT)
          : PAINTED_ASSET_TOTAL_COUNT;
        const loaded = typeof (err as { paintedAttemptedCount?: unknown })?.paintedAttemptedCount === "number"
          ? ((err as { paintedAttemptedCount?: number }).paintedAttemptedCount ?? snap.loaded)
          : snap.loaded;
        const succeeded = typeof (err as { paintedLoadedCount?: unknown })?.paintedLoadedCount === "number"
          ? ((err as { paintedLoadedCount?: number }).paintedLoadedCount ?? snap.succeeded)
          : snap.succeeded;
        setPaintedPreloadSnapshot({
          started: true,
          total,
          loaded,
          succeeded,
          errors,
          ready: loaded === total && errors.length === 0,
          layers: null,
        });
      })
      .finally(() => {
        paintedPreloadPromise = null;
      });
    return paintedPreloadPromise;
  },
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.decoding = "async"; img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Failed to load image: ${src}`)); img.src = src;
  });
}
function loadImageCachedBitmapFirst(src: string): Promise<PaintedImage> {
  const cached = paintedImageCache.get(src);
  if (cached) return cached;
  const task = (async (): Promise<PaintedImage> => {
    if (typeof window !== "undefined" && typeof window.createImageBitmap === "function") {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return await window.createImageBitmap(blob);
      } catch {
        return loadImage(src);
      }
    }
    return loadImage(src);
  })();
  paintedImageCache.set(src, task);
  return task;
}
function loadPaintedLayers(
  onProgress?: (info: { attemptedCount: number; loadedCount: number; totalCount: number; errors: string[] }) => void,
): Promise<PaintedLayerSet> {
  const totalCount = PAINTED_ASSET_TOTAL_COUNT;
  const errors: string[] = [];
  let attemptedCount = 0;
  let loadedCount = 0;
  const emit = (): void => onProgress?.({ attemptedCount, loadedCount, totalCount, errors: [...errors] });
  return (async () => {
    const launch = {} as Record<PaintedLaunchLayerId, PaintedImage>;
    const corridor = {} as Record<PaintedCorridorLayerId, PaintedImage>;
    const bonkFrames = new Array<PaintedImage | null>(PAINTED_BONK_FRAME_COUNT).fill(null);
    const explosionFrames = new Array<PaintedImage | null>(PAINTED_EXPLOSION_FRAME_COUNT).fill(null);
    let pluto: PaintedImage | null = null;
    emit();
    await Promise.allSettled(PAINTED_ASSET_MANIFEST.map(async (entry) => {
      try {
        const img = await loadImageCachedBitmapFirst(entry.src);
        loadedCount += 1;
        if (entry.kind === "launch") launch[entry.id] = img;
        else if (entry.kind === "corridor") corridor[entry.id] = img;
        else if (entry.kind === "pluto") pluto = img;
        else if (entry.kind === "bonk") bonkFrames[entry.id] = img;
        else explosionFrames[entry.id] = img;
      } catch {
        errors.push(entry.src);
      }
      attemptedCount += 1;
      emit();
    }));
    if (
      errors.length > 0
      || !pluto
      || bonkFrames.some((img) => !img)
      || explosionFrames.some((img) => !img)
      || PAINTED_LAUNCH_LAYER_PATHS.some(([id]) => !launch[id])
      || PAINTED_CORRIDOR_LAYER_PATHS.some(([id]) => !corridor[id])
    ) {
      const err = new Error("painted_assets_failed") as Error & {
        paintedAssetErrors?: string[];
        paintedAttemptedCount?: number;
        paintedLoadedCount?: number;
        paintedTotalCount?: number;
      };
      err.paintedAssetErrors = [...errors];
      err.paintedAttemptedCount = attemptedCount;
      err.paintedLoadedCount = loadedCount;
      err.paintedTotalCount = totalCount;
      throw err;
    }
    return {
      launch,
      corridor,
      pluto,
      bonkFrames: bonkFrames as PaintedImage[],
      explosionFrames,
      explosionLoadedCount: PAINTED_EXPLOSION_FRAME_COUNT,
      explosionLoadErrors: [],
    };
  })();
}
function paintedImageDims(img: PaintedImage): { w: number; h: number } {
  return { w: img.width, h: img.height };
}
function rng(seed: number): () => number { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff); }
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, sc = 1): void {
  ctx.fillStyle = color; let cx = Math.round(x); const yy = Math.round(y);
  for (const ch of text) { const g = FONT[ch] ?? FONT[ch.toUpperCase()] ?? FONT["?"]; for (let r = 0; r < 7; r += 1) { const bits = g[r] ?? 0; for (let c = 0; c < 5; c += 1) if ((bits >> (4-c)) & 1) ctx.fillRect(cx + c*sc, yy + r*sc, sc, sc); } cx += 6 * sc; }
}
function drawTextShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, shadow: string, sc = 1): void { drawText(ctx, text, x + sc, y + sc, shadow, sc); drawText(ctx, text, x, y, color, sc); }
function drawTextUi(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, sc = 1): void {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  const yy = Math.round(y);
  for (const ch of text) {
    const g = UI_FONT[ch] ?? UI_FONT[ch.toUpperCase()] ?? UI_FONT["?"];
    for (let r = 0; r < UI_GLYPH_H; r += 1) {
      const bits = g[r] ?? 0;
      for (let c = 0; c < UI_GLYPH_W; c += 1) if ((bits >> (UI_GLYPH_W - 1 - c)) & 1) ctx.fillRect(cx + c * sc, yy + r * sc, sc, sc);
    }
    cx += UI_GLYPH_ADV * sc;
  }
}
function drawTextUiTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, sc = 1, tracking = 0): void {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  const yy = Math.round(y);
  for (const ch of text) {
    const g = UI_FONT[ch] ?? UI_FONT[ch.toUpperCase()] ?? UI_FONT["?"];
    for (let r = 0; r < UI_GLYPH_H; r += 1) {
      const bits = g[r] ?? 0;
      for (let c = 0; c < UI_GLYPH_W; c += 1) if ((bits >> (UI_GLYPH_W - 1 - c)) & 1) ctx.fillRect(cx + c * sc, yy + r * sc, sc, sc);
    }
    cx += (UI_GLYPH_ADV + tracking) * sc;
  }
}
function drawTextUiShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, shadow: string, sc = 1): void {
  drawTextUi(ctx, text, x + sc, y + sc, shadow, sc);
  drawTextUi(ctx, text, x, y, color, sc);
}

function resolveManifest(raw: ManifestRaw): ManifestResolved {
  const sceneIndex: Record<string, number> = {}; raw.sceneAtlas.order.forEach((n,i)=>sceneIndex[n]=i); Object.entries(raw.scenes ?? {}).forEach(([k,v])=>sceneIndex[k]=v);
  const keys = [...new Set([...raw.sceneAtlas.order, ...Object.keys(raw.scenes ?? {})])]; const byNorm = new Map(keys.map((k)=>[norm(k), k] as const));
  const pick = (k: SceneKey, fb: string) => { for (const c of SCENE_ALIAS[k]) if (keys.includes(c)) return c; for (const c of SCENE_ALIAS[k]) { const m = byNorm.get(norm(c)); if (m) return m; } return fb; };
  const first = raw.sceneAtlas.order[0] ?? "launch_pad"; const deep = pick("deep_space", first);
  const sceneName: Record<SceneKey, string> = { launch_pad: pick("launch_pad", first), liftoff: pick("liftoff", first), atmosphere: pick("atmosphere", pick("liftoff", first)), deep_space: deep, mercury: pick("mercury", deep), venus: pick("venus", deep), earth: pick("earth", deep), mars: pick("mars", deep), jupiter: pick("jupiter", deep), saturn: pick("saturn", deep), uranus: pick("uranus", deep), neptune: pick("neptune", deep), pluto: pick("pluto", deep), explosion_bg: pick("explosion_bg", deep), card_bg: pick("card_bg", raw.sceneAtlas.order[raw.sceneAtlas.order.length - 1] ?? deep) };
  return {
    raw, sceneName, sceneIndex,
    times: {
      countdownTotal: INTRO_TIMING_MS.pad + INTRO_TIMING_MS.ignite,
      liftoffToSpace: INTRO_TIMING_MS.ascent + INTRO_TIMING_MS.blend,
      planetHold: Math.max(820, Math.round((raw.timingsMs?.planetHold ?? 1000) * PLANET_HOLD_TIGHTEN)),
      planetXFade: raw.timingsMs?.planetXFade ?? 120,
      crash: raw.timingsMs?.crash ?? 900,
      explosion: raw.timingsMs?.explosion ?? 900,
    },
    hitboxes: { openEmail: raw.card?.hitboxes?.openEmail ?? DEFAULT_HITBOXES.openEmail, copyEmail: raw.card?.hitboxes?.copyEmail ?? DEFAULT_HITBOXES.copyEmail, social1: raw.card?.hitboxes?.social1 ?? DEFAULT_HITBOXES.social1, social2: raw.card?.hitboxes?.social2 ?? DEFAULT_HITBOXES.social2, social3: raw.card?.hitboxes?.social3 ?? DEFAULT_HITBOXES.social3, social4: raw.card?.hitboxes?.social4 ?? DEFAULT_HITBOXES.social4, backToPortals: raw.card?.hitboxes?.backToPortals ?? DEFAULT_HITBOXES.backToPortals, candyCastle: raw.card?.hitboxes?.candyCastle ?? DEFAULT_HITBOXES.candyCastle },
  };
}

export default function ContactMissionV6() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const rafPausedRef = useRef(false);
  const assetsRef = useRef<Assets | null>(null);
  const cardBufRef = useRef<HTMLCanvasElement | null>(null);
  const cardCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cardBufHiRef = useRef<HTMLCanvasElement | null>(null);
  const cardCtxHiRef = useRef<CanvasRenderingContext2D | null>(null);
  const textHiBufRef = useRef<HTMLCanvasElement | null>(null);
  const textHiCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const planetSpritesRef = useRef<Record<string, PlanetSprite> | null>(null);
  const cleanedFxTilesRef = useRef<Record<string, HTMLCanvasElement>>({});
  const socialIconSpritesRef = useRef<Partial<Record<ActionId, HTMLCanvasElement>>>({});
  const errRef = useRef<string | null>(null);
  const debugOnRef = useRef(false);
  const paintedModeRef = useRef(false);
  const paintedLayersRef = useRef<PaintedLayerSet | null>(null);
  const paintedLoadStartedRef = useRef(false);
  const didStartPreloadRef = useRef(false);
  const preloadImgsRef = useRef<HTMLImageElement[]>([]);
  const paintedLoadErrorRef = useRef<string | null>(null);
  const paintedDebugLabelRef = useRef(false);
  const paintedAssetsAttemptedCountRef = useRef(0);
  const paintedAssetsLoadedCountRef = useRef(0);
  const paintedAssetsTotalCountRef = useRef(PAINTED_ASSET_TOTAL_COUNT);
  const paintedAssetsErrorsRef = useRef<string[]>([]);
  const paintedExplosionLoadedCountRef = useRef(0);
  const paintedExplosionLoadErrorsRef = useRef<string[]>([]);
  const rafNowMsRef = useRef<number | null>(null);
  const paintedBonkStartMsRef = useRef<number | null>(null);
  const paintedExplosionStartMsRef = useRef<number | null>(null);
  const paintedExplosionActiveRef = useRef(false);
  const paintedExplosionFrameIdxRef = useRef(0);
  const paintedExplosionStartedFromRef = useRef<"NONE" | "PLUTO" | "E">("NONE");
  const paintedImpactFxRef = useRef<{
    bonkStartMs: number | null;
    explosionStartMs: number | null;
    explosionActive: boolean;
    explosionFrameIdx: number;
    explosionStartedFrom: "NONE" | "PLUTO" | "E";
  }>({
    bonkStartMs: null,
    explosionStartMs: null,
    explosionActive: false,
    explosionFrameIdx: 0,
    explosionStartedFrom: "NONE",
  });
  const pausedRef = useRef(false);
  const stepOnceRef = useRef(false);
  const simElapsedRef = useRef(0);
  const lastRealRef = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const reachedCardRef = useRef(false);
  const guardErrorRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>("prestart");
  const hoverRef = useRef<HoverId>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });
  const cardHitboxesScreenRef = useRef<Partial<Record<ScreenHitboxId, Rect>>>({});
  const actionsRef = useRef<Array<{ id: ActionId; rect: Rect; onClick: () => void | Promise<void> }>>([]);
  const cardEnterRef = useRef<number | null>(null);
  const forceCardRef = useRef(false);
  const cardScaleRef = useRef(1);
  const soundOnRef = useRef(false);
  const userGestureRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Array<{ x: number; y: number; s: number; k: number; c: number; size: 1 | 2 }>>([]);
  const trailAccRef = useRef(0);
  const smokeAccRef = useRef(0);
  const countdownShownRef = useRef<number | null>(null);
  const crashOnceRef = useRef(false);
  const explosionOnceRef = useRef(false);
  const toastRef = useRef<{ text: string; startMs: number; durMs: number } | null>(null);
  const forceRedrawRef = useRef(false);
  const skipRequestedRef = useRef(false);
  const rocketXRef = useRef<number>(-20);
  const rocketYRef = useRef<number>(H * 0.45);
  const rocketVXRef = useRef<number>(40);
  const rocketVYRef = useRef<number>(0);
  const rocketRotRef = useRef<number>(0);
  const rocketInitRef = useRef<boolean>(false);
  const rocketAnchorXRef = useRef<number>(154);
  const rocketAnchorYRef = useRef<number>(94);
  const corridorEntryElapsedRef = useRef<number | null>(null);
  const inCorridorRef = useRef(false);
  const corridorLatchRef = useRef(false);
  const exhaustAccRef = useRef<number>(0);
  const crashTriggeredRef = useRef<boolean>(false);
  const crashStartElapsedRef = useRef<number | null>(null);
  const impactAnchorRef = useRef<{ cx: number; cy: number } | null>(null);
  const crashImpactXRef = useRef<number>(Math.round(W * 0.62));
  const crashImpactYRef = useRef<number>(Math.round(H * 0.45));
  const shakeAmpRef = useRef<number>(0);
  const shakeTRef = useRef<number>(0);
  const wobbleRef = useRef<number>(0);
  const wobbleVRef = useRef<number>(0);
  const impactFreezeUntilRef = useRef<number>(0);
  const bonkStartRef = useRef<number>(0);
  const bonkActiveRef = useRef<boolean>(false);
  const explosionAnimStartRef = useRef<number | null>(null);
  const cardPopStartRef = useRef<number | null>(null);
  const paintedCardPopStartMsRef = useRef<number | null>(null);
  const dustRef = useRef<ImpactDust[]>([]);
  const dbgPlanetNameRef = useRef<string>("-");
  const dbgPlanetURef = useRef<number>(0);
  const dbgPlanetXRef = useRef<number>(0);
  const dbgPlanetWRef = useRef<number>(0);
  const dbgSpriteReadyRef = useRef<boolean>(false);
  const dbgSpriteAlphaPxRef = useRef<number>(0);
  const dbgSpritePreviewRef = useRef<PlanetSprite | null>(null);
  const dbgIntroStateRef = useRef<IntroStateName>("INTRO_PAD");
  const dbgBgModeRef = useRef<BgMode>("PRESTART");
  const dbgGradeAppliedRef = useRef(false);
  const dbgMistCapRef = useRef(0);
  const dbgDrawCorridorModeRef = useRef<"PAINTED" | "LEGACY">("LEGACY");
  const dbgPaintedCorridorProofRef = useRef(false);
  const dbgCorridorLatchReasonRef = useRef<"SPEED" | "FLYBY" | "MODE" | "NONE">("NONE");
  const dbgCorridorAlphaRef = useRef<number>(0);
  const prodGuardLoggedRef = useRef<string | null>(null);
  const musicRef = useRef<MusicState>({ ctx: null, master: null, timer: null, nextTime: 0, step: 0, noise: null });
  const lifecycleAbortRef = useRef<AbortController | null>(null);
  const activeTimeoutsRef = useRef<Set<number>>(new Set());
  const activeIntervalsRef = useRef<Set<number>>(new Set());
  const paintedPreloadSnapshot = useSyncExternalStore(
    paintedPreloadStore.subscribe,
    paintedPreloadStore.getSnapshot,
    paintedPreloadStore.getSnapshot,
  );

  useEffect(() => {
    const snap = paintedPreloadSnapshot;
    paintedLoadStartedRef.current = snap.started;
    paintedAssetsTotalCountRef.current = snap.total;
    paintedAssetsAttemptedCountRef.current = snap.loaded;
    paintedAssetsLoadedCountRef.current = snap.succeeded;
    paintedAssetsErrorsRef.current = [...snap.errors];
    if (snap.layers) {
      paintedLayersRef.current = snap.layers;
      paintedExplosionLoadedCountRef.current = snap.layers.explosionLoadedCount;
      paintedExplosionLoadErrorsRef.current = [...snap.layers.explosionLoadErrors];
      paintedLoadErrorRef.current = null;
    } else if (snap.started && snap.loaded >= snap.total && snap.errors.length > 0) {
      paintedLoadErrorRef.current = "painted_assets_failed";
      paintedExplosionLoadedCountRef.current = 0;
      paintedExplosionLoadErrorsRef.current = snap.errors.filter((url) => url.includes("/fx/explosion/"));
    }
    forceRedrawRef.current = true;
  }, [paintedPreloadSnapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = "pixelated";
    canvas.style.touchAction = "none";

    const lctx = ctx;
    lctx.imageSmoothingEnabled = false;
    let dead = false;
    let alive = true;
    lifecycleAbortRef.current?.abort();
    const effectAbort = new AbortController();
    lifecycleAbortRef.current = effectAbort;
    activeTimeoutsRef.current.clear();
    activeIntervalsRef.current.clear();
    const setTrackedTimeout = (fn: () => void, ms: number): number | null => {
      if (dead || !alive || effectAbort.signal.aborted) return null;
      const id = window.setTimeout(() => {
        activeTimeoutsRef.current.delete(id);
        if (dead || !alive || effectAbort.signal.aborted) return;
        fn();
      }, ms);
      activeTimeoutsRef.current.add(id);
      return id;
    };
    const setTrackedInterval = (fn: () => void, ms: number): number | null => {
      if (dead || !alive || effectAbort.signal.aborted) return null;
      const id = window.setInterval(() => {
        if (dead || !alive || effectAbort.signal.aborted) return;
        fn();
      }, ms);
      activeIntervalsRef.current.add(id);
      return id;
    };
    const clearTrackedInterval = (id: number | null): void => {
      if (id === null) return;
      activeIntervalsRef.current.delete(id);
      window.clearInterval(id);
    };
    const clearTrackedTimers = (): void => {
      for (const id of activeTimeoutsRef.current) window.clearTimeout(id);
      activeTimeoutsRef.current.clear();
      for (const id of activeIntervalsRef.current) window.clearInterval(id);
      activeIntervalsRef.current.clear();
    };
    const loadImageAbortable = (src: string, signal: AbortSignal): Promise<HTMLImageElement> => (
      new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const img = new Image();
        img.decoding = "async";
        const cleanup = (): void => {
          img.onload = null;
          img.onerror = null;
          signal.removeEventListener("abort", onAbort);
        };
        const onAbort = (): void => {
          cleanup();
          try { img.src = ""; } catch {}
          reject(new DOMException("Aborted", "AbortError"));
        };
        img.onload = () => {
          cleanup();
          resolve(img);
        };
        img.onerror = () => {
          cleanup();
          reject(new Error(`Failed to load image: ${src}`));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        img.src = src;
      })
    );
    const hardResetCanvasState = (g: CanvasRenderingContext2D): void => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.filter = "none";
      g.imageSmoothingEnabled = false;
      g.shadowBlur = 0;
      g.shadowColor = "transparent";
      g.lineWidth = 1;
    };
    const applyDeepSpaceGrade = (g: CanvasRenderingContext2D): void => {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "multiply";
      g.globalAlpha = 0.76;
      g.fillStyle = "rgb(2, 4, 12)";
      g.fillRect(0, 0, W, H);
      g.restore();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      const vignette = g.createRadialGradient(
        Math.round(W * 0.5),
        Math.round(H * 0.45),
        Math.round(Math.min(W, H) * 0.18),
        Math.round(W * 0.5),
        Math.round(H * 0.45),
        Math.round(Math.max(W, H) * 0.72),
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.50)");
      g.fillStyle = vignette;
      g.fillRect(0, 0, W, H);
      g.restore();
    };
    const drawLegacySpeedLinesLayer = (
      tSec: number,
      alpha: number,
      opts?: { highlightAlphaMul?: number; blurPx?: number; blurAlpha?: number; composite?: GlobalCompositeOperation },
    ): void => {
      const a = Math.min(1.0, smoothstep(clamp(alpha, 0, 1)));
      if (a <= 0) return;
      const nowMs = rafNowMsRef.current ?? Math.round(tSec * 1000);
      const lineCount = 7;
      const highlightAlphaMul = opts?.highlightAlphaMul ?? 1;
      const drawStrokeSet = (alphaScale = 1): void => {
        for (let i = 0; i < lineCount; i += 1) {
          const phase = i * 0.73;
          const typeRoll = ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;
          const y = ((LH + 10) - ((tSec * (34 + i * 2.6) + i * 13) % (LH + 28))) | 0;
          const xBase = 8 + ((i * 19 + Math.floor(Math.sin(tSec * 1.35 + phase) * 5)) % Math.max(1, LW - 24));
          const twinkle = 0.82 + 0.18 * Math.sin(nowMs * 0.004 + i * 0.91);
          const alphaMul = clamp(a * twinkle * highlightAlphaMul * alphaScale, 0, 1);
          lctx.globalAlpha = alphaMul;
          if (typeRoll < 0.45) {
            const len = 8 + ((i * 7 + Math.floor(Math.abs(Math.sin(tSec * 1.8 + phase)) * 15)) % 15);
            lctx.fillRect(Math.round(xBase), Math.round(y), len, 1);
          } else if (typeRoll < 0.70) {
            const len = 20 + ((i * 13 + Math.floor(Math.abs(Math.cos(tSec * 1.15 + phase)) * 29)) % 29);
            lctx.fillRect(Math.round(xBase), Math.round(y), len, 1);
          } else if (typeRoll < 0.90) {
            const clusterCount = 2 + (i % 2);
            for (let c = 0; c < clusterCount; c += 1) {
              const cx = Math.round(xBase + c * (3 + (i % 3)) + Math.sin(tSec * 2.6 + c + phase) * 2);
              const cy = Math.round(y + (((i + c) % 3) - 1));
              const s = ((i + c) % 4 === 0) ? 2 : 1;
              lctx.fillRect(cx, cy, s, s);
            }
          } else {
            const len = 84 + ((i * 31 + Math.floor(Math.abs(Math.sin(tSec * 0.75 + phase)) * 46)) % 47);
            const tailLen = Math.max(18, Math.round(len * 0.34));
            lctx.fillRect(Math.round(xBase), Math.round(y), len, 1);
            lctx.globalAlpha = clamp(alphaMul * 0.4, 0, 1);
            lctx.fillRect(Math.round(xBase - tailLen), Math.round(y), tailLen, 1);
            lctx.globalAlpha = clamp(alphaMul, 0, 1);
            lctx.fillRect(Math.round(xBase + len - 1), Math.round(y - 1), 2, 2);
          }
        }
      };

      lctx.save();
      lctx.fillStyle = "#cfe6ff";
      if (opts?.composite) lctx.globalCompositeOperation = opts.composite;
      drawStrokeSet(1);
      if (opts?.blurPx && opts.blurPx > 0 && (opts.blurAlpha ?? 0) > 0) {
        lctx.save();
        if (opts?.composite) lctx.globalCompositeOperation = opts.composite;
        lctx.filter = `blur(${opts.blurPx}px)`;
        lctx.fillStyle = "#f4fbff";
        drawStrokeSet(clamp(opts.blurAlpha ?? 0, 0, 1));
        lctx.filter = "none";
        lctx.restore();
      }
      lctx.restore();
    };
    const drawCorridorNebulaSpecklePass = (tSec: number, opts?: { offsetX?: number; offsetY?: number }): void => {
      const nowMs = rafNowMsRef.current ?? Math.round(tSec * 1000);
      const clusters = Math.min(22, starsRef.current.length);
      const offsetX = Math.round(opts?.offsetX ?? 0);
      const offsetY = Math.round(opts?.offsetY ?? 0);
      if (clusters <= 0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "screen";
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < clusters; i += 1) {
        const s = starsRef.current[i];
        const cx = Math.round(((s.x / LW) * W) + Math.sin(tSec * (0.18 + s.c * 0.12) + s.k) * 6 + offsetX);
        const cy = Math.round(((s.y / LH) * H) + Math.cos(tSec * (0.14 + s.c * 0.09) + s.k * 0.7) * 5 + offsetY);
        const dotCount = 3 + (((i * 7) % 5));
        const baseAlpha = 0.05 + (((i * 11) % 4) / 100);
        const tw = 0.82 + 0.18 * Math.sin(nowMs * 0.004 + s.k);
        for (let d = 0; d < dotCount; d += 1) {
          const ang = (d / Math.max(1, dotCount)) * Math.PI * 2 + s.k * 0.7 + i * 0.09;
          const rad = 2 + (((d * 5 + i) % 11)) + Math.sin(tSec * 0.9 + d + s.k) * 1.2;
          const px = Math.round(cx + Math.cos(ang) * rad);
          const py = Math.round(cy + Math.sin(ang) * rad);
          const palette = (i + d) % 3;
          ctx.fillStyle = palette === 0 ? "#f5fbff" : (palette === 1 ? "#d9efff" : "#e9ddff");
          ctx.globalAlpha = clamp(baseAlpha * tw, 0, 0.09);
          ctx.fillRect(px, py, ((i + d) % 5 === 0) ? 2 : 1, 1);
        }
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
    };
    const drawLegacySpeedLineSparklePass = (tSec: number, intensity: number): void => {
      drawLegacySpeedLinesLayer(
        tSec,
        0.12 + smoothstep(clamp(intensity, 0, 1)) * 0.68,
        {
          composite: "screen",
          highlightAlphaMul: 0.68,
          blurAlpha: 0.22,
          blurPx: 0.8,
        },
      );
    };
    const drawPaintedCorridorSparklePass = (
      tSec: number,
      intensity: number,
      opts?: { offsetX?: number; offsetY?: number; alpha?: number },
    ): void => {
      const layers = paintedLayersRef.current?.corridor;
      if (!layers) return;
      const offsetX = Math.round(opts?.offsetX ?? 0);
      const offsetY = Math.round(opts?.offsetY ?? 0);
      const alphaMul = clamp(opts?.alpha ?? 1, 0, 1);
      if (alphaMul <= 0) return;
      const l3BaseClamp = Math.min(1.0, 0.88 + 0.12 * smoothstep(clamp(intensity, 0, 1)));
      const l3Twinkle = 0.88 + 0.12 * Math.sin(tSec * 4 + 1.17);
      const l3Alpha = clamp(l3BaseClamp * l3Twinkle, 0, 1);
      if (l3Alpha <= 0) return;
      const dw = Math.max(1, Math.round(W * 1.02));
      const dh = Math.max(1, Math.round(H * 1.02));
      const cx = Math.round((W - dw) / 2) + offsetX;
      const cy = Math.round((H - dh) / 2) + offsetY;
      const l3ScrollY = tSec * 220;
      const xDrift = Math.round(Math.sin(tSec * 0.18 + 2.1) * 3);
      const x = cx + xDrift;
      const dy = ((Math.floor(l3ScrollY) % H) + H) % H;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp(0.68 * alphaMul * l3Alpha, 0, 1);
      drawPaintedCover(layers.L3, x, cy - dy, dw, dh);
      drawPaintedCover(layers.L3, x, cy + H - dy, dw, dh);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp(0.22 * alphaMul, 0, 1);
      ctx.filter = "blur(0.8px)";
      drawPaintedCover(layers.L3, x, cy - dy, dw, dh);
      drawPaintedCover(layers.L3, x, cy + H - dy, dw, dh);
      ctx.filter = "none";
      ctx.restore();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;
    };
    const applyCorridorGradeIfLatched = (opts?: {
      mode?: "painted" | "legacy";
      tSec?: number;
      intensity?: number;
      offsetX?: number;
      offsetY?: number;
      alpha?: number;
    }): void => {
      if (!corridorLatchRef.current) return;
      dbgGradeAppliedRef.current = true;
      dbgMistCapRef.current = Math.max(dbgMistCapRef.current, CORRIDOR_MIST_ALPHA_CAP);
      applyDeepSpaceGrade(ctx);
      const tSec = opts?.tSec ?? ((rafNowMsRef.current ?? 0) / 1000);
      const intensity = opts?.intensity ?? 0.3;
      drawCorridorNebulaSpecklePass(tSec, {
        offsetX: opts?.offsetX ?? 0,
        offsetY: opts?.offsetY ?? 0,
      });
      if (opts?.mode === "painted") {
        drawPaintedCorridorSparklePass(tSec, intensity, {
          offsetX: opts?.offsetX ?? 0,
          offsetY: opts?.offsetY ?? 0,
          alpha: opts?.alpha ?? 1,
        });
      } else if (opts?.mode === "legacy") {
        drawLegacySpeedLineSparklePass(tSec, intensity);
      }
    };
    const updateCorridorLatch = (
      state: {
        speedSignal?: boolean;
        flybySignal?: boolean;
        modeSignal?: boolean;
      },
    ): void => {
      if (corridorLatchRef.current) {
        inCorridorRef.current = true;
        return;
      }
      const speedSignal = !!state.speedSignal;
      const flybySignal = !!state.flybySignal;
      const modeSignal = !!state.modeSignal;
      let reason: "SPEED" | "FLYBY" | "MODE" | "NONE" = "NONE";
      if (speedSignal) reason = "SPEED";
      else if (flybySignal) reason = "FLYBY";
      else if (modeSignal) reason = "MODE";
      if (reason === "NONE") return;
      corridorLatchRef.current = true;
      inCorridorRef.current = true;
      if (dbgCorridorLatchReasonRef.current === "NONE") dbgCorridorLatchReasonRef.current = reason;
    };

    const query = new URLSearchParams(window.location.search);
    const debugQueryOn = query.get("debug") === "1";
    const paintedParam = query.get("painted");
    const pixelParam = query.get("pixel");
    const paintedMode = paintedParam === "1"
      ? true
      : (pixelParam === "1" || paintedParam === "0")
        ? false
        : true;
    debugOnRef.current = debugQueryOn;
    paintedModeRef.current = paintedMode;
    paintedDebugLabelRef.current = paintedMode && debugQueryOn;
    const debugToggleAllowed = debugQueryOn;

    const seedStars = (): void => {
      const r = rng(0x12345678); const arr: Array<{ x: number; y: number; s: number; k: number; c: number; size: 1 | 2 }> = [];
      for (let i = 0; i < 86; i += 1) arr.push({ x: Math.floor(r()*LW), y: Math.floor(r()*(LH*0.78)), s: 3 + r()*16, k: r()*Math.PI*2, c: r(), size: r() > 0.86 ? 2 : 1 });
      starsRef.current = arr;
    };
    seedStars();

    const setCursor = (id: HoverId): void => { if (hoverRef.current === id) return; hoverRef.current = id; canvas.style.cursor = id ? "pointer" : "default"; };
    const resize = (): void => { const s = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H))); scaleRef.current = s; canvas.width = W; canvas.height = H; canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`; ctx.imageSmoothingEnabled = false; };
    const toInternal = (e: PointerEvent): { x: number; y: number } => {
      const r = canvas.getBoundingClientRect(); let x = ((e.clientX - r.left) / r.width) * W; let y = ((e.clientY - r.top) / r.height) * H;
      return { x, y };
    };
    if (!cardBufRef.current || !cardBufHiRef.current) {
      const cb = cardBufRef.current ?? document.createElement("canvas");
      cb.width = CARD_PANEL_RECT.w;
      cb.height = CARD_PANEL_RECT.h;
      const cc = cardCtxRef.current ?? cb.getContext("2d", { alpha: true });
      const chb = cardBufHiRef.current ?? document.createElement("canvas");
      chb.width = CARD_PANEL_RECT.w * 2;
      chb.height = CARD_PANEL_RECT.h * 2;
      const chc = cardCtxHiRef.current ?? chb.getContext("2d", { alpha: true });
      if (cc && chc) {
        cc.imageSmoothingEnabled = false;
        chc.imageSmoothingEnabled = false;
        cardBufRef.current = cb;
        cardCtxRef.current = cc;
        cardBufHiRef.current = chb;
        cardCtxHiRef.current = chc;
      }
    }
    if (!textHiBufRef.current) {
      const tb = document.createElement("canvas");
      tb.width = 8;
      tb.height = 8;
      const tg = tb.getContext("2d", { alpha: true });
      if (tg) {
        tg.imageSmoothingEnabled = false;
        textHiBufRef.current = tb;
        textHiCtxRef.current = tg;
      }
    }
    const showToast = (text: string, ms = 1000): void => {
      toastRef.current = { text, startMs: simElapsedRef.current, durMs: ms };
      forceRedrawRef.current = true;
      ensureRaf();
    };
    const ensureTextHiSize = (w2: number, h2: number): CanvasRenderingContext2D | null => {
      const tb = textHiBufRef.current;
      const tg = textHiCtxRef.current;
      if (!tb || !tg) return null;
      if (tb.width !== w2) tb.width = w2;
      if (tb.height !== h2) tb.height = h2;
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.imageSmoothingEnabled = false;
      tg.clearRect(0, 0, tb.width, tb.height);
      return tg;
    };
    const drawDisplayTextHiToCard = (
      dst: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      color: string,
      scale: number,
      opts?: { pad?: number; shadow?: string },
    ): void => {
      const tb = textHiBufRef.current;
      const pad = opts?.pad ?? 2;
      const tw = textW(text, scale);
      const th = 7 * scale;
      const w2 = Math.max(2, (tw + pad * 2) * 2);
      const h2 = Math.max(2, (th + pad * 2) * 2);
      const tg = ensureTextHiSize(w2, h2);
      if (!tb || !tg) {
        drawTextPx(dst, text, x, y, color, scale, undefined);
        return;
      }
      const tx = pad * 2;
      const ty = pad * 2;
      const scHi = scale * 2;
      const shadow = opts?.shadow ?? "rgba(8,16,28,0.65)";
      drawText(tg, text, tx + 2, ty + 2, shadow, scHi);
      drawText(tg, text, tx, ty, color, scHi);
      dst.imageSmoothingEnabled = false;
      dst.drawImage(tb, 0, 0, tb.width, tb.height, Math.round(x - pad), Math.round(y - pad), tb.width / 2, tb.height / 2);
    };
    const drawUiTextHiToCard = (
      dst: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      color: string,
      scale: number,
      opts?: { pad?: number; shadow?: string; tracking?: number; shadowOnly?: boolean },
    ): void => {
      const tb = textHiBufRef.current;
      const pad = opts?.pad ?? 2;
      const tracking = opts?.tracking ?? 0;
      const tw = uiTextWTracked(text, scale, tracking);
      const th = UI_GLYPH_H * scale;
      const w2 = Math.max(2, (tw + pad * 2) * 2);
      const h2 = Math.max(2, (th + pad * 2) * 2);
      const tg = ensureTextHiSize(w2, h2);
      if (!tb || !tg) {
        if (opts?.shadowOnly) drawTextUiTracked(dst, text, x + 1, y + 1, opts?.shadow ?? "#ffffff33", scale, tracking);
        drawTextUiTracked(dst, text, x, y, color, scale, tracking);
        return;
      }
      const tx = pad * 2;
      const ty = pad * 2;
      const scHi = scale * 2;
      const shadow = opts?.shadow ?? "rgba(255,255,255,0.18)";
      if (opts?.shadowOnly) drawTextUiTracked(tg, text, tx + 2, ty + 2, shadow, scHi, tracking);
      else drawTextUiTracked(tg, text, tx + 2, ty + 2, shadow, scHi, tracking);
      drawTextUiTracked(tg, text, tx, ty, color, scHi, tracking);
      dst.imageSmoothingEnabled = false;
      dst.drawImage(tb, 0, 0, tb.width, tb.height, Math.round(x - pad), Math.round(y - pad), tb.width / 2, tb.height / 2);
    };
    const getSoundMainRect = (): Rect => ({
      x: clamp(W - (Math.max(uiTextW("OFF", SOUND_FONT_SCALE), uiTextW("ON", SOUND_FONT_SCALE)) + SOUND_PAD_X * 2 + 4) - 6, 6, W - 6),
      y: clamp(SOUND_RECT.y, 6, H - 18),
      w: Math.max(uiTextW("OFF", SOUND_FONT_SCALE), uiTextW("ON", SOUND_FONT_SCALE)) + SOUND_PAD_X * 2 + 4,
      h: UI_GLYPH_H * SOUND_FONT_SCALE + SOUND_PAD_Y * 2 + 2,
    });
    const resolveCardHoverAt = (x: number, y: number): HoverId => {
      const boxes = cardHitboxesScreenRef.current;
      const soundRect = boxes.soundToggle ?? getSoundMainRect();
      if (hit(soundRect, x, y)) return "soundToggle";
      if (phaseRef.current !== "card") return null;
      for (const action of actionsRef.current) {
        const rect = boxes[action.id];
        if (rect && hit(rect, x, y)) return action.id;
      }
      return null;
    };

    const getAudio = (): AudioContext | null => {
      if (!userGestureRef.current || !soundOnRef.current) return null;
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      if (!audioRef.current) audioRef.current = new Ctor();
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
      return audioRef.current;
    };
    const beep = (f: number, ms: number, type: OscillatorType, g: number, f2?: number): void => {
      const a = getAudio(); if (!a) return; const t = a.currentTime; const o = a.createOscillator(); const gg = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2 !== undefined) o.frequency.linearRampToValueAtTime(f2, t + ms/1000);
      gg.gain.setValueAtTime(Math.max(0.0001, g), t); gg.gain.exponentialRampToValueAtTime(0.0001, t + ms/1000); o.connect(gg); gg.connect(a.destination); o.start(t); o.stop(t + ms/1000);
    };
    const uiBeep = () => beep(700, 70, "square", 0.03, 860);
    const tickBeep = () => beep(430, 85, "triangle", 0.03, 520);
    const bonkBeep = () => { beep(220, 150, "square", 0.05, 120); beep(120, 110, "triangle", 0.03, 85); };
    const boomBeep = () => { beep(660, 90, "sawtooth", 0.05, 240); beep(240, 240, "triangle", 0.04, 75); };
    const ensureMusicNoise = (a: AudioContext): AudioBuffer => {
      const mr = musicRef.current;
      if (mr.noise && mr.ctx === a) return mr.noise;
      const len = Math.max(1, Math.floor(a.sampleRate * 0.25));
      const b = a.createBuffer(1, len, a.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      mr.noise = b;
      return b;
    };
    const stopMusic = (): void => {
      const mr = musicRef.current;
      if (mr.timer !== null) {
        clearTrackedInterval(mr.timer);
        mr.timer = null;
      }
      if (mr.master) {
        try {
          const t = mr.ctx?.currentTime ?? 0;
          mr.master.gain.cancelScheduledValues(t);
          mr.master.gain.setTargetAtTime(0.0001, t, 0.02);
        } catch {}
        const old = mr.master;
        setTrackedTimeout(() => { try { old.disconnect(); } catch {} }, 120);
      }
      mr.master = null;
      mr.ctx = null;
      mr.nextTime = 0;
      mr.step = 0;
    };
    const startMusic = (): void => {
      if (!soundOnRef.current || !userGestureRef.current) return;
      const a = getAudio();
      if (!a) return;
      const mr = musicRef.current;
      if (mr.timer !== null && mr.ctx === a && mr.master) return;
      stopMusic();
      const master = a.createGain();
      const mixLP = a.createBiquadFilter();
      mixLP.type = "lowpass";
      mixLP.frequency.value = 3400;
      mixLP.Q.value = 0.5;
      master.gain.value = 0.032;
      master.connect(mixLP);
      mixLP.connect(a.destination);
      mr.ctx = a;
      mr.master = master;
      mr.nextTime = a.currentTime + 0.04;
      mr.step = 0;
      const bpm = 176;
      const stepDur = 60 / bpm / 4;
      const lookAhead = 0.16;
      const leadBars: readonly (readonly number[])[] = [
        [69,72,76,72, 69,72,76,77, 76,72,69,72, 64,67,69,-1],
        [69,72,76,72, 69,72,76,77, 81,77,76,72, 69,67,64,-1],
        [76,77,81,77, 76,72,69,72, 76,77,81,84, 81,77,76,-1],
        [69,72,76,72, 69,72,76,77, 76,72,69,72, 64,67,69,-1],
      ];
      const arpBars: readonly (readonly number[])[] = [
        [69,72,76,72, 69,72,76,72, 69,72,76,72, 69,72,76,72],
        [65,69,72,69, 65,69,72,69, 65,69,72,69, 65,69,72,69],
        [67,71,74,71, 67,71,74,71, 67,71,74,71, 67,71,74,71],
        [69,72,76,72, 69,72,76,72, 69,72,76,72, 69,72,76,72],
      ];
      const bassBars: readonly (readonly number[])[] = [
        [45,-1,40,-1,45,-1,40,-1,45,-1,40,-1,45,-1,40,-1],
        [41,-1,36,-1,41,-1,36,-1,41,-1,36,-1,41,-1,36,-1],
        [43,-1,38,-1,43,-1,38,-1,43,-1,38,-1,43,-1,38,-1],
        [45,-1,40,-1,45,-1,40,-1,45,-1,40,-1,45,-1,40,-1],
      ];
      const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
      const pulseWave = (duty: number): PeriodicWave => {
        const n = 16;
        const re = new Float32Array(n);
        const im = new Float32Array(n);
        for (let k = 1; k < n; k += 1) {
          const amp = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
          im[k] = amp;
        }
        return a.createPeriodicWave(re, im, { disableNormalization: false });
      };
      const leadWave = pulseWave(0.125);
      const arpWave = pulseWave(0.25);
      const scheduleKick = (t: number): void => {
        if (!mr.master) return;
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(155, t);
        o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g).connect(mr.master);
        o.start(t); o.stop(t + 0.16);
      };
      const scheduleSnare = (t: number): void => {
        if (!mr.master) return;
        const src = a.createBufferSource();
        src.buffer = ensureMusicNoise(a);
        const bp = a.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1700;
        bp.Q.value = 0.9;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.075, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        src.connect(bp).connect(g).connect(mr.master);
        src.start(t); src.stop(t + 0.1);
      };
      const scheduleHat = (t: number, accent = false): void => {
        if (!mr.master) return;
        const src = a.createBufferSource();
        src.buffer = ensureMusicNoise(a);
        const hp = a.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = accent ? 4200 : 5600;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(accent ? 0.05 : 0.03, t + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.04 : 0.024));
        src.connect(hp).connect(g).connect(mr.master);
        src.start(t); src.stop(t + 0.05);
      };
      const scheduleBass = (t: number, midi: number, gate = 0.14): void => {
        if (!mr.master) return;
        const o = a.createOscillator();
        const f = a.createBiquadFilter();
        const g = a.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(midiHz(midi), t);
        o.frequency.linearRampToValueAtTime(midiHz(midi) * 0.99, t + gate);
        f.type = "lowpass";
        f.frequency.setValueAtTime(900, t);
        f.frequency.exponentialRampToValueAtTime(340, t + gate);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.065, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + gate);
        o.connect(f).connect(g).connect(mr.master);
        o.start(t); o.stop(t + gate + 0.02);
      };
      const scheduleArp = (t: number, midi: number, accent = false): void => {
        if (!mr.master) return;
        const o = a.createOscillator();
        const f = a.createBiquadFilter();
        const g = a.createGain();
        o.setPeriodicWave(arpWave);
        o.frequency.setValueAtTime(midiHz(midi), t);
        f.type = "lowpass";
        f.frequency.value = accent ? 2400 : 1800;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(accent ? 0.028 : 0.02, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        o.connect(f).connect(g).connect(mr.master);
        o.start(t); o.stop(t + 0.08);
      };
      const scheduleLead = (t: number, midi: number): void => {
        if (!mr.master) return;
        const o = a.createOscillator();
        const f = a.createBiquadFilter();
        const g = a.createGain();
        const lfo = a.createOscillator();
        const lfoG = a.createGain();
        o.setPeriodicWave(leadWave);
        o.frequency.setValueAtTime(midiHz(midi), t);
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(6, t);
        lfoG.gain.setValueAtTime(4, t);
        lfo.connect(lfoG).connect(o.frequency);
        f.type = "lowpass";
        f.frequency.value = 3200;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + 0.003);
        g.gain.setValueAtTime(0.024, t + 0.038);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(f).connect(g).connect(mr.master);
        lfo.start(t); o.start(t);
        lfo.stop(t + 0.15); o.stop(t + 0.16);
      };
      const scheduleStep = (step: number, t: number): void => {
        const s16 = step % 16;
        const bar = Math.floor(step / 16) % 4;
        // Light arcade drums.
        if (s16 === 0 || s16 === 8) scheduleKick(t);
        if (s16 === 4 || s16 === 12) scheduleSnare(t);
        if ((s16 % 2) === 0) scheduleHat(t, s16 === 0 || s16 === 8);

        const bassMidi = bassBars[bar]?.[s16] ?? -1;
        if (bassMidi >= 0) scheduleBass(t, bassMidi, 0.13);

        const arpMidi = arpBars[bar]?.[s16] ?? -1;
        if (arpMidi >= 0) scheduleArp(t, arpMidi, (s16 % 4) === 0);

        const leadMidi = leadBars[bar]?.[s16] ?? -1;
        if (leadMidi >= 0) scheduleLead(t, leadMidi);
        if (s16 === 15 && (bar === 1 || bar === 2)) {
          const nextLead = leadBars[(bar + 1) % 4]?.[0] ?? -1;
          if (nextLead >= 0) scheduleLead(t + stepDur * 0.68, Math.max(48, nextLead - 2));
        }
      };
      const tick = (): void => {
        if (!soundOnRef.current || !mr.master || mr.ctx !== a) { stopMusic(); return; }
        while (mr.nextTime < a.currentTime + lookAhead) {
          scheduleStep(mr.step, mr.nextTime);
          mr.nextTime += stepDur;
          mr.step += 1;
        }
      };
      tick();
      mr.timer = setTrackedInterval(tick, 45);
    };

    const sceneSrc = (a: Assets, logical: SceneKey): Rect | null => {
      const key = a.manifest.sceneName[logical]; const idx = a.manifest.sceneIndex[key]; if (idx === undefined) return null;
      const sa = a.manifest.raw.sceneAtlas; return { x: (idx % sa.cols) * sa.frameW, y: Math.floor(idx / sa.cols) * sa.frameH, w: sa.frameW, h: sa.frameH };
    };
    const fxSrc = (a: Assets, name: string): Rect | null => {
      const idx = a.manifest.raw.fxAtlas.tiles[name]; if (idx === undefined) return null; const fa = a.manifest.raw.fxAtlas;
      return { x: (idx % fa.cols) * fa.tile, y: Math.floor(idx / fa.cols) * fa.tile, w: fa.tile, h: fa.tile };
    };
    const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      return c;
    };
    const buildCleanRocketTiles = (fxImg: HTMLImageElement, manifest: ManifestResolved): Record<string, HTMLCanvasElement> => {
      const out: Record<string, HTMLCanvasElement> = {};
      const fa = manifest.raw.fxAtlas;
      const tileSize = fa.tile;
      const keys = Object.keys(fa.tiles).filter((k) => /rocket/i.test(k));
      for (const key of keys) {
        const idx = fa.tiles[key];
        if (typeof idx !== "number") continue;
        const sx0 = (idx % fa.cols) * tileSize;
        const sy0 = Math.floor(idx / fa.cols) * tileSize;
        const rawTile = makeCanvas(tileSize, tileSize);
        const g = rawTile.getContext("2d", { willReadFrequently: true });
        if (!g) continue;
        g.imageSmoothingEnabled = false;
        g.drawImage(fxImg, sx0, sy0, tileSize, tileSize, 0, 0, tileSize, tileSize);
        const img = g.getImageData(0, 0, tileSize, tileSize);
        const data = img.data;
        const visited = new Uint8Array(tileSize * tileSize);
        const queue = new Int32Array(tileSize * tileSize);
        let qh = 0;
        let qt = 0;
        const isEdgeNearBlack = (x: number, y: number): boolean => {
          const i = (y * tileSize + x) * 4;
          const a = data[i + 3] ?? 0;
          if (a < 8) return false;
          const r = data[i] ?? 0;
          const g2 = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          return r <= 20 && g2 <= 20 && b <= 20;
        };
        const push = (x: number, y: number): void => {
          if (x < 0 || y < 0 || x >= tileSize || y >= tileSize) return;
          const p = y * tileSize + x;
          if (visited[p]) return;
          if (!isEdgeNearBlack(x, y)) return;
          visited[p] = 1;
          queue[qt++] = p;
        };
        for (let x = 0; x < tileSize; x += 1) { push(x, 0); push(x, tileSize - 1); }
        for (let y = 1; y < tileSize - 1; y += 1) { push(0, y); push(tileSize - 1, y); }
        while (qh < qt) {
          const p = queue[qh++];
          const x = p % tileSize;
          const y = Math.floor(p / tileSize);
          const i = p * 4;
          data[i + 3] = 0;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }
        g.putImageData(img, 0, 0);
        const check = g.getImageData(0, 0, tileSize, tileSize).data;
        let alphaCount = 0;
        let minX = tileSize;
        let minY = tileSize;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < tileSize; y += 1) {
          for (let x = 0; x < tileSize; x += 1) {
            const i = (y * tileSize + x) * 4;
            if ((check[i + 3] ?? 0) <= 8) continue;
            alphaCount += 1;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        const valid = alphaCount > 20 && maxX >= minX && maxY >= minY;
        if (!valid) {
          if (DEV) console.warn("CONTACT_MISSION_ROCKET_CLEAN_FALLBACK", key, { alphaCount });
          continue;
        }
        out[key] = rawTile;
      }
      return out;
    };
    const clampFrameCrop = (r: Rect): Rect => {
      const x = clamp(Math.round(r.x), 0, 399);
      const y = clamp(Math.round(r.y), 0, 224);
      const w = clamp(Math.round(r.w), 1, 400 - x);
      const h = clamp(Math.round(r.h), 1, 225 - y);
      return { x, y, w, h };
    };
    const countAlphaPx = (canvas2: HTMLCanvasElement): number => {
      const g = canvas2.getContext("2d", { willReadFrequently: true });
      if (!g) return 0;
      const data = g.getImageData(0, 0, canvas2.width, canvas2.height).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) count += 1;
      return count;
    };
    const makePlanetSpriteRecord = (name: Planet, canvas2: HTMLCanvasElement, palette: [number, number, number][]): PlanetSprite => ({
      name,
      canvas: canvas2,
      w: canvas2.width,
      h: canvas2.height,
      alphaPx: countAlphaPx(canvas2),
      palette,
    });
    const clampByte = (n: number) => clamp(Math.round(n), 0, 255);
    const paletteCss = (p: [number, number, number], mul = 1, add = 0): string =>
      `rgb(${clampByte(p[0] * mul + add)} ${clampByte(p[1] * mul + add)} ${clampByte(p[2] * mul + add)})`;
    const defaultPaletteFor = (planet: Planet): [number, number, number][] => {
      if (planet === "mercury") return [[180, 170, 160], [145, 138, 132], [110, 105, 100], [86, 82, 79], [212, 204, 193]];
      if (planet === "venus") return [[236, 214, 154], [211, 179, 110], [184, 148, 88], [140, 112, 68], [248, 236, 192]];
      if (planet === "earth") return [[60, 113, 211], [50, 155, 99], [223, 236, 255], [22, 52, 118], [96, 183, 255]];
      if (planet === "mars") return [[204, 128, 86], [162, 96, 62], [120, 72, 46], [230, 162, 124], [94, 58, 40]];
      if (planet === "jupiter") return [[235, 206, 168], [210, 165, 122], [178, 132, 98], [136, 97, 76], [248, 230, 198]];
      if (planet === "saturn") return [[231, 212, 164], [203, 181, 131], [168, 148, 110], [130, 113, 84], [246, 236, 198]];
      if (planet === "uranus") return [[188, 236, 230], [132, 205, 197], [98, 170, 168], [72, 131, 138], [226, 255, 251]];
      if (planet === "neptune") return [[111, 152, 245], [75, 112, 209], [43, 76, 164], [28, 49, 112], [162, 195, 255]];
      return [[190, 216, 236], [143, 178, 204], [106, 138, 166], [78, 102, 126], [218, 239, 255]];
    };
    const buildPlanetSprites = (atlasImg: HTMLImageElement, manifest: ManifestResolved): Record<string, PlanetSprite> => {
      const atlasCanvas = makeCanvas(atlasImg.naturalWidth || atlasImg.width, atlasImg.naturalHeight || atlasImg.height);
      const atlasCtx = atlasCanvas.getContext("2d", { willReadFrequently: true });
      if (atlasCtx) {
        atlasCtx.imageSmoothingEnabled = false;
        atlasCtx.drawImage(atlasImg, 0, 0);
      }
      const cropByPlanet: Record<Planet, Rect> = {
        earth: { x: 140, y: 0, w: 220, h: 200 },
        mars: { x: 140, y: 0, w: 220, h: 200 },
        jupiter: { x: 0, y: 0, w: 260, h: 200 },
        saturn: { x: 0, y: 0, w: 320, h: 210 },
        uranus: { x: 120, y: 0, w: 220, h: 210 },
        neptune: { x: 120, y: 0, w: 220, h: 210 },
        mercury: { x: 80, y: 0, w: 240, h: 180 },
        venus: { x: 80, y: 0, w: 240, h: 180 },
        pluto: { x: 80, y: 0, w: 240, h: 180 },
      };
      const dither2x2 = [0, 2, 3, 1];
      const getFrameIndex = (name: string): number => {
        const raw = manifest.raw;
        const actual = (manifest.sceneName as Partial<Record<string, string>>)[name] ?? name;
        const names = [name, actual];
        for (const n of names) {
          const i = raw.sceneAtlas.frameIndices?.[n];
          if (typeof i === "number" && i >= 0) return i;
        }
        for (const n of names) {
          const i = raw.frame_indices?.[n];
          if (typeof i === "number" && i >= 0) return i;
        }
        for (const n of names) {
          const i = raw.frameIndices?.[n];
          if (typeof i === "number" && i >= 0) return i;
        }
        for (const n of names) {
          const idx = raw.sceneAtlas.order.indexOf(n);
          if (idx >= 0) return idx;
        }
        return -1;
      };
      const frameOrigin = (idx: number): { x: number; y: number } => {
        const cols = manifest.raw.sceneAtlas.cols || 5;
        const fw = manifest.raw.sceneAtlas.frameW || 400;
        const fh = manifest.raw.sceneAtlas.frameH || 225;
        return { x: (idx % cols) * fw, y: Math.floor(idx / cols) * fh };
      };
      const samplePalette = (planet: Planet): [number, number, number][] => {
        if (!atlasCtx) return defaultPaletteFor(planet);
        const idx = getFrameIndex(planet);
        if (idx < 0) return defaultPaletteFor(planet);
        const origin = frameOrigin(idx);
        const crop = clampFrameCrop(cropByPlanet[planet]);
        const sx0 = origin.x + crop.x;
        const sy0 = origin.y + crop.y;
        const sw0 = clamp(crop.w, 1, Math.max(1, atlasCanvas.width - sx0));
        const sh0 = clamp(crop.h, 1, Math.max(1, atlasCanvas.height - sy0));
        const data = atlasCtx.getImageData(sx0, sy0, sw0, sh0).data;
        const buckets = new Map<number, number>();
        for (let y = 0; y < sh0; y += Math.max(1, Math.floor(sh0 / 24))) {
          for (let x = 0; x < sw0; x += Math.max(1, Math.floor(sw0 / 30))) {
            const i = (y * sw0 + x) * 4;
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;
            if ((data[i + 3] ?? 0) < 8) continue;
            if (r + g + b < 18) continue;
            const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
            buckets.set(k, (buckets.get(k) ?? 0) + 1);
          }
        }
        const top = [...buckets.entries()].sort((a1, b1) => b1[1] - a1[1]).slice(0, 5).map(([k]) => {
          const r = (((k >> 8) & 0x0f) << 4) + 8;
          const g = (((k >> 4) & 0x0f) << 4) + 8;
          const b = ((k & 0x0f) << 4) + 8;
          return [r, g, b] as [number, number, number];
        });
        const fb = defaultPaletteFor(planet);
        while (top.length < 5) top.push(fb[top.length % fb.length]);
        return top.slice(0, 5);
      };
      const renderSphereSprite = (planet: Planet, palette: [number, number, number][], size: number): HTMLCanvasElement => {
        const c = makeCanvas(size, size);
        const g = c.getContext("2d");
        if (!g) return c;
        g.imageSmoothingEnabled = false;
        const r = Math.floor(size / 2) - 2;
        const cx = Math.floor(size / 2);
        const cy = Math.floor(size / 2);
        for (let y = 0; y < c.height; y += 1) {
          for (let x = 0; x < c.width; x += 1) {
            const nx = (x - cx) / Math.max(1, r);
            const ny = (y - cy) / Math.max(1, r);
            const dd = nx * nx + ny * ny;
            if (dd > 1) continue;
            const nz = Math.sqrt(Math.max(0, 1 - dd));
            let shade = clamp(0.15 + 0.85 * (0.6 * nz + 0.4 * (nx * -0.3 + ny * -0.6)), 0, 1);
            if (planet === "jupiter") shade = clamp(shade + Math.sin((y / size) * Math.PI * 9) * 0.06, 0, 1);
            if (planet === "venus") shade = clamp(shade + Math.sin((y / size) * Math.PI * 6) * 0.04 + 0.06, 0, 1);
            const dith = dither2x2[((y & 1) << 1) | (x & 1)] / 12 - 0.125;
            let band = Math.floor(clamp(shade + dith, 0, 0.999) * palette.length);
            if (planet === "jupiter") band = clamp(Math.floor(((y * 0.08 + shade * 3) % palette.length)), 0, palette.length - 1);
            const p = palette[clamp(band, 0, palette.length - 1)] ?? palette[0];
            let mul = 1;
            let add = 0;
            if (planet === "mercury") {
              const crater = Math.sin(x * 0.21 + y * 0.13) + Math.cos(y * 0.17);
              if (crater > 1.2 && ((x + y) & 1) === 0) mul = 0.72;
            }
            if (planet === "pluto") {
              if ((Math.sin(x * 0.31) + Math.cos(y * 0.23)) > 1.4 && ((x ^ y) & 1) === 0) add = 18;
            }
            g.fillStyle = paletteCss(p, mul, add);
            g.fillRect(x, y, 1, 1);
          }
        }
        if (planet === "venus") {
          g.save();
          g.globalAlpha = 0.16;
          g.fillStyle = "#f7e1a7";
          for (let i = 0; i < 18; i += 1) g.fillRect(6 + ((i * 7) % (size - 12)), 4 + ((i * 5 + 7) % (size - 10)), 1, 1);
          g.restore();
        }
        if (planet === "neptune") {
          g.save();
          g.globalAlpha = 0.14;
          g.fillStyle = "#8dc9ff";
          for (let i = 0; i < 20; i += 1) g.fillRect(8 + ((i * 9) % (size - 16)), 8 + ((i * 6) % (size - 16)), 1, 1);
          g.restore();
        }
        g.strokeStyle = "rgba(220,235,255,0.35)";
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx + 0.5, cy + 0.5, r + 0.5, 0, Math.PI * 2);
        g.stroke();
        return c;
      };
      const renderSaturnSprite = (palette: [number, number, number][]): HTMLCanvasElement => {
        const c = makeCanvas(200, 120);
        const g = c.getContext("2d");
        if (!g) return c;
        g.imageSmoothingEnabled = false;
        const cx = 100;
        const cy = 60;
        g.save();
        g.translate(cx, cy + 2);
        g.rotate(-0.18);
        for (let i = 0; i < 4; i += 1) {
          g.strokeStyle = paletteCss(palette[(i + 1) % palette.length], 0.9 + i * 0.06);
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(0, 0, 78 - i * 5, 20 - i, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.restore();
        const sphere = renderSphereSprite("saturn", palette, 86);
        g.drawImage(sphere, cx - Math.floor(sphere.width / 2), cy - Math.floor(sphere.height / 2));
        g.save();
        g.globalAlpha = 0.55;
        g.strokeStyle = "#fff4cf";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cx + 34, cy + 2);
        g.lineTo(cx + 72, cy - 4);
        g.stroke();
        g.restore();
        return c;
      };
      const out: Record<string, PlanetSprite> = {};
      for (const planet of PLANETS) {
        const palette = samplePalette(planet);
        let canvas2: HTMLCanvasElement;
        if (planet === "saturn") canvas2 = renderSaturnSprite(palette);
        else {
          const size =
            planet === "jupiter" ? 140 :
            planet === "earth" ? 132 :
            planet === "mars" ? 128 :
            planet === "uranus" ? 128 :
            planet === "neptune" ? 132 :
            planet === "venus" ? 124 :
            planet === "mercury" ? 118 :
            planet === "pluto" ? 112 : 128;
          canvas2 = renderSphereSprite(planet, palette, size);
        }
        out[planet] = makePlanetSpriteRecord(planet, canvas2, palette);
      }
      return out;
    };
    const fallbackPlanetSprite = (planet: Planet): PlanetSprite => {
      const palette = defaultPaletteFor(planet);
      const c = makeCanvas(120, 120);
      const g = c.getContext("2d");
      if (g) {
        g.imageSmoothingEnabled = false;
        const cx = 60;
        const cy = 60;
        const r = 52;
        for (let y = 0; y < 120; y += 1) for (let x = 0; x < 120; x += 1) {
          const dx = (x - cx) / r; const dy = (y - cy) / r; const dd = dx * dx + dy * dy; if (dd > 1) continue;
          const p = palette[Math.floor(clamp((1 - Math.sqrt(dd)) * palette.length, 0, palette.length - 1))] ?? palette[0];
          g.fillStyle = paletteCss(p);
          g.fillRect(x, y, 1, 1);
        }
      }
      return makePlanetSpriteRecord(planet, c, palette);
    };
    const drawPlanetFlybyBack = (a: Assets, tl: Timeline, tSec: number): PlanetFlybyInfo | null => {
      if (tl.phase !== "montage") return null;
      const planet = PLANETS[tl.planetIndex];
      const cache = planetSpritesRef.current ?? (planetSpritesRef.current = {});
      const hadSprite = Boolean(cache[planet]);
      const sprite = cache[planet] ?? (cache[planet] = fallbackPlanetSprite(planet));
      const holdMs = Math.max(1, a.manifest.times.planetHold);
      const u = clamp(tl.planetLocal / holdMs, 0, 1);
      const approach = clamp(u / 0.25, 0, 1);
      const hold = clamp((u - 0.25) / 0.5, 0, 1);
      const exit = clamp((u - 0.75) / 0.25, 0, 1);
      const ease = easeInOut(u);
      const sRaw = 0.95 + 0.18 * Math.sin(u * Math.PI);
      const scale = Math.round(sRaw * 16) / 16;
      const drawW = Math.max(1, Math.round(sprite.w * scale));
      const drawH = Math.max(1, Math.round(sprite.h * scale));
      const laneOffsets = [-56, 54, -28, 40, -44, 18, -36, 34, 0] as const;
      const laneTargetX = clamp(
        Math.round(rocketAnchorXRef.current + (laneOffsets[tl.planetIndex] ?? 0) + Math.sin(tl.planetIndex * 1.17) * 6),
        Math.floor(drawW / 2) + 8,
        W - Math.floor(drawW / 2) - 8,
      );
      const plutoLaneX = clamp(Math.round(rocketXRef.current + 6), Math.floor(drawW / 2) + 8, W - Math.floor(drawW / 2) - 8);
      const centerXTarget = planet === "pluto" ? Math.round(lerp(laneTargetX, plutoLaneX, smoothstep(clamp((u - 0.35) / 0.3, 0, 1)))) : laneTargetX;
      const drawX = Math.round(centerXTarget - drawW / 2);
      const drawY = Math.round(lerp(-drawH - 36, H + 36, ease));
      const drawYCenter = Math.round(drawY + drawH / 2);
      const centerX = Math.round(drawX + drawW / 2);
      const centerY = drawYCenter;
      const intensity = 0.25 + 0.75 * Math.max(approach, exit);
      const paintedPluto = planet === "pluto" && paintedReady() ? (paintedLayersRef.current?.pluto ?? null) : null;

      dbgPlanetNameRef.current = planet;
      dbgPlanetURef.current = u;
      dbgPlanetXRef.current = drawX;
      dbgPlanetWRef.current = drawW;
      dbgSpriteReadyRef.current = hadSprite;
      dbgSpriteAlphaPxRef.current = sprite.alphaPx;
      dbgSpritePreviewRef.current = sprite;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      if (planet === "mercury" && u >= 0.2 && u <= 0.6) {
        ctx.fillStyle = "#ffb066";
        ctx.globalAlpha = 0.25 + intensity * 0.4;
        for (let i = 0; i < 5; i += 1) {
          const xx = Math.round(centerX - 18 + i * 8 + Math.sin(tSec * 6 + i) * 2);
          const ll = Math.round(6 + i * 2 + intensity * 14);
          ctx.fillRect(xx, Math.round(drawY + drawH + 4 + (i % 2)), 1, ll);
        }
      } else if (planet === "mars") {
        ctx.fillStyle = "#da8c62";
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 8; i += 1) ctx.fillRect(Math.round(centerX - 6 + i * 2 + Math.sin(tSec * 5 + i)), Math.round(drawY + drawH + (i % 4) + 2), 1, 1);
      } else if (planet === "earth") {
        ctx.strokeStyle = "#75c6ff";
        ctx.globalAlpha = 0.28;
        ctx.strokeRect(drawX - 2, drawY - 2, drawW + 4, drawH + 4);
        ctx.fillStyle = "#d3fbff";
        ctx.globalAlpha = 0.9;
        for (let i = 0; i < 4; i += 1) {
          const ang = tSec * 1.8 + i * 1.3;
          ctx.fillRect(Math.round(centerX + Math.cos(ang) * (drawW * 0.52)), Math.round(centerY + Math.sin(ang) * (drawH * 0.42)), 1, 1);
        }
      } else if (planet === "jupiter") {
        ctx.globalAlpha = 0.9;
        for (let i = 0; i < 12; i += 1) {
          const ang = tSec * (0.8 + i * 0.03) + i * 0.52;
          const mx = Math.round(centerX + Math.cos(ang) * (drawW * (0.54 + (i % 3) * 0.08)));
          const my = Math.round(centerY + Math.sin(ang * 1.1) * (drawH * (0.18 + (i % 4) * 0.03)));
          ctx.fillStyle = i % 3 === 0 ? "#f8e5b4" : "#dbe7ff";
          ctx.fillRect(mx, my, 1, 1);
        }
      } else if (planet === "neptune") {
        ctx.fillStyle = "#82c7ff";
        ctx.globalAlpha = 0.22 + intensity * 0.2;
        for (let i = 0; i < 10; i += 1) ctx.fillRect(Math.round(drawX + ((i * 11 + Math.floor(tSec * 12)) % Math.max(1, drawW))), Math.round(drawY + drawH - 4 + (i % 3)), 1, 1);
      } else if (planet === "pluto") {
        ctx.fillStyle = "#b8f3ff";
        ctx.globalAlpha = 0.9;
        for (let i = 0; i < 4; i += 1) ctx.fillRect(Math.round(drawX + 8 + ((i * 17 + Math.floor(tSec * 18)) % Math.max(1, drawW - 12))), Math.round(drawY + 8 + ((i * 13 + Math.floor(tSec * 15)) % Math.max(1, drawH - 12))), 1, 1);
      } else if (planet === "venus") {
        ctx.fillStyle = "#f2dd9a";
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 8; i += 1) ctx.fillRect(Math.round(centerX + Math.sin(tSec * 2.1 + i) * 14), Math.round(centerY + Math.cos(tSec * 1.7 + i) * 9), 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      if (planet === "uranus") {
        const wobble = Math.round(Math.sin(tSec * 2.3 + tl.planetIndex) * 8) / 256;
        ctx.translate(centerX, centerY);
        if (wobble) ctx.rotate(wobble);
        ctx.drawImage(sprite.canvas, -Math.floor(drawW / 2), -Math.floor(drawH / 2), drawW, drawH);
      } else if (paintedPluto) {
        ctx.imageSmoothingEnabled = true;
        drawPaintedCover(paintedPluto, drawX, drawY, drawW, drawH);
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.drawImage(sprite.canvas, drawX, drawY, drawW, drawH);
      }
      ctx.restore();
      return { planet, drawX, drawY, drawW, drawH, centerX, centerY, u, approach, hold, exit, scale, spriteAlphaPx: sprite.alphaPx, spriteReady: hadSprite };
    };
    const drawPlanetFlybyFront = (info: PlanetFlybyInfo | null, tSec: number): void => {
      if (!info || info.planet !== "saturn") return;
      const sweep = clamp((Math.sin(tSec * 3 + info.u * Math.PI * 2) + 1) * 0.5, 0, 1);
      if (sweep < 0.35) return;
      const glintX = Math.round(info.centerX - info.drawW * 0.42 + sweep * info.drawW * 0.84);
      const glintY = Math.round(info.centerY + info.drawH * 0.02);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.28 + info.hold * 0.35;
      ctx.fillStyle = "#f6e8bc";
      ctx.fillRect(glintX - 2, glintY, 5, 1);
      ctx.fillStyle = "#fff8db";
      ctx.fillRect(glintX, glintY - 1, 1, 3);
      ctx.restore();
    };
    const drawScene = (a: Assets, name: SceneKey, alpha = 1, zoom = 1, panX = 0, panY = 0): void => {
      const s = sceneSrc(a, name); if (!s || alpha <= 0) return; lctx.save(); lctx.imageSmoothingEnabled = false; lctx.globalAlpha = clamp(alpha,0,1);
      const dw = Math.max(1, Math.round(LW * zoom)); const dh = Math.max(1, Math.round(LH * zoom)); const dx = Math.round((LW - dw)/2 + panX); const dy = Math.round((LH - dh)/2 + panY);
      lctx.drawImage(a.scenes, s.x, s.y, s.w, s.h, dx, dy, dw, dh); lctx.restore();
    };
    const drawFx = (a: Assets, tile: string, x: number, y: number, size: number, alpha = 1, rot = 0): void => {
      const s = fxSrc(a, tile); if (!s || alpha <= 0) return; lctx.save(); lctx.imageSmoothingEnabled = false; lctx.globalAlpha = clamp(alpha,0,1);
      lctx.translate(Math.round(x), Math.round(y)); if (rot) lctx.rotate(rot); const d = Math.max(1, Math.round(size));
      const cleaned = cleanedFxTilesRef.current[tile];
      if (cleaned) lctx.drawImage(cleaned, 0, 0, cleaned.width, cleaned.height, -Math.floor(d/2), -Math.floor(d/2), d, d);
      else lctx.drawImage(a.fx, s.x, s.y, s.w, s.h, -Math.floor(d/2), -Math.floor(d/2), d, d);
      lctx.restore();
    };
    const drawStars = (tSec: number, alpha: number, boost: number): void => {
      if (alpha <= 0) return; lctx.save(); lctx.globalAlpha = clamp(alpha,0,1);
      const nowMs = rafNowMsRef.current ?? Math.round(tSec * 1000);
      for (const s of starsRef.current) {
        const travel = tSec * s.s * (1 + boost * 1.8);
        const wrapW = LW + 6;
        const wrapH = LH + 6;
        const x = ((s.x + CORRIDOR_FLOW.x * travel) % wrapW + wrapW) % wrapW;
        const y0 = ((s.y + CORRIDOR_FLOW.y * travel) % wrapH + wrapH) % wrapH;
        const tw = 0.55 + Math.sin(tSec*(2 + s.s*0.04) + s.k)*0.45;
        const pulse = (s.size === 2 || s.c > 0.78) ? (0.72 + Math.sin(tSec * (3.1 + s.c * 1.7) + s.k * 1.7) * 0.18) : 1;
        const sparkleTwinkle = 0.65 + 0.35 * Math.sin(nowMs * 0.007 + s.k);
        const baseAlpha = clamp(alpha * pulse * 2.5 * sparkleTwinkle, 0, 1);
        lctx.globalAlpha = baseAlpha;
        lctx.fillStyle = tw > 0.86 ? "#ffffff" : s.c > 0.8 ? "#fff2bf" : s.c > 0.45 ? "#c8d8ff" : "#b6efff";
        const py = Math.round(y0 + (s.c < 0.2 ? Math.sin(tSec + s.k) * 0.5 : 0));
        const px = Math.round(x);
        lctx.fillRect(px, py, s.size, 1);
        const extraTwinkle = 0.65 + 0.35 * Math.sin(nowMs * 0.007 + s.k + 1.13);
        lctx.globalAlpha = clamp(alpha * (0.35 + 0.20 * ((Math.sin(nowMs * 0.003 + s.k * 2.1) + 1) * 0.5)) * extraTwinkle, 0, 0.55);
        lctx.fillRect(px + ((s.c > 0.5) ? 1 : -1), py + (((s.s * 10) | 0) % 3) - 1, s.size, 1);
      }
      lctx.restore();
    };
    const drawSpeedLines = (tSec: number, alpha: number): void => {
      drawLegacySpeedLinesLayer(tSec, alpha);
    };
    const roundedRectPath = (x: number, y: number, w: number, h: number, r: number): void => {
      const rr = Math.max(0, Math.min(r, Math.floor(Math.min(w, h) / 2)));
      lctx.beginPath();
      lctx.moveTo(x + rr, y);
      lctx.lineTo(x + w - rr, y);
      lctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      lctx.lineTo(x + w, y + h - rr);
      lctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      lctx.lineTo(x + rr, y + h);
      lctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      lctx.lineTo(x, y + rr);
      lctx.quadraticCurveTo(x, y, x + rr, y);
      lctx.closePath();
    };
    const paintedAssetsReady = (): boolean => (
      !paintedModeRef.current
      || (
        paintedAssetsAttemptedCountRef.current === paintedAssetsTotalCountRef.current
        && paintedAssetsErrorsRef.current.length === 0
      )
    );
    const prestartCanStart = (): boolean => (
      !!assetsRef.current
      && (!paintedModeRef.current || (!!paintedLayersRef.current && paintedAssetsReady()))
    );
    const paintedReady = (): boolean => paintedModeRef.current && paintedAssetsReady() && !!paintedLayersRef.current;
    const drawPrestartDeepSpacePlaceholder = (nowMs: number): void => {
      const tSec = nowMs / 1000;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#050611";
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(
        Math.round(W * 0.52),
        Math.round(H * 0.42),
        8,
        Math.round(W * 0.52),
        Math.round(H * 0.42),
        Math.round(Math.max(W, H) * 0.72),
      );
      glow.addColorStop(0, "rgba(36,42,88,0.18)");
      glow.addColorStop(0.55, "rgba(14,16,34,0.08)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      const vignette = ctx.createRadialGradient(
        Math.round(W * 0.5),
        Math.round(H * 0.5),
        Math.round(Math.min(W, H) * 0.2),
        Math.round(W * 0.5),
        Math.round(H * 0.5),
        Math.round(Math.hypot(W, H) * 0.56),
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < Math.min(28, starsRef.current.length); i += 1) {
        const s = starsRef.current[i];
        const px = Math.round((s.x / LW) * W);
        const py = Math.round((s.y / LH) * H);
        const tw = 0.65 + Math.sin(tSec * (1.7 + s.c * 1.5) + s.k) * 0.35;
        ctx.globalAlpha = clamp(0.16 + tw * 0.26, 0, 0.40);
        ctx.fillStyle = tw > 0.84 ? "#ffffff" : (s.c > 0.5 ? "#bfd8ff" : "#9fc9ff");
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };
    const drawPaintedCover = (img: PaintedImage, dx: number, dy: number, dw: number, dh: number): void => {
      const { w: srcW0, h: srcH0 } = paintedImageDims(img);
      if (!(srcW0 > 0 && srcH0 > 0 && dw > 0 && dh > 0)) return;
      let sx0 = 0;
      let sy0 = 0;
      let sw0 = srcW0;
      let sh0 = srcH0;
      const srcAspect = srcW0 / srcH0;
      const dstAspect = dw / dh;
      if (Math.abs(srcAspect - dstAspect) > 0.0001) {
        if (srcAspect > dstAspect) {
          sw0 = srcH0 * dstAspect;
          sx0 = (srcW0 - sw0) * 0.5;
        } else {
          sh0 = srcW0 / dstAspect;
          sy0 = (srcH0 - sh0) * 0.5;
        }
      }
      ctx.drawImage(
        img as CanvasImageSource,
        Math.round(sx0),
        Math.round(sy0),
        Math.max(1, Math.round(sw0)),
        Math.max(1, Math.round(sh0)),
        Math.round(dx),
        Math.round(dy),
        Math.max(1, Math.round(dw)),
        Math.max(1, Math.round(dh)),
      );
    };
    const drawPaintedLaunchBackground = (tSec: number, alpha: number, shakeX = 0, shakeY = 0): void => {
      const layers = paintedLayersRef.current?.launch;
      const a0 = clamp(alpha, 0, 1);
      if (!layers || a0 <= 0) return;
      const basePad = 12;
      const drawLayer = (
        img: PaintedImage,
        xOff: number,
        yOff: number,
        extraPad = 0,
      ): void => {
        const pad = basePad + extraPad;
        const dx = Math.round(-pad + shakeX + xOff);
        const dy = Math.round(-pad + shakeY + yOff);
        const dw = Math.round(W + pad * 2);
        const dh = Math.round(H + pad * 2);
        drawPaintedCover(img, dx, dy, dw, dh);
      };
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = a0;
      ctx.save();
      ctx.filter = "blur(0.7px)";
      drawLayer(layers.L0, 0, 0);
      ctx.restore();
      drawLayer(layers.L1, Math.round(Math.sin(tSec * 0.20) * 3), Math.round(tSec * 6), 3);
      drawLayer(layers.L2, Math.round(Math.sin(tSec * 0.26) * 6), Math.round(tSec * 12), 5);
      drawLayer(layers.L3, Math.round(Math.sin(tSec * 0.32) * 10), Math.round(tSec * 18), 7);
      ctx.save();
      ctx.globalAlpha = a0 * (0.92 + 0.08 * Math.sin(tSec * 0.8));
      drawLayer(layers.L4, 0, Math.round(tSec * 3), 3);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a0 * (0.75 + 0.25 * Math.sin(tSec * 1.8 + 1.37));
      drawLayer(layers.L5, 0, 0, 2);
      ctx.restore();
      drawLayer(layers.L6, 0, Math.round(tSec * 2), 2);
      ctx.restore();
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;
    };
    const drawPaintedCorridorBackground = (
      tSec: number,
      intensity: number,
      opts?: { alpha?: number; offsetX?: number; offsetY?: number; applyGrade?: boolean; bgMode?: BgMode },
    ): void => {
      const layers = paintedLayersRef.current?.corridor;
      if (!layers) return;
      const alpha = clamp(opts?.alpha ?? 1, 0, 1);
      if (alpha <= 0) return;
      const bgModeForDraw = opts?.bgMode ?? getBgMode(phaseRef.current, paintedModeRef.current, paintedReady());
      const applyGrade = opts?.applyGrade ?? false;
      const offsetX = Math.round(opts?.offsetX ?? 0);
      const offsetY = Math.round(opts?.offsetY ?? 0);
      const drawWrapped = (
        img: PaintedImage,
        scrollY: number,
        xDrift: number,
        layerAlpha: number,
        scale: number,
      ): void => {
        const dw = Math.max(1, Math.round(W * scale));
        const dh = Math.max(1, Math.round(H * scale));
        const cx = Math.round((W - dw) / 2) + offsetX;
        const cy = Math.round((H - dh) / 2) + offsetY;
        const x = cx + Math.round(xDrift);
        const dy = ((Math.floor(scrollY) % H) + H) % H;
        ctx.save();
        ctx.globalAlpha = alpha * clamp(layerAlpha, 0, 1);
        drawPaintedCover(img, x, cy - dy, dw, dh);
        drawPaintedCover(img, x, cy + H - dy, dw, dh);
        ctx.restore();
      };
      const l0ScrollY = tSec * 110;
      const l1ScrollY = tSec * 150;
      const l2ScrollY = tSec * 130;
      const l3ScrollY = tSec * 220;
      const breathScale = 1 + 0.015 * Math.sin(tSec * 0.9);
      const l2PulseRaw = 0.55 + 0.20 * Math.sin(tSec * 1.1);
      const l2Pulse = Math.min(CORRIDOR_MIST_ALPHA_CAP, l2PulseRaw);
      const l3ClampAlpha = Math.min(1.0, 0.88 + 0.12 * smoothstep(clamp(intensity, 0, 1)));
      const l3Boost = l3ClampAlpha * (0.88 + 0.12 * Math.sin(tSec * 4 + 1.17));
      if (bgModeForDraw === "PAINTED_CORRIDOR") {
        dbgMistCapRef.current = Math.max(dbgMistCapRef.current, CORRIDOR_MIST_ALPHA_CAP);
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      drawWrapped(layers.L0, l0ScrollY, Math.sin(tSec * 0.06) * 2, 1, 1.01);
      drawWrapped(layers.L1, l1ScrollY, Math.sin(tSec * 0.10 + 0.4) * 3, 1, breathScale);
      drawWrapped(layers.L2, l2ScrollY, Math.sin(tSec * 0.13 + 1.2) * 2, l2Pulse, 1.02);
      drawWrapped(layers.L3, l3ScrollY, Math.sin(tSec * 0.18 + 2.1) * 3, l3Boost, 1.02);
      if (applyGrade) {
        dbgGradeAppliedRef.current = true;
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.19 * alpha;
        ctx.fillStyle = "rgb(6, 8, 20)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.03 * alpha;
        ctx.fillStyle = "rgb(40, 30, 90)";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;
    };
    const drawCorridor = (_a: Assets, tSec: number, intensity: number): void => {
      lctx.fillStyle = "#000";
      lctx.fillRect(0, 0, LW, LH);
      lctx.save();
      lctx.globalAlpha = 0.98;
      for (const s of starsRef.current) {
        const travel = tSec * s.s * (1 + intensity * 1.8);
        const x = ((s.x + CORRIDOR_FLOW.x * travel) % (LW + 6) + (LW + 6)) % (LW + 6);
        const yBase = ((s.y + CORRIDOR_FLOW.y * travel) % (LH + 6) + (LH + 6)) % (LH + 6);
        const y = Math.round(yBase + (s.c < 0.2 ? Math.sin(tSec + s.k) * 0.5 : 0));
        const tw = 0.55 + Math.sin(tSec * (2 + s.s * 0.04) + s.k) * 0.45;
        const pulse = (s.size === 2 || s.c > 0.78) ? (0.74 + Math.sin(tSec * (3.4 + s.c * 2.2) + s.k * 1.9) * 0.16) : 1;
        const nowMs = (rafNowMsRef.current ?? Math.round(tSec * 1000));
        const sparkleTwinkle = 0.65 + 0.35 * Math.sin(nowMs * 0.004 + s.k);
        const baseAlpha = clamp(0.98 * pulse * 3.9 * sparkleTwinkle, 0, 1);
        lctx.globalAlpha = baseAlpha;
        lctx.fillStyle = tw > 0.86 ? "#ffffff" : s.c > 0.8 ? "#fff2bf" : s.c > 0.45 ? "#c8d8ff" : "#b6efff";
        const px = Math.round(x);
        lctx.fillRect(px, y, 1, 1);
        const extraTwinkle = 0.65 + 0.35 * Math.sin(nowMs * 0.004 + s.k + 1.13);
        lctx.globalAlpha = clamp((0.35 + 0.20 * ((Math.sin(nowMs * 0.003 + s.k * 2.1) + 1) * 0.5)) * extraTwinkle, 0, 0.55);
        lctx.fillRect(px + ((s.c > 0.5) ? 1 : -1), y + (((s.s * 10) | 0) % 3) - 1, 1, 1);
      }
      lctx.restore();
      const i = smoothstep(clamp(intensity, 0, 1));
      drawSpeedLines(tSec, 0.12 + i * 0.68);
      if (i > 0.05) {
        lctx.save();
        lctx.globalAlpha = clamp(i * 0.62, 0, CORRIDOR_MIST_ALPHA_CAP);
        lctx.fillStyle = "#dbeeff";
        const count = Math.round(8 + i * 24);
        for (let n = 0; n < count; n += 1) {
          const len = Math.round(3 + i * 10 + ((n * 5) % 6));
          const x = 6 + ((n * 9 + (Math.floor(tSec * 9) % 11)) % Math.max(1, LW - len - 12));
          const y = ((LH + 8) - ((tSec * (52 + i * 52 + n * 1.5) + n * 9) % (LH + 20))) | 0;
          lctx.fillRect(Math.round(x), y, len, 1);
        }
        lctx.restore();
      }
    };
    const introStateFor = (tl: Timeline, a: Assets): {
      active: boolean;
      name: IntroStateName;
      introElapsed: number;
      stateLocal: number;
      stateDur: number;
      total: number;
      corridorAlpha: number;
      ascentAlpha: number;
      altitude: number;
      shakeX: number;
      shakeY: number;
    } => {
      const total = a.manifest.times.countdownTotal + a.manifest.times.liftoffToSpace;
      if (tl.phase !== "countdown" && tl.phase !== "liftoff") {
        return {
          active: false,
          name: "INTRO_BLEND_TO_CORRIDOR",
          introElapsed: total,
          stateLocal: 0,
          stateDur: 1,
          total,
          corridorAlpha: 1,
          ascentAlpha: 1,
          altitude: 1,
          shakeX: 0,
          shakeY: 0,
        };
      }
      const introElapsed = tl.phase === "countdown" ? tl.local : (a.manifest.times.countdownTotal + tl.local);
      const t0 = INTRO_TIMING_MS.pad;
      const t1 = t0 + INTRO_TIMING_MS.ignite;
      const t2 = t1 + INTRO_TIMING_MS.ascent;
      let name: IntroStateName = "INTRO_PAD";
      let stateStart: number = 0;
      let stateDur: number = INTRO_TIMING_MS.pad;
      if (introElapsed < t0) {
        name = "INTRO_PAD";
      } else if (introElapsed < t1) {
        name = "INTRO_IGNITE";
        stateStart = t0;
        stateDur = INTRO_TIMING_MS.ignite;
      } else if (introElapsed < t2) {
        name = "INTRO_ASCENT";
        stateStart = t1;
        stateDur = INTRO_TIMING_MS.ascent;
      } else {
        name = "INTRO_BLEND_TO_CORRIDOR";
        stateStart = t2;
        stateDur = INTRO_TIMING_MS.blend;
      }
      const stateLocal = clamp(introElapsed - stateStart, 0, stateDur);
      const corridorAlpha = name === "INTRO_BLEND_TO_CORRIDOR" ? smoothstep(clamp(stateLocal / stateDur, 0, 1)) : 0;
      const altitude = clamp((introElapsed - t1) / (INTRO_TIMING_MS.ascent + INTRO_TIMING_MS.blend), 0, 1);
      const ascentAlpha = smoothstep(altitude);
      const igniteAmt = name === "INTRO_IGNITE" ? smoothstep(clamp(stateLocal / stateDur, 0, 1)) : name === "INTRO_ASCENT" || name === "INTRO_BLEND_TO_CORRIDOR" ? 1 : 0;
      const shakeMag = name === "INTRO_IGNITE" ? (1 + Math.sin(introElapsed * 0.06) * 0.3) * igniteAmt : 0;
      return {
        active: true,
        name,
        introElapsed,
        stateLocal,
        stateDur,
        total,
        corridorAlpha,
        ascentAlpha,
        altitude,
        shakeX: Math.round(Math.sin(introElapsed * 0.09) * shakeMag),
        shakeY: Math.round(Math.cos(introElapsed * 0.11) * shakeMag),
      };
    };
    const drawIntroWorld = (a: Assets, tl: Timeline, tSec: number, usePaintedLaunch: boolean): { corridorAlpha: number; rocketPose: RocketPose; introState: IntroStateName } => {
      const intro = introStateFor(tl, a);
      dbgIntroStateRef.current = intro.name;
      dbgCorridorAlphaRef.current = intro.corridorAlpha;
      const alt = intro.altitude;
      const shakeX = intro.shakeX;
      const shakeY = intro.shakeY;

      const skyFade = 1 - intro.corridorAlpha;
      const usePaintedIntroBg = usePaintedLaunch && paintedReady();
      if (intro.name === "INTRO_BLEND_TO_CORRIDOR" && intro.corridorAlpha > 0.85) {
        updateCorridorLatch({ modeSignal: true });
      }
      if (skyFade > 0 && usePaintedIntroBg) {
        dbgBgModeRef.current = "PAINTED_LAUNCH";
        drawPaintedLaunchBackground(tSec, skyFade, shakeX * 2, shakeY * 2);
      } else {
        if (skyFade > 0) dbgBgModeRef.current = "PIXEL";
        lctx.save();
        lctx.translate(shakeX, shakeY);
        if (skyFade > 0) {
        for (let y = 0; y < LH; y += 1) {
          const horizonMix = clamp((y - Math.floor(LH * 0.42)) / Math.max(1, Math.floor(LH * 0.5)), 0, 1);
          const deep = clamp((y / LH) * 0.82 + alt * 0.58, 0, 1);
          const r = Math.round(lerp(42, 8, deep) + lerp(22, 56, 1 - horizonMix) * (1 - alt) * 0.42);
          const g = Math.round(lerp(156, 20, deep) + lerp(22, 82, 1 - horizonMix) * (1 - alt) * 0.2);
          const b = Math.round(lerp(246, 52, deep) + lerp(34, 110, 1 - horizonMix) * (1 - alt) * 0.22);
          lctx.globalAlpha = clamp(skyFade, 0, 1);
          lctx.fillStyle = `rgb(${clamp(r,0,255)} ${clamp(g,0,255)} ${clamp(b,0,255)})`;
          lctx.fillRect(0, y, LW, 1);
        }
        const hazeY = Math.round(62 - alt * 18);
        lctx.globalAlpha = clamp(0.34 * skyFade, 0, MAX_GLOW_ALPHA);
        lctx.fillStyle = "#f6a7cf";
        lctx.fillRect(0, hazeY, LW, 10);
        lctx.globalAlpha = clamp(0.14 * skyFade, 0, MAX_GLOW_ALPHA);
        lctx.fillStyle = "#ffd6ea";
        lctx.fillRect(0, hazeY + 2, LW, 4);

        const parY = Math.round(18 - alt * 6);
        lctx.globalAlpha = clamp(0.95 * skyFade, 0, 1);
        lctx.fillStyle = "#a8d1ff";
        lctx.fillRect(19, parY + 2, 8, 8);
        lctx.fillStyle = "#e4f2ff";
        lctx.fillRect(22, parY + 4, 2, 2);
        lctx.fillStyle = "#e7c7ff";
        lctx.fillRect(142, parY - 1, 6, 6);
        lctx.strokeStyle = "#d3a5e9";
        lctx.lineWidth = 1;
        lctx.beginPath();
        lctx.ellipse(145.5, parY + 2.5, 6, 2, -0.2, 0, Math.PI * 2);
        lctx.stroke();
        lctx.fillStyle = "#d2dcff";
        lctx.fillRect(95, parY + 9, 4, 4);
        const introStars = [
          { x: 12, y: 14, c: "#bff3ff", plus: true },
          { x: 34, y: 8, c: "#d7fbff", plus: false },
          { x: 58, y: 18, c: "#b2e9ff", plus: true },
          { x: 74, y: 11, c: "#d8e9ff", plus: false },
          { x: 108, y: 16, c: "#bff6ff", plus: true },
          { x: 124, y: 8, c: "#d9f1ff", plus: false },
          { x: 156, y: 14, c: "#bfe8ff", plus: true },
          { x: 177, y: 9, c: "#d8faff", plus: false },
        ];
        lctx.globalAlpha = clamp((0.35 + alt * 0.55) * skyFade, 0, MAX_GLOW_ALPHA);
        for (const st of introStars) {
          const sx0 = st.x + Math.round(Math.sin(tSec * 0.8 + st.x) * 0.4);
          const sy0 = st.y + Math.round(Math.cos(tSec * 0.7 + st.y) * 0.4);
          lctx.fillStyle = st.c;
          lctx.fillRect(sx0, sy0, 1, 1);
          if (st.plus) {
            lctx.fillRect(sx0 - 1, sy0, 1, 1);
            lctx.fillRect(sx0 + 1, sy0, 1, 1);
            lctx.fillRect(sx0, sy0 - 1, 1, 1);
            lctx.fillRect(sx0, sy0 + 1, 1, 1);
          }
        }
        for (let i = 0; i < 10; i += 1) {
          const sx1 = (13 + i * 17 + Math.floor(i / 3) * 7) % (LW - 4) + 2;
          const sy1 = 6 + ((i * 9) % 22);
          const blink = 0.55 + Math.sin(tSec * (1.7 + i * 0.11) + i) * 0.25;
          lctx.globalAlpha = clamp((0.22 + alt * 0.4) * blink * skyFade, 0, MAX_GLOW_ALPHA);
          lctx.fillStyle = i % 3 === 0 ? "#c3f5ff" : i % 2 === 0 ? "#cfe1ff" : "#bfefff";
          lctx.fillRect(sx1, sy1, 1, 1);
        }

        const horizonBase = Math.round(76 + alt * 16);
        for (let x = 0; x < LW; x += 1) {
          const hillFar = Math.round(horizonBase + Math.sin(x * 0.09 + 0.7) * 3 + Math.sin(x * 0.03 + 1.9) * 4);
          const hillNear = Math.round(horizonBase + 8 + Math.sin(x * 0.13 + 0.3 - alt * 1.1) * 4 + Math.sin(x * 0.04 + 2.1) * 5);
          lctx.globalAlpha = clamp(0.92 * skyFade, 0, 1);
          lctx.fillStyle = "#f4abc8";
          lctx.fillRect(x, hillFar, 1, Math.max(0, LH - hillFar));
          lctx.globalAlpha = clamp(0.95 * skyFade, 0, 1);
          lctx.fillStyle = "#df83ae";
          lctx.fillRect(x, hillNear, 1, Math.max(0, LH - hillNear));
        }

        const accents = [
          { x: 22, y: 89, h: 4 },
          { x: 49, y: 92, h: 3 },
          { x: 130, y: 90, h: 4 },
          { x: 172, y: 94, h: 3 },
        ];
        lctx.globalAlpha = clamp(0.85 * skyFade, 0, 1);
        for (const ac of accents) {
          lctx.fillStyle = "#57d7c8";
          lctx.fillRect(ac.x, ac.y - ac.h, 1, ac.h);
          lctx.fillRect(ac.x - 1, ac.y - 1, 3, 1);
          lctx.fillStyle = "#2ab3ae";
          lctx.fillRect(ac.x + 1, ac.y - 2, 1, 2);
        }

        const stripY = Math.round(94 + alt * 18);
        lctx.globalAlpha = clamp(skyFade, 0, 1);
        lctx.fillStyle = "#44506d";
        lctx.fillRect(83, stripY, 34, 3);
        lctx.fillStyle = "#262e43";
        lctx.fillRect(83, stripY + 3, 34, 2);
        lctx.fillStyle = "#8ea0c6";
        lctx.fillRect(84, stripY + 1, 2, 1);
        lctx.fillRect(114, stripY + 1, 2, 1);
        lctx.fillStyle = "#252c3f";
        lctx.fillRect(87, stripY + 5, 1, 2);
        lctx.fillRect(98, stripY + 5, 1, 2);
        lctx.fillRect(109, stripY + 5, 1, 2);
        lctx.fillStyle = "#5f6f92";
        lctx.fillRect(99, stripY - 10, 1, 10);
        lctx.fillStyle = "#7183a8";
        lctx.fillRect(95, stripY - 1, 10, 1);
        lctx.fillStyle = "#2b3348";
        lctx.fillRect(95, stripY, 10, 1);
        lctx.fillStyle = "#7c8cb2";
        lctx.fillRect(98, stripY - 7, 4, 1);
        lctx.fillStyle = "#f7d08a";
        const lampPulse = 0.62 + Math.sin(tSec * 3.1) * 0.22;
        lctx.globalAlpha = clamp(lampPulse * skyFade, 0, MAX_GLOW_ALPHA);
        lctx.fillRect(98, stripY - 11, 3, 2);
        lctx.fillStyle = "#ffdbae";
        lctx.fillRect(99, stripY - 13, 1, 2);
        lctx.globalAlpha = clamp(0.22 * skyFade, 0, MAX_GLOW_ALPHA);
        lctx.fillStyle = "#ffcf8f";
        lctx.fillRect(95, stripY - 9, 9, 6);
        const markerBlink = (Math.floor(tSec * 2) & 1) === 0 ? 1 : 0.45;
        lctx.globalAlpha = clamp(0.8 * markerBlink * skyFade, 0, MAX_GLOW_ALPHA);
        lctx.fillStyle = "#ff8e95";
        lctx.fillRect(85, stripY - 1, 2, 1);
        lctx.fillRect(113, stripY - 1, 2, 1);
        }
        lctx.restore();
      }

      if (intro.corridorAlpha > 0) {
        if (usePaintedIntroBg) {
          dbgBgModeRef.current = "PAINTED_CORRIDOR";
          drawPaintedCorridorBackground(tSec, 0.1 + intro.corridorAlpha * 0.4, {
            alpha: intro.corridorAlpha,
          });
        } else {
          dbgBgModeRef.current = "PIXEL";
          lctx.save();
          lctx.globalAlpha = clamp(intro.corridorAlpha, 0, 1);
          drawCorridor(a, tSec, 0.1 + intro.corridorAlpha * 0.4);
          lctx.restore();
        }
        applyCorridorGradeIfLatched({
          mode: usePaintedIntroBg ? "painted" : "legacy",
          tSec,
          intensity: 0.1 + intro.corridorAlpha * 0.4,
          alpha: intro.corridorAlpha,
        });
      } else if (intro.name === "INTRO_ASCENT" && !usePaintedIntroBg) {
        drawStars(tSec, 0.08 + intro.ascentAlpha * 0.2, intro.ascentAlpha * 0.2);
      }

      const padY = 84;
      const stripY = Math.round(94 + alt * 18);
      const ascentOffset = Math.round(easeOut(clamp((intro.introElapsed - (INTRO_TIMING_MS.pad + INTRO_TIMING_MS.ignite)) / (INTRO_TIMING_MS.ascent + INTRO_TIMING_MS.blend), 0, 1)) * 72);
      const rocketX = 98 + Math.round(Math.sin(tSec * 2.6) * (intro.name === "INTRO_PAD" ? 1 : 0.5));
      const rocketY = Math.round((intro.name === "INTRO_PAD" ? padY + Math.sin(tSec * 4.4) * 0.8 : stripY - 8) - ascentOffset);
      const thrustAmt = intro.name === "INTRO_PAD" ? 0.2 : intro.name === "INTRO_IGNITE" ? lerp(0.35, 1.1, smoothstep(clamp(intro.stateLocal / intro.stateDur, 0, 1))) : 1.1 + intro.corridorAlpha * 0.2;
      const rocketPose: RocketPose = {
        x: Math.round(rocketX + shakeX),
        y: Math.round(rocketY + shakeY),
        rot: 0,
        size: 28,
        exhaust: thrustAmt,
        thrust: intro.name !== "INTRO_PAD",
        visible: true,
      };
      if (intro.name !== "INTRO_PAD") {
        spawnTrail(rocketPose, Math.min(22, 10 + (intro.name === "INTRO_IGNITE" ? 8 : 16)));
        if (intro.name !== "INTRO_IGNITE" || (Math.floor(tSec * 10) & 1) === 0) spawnSmoke(rocketPose, 12, clamp(thrustAmt * 0.6, 0, 1));
      }
      rocketAnchorXRef.current = Math.round(lerp(154, 170, intro.corridorAlpha));
      rocketAnchorYRef.current = Math.round(lerp(H * 0.46, H * 0.44, clamp((intro.introElapsed - (INTRO_TIMING_MS.pad + INTRO_TIMING_MS.ignite)) / (INTRO_TIMING_MS.ascent + INTRO_TIMING_MS.blend), 0, 1)));
      rocketXRef.current = rocketPose.x * 2;
      rocketYRef.current = rocketPose.y * 2;
      rocketVXRef.current = 44;
      rocketVYRef.current = -8 * intro.corridorAlpha;
      rocketRotRef.current = 0;
      if (intro.corridorAlpha > 0.02) inCorridorRef.current = true;
      if (intro.name === "INTRO_BLEND_TO_CORRIDOR" && intro.corridorAlpha > 0.85) {
        corridorEntryElapsedRef.current = tl.elapsed;
        updateCorridorLatch({ modeSignal: true });
      }
      rocketInitRef.current = intro.name === "INTRO_BLEND_TO_CORRIDOR" && intro.corridorAlpha > 0.85;
      return { corridorAlpha: intro.corridorAlpha, rocketPose, introState: intro.name };
    };
    const drawPlanetVignette = (
      a: Assets,
      scene: Planet,
      alpha: number,
      approach: number,
      hold: number,
      exit: number,
      tSec: number,
      planetIndex: number,
    ): MontageVignetteInfo | null => {
      if (alpha <= 0) return null;
      const winW = 360;
      const winH = 200;
      const radius = 10;
      const x = clamp(Math.round((W - winW) * 0.55), 0, W - winW);
      const y = clamp(Math.round((H - winH) * 0.42), 0, H - winH);
      const panX = Math.round(Math.sin(tSec * 0.9 + planetIndex) * 2);
      const panY = Math.round(Math.cos(tSec * 1.1 + planetIndex) * 2);
      const s = sceneSrc(a, scene);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = clamp(alpha, 0, 1);

      ctx.fillStyle = "rgba(7,13,22,0.84)";
      ctx.beginPath();
      ctx.roundRect(x - 4, y - 4, winW + 8, winH + 8, radius + 2);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(x, y, winW, winH, radius);
      ctx.save();
      ctx.clip();
      if (s) {
        const cropMinX = s.x;
        const cropMaxX = s.x + (400 - winW);
        const cropMinY = s.y;
        const cropMaxY = s.y + (225 - winH);
        const cropX = clamp(s.x + Math.round((400 - winW) / 2) + panX, cropMinX, cropMaxX);
        const cropY = clamp(s.y + Math.round((225 - winH) / 2) + panY, cropMinY, cropMaxY);
        ctx.drawImage(a.scenes, cropX, cropY, winW, winH, x, y, winW, winH);
      }
      ctx.fillStyle = "rgba(120,170,220,0.10)";
      ctx.fillRect(x, y, winW, winH);
      ctx.fillStyle = "rgba(190,225,255,0.08)";
      ctx.fillRect(x, y, winW, 26);
      ctx.restore();

      ctx.strokeStyle = "#cfddec";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, winW, winH, radius);
      ctx.stroke();
      ctx.strokeStyle = "#10213d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, winW - 6, winH - 6, Math.max(1, radius - 2));
      ctx.stroke();
      ctx.restore();
      return {
        x,
        y,
        w: winW,
        h: winH,
        centerX: x + Math.round(winW / 2),
        centerY: y + Math.round(winH / 2),
        approach,
        hold,
        exit,
        alpha,
        radius,
      };
    };
    const drawCapsule = (text: string, yMain: number, alpha: number): void => {
      if (alpha <= 0) return; const wMain = clamp(text.length*6 + 14, 44, 180); const r = rectL({ x: Math.round((W - wMain)/2), y: yMain, w: wMain, h: 16 });
      lctx.save(); lctx.globalAlpha = clamp(alpha,0,1); lctx.fillStyle = "#0c1526"; lctx.fillRect(r.x,r.y,r.w,r.h); lctx.fillStyle = "#31486f"; lctx.fillRect(r.x+1,r.y+1,Math.max(1,r.w-2),Math.max(1,r.h-2)); lctx.fillStyle = "#13203a"; lctx.fillRect(r.x+1,r.y+r.h-3,Math.max(1,r.w-2),2);
      drawTextShadow(lctx, text, r.x + Math.max(2, Math.floor((r.w - textW(text))/2)), r.y + Math.max(2, Math.floor((r.h - 7)/2)), "#eff6ff", "#05080f"); lctx.restore();
    };
    const drawCountdownHud = (tl: Timeline, countdownTotal: number): void => {
      if (tl.phase !== "countdown") return;
      const seg = countdownTotal / 3;
      const shown = clamp(3 - Math.floor(tl.local / Math.max(1, seg)), 1, 3);
      if (countdownShownRef.current !== shown) {
        countdownShownRef.current = shown;
        tickBeep();
      }
      const pulse = (tl.local % Math.max(1, seg)) / Math.max(1, seg);
      const bx = 82;
      const by = 13;
      const bw = 36;
      const bh = 18;
      lctx.save();
      lctx.fillStyle = "#0a1120";
      lctx.fillRect(bx, by, bw, bh);
      lctx.fillStyle = "#f3f7ff";
      lctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
      lctx.fillStyle = "#1a2744";
      lctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      lctx.fillStyle = "#f3f7ff";
      lctx.fillRect(bx + 14, by + bh - 1, 6, 3);
      lctx.fillStyle = "#1a2744";
      lctx.fillRect(bx + 15, by + bh, 4, 2);
      const sc = pulse > 0.6 ? 2 : 1;
      drawTextShadow(
        lctx,
        String(shown),
        bx + Math.floor((bw - textW(String(shown), sc)) / 2),
        by + Math.floor((bh - 7 * sc) / 2),
        "#ffd861",
        "#5b3c00",
        sc,
      );
      lctx.restore();
    };
    const drawStamp = (): void => {
      const showStamp = DEV;
      const showPaintedLabel = paintedDebugLabelRef.current && paintedModeRef.current;
      if (!showStamp && !showPaintedLabel) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (showStamp) {
        const w = textW(STAMP) + 8;
        ctx.fillStyle = "#090f1c";
        ctx.fillRect(4, H - 16, w, 11);
        drawTextShadow(ctx, STAMP, 6, H - 14, "#9bb7ea", "#05080f");
      }
      if (showPaintedLabel) {
        const label = "PAINTED=ON";
        const w = textW(label) + 8;
        const x = W - w - 4;
        ctx.fillStyle = "#0a1120";
        ctx.fillRect(x, H - 16, w, 11);
        drawTextShadow(ctx, label, x + 2, H - 14, "#cfe9ff", "#05080f");
      }
      ctx.restore();
    };
    const drawSound = (): void => {
      const soundMain = getSoundMainRect();
      const r = soundMain;
      const hov = hoverRef.current === "soundToggle";
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = hov ? "#45689f" : "#304a70";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "#0d1528";
      ctx.fillRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
      ctx.fillStyle = hov ? "#a7dfff" : "#7ec4f6";
      ctx.fillRect(r.x + 2, r.y + 2, 1, Math.max(1, r.h - 4));
      const label = soundOnRef.current ? "ON" : "OFF";
      drawTextUiShadow(ctx, label, r.x + Math.max(2, Math.floor((r.w - uiTextW(label, SOUND_FONT_SCALE)) / 2)), r.y + SOUND_PAD_Y, hov ? "#f3f8ff" : "#d6e5ff", "#05080f", SOUND_FONT_SCALE);
      ctx.restore();
    };
    const drawMissionBriefingGate = (a: Assets | null, nowMs: number): void => {
      const tSec = nowMs / 1000;
      const startReadyNow = prestartCanStart();
      void a;
      dbgBgModeRef.current = "PRESTART";
      drawPrestartDeepSpacePlaceholder(nowMs);
      lctx.save();
      lctx.globalAlpha = 0.55;
      lctx.fillStyle = "#050914";
      lctx.fillRect(0, 0, LW, LH);
      lctx.restore();

      const px = 23;
      const py = 22;
      const pw = 154;
      const ph = 66;
      lctx.save();
      lctx.fillStyle = "#d8d4f3";
      lctx.fillRect(px, py, pw, ph);
      lctx.fillStyle = "#faf8ff";
      lctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      lctx.fillStyle = "#beb7e8";
      lctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
      lctx.fillStyle = "#221d3b";
      lctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
      lctx.fillStyle = "#2f274f";
      lctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
      lctx.fillStyle = "#f0ecff";
      lctx.fillRect(px + 5, py + 5, pw - 10, 2);
      lctx.fillStyle = "#120f21";
      lctx.fillRect(px + 5, py + ph - 7, pw - 10, 2);

      const title = "BEGIN THE PLUTO MISSION";
      drawTextShadow(lctx, title, px + Math.floor((pw - textW(title)) / 2), py + 14, "#f6f4ff", "#090710");
      lctx.fillStyle = "#5a4f87";
      lctx.fillRect(px + 14, py + 24, pw - 28, 1);

      if (!startReadyNow) {
        const loadingText = paintedModeRef.current
          ? `LOADING ${paintedAssetsAttemptedCountRef.current}/${paintedAssetsTotalCountRef.current}`
          : "LOADING...";
        drawTextShadow(lctx, loadingText, px + Math.floor((pw - textW(loadingText)) / 2), py + 34, "#ffe48f", "#5b3c00");
        const waitText = "PLEASE WAIT";
        drawTextShadow(lctx, waitText, px + Math.floor((pw - textW(waitText)) / 2), py + 48, "#bfe7ff", "#0b1628");
        if (paintedModeRef.current && paintedAssetsErrorsRef.current.length > 0) {
          const missingLabel = "MISSING:";
          drawTextShadow(lctx, missingLabel, 6, 94, "#ffb8b8", "#2a0909");
          const shown = paintedAssetsErrorsRef.current.slice(0, 2);
          let my = 102;
          for (const raw of shown) {
            const line = raw.length > 31 ? `...${raw.slice(-28)}` : raw;
            drawTextShadow(lctx, line, 6, my, "#ffd6d6", "#2a0909");
            my += 8;
          }
        }
      } else {
        const blinkOn = (Math.floor(nowMs / 350) % 2) === 0;
        if (blinkOn) {
          const prompt = "PRESS ENTER";
          drawTextShadow(lctx, prompt, px + Math.floor((pw - textW(prompt)) / 2), py + 36, "#ffe48f", "#5b3c00");
        }
        const tapPrompt = "TAP TO START";
        drawTextShadow(lctx, tapPrompt, px + Math.floor((pw - textW(tapPrompt)) / 2), py + 50, "#bfe7ff", "#0b1628");
      }
      lctx.restore();
    };

    const spawn = (p: Particle) => particlesRef.current.push(p);
    const spawnTrail = (pose: RocketPose, dtMs: number): void => {
      trailAccRef.current += dtMs;
      while (trailAccRef.current >= 22) {
        trailAccRef.current -= 22; const r = rng((Math.floor(performance.now()) ^ particlesRef.current.length * 37) >>> 0); const bx = pose.x - Math.sin(pose.rot)*11; const by = pose.y + Math.cos(pose.rot)*11;
        const flick = (Math.floor(simElapsedRef.current / 72) & 1) === 0 ? 0.84 : 1;
        spawn({ kind:"trail", x:bx + (r()-0.5)*2, y:by + (r()-0.5)*2, vx:(r()-0.5)*8, vy:10 + r()*12, g:0, size:1 + Math.floor(r()*2), life:120 + r()*140, max:260, alpha:clamp(0.62 + pose.exhaust * 0.16, 0, MAX_GLOW_ALPHA) * flick, rot:0, spin:0, front:false, color: r() > 0.5 ? "#ffd98a" : "#9fe6ff" });
        if (r() > 0.72) spawn({ kind:"spark", x:bx, y:by, vx:(r()-0.5)*16, vy:(r()-0.5)*10 + 6, g:4, size:6 + r()*4, life:100 + r()*160, max:240, alpha:clamp(0.55 + pose.exhaust * 0.12, 0, MAX_GLOW_ALPHA) * flick, rot:r()*Math.PI*2, spin:(r()-0.5)*0.25, front:false, tile: r() > 0.5 ? "sparkle_1" : "sparkle_2" });
      }
    };
    const spawnTravelExhaust = (pose: RocketPose, dtMs: number, intensity: number): void => {
      const ratePerSec = lerp(8, 24, clamp(intensity, 0, 1));
      const lifeMax = lerp(250, 700, clamp(intensity, 0, 1));
      const brightnessBoost = clamp(intensity, 0, 1);
      exhaustAccRef.current += dtMs * (ratePerSec / 1000);
      while (exhaustAccRef.current >= 1) {
        exhaustAccRef.current -= 1;
        const r = rng((Math.floor(performance.now()) ^ (particlesRef.current.length * 71)) >>> 0);
        const bx = Math.round(pose.x - Math.sin(pose.rot) * 10);
        const by = Math.round(pose.y + Math.cos(pose.rot) * 10);
        spawn({
          kind: "trail",
          x: bx + Math.round((r() - 0.5) * 2),
          y: by + Math.round((r() - 0.5) * 2),
          vx: (r() - 0.5) * 5 - Math.sin(pose.rot) * 3,
          vy: 7 + r() * 8 + Math.cos(pose.rot) * 2,
          g: 0,
          size: 1 + (r() > 0.7 ? 1 : 0),
          life: 180 + r() * (lifeMax - 180),
          max: lifeMax,
          alpha: 0.65 + brightnessBoost * 0.35,
          rot: 0,
          spin: 0,
          front: false,
          color: r() > 0.75 ? (brightnessBoost > 0.5 ? "#ffe27f" : "#ffd67a") : r() > 0.45 ? "#ffdfb1" : (brightnessBoost > 0.5 ? "#b5efff" : "#9fe6ff"),
        });
        if (r() > 0.82) {
          spawn({
            kind: "spark",
            x: bx,
            y: by,
            vx: (r() - 0.5) * 10,
            vy: (r() - 0.5) * 8 + 4,
            g: 3,
            size: 4 + r() * 3,
            life: 120 + r() * (220 + brightnessBoost * 180),
            max: 350 + brightnessBoost * 250,
            alpha: 0.45 + brightnessBoost * 0.25,
            rot: r() * Math.PI * 2,
            spin: (r() - 0.5) * 0.18,
            front: false,
            tile: r() > 0.5 ? "sparkle_1" : "sparkle_2",
          });
        }
      }
    };
    const spawnSmoke = (pose: RocketPose, dtMs: number, intensity: number): void => {
      smokeAccRef.current += dtMs * (0.012 + intensity * 0.02);
      while (smokeAccRef.current >= 1) {
        smokeAccRef.current -= 1; const r = rng((Math.floor(performance.now()) ^ particlesRef.current.length * 53) >>> 0);
        spawn({ kind:"smoke", x:pose.x + (r()-0.5)*8, y:pose.y + 14 + r()*4, vx:(r()-0.5)*10, vy:4 + r()*8, g:-1.2, size:10 + r()*8 + intensity*4, life:180 + r()*220, max:420, alpha:0.8, rot:r()*Math.PI*2, spin:(r()-0.5)*0.08, front:false, tile: r() > 0.5 ? (r() > 0.5 ? "smoke_l_1" : "smoke_l_2") : (r() > 0.5 ? "smoke_m_1" : "smoke_m_2") });
      }
    };
    const spawnDust = (x: number, y: number): void => {
      const r = rng(0xcafe);
      for (let i = 0; i < 16; i += 1) {
        const ang = (i/16)*Math.PI + (r()-0.5)*0.45; const sp = 10 + r()*18;
        spawn({ kind:"dust", x, y, vx:Math.cos(ang)*sp, vy:-Math.abs(Math.sin(ang))*sp*0.7 - r()*4, g:24, size:8 + r()*7, life:170 + r()*250, max:420, alpha:1, rot:r()*Math.PI*2, spin:(r()-0.5)*0.14, front:true, tile: r() > 0.5 ? "impact_dust_1" : "impact_dust_2" });
      }
    };
    const spawnBonkDustSquares = (x: number, y: number): void => {
      const r = rng(((Math.floor(x) << 8) ^ Math.floor(y) ^ 0xb0a6) >>> 0);
      const colors = ["#d8cbb8", "#b8aa98", "#8f8580", "#e8dcc4"] as const;
      const count = 24 + Math.floor(r() * 13); // 24..36
      const baseX = Math.round(x / 2);
      const baseY = Math.round(y / 2);
      for (let i = 0; i < count; i += 1) {
        const ang = r() * Math.PI * 2;
        const sp = 9 + r() * 35; // lctx px/s
        const sizePick = [1, 1, 1, 2, 2, 2, 3][Math.floor(r() * 7)] ?? 1;
        dustRef.current.push({
          x: baseX + Math.round((r() - 0.5) * 2),
          y: baseY + Math.round((r() - 0.5) * 2),
          vx: Math.cos(ang) * sp + (r() * 12 - 6),
          vy: Math.sin(ang) * sp - (6 + r() * 18),
          life: 0,
          ttl: 600 + r() * 300,
          size: sizePick,
          color: colors[Math.floor(r() * colors.length)] ?? "#d8cbb8",
        });
      }
    };
    const spawnExplosion = (x: number, y: number): void => {
      const r = rng(0xdeadbeef);
      for (let i = 0; i < 52; i += 1) {
        const ang = (i/52)*Math.PI*2 + (r()-0.5)*0.2; const sp = 10 + r()*34; const tile = r() > 0.7 ? (r() > 0.5 ? "starburst_1" : "starburst_2") : r() > 0.35 ? (r() > 0.5 ? "glitter_1" : "glitter_2") : (r() > 0.5 ? "sparkle_1" : "sparkle_2");
        spawn({ kind:"spark", x, y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp - 2, g:12 + r()*16, size: tile.startsWith("starburst") ? 8 + r()*8 : 5 + r()*5, life:220 + r()*520, max:760, alpha:1, rot:r()*Math.PI*2, spin:(r()-0.5)*0.22, front:true, tile });
      }
    };
    const spawnSparklyPuff = (x: number, y: number): void => {
      spawnExplosion(x, y);
      const r = rng(((Math.floor(x) * 131) ^ (Math.floor(y) * 197) ^ 0x5f0ff) >>> 0);
      for (let i = 0; i < 18; i += 1) {
        const ang = (i / 18) * Math.PI * 2 + (r() - 0.5) * 0.35;
        const sp = 14 + r() * 20;
        spawn({
          kind: "spark",
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 3,
          g: 5 + r() * 7,
          size: 1 + Math.floor(r() * 2),
          life: 900 + r() * 500,
          max: 1400,
          alpha: 0.8,
          rot: 0,
          spin: 0,
          front: true,
          color: r() > 0.55 ? "#d8f5ff" : r() > 0.25 ? "#ffe2a6" : "#b9e8ff",
        });
      }
    };
    const updateImpactDust = (dtMs: number): void => {
      if (dustRef.current.length === 0) return;
      const dtSec = dtMs / 1000;
      const next: ImpactDust[] = [];
      for (const p of dustRef.current) {
        p.life += dtMs;
        if (p.life >= p.ttl) continue;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy += 140 * dtSec;
        p.vx *= 0.985;
        p.vy *= 0.985;
        next.push(p);
      }
      dustRef.current = next;
    };
    const drawImpactDust = (): void => {
      if (dustRef.current.length === 0) return;
      for (const p of dustRef.current) {
        const a = clamp(1 - p.life / p.ttl, 0, 1);
        if (a <= 0) continue;
        lctx.save();
        lctx.globalAlpha = a;
        lctx.fillStyle = p.color;
        const s = Math.max(1, Math.round(p.size));
        lctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
        lctx.restore();
      }
    };
    const aabbOverlap = (a1: Rect, a2: Rect, m = 0): boolean =>
      a1.x + a1.w > a2.x + m && a1.x < a2.x + a2.w - m && a1.y + a1.h > a2.y + m && a1.y < a2.y + a2.h - m;
    const updateParticles = (dtMs: number): void => {
      const dt = dtMs / 1000; const next: Particle[] = [];
      for (const p of particlesRef.current) { p.life -= dtMs; if (p.life <= 0) continue; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += p.g*dt; p.rot += p.spin; next.push(p); }
      particlesRef.current = next;
    };
    const drawParticles = (a: Assets, front: boolean): void => {
      for (const p of particlesRef.current) {
        if (p.front !== front) continue; const lt = clamp(p.life / p.max, 0, 1); const alpha = p.alpha * (p.kind === "smoke" ? lt * 0.75 : Math.sqrt(lt)); if (alpha <= 0) continue;
        if (p.tile) drawFx(a, p.tile, p.x, p.y, p.size, alpha, p.rot); else { lctx.save(); lctx.globalAlpha = alpha; lctx.fillStyle = p.color ?? "#fff"; const s = Math.max(1, Math.round(p.size)); lctx.fillRect(Math.round(p.x - s/2), Math.round(p.y - s/2), s, s); lctx.restore(); }
      }
    };

    const poseMontageBase = (prog: number, tSec: number): RocketPose => ({ x:104 + prog*58 + Math.sin(tSec*1.7)*1.4, y:29 + prog*30 + Math.sin(tSec*2.3 + prog*10)*3.4, rot:0.18 + Math.sin(tSec*1.5 + prog*4)*0.05, size:37, exhaust:0.45, thrust:false, visible:true });
    const poseFor = (tl: Timeline): RocketPose => {
      const a = assetsRef.current; if (!a) return { x:98, y:77, rot:0, size:40, exhaust:0, thrust:false, visible:false };
      const t = a.manifest.times; const tSec = tl.elapsed / 1000;
      if (tl.phase === "countdown") return { x:98 + Math.sin(tSec*5)*0.8, y:77 + Math.sin(tSec*7.5)*0.8, rot:Math.sin(tSec*4)*0.02, size:40, exhaust:0.55, thrust:false, visible:true };
      if (tl.phase === "liftoff") { const p = clamp(tl.local / t.liftoffToSpace, 0, 1); const target = poseMontageBase(0, tSec); return { x:lerp(98,target.x,easeInOut(p)), y:lerp(77,target.y,easeOut(p)), rot:lerp(0.02,0.16,easeOut(p)) + Math.sin(tSec*8)*0.02*(1-p), size:40, exhaust:lerp(0.9,1.9,p), thrust:true, visible:true }; }
      if (tl.phase === "montage") { const mp = clamp(tl.local / (PLANETS.length * t.planetHold), 0, 1); const base = poseMontageBase(mp, tSec); const u = clamp(tl.planetLocal / t.planetHold, 0, 1); const passT = clamp((u - 0.34) / 0.4, 0, 1); const surge = Math.sin(passT * Math.PI) * 24; return { x:base.x + surge, y:base.y + Math.sin(tSec*3.2 + tl.planetIndex*0.7)*1.8 + Math.sin(u*Math.PI*2)*0.8, rot:base.rot + Math.sin(u*Math.PI)*0.06, size:36, exhaust:0.35 + Math.sin(passT*Math.PI)*0.15, thrust: passT > 0.05 && passT < 0.95, visible:true }; }
      if (tl.phase === "crash") { const p = clamp(tl.local / t.crash, 0, 1); const hitT = 0.58; const start = poseMontageBase(1, tSec); if (p < hitT) { const k = easeInOut(p / hitT); return { x:lerp(start.x,149,k), y:lerp(start.y,79,k), rot:lerp(start.rot,0.92,k), size:36, exhaust:lerp(0.8,0.35,k), thrust:true, visible:true }; } const q = clamp((p - hitT)/(1-hitT), 0, 1); const damp = 1 - q; return { x:149 + Math.sin(q*24)*6*damp, y:79 + Math.sin(q*18 + 0.6)*2*damp, rot:0.95 + Math.sin(q*20)*0.17*damp, size:36, exhaust:0.15*damp, thrust:false, visible:true }; }
      return { x:0, y:0, rot:0, size:36, exhaust:0, thrust:false, visible:false };
    };
    const drawRocket = (a: Assets, p: RocketPose, tSec: number, alpha = 1, sizeScale = 1): void => {
      if (!p.visible) return; const tile = p.thrust ? (Math.floor(tSec*14)%2 ? "rocket_boost_1" : "rocket_boost_2") : (Math.floor(tSec*8)%2 ? "rocket_idle_1" : "rocket_idle_2");
      const size = p.size * sizeScale;
      lctx.save();
      lctx.globalAlpha *= clamp(alpha, 0, 1);
      if (p.exhaust > 0.2) {
        const flick = Math.floor(tSec * 14) % 2 ? 1 : 0.82;
        drawFx(a, Math.floor(tSec*14)%2 ? "sparkle_1" : "sparkle_2", p.x - Math.sin(p.rot)*11, p.y + Math.cos(p.rot)*11, 6 + p.exhaust*2, clamp(0.56 * flick + p.exhaust * 0.08, 0, MAX_GLOW_ALPHA), p.rot);
      }
      drawFx(a, tile, p.x, p.y, size, 1, p.rot);
      lctx.restore();
    };
    const drawRocketFull = (a: Assets, x: number, y: number, rot: number, tSec: number, alpha = 1, sizePx = 52): void => {
      const tile = Math.floor(tSec * 10) % 2 ? "rocket_boost_1" : "rocket_boost_2";
      const s = fxSrc(a, tile);
      if (!s) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(Math.round(x), Math.round(y));
      if (rot) ctx.rotate(rot);
      const d = Math.max(1, Math.round(sizePx));
      const cleaned = cleanedFxTilesRef.current[tile];
      if (cleaned) ctx.drawImage(cleaned, 0, 0, cleaned.width, cleaned.height, -Math.floor(d / 2), -Math.floor(d / 2), d, d);
      else ctx.drawImage(a.fx, s.x, s.y, s.w, s.h, -Math.floor(d / 2), -Math.floor(d / 2), d, d);
      ctx.restore();
    };
    const timelineFromElapsed = (elapsed: number): Timeline => {
      const a = assetsRef.current; if (!a) return { phase:"loading", elapsed:0, local:0, planetIndex:0, planetLocal:0 };
      if (forceCardRef.current) { const ce = cardEnterRef.current ?? elapsed; return { phase:"card", elapsed, local: elapsed - ce, planetIndex: PLANETS.length - 1, planetLocal:0 }; }
      const t = a.manifest.times; let c = elapsed; if (c < t.countdownTotal) return { phase:"countdown", elapsed, local:c, planetIndex:0, planetLocal:0 }; c -= t.countdownTotal; if (c < t.liftoffToSpace) return { phase:"liftoff", elapsed, local:c, planetIndex:0, planetLocal:0 }; c -= t.liftoffToSpace;
      const montage = PLANETS.length * t.planetHold; if (c < montage) { const i = Math.min(PLANETS.length - 1, Math.floor(c / t.planetHold)); return { phase:"montage", elapsed, local:c, planetIndex:i, planetLocal:c - i*t.planetHold }; }
      c -= montage; if (c < t.crash) return { phase:"crash", elapsed, local:c, planetIndex:PLANETS.length - 1, planetLocal:0 }; c -= t.crash; if (c < t.explosion) return { phase:"explosion", elapsed, local:c, planetIndex:PLANETS.length - 1, planetLocal:0 };
      if (cardEnterRef.current === null) cardEnterRef.current = elapsed; return { phase:"card", elapsed, local: elapsed - (cardEnterRef.current ?? elapsed), planetIndex: PLANETS.length - 1, planetLocal:0 };
    };
    const montageRocketPose = (): RocketPose => ({
      x: rocketXRef.current / 2,
      y: rocketYRef.current / 2,
      rot: 0,
      size: 26,
      exhaust: clamp(Math.abs(rocketVXRef.current) / 90, 0.35, 1),
      thrust: true,
      visible: true,
    });
    const updateRocket = (dtMs: number, tl: Timeline): RocketPose => {
      if (!rocketInitRef.current) {
        rocketXRef.current = -20;
        rocketYRef.current = H * 0.45;
        rocketVXRef.current = 40;
        rocketVYRef.current = 0;
        rocketRotRef.current = 0;
        rocketAnchorXRef.current = 154;
        rocketAnchorYRef.current = 94;
        corridorEntryElapsedRef.current = tl.elapsed;
        rocketInitRef.current = true;
      }
      const dt = clamp(dtMs / 1000, 0, 0.05);
      if (corridorEntryElapsedRef.current === null) corridorEntryElapsedRef.current = tl.elapsed;
      const planetHold = assetsRef.current?.manifest.times.planetHold ?? 1000;
      const p = tl.planetIndex + tl.planetLocal / Math.max(1, planetHold);
      const m = clamp(p / PLANETS.length, 0, 1);
      const u = clamp(tl.planetLocal / Math.max(1, planetHold), 0, 1);
      const approach = clamp(u / 0.25, 0, 1);
      const hold = clamp((u - 0.25) / 0.5, 0, 1);
      const exit = clamp((u - 0.75) / 0.25, 0, 1);
      const entryT = smoothstep(clamp((tl.elapsed - corridorEntryElapsedRef.current) / 2000, 0, 1));
      rocketAnchorXRef.current = Math.round(lerp(164, 232, entryT));
      rocketAnchorYRef.current = Math.round(lerp(106, 72, entryT));
      const verticalLift = Math.round(m * 30);
      const baseX = rocketAnchorXRef.current + Math.sin(m * Math.PI * 2.1) * 5 + Math.sin(m * Math.PI * 5.2 + 0.4) * 2;
      const baseY = Math.round(rocketAnchorYRef.current - verticalLift + Math.sin(m * Math.PI * 3.1) * 8);
      let targetX = baseX;
      let targetY = baseY + Math.sin((p + 0.1) * Math.PI * 1.6) * 2;
      targetX += lerp(0, -6, smoothstep(approach));
      targetX += lerp(0, 4, smoothstep(hold));
      targetX += lerp(0, 12, smoothstep(exit));
      targetY += lerp(0, 4, smoothstep(approach));
      targetY += lerp(0, -3, smoothstep(hold));
      targetY += lerp(0, -6, entryT);
      targetX = clamp(targetX, 152, 238);
      targetY = clamp(targetY, 32, 140);

      const k = 12;
      const d = 7;
      const ax = (targetX - rocketXRef.current) * k - rocketVXRef.current * d;
      const ay = (targetY - rocketYRef.current) * k - rocketVYRef.current * d;
      rocketVXRef.current += ax * dt;
      rocketVYRef.current += ay * dt;
      rocketXRef.current += rocketVXRef.current * dt;
      rocketYRef.current += rocketVYRef.current * dt;

      rocketRotRef.current = 0;
      return montageRocketPose();
    };
    const guard = (ok: boolean, msg: string): void => {
      if (ok) return;
      if (DEV) {
        if (!guardErrorRef.current) guardErrorRef.current = msg;
        return;
      }
      if (prodGuardLoggedRef.current !== msg) {
        prodGuardLoggedRef.current = msg;
        console.error("CONTACT MISSION GUARD", msg, { phase: phaseRef.current, elapsed: Math.round(simElapsedRef.current) });
      }
      skipRequestedRef.current = true;
      reachedCardRef.current = true;
      forceCardRef.current = true;
      if (cardEnterRef.current === null) cardEnterRef.current = simElapsedRef.current;
      forceRedrawRef.current = true;
    };
    const resetAll = (reason: string): void => {
      void reason;
      simElapsedRef.current = 0;
      lastRealRef.current = null;
      particlesRef.current = [];
      trailAccRef.current = 0;
      smokeAccRef.current = 0;
      countdownShownRef.current = null;
      crashOnceRef.current = false;
      explosionOnceRef.current = false;
      toastRef.current = null;
      forceRedrawRef.current = false;
      rafPausedRef.current = false;
      forceCardRef.current = false;
      cardEnterRef.current = null;
      reachedCardRef.current = false;
      guardErrorRef.current = null;
      pausedRef.current = false;
      stepOnceRef.current = false;
      skipRequestedRef.current = false;
      phaseRef.current = "prestart";
      rocketXRef.current = -20;
      rocketYRef.current = H * 0.45;
      rocketVXRef.current = 40;
      rocketVYRef.current = 0;
      rocketRotRef.current = 0;
      rocketInitRef.current = false;
      rocketAnchorXRef.current = 154;
      rocketAnchorYRef.current = 94;
      corridorEntryElapsedRef.current = null;
      inCorridorRef.current = false;
      corridorLatchRef.current = false;
      dbgCorridorLatchReasonRef.current = "NONE";
      exhaustAccRef.current = 0;
      crashTriggeredRef.current = false;
      crashStartElapsedRef.current = null;
      impactAnchorRef.current = null;
      crashImpactXRef.current = Math.round(W * 0.62);
      crashImpactYRef.current = Math.round(H * 0.45);
      shakeAmpRef.current = 0;
      shakeTRef.current = 0;
      wobbleRef.current = 0;
      wobbleVRef.current = 0;
      impactFreezeUntilRef.current = 0;
      bonkStartRef.current = 0;
      bonkActiveRef.current = false;
      paintedBonkStartMsRef.current = null;
      explosionAnimStartRef.current = null;
      paintedExplosionStartMsRef.current = null;
      paintedExplosionActiveRef.current = false;
      paintedExplosionFrameIdxRef.current = 0;
      paintedExplosionStartedFromRef.current = "NONE";
      paintedImpactFxRef.current = {
        bonkStartMs: null,
        explosionStartMs: null,
        explosionActive: false,
        explosionFrameIdx: 0,
        explosionStartedFrom: "NONE",
      };
      cardPopStartRef.current = null;
      paintedCardPopStartMsRef.current = null;
      dustRef.current = [];
      dbgPlanetNameRef.current = "-";
      dbgPlanetURef.current = 0;
      dbgPlanetXRef.current = 0;
      dbgPlanetWRef.current = 0;
      dbgSpriteReadyRef.current = false;
      dbgSpriteAlphaPxRef.current = 0;
      dbgSpritePreviewRef.current = null;
      prodGuardLoggedRef.current = null;
      hoverRef.current = null;
      mouseRef.current = { x: -999, y: -999 };
      cardHitboxesScreenRef.current = { soundToggle: getSoundMainRect() };
    };
    const phaseOffsets = (a?: Assets | null) => {
      const t = a?.manifest.times ?? { countdownTotal: 2400, liftoffToSpace: 1800, planetHold: 1000, planetXFade: 120, crash: 900, explosion: 900 };
      const countdown = 0;
      const liftoff = countdown + t.countdownTotal;
      const montage = liftoff + t.liftoffToSpace;
      const crash = montage + PLANETS.length * t.planetHold;
      const explosion = crash + t.crash;
      const card = explosion + t.explosion;
      return { countdown, liftoff, montage, crash, explosion, card };
    };
    const jumpToPhase = (target: "countdown" | "liftoff" | "montage" | "crash" | "explosion" | "card"): void => {
      const o = phaseOffsets(assetsRef.current);
      const eps = 10;
      const preserveImpactBeat = target === "card" && paintedModeRef.current && (paintedExplosionActiveRef.current || paintedExplosionStartMsRef.current !== null);
      let v = 0;
      if (target === "countdown") v = o.countdown + eps;
      else if (target === "liftoff") v = o.liftoff + eps;
      else if (target === "montage") v = o.montage + eps;
      else if (target === "crash") v = o.crash + eps;
      else if (target === "explosion") v = o.explosion + eps;
      else v = o.card + eps;
      simElapsedRef.current = v;
      lastRealRef.current = null;
      forceCardRef.current = false;
      cardEnterRef.current = target === "card" ? v : null;
      particlesRef.current = [];
      trailAccRef.current = 0;
      smokeAccRef.current = 0;
      crashOnceRef.current = false;
      explosionOnceRef.current = false;
      toastRef.current = null;
      forceRedrawRef.current = false;
      rafPausedRef.current = false;
      phaseRef.current = target;
      reachedCardRef.current = false;
      guardErrorRef.current = null;
      countdownShownRef.current = null;
      skipRequestedRef.current = target === "card";
      exhaustAccRef.current = 0;
      crashTriggeredRef.current = target === "crash" || target === "explosion";
      crashStartElapsedRef.current = target === "crash" ? v : null;
      if (!preserveImpactBeat) {
        impactAnchorRef.current = null;
        crashImpactXRef.current = Math.round(W * 0.62);
        crashImpactYRef.current = Math.round(H * 0.45);
      }
      shakeAmpRef.current = 0;
      shakeTRef.current = 0;
      wobbleRef.current = 0;
      wobbleVRef.current = 0;
      impactFreezeUntilRef.current = 0;
      if (!preserveImpactBeat) {
        bonkStartRef.current = 0;
        bonkActiveRef.current = false;
        paintedBonkStartMsRef.current = null;
        explosionAnimStartRef.current = null;
        paintedExplosionStartMsRef.current = null;
        paintedExplosionActiveRef.current = false;
        paintedExplosionFrameIdxRef.current = 0;
        paintedExplosionStartedFromRef.current = "NONE";
        paintedImpactFxRef.current = {
          bonkStartMs: null,
          explosionStartMs: null,
          explosionActive: false,
          explosionFrameIdx: 0,
          explosionStartedFrom: "NONE",
        };
        paintedCardPopStartMsRef.current = null;
      }
      cardPopStartRef.current = null;
      dustRef.current = [];
      prodGuardLoggedRef.current = null;
      hoverRef.current = null;
      cardHitboxesScreenRef.current = { soundToggle: getSoundMainRect() };
      inCorridorRef.current = target === "montage" || target === "crash" || target === "explosion" || target === "card";
      corridorLatchRef.current = target === "montage" || target === "crash" || target === "explosion" || target === "card";
      dbgCorridorLatchReasonRef.current = corridorLatchRef.current ? "MODE" : "NONE";
      if (target === "montage") {
        rocketXRef.current = -20;
        rocketYRef.current = H * 0.45;
        rocketVXRef.current = 40;
        rocketVYRef.current = 0;
        rocketRotRef.current = 0;
        rocketAnchorXRef.current = 154;
        rocketAnchorYRef.current = 94;
        corridorEntryElapsedRef.current = v;
        rocketInitRef.current = true;
      }
    };

    const drawButton = (r: Rect, label: string, hov: boolean): void => {
      const lr = rectL(r); lctx.fillStyle = hov ? "#4f78ba" : "#345a92"; lctx.fillRect(lr.x, lr.y, lr.w, lr.h); lctx.fillStyle = "#10192f"; lctx.fillRect(lr.x+1, lr.y+1, Math.max(1, lr.w-2), Math.max(1, lr.h-2)); lctx.fillStyle = hov ? "#dff0ff" : "#bdd5fb"; lctx.fillRect(lr.x+1, lr.y+1, Math.max(1, lr.w-2), 2);
      drawTextShadow(lctx, label, lr.x + Math.max(2, Math.floor((lr.w - textW(label))/2)), lr.y + Math.max(2, Math.floor((lr.h - 7)/2)), "#f4f8ff", "#06090f");
    };
    const drawSocial = (id: ActionId, r: Rect, hov: boolean): void => {
      const lr = rectL(r); lctx.fillStyle = hov ? "#5b88d1" : "#426caf"; lctx.fillRect(lr.x, lr.y, lr.w, lr.h); lctx.fillStyle = "#121f39"; lctx.fillRect(lr.x+1, lr.y+1, Math.max(1,lr.w-2), Math.max(1,lr.h-2)); lctx.fillStyle = "#e0efff";
      if (id === "social1") { lctx.strokeStyle = "#e0efff"; lctx.lineWidth = 1; lctx.strokeRect(lr.x+5, lr.y+5, 7, 7); lctx.fillRect(lr.x+8, lr.y+8, 2, 2); }
      else if (id === "social2") { lctx.fillRect(lr.x+7, lr.y+4, 2, 9); lctx.fillRect(lr.x+5, lr.y+8, 5, 2); lctx.fillRect(lr.x+10, lr.y+8, 3, 2); }
      else if (id === "social3") { lctx.fillRect(lr.x+4, lr.y+4, 2, 9); lctx.fillRect(lr.x+7, lr.y+6, 2, 7); lctx.fillRect(lr.x+10, lr.y+6, 2, 7); }
      else { lctx.fillRect(lr.x+4, lr.y+5, 2, 2); lctx.fillRect(lr.x+6, lr.y+7, 2, 2); lctx.fillRect(lr.x+8, lr.y+9, 2, 2); lctx.fillRect(lr.x+10, lr.y+5, 2, 2); }
    };
    const drawMiniCapsule = (text: string, alpha: number): void => {
      if (alpha <= 0) return;
      const maxW = 90;
      const wMain = clamp(text.length * 6 + 12, 34, maxW);
      guard(wMain <= maxW, "LABEL_CAPSULE_OVERSIZE");
      const r = rectL({ x: Math.round((W - wMain) / 2), y: 10, w: wMain, h: 14 });
      lctx.save();
      lctx.globalAlpha = clamp(alpha, 0, 1);
      lctx.fillStyle = "#0c1526";
      lctx.fillRect(r.x, r.y, r.w, r.h);
      lctx.fillStyle = "#2d4468";
      lctx.fillRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
      drawTextShadow(lctx, text, r.x + Math.max(2, Math.floor((r.w - textW(text)) / 2)), r.y + 3, "#eff6ff", "#05080f");
      lctx.restore();
    };
    const drawTextPx = (
      ctx2: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      color: string,
      sc = 1,
      outlineColor?: string,
    ): void => {
      const xx = Math.round(x);
      const yy = Math.round(y);
      if (outlineColor) {
        drawText(ctx2, text, xx - sc, yy, outlineColor, sc);
        drawText(ctx2, text, xx + sc, yy, outlineColor, sc);
        drawText(ctx2, text, xx, yy - sc, outlineColor, sc);
        drawText(ctx2, text, xx, yy + sc, outlineColor, sc);
      }
      drawText(ctx2, text, xx, yy, color, sc);
    };
    const drawPixelPanel = (rMain: Rect): void => {
      const r = rectL(rMain);
      lctx.save();
      lctx.fillStyle = "rgba(4,8,16,0.42)";
      lctx.fillRect(r.x + 1, r.y + 1, r.w, r.h);
      lctx.fillStyle = "#cfd6e7";
      lctx.fillRect(r.x, r.y, r.w, r.h);
      lctx.fillStyle = "#111d35";
      lctx.fillRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
      lctx.fillStyle = "#d5d0de";
      lctx.fillRect(r.x + 2, r.y + 2, Math.max(1, r.w - 4), Math.max(1, r.h - 4));
      lctx.fillStyle = "#e8e3ef";
      lctx.fillRect(r.x + 2, r.y + 2, Math.max(1, r.w - 4), 1);
      lctx.fillStyle = "#f4f0f7";
      lctx.fillRect(r.x + 3, r.y + 3, Math.max(1, r.w - 6), 1);
      lctx.fillStyle = "#7f7392";
      lctx.fillRect(r.x + 2, r.y + r.h - 3, Math.max(1, r.w - 4), 1);
      lctx.fillStyle = "#495272";
      lctx.fillRect(r.x + 2, r.y + 2, 1, Math.max(1, r.h - 4));
      lctx.fillRect(r.x + r.w - 3, r.y + 2, 1, Math.max(1, r.h - 4));
      lctx.fillStyle = "#a897c2";
      lctx.fillRect(r.x + 5, r.y + 5, 1, 1);
      lctx.fillRect(r.x + r.w - 6, r.y + 5, 1, 1);
      lctx.fillRect(r.x + 5, r.y + r.h - 6, 1, 1);
      lctx.fillRect(r.x + r.w - 6, r.y + r.h - 6, 1, 1);
      lctx.restore();
    };
    const drawPixelStarBadge = (xMain: number, yMain: number): void => {
      const x = sx(xMain);
      const y = sy(yMain);
      lctx.save();
      lctx.fillStyle = "#3a2a10";
      lctx.fillRect(x - 1, y - 1, 7, 7);
      lctx.fillStyle = "#f5cf68";
      lctx.fillRect(x + 2, y, 1, 5);
      lctx.fillRect(x, y + 2, 5, 1);
      lctx.fillRect(x + 1, y + 1, 3, 3);
      lctx.fillStyle = "#fff4c0";
      lctx.fillRect(x + 2, y + 1, 1, 3);
      lctx.fillRect(x + 1, y + 2, 3, 1);
      lctx.restore();
    };
    const drawPixelButton = (
      rectMain: Rect,
      label: string,
      hovered: boolean,
      kind: "primary" | "secondary" | "nav",
      small = false,
    ): void => {
      const r = rectL(rectMain);
      lctx.save();
      const base =
        kind === "primary" ? (hovered ? "#4e78bd" : "#3f66a5")
        : kind === "secondary" ? (hovered ? "#55627f" : "#414d66")
        : (hovered ? "#5c6882" : "#4a546a");
      const inner =
        kind === "primary" ? (hovered ? "#9fc7ff" : "#8eb7ee")
        : kind === "secondary" ? (hovered ? "#c0c8da" : "#a8b2c6")
        : (hovered ? "#d5dbe8" : "#c4cbda");
      lctx.fillStyle = "#0f172a";
      lctx.fillRect(r.x, r.y, r.w, r.h);
      lctx.fillStyle = base;
      lctx.fillRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
      lctx.fillStyle = kind === "primary" ? "#162745" : "#1b2231";
      lctx.fillRect(r.x + 2, r.y + 2, Math.max(1, r.w - 4), Math.max(1, r.h - 4));
      lctx.fillStyle = inner;
      lctx.fillRect(r.x + 2, r.y + 2, Math.max(1, r.w - 4), 1);
      if (hovered) {
        lctx.fillStyle = "rgba(210,236,255,0.22)";
        lctx.fillRect(r.x + 2, r.y + 3, Math.max(1, r.w - 4), Math.max(1, Math.floor((r.h - 5) * 0.45)));
      }
      const textScale = small ? 1 : 1;
      drawTextPx(lctx, label, r.x + Math.max(2, Math.floor((r.w - textW(label, textScale)) / 2)), r.y + Math.max(2, Math.floor((r.h - 7 * textScale) / 2)), kind === "primary" ? "#eef6ff" : "#f2f5fb", textScale, "#07101d");
      lctx.restore();
    };
    const drawSocialIcon = (id: ActionId, rectMain: Rect, hovered: boolean): void => {
      const r = rectL(rectMain);
      lctx.save();
      lctx.fillStyle = hovered ? "#4d5d80" : "#3f4964";
      lctx.fillRect(r.x, r.y, r.w, r.h);
      lctx.fillStyle = "#121a28";
      lctx.fillRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
      lctx.fillStyle = hovered ? "#d8eeff" : "#cfd8ea";
      if (id === "social1") {
        lctx.strokeStyle = lctx.fillStyle;
        lctx.lineWidth = 1;
        lctx.strokeRect(r.x + 4, r.y + 4, 9, 9);
        lctx.fillRect(r.x + 7, r.y + 7, 3, 3);
        lctx.fillRect(r.x + 11, r.y + 5, 1, 1);
      } else if (id === "social2") {
        lctx.fillRect(r.x + 7, r.y + 4, 2, 8);
        lctx.fillRect(r.x + 9, r.y + 5, 2, 2);
        lctx.fillRect(r.x + 6, r.y + 11, 7, 2);
        lctx.fillRect(r.x + 10, r.y + 7, 2, 5);
      } else if (id === "social3") {
        lctx.fillRect(r.x + 5, r.y + 6, 2, 7);
        lctx.fillRect(r.x + 5, r.y + 4, 2, 1);
        lctx.fillRect(r.x + 9, r.y + 7, 2, 6);
        lctx.fillRect(r.x + 12, r.y + 7, 2, 6);
        lctx.fillRect(r.x + 9, r.y + 6, 5, 1);
      } else if (id === "social4") {
        lctx.fillRect(r.x + 4, r.y + 4, 2, 2);
        lctx.fillRect(r.x + 6, r.y + 6, 2, 2);
        lctx.fillRect(r.x + 8, r.y + 8, 2, 2);
        lctx.fillRect(r.x + 10, r.y + 10, 2, 2);
        lctx.fillRect(r.x + 10, r.y + 4, 2, 2);
        lctx.fillRect(r.x + 8, r.y + 6, 2, 2);
        lctx.fillRect(r.x + 6, r.y + 8, 2, 2);
        lctx.fillRect(r.x + 4, r.y + 10, 2, 2);
      }
      if (hovered) {
        lctx.strokeStyle = "#bfe7ff";
        lctx.lineWidth = 1;
        lctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      }
      lctx.restore();
    };
    const getSocialIconSprite = (id: ActionId): HTMLCanvasElement | null => {
      if (!["social1", "social2", "social3", "social4"].includes(id)) return null;
      const cached = socialIconSpritesRef.current[id];
      if (cached) return cached;
      const c = makeCanvas(28, 28);
      const g = c.getContext("2d");
      if (!g) return null;
      g.imageSmoothingEnabled = false;
      const px = (x: number, y: number, w = 1, h = 1): void => { g.fillRect(x, y, w, h); };
      g.clearRect(0, 0, 28, 28);
      g.fillStyle = "#dbe5f6";
      if (id === "social1") {
        // Instagram camera glyph (rounded square + lens + flash dot)
        px(7, 6, 14, 2); px(7, 20, 14, 2); px(6, 7, 2, 14); px(20, 7, 2, 14);
        px(8, 8, 1, 1); px(19, 8, 1, 1); px(8, 19, 1, 1); px(19, 19, 1, 1);
        px(11, 10, 6, 2); px(10, 11, 2, 6); px(16, 11, 2, 6); px(11, 16, 6, 2);
        px(17, 9, 2, 2);
      } else if (id === "social2") {
        // TikTok note with cyan/pink offset shadows
        const note = (ox: number, oy: number): void => {
          px(15 + ox, 5 + oy, 2, 12);
          px(17 + ox, 5 + oy, 5, 2);
          px(16 + ox, 8 + oy, 2, 11);
          px(11 + ox, 16 + oy, 7, 2);
          px(10 + ox, 15 + oy, 2, 4);
          px(14 + ox, 4 + oy, 2, 2);
          px(12 + ox, 17 + oy, 2, 2);
        };
        g.fillStyle = "#ff5fa2";
        note(-1, 1);
        g.fillStyle = "#5eefff";
        note(1, 0);
        g.fillStyle = "#f6fbff";
        note(0, 0);
      } else if (id === "social3") {
        // LinkedIn "in" pixel motif
        px(7, 9, 2, 12); px(7, 6, 2, 2); // i
        px(12, 9, 2, 12); // n left
        px(14, 9, 6, 2); // n cap
        px(18, 10, 2, 11); // n right
        px(14, 11, 2, 2); // n shoulder
      } else {
        // X logo diagonals
        px(7, 6, 3, 3); px(10, 9, 2, 2); px(12, 11, 2, 2); px(14, 13, 2, 2); px(16, 15, 2, 2); px(18, 17, 3, 3);
        px(18, 6, 3, 3); px(16, 8, 2, 2); px(14, 10, 2, 2); px(12, 12, 2, 2); px(10, 14, 2, 2); px(8, 16, 2, 2); px(7, 18, 3, 3);
      }
      socialIconSpritesRef.current[id] = c;
      return c;
    };
    const drawCardToBuffer = (hoveredId: HoverId): void => {
      const b = cardBufRef.current;
      const cLo = cardCtxRef.current;
      const bHi = cardBufHiRef.current;
      const c = cardCtxHiRef.current;
      if (!b || !cLo || !bHi || !c) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, bHi.width, bHi.height);
      c.setTransform(2, 0, 0, 2, 0, 0);
      c.fillStyle = "rgba(7,10,18,0.22)";
      c.fillRect(3, 3, b.width - 3, b.height - 3);
      c.fillStyle = "#d8d3e3";
      c.fillRect(0, 0, b.width, b.height);
      c.fillStyle = "#111b31";
      c.fillRect(2, 2, b.width - 4, b.height - 4);
      c.fillStyle = "#e6e0ef";
      c.fillRect(4, 4, b.width - 8, b.height - 8);
      c.fillStyle = "#f4effb";
      c.fillRect(4, 4, b.width - 8, 1);
      c.fillStyle = "#c3bad4";
      c.fillRect(4, 5, b.width - 8, 1);
      c.fillStyle = "#b39fca";
      c.fillRect(6, 6, 2, 2);
      c.fillRect(b.width - 8, 6, 2, 2);
      c.fillRect(6, b.height - 8, 2, 2);
      c.fillRect(b.width - 8, b.height - 8, 2, 2);
      c.fillStyle = "#ede6f4";
      c.fillRect(10, 12, b.width - 20, 1);

      c.fillStyle = "#3a2a10";
      c.fillRect(326, 16, 8, 8);
      c.fillStyle = "#f1c85f";
      c.fillRect(329, 17, 2, 6);
      c.fillRect(327, 19, 6, 2);
      c.fillStyle = "#fff0b8";
      c.fillRect(329, 18, 2, 4);
      c.fillRect(328, 19, 4, 2);

      drawTextUi(c, "EMAIL", 18, 42, "#324660", 1);

      const drawBufButton = (r: Rect, label: string, hovered: boolean, kind: "primary" | "secondary" | "nav"): void => {
        c.save();
        const base = kind === "primary" ? (hovered ? "#4d79c4" : "#3d68ab") : kind === "secondary" ? (hovered ? "#566686" : "#44526d") : (hovered ? "#5b6884" : "#4e586f");
        c.fillStyle = "#0f1728";
        c.fillRect(r.x, r.y, r.w, r.h);
        c.fillStyle = base;
        c.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        c.fillStyle = kind === "primary" ? "#16284a" : "#1a2334";
        c.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        c.fillStyle = hovered ? "rgba(230,246,255,0.18)" : "rgba(255,255,255,0.08)";
        c.fillRect(r.x + 2, r.y + 2, r.w - 4, 1);
        if (hovered) c.fillRect(r.x + 2, r.y + 3, r.w - 4, Math.max(1, Math.floor((r.h - 5) * 0.4)));
        const labelScale = kind === "nav" ? 1 : (uiTextW(label, 2) <= r.w - 10 ? 2 : 1);
        const tx = r.x + Math.max(2, Math.floor((r.w - uiTextW(label, labelScale)) / 2));
        const ty = r.y + Math.max(1, Math.floor((r.h - UI_GLYPH_H * labelScale) / 2));
        drawTextUiShadow(c, label, tx, ty, "#f4f8ff", "#07101d", labelScale);
        c.restore();
      };
      drawBufButton(CARD_ACTION_RECTS.openEmail, "OPEN EMAIL", hoveredId === "openEmail", "primary");
      drawBufButton(CARD_ACTION_RECTS.copyEmail, "COPY EMAIL", hoveredId === "copyEmail", "secondary");

      const socialOrder: ActionId[] = ["social1", "social2", "social3", "social4"];
      for (const id of socialOrder) {
        const r = CARD_ACTION_RECTS[id];
        const hovered = hoveredId === id;
        c.save();
        c.fillStyle = hovered ? "#4d5f84" : "#3d4761";
        c.fillRect(r.x, r.y, r.w, r.h);
        c.fillStyle = "#121a28";
        c.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        if (hovered) {
          c.strokeStyle = "#bfe9ff";
          c.lineWidth = 1;
          c.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
        }
        const icon = getSocialIconSprite(id);
        if (icon) {
          c.imageSmoothingEnabled = false;
          c.drawImage(icon, r.x + Math.floor((r.w - icon.width) / 2), r.y + Math.floor((r.h - icon.height) / 2));
        }
        c.restore();
      }
      drawBufButton(CARD_ACTION_RECTS.backToPortals, "CHLOEVERSE", hoveredId === "backToPortals", "nav");
      drawBufButton(CARD_ACTION_RECTS.candyCastle, "CANDY CASTLE", hoveredId === "candyCastle", "nav");

      c.setTransform(1, 0, 0, 1, 0, 0);
      cLo.setTransform(1, 0, 0, 1, 0, 0);
      cLo.imageSmoothingEnabled = false;
      cLo.clearRect(0, 0, b.width, b.height);
      // Exact 2:1 downsample from the hi-res card UI buffer into the native card buffer.
      cLo.drawImage(bHi, 0, 0, bHi.width, bHi.height, 0, 0, b.width, b.height);
      // Re-draw header + email via dedicated hi-res text buffer for extra legibility.
      drawDisplayTextHiToCard(cLo, CONTACT.name.toUpperCase(), 18, 14, "#08101c", 3, {
        shadow: "rgba(8,14,24,0.28)",
        pad: 2,
      });
      const emailLine = CONTACT.email;
      drawUiTextHiToCard(cLo, emailLine, 18, 54, "#070f18", 1, {
        shadow: "rgba(8,14,24,0.20)",
        tracking: 2,
        shadowOnly: true,
        pad: 2,
      });
    };
    const syncCardActionRects = (dx: number, dy: number, s: number): void => {
      const nextBoxes: Partial<Record<ScreenHitboxId, Rect>> = {
        soundToggle: getSoundMainRect(),
      };
      for (const action of actionsRef.current) {
        const base = CARD_ACTION_RECTS[action.id];
        if (!base) continue;
        const rect = {
          x: dx + Math.round(base.x * s),
          y: dy + Math.round(base.y * s),
          w: Math.max(1, Math.round(base.w * s)),
          h: Math.max(1, Math.round(base.h * s)),
        };
        action.rect = rect;
        nextBoxes[action.id] = rect;
      }
      cardHitboxesScreenRef.current = nextBoxes;
    };
    const drawToast = (elapsedMs: number, cardY: number, cardH: number): void => {
      const toast = toastRef.current;
      if (!toast) return;
      const age = elapsedMs - toast.startMs;
      if (age >= toast.durMs) {
        toastRef.current = null;
        return;
      }
      const fadeTail = 200;
      const a = age < toast.durMs - fadeTail ? 1 : clamp((toast.durMs - age) / fadeTail, 0, 1);
      const tw = Math.max(42, Math.min(W - 12, uiTextW(toast.text) + 22));
      const th = 18;
      const x = Math.round(W / 2 - tw / 2);
      const y = Math.round(Math.min(H - 24, cardY + cardH - 26));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#0d1528";
      ctx.fillRect(x, y, tw, th);
      ctx.fillStyle = "#a8ddff";
      ctx.fillRect(x, y, tw, 2);
      ctx.fillRect(x, y + th - 2, tw, 2);
      ctx.fillRect(x, y, 2, th);
      ctx.fillRect(x + tw - 2, y, 2, th);
      ctx.fillStyle = "#24354f";
      ctx.fillRect(x + 2, y + 2, Math.max(1, tw - 4), Math.max(1, th - 4));
      ctx.fillStyle = "#101a2e";
      ctx.fillRect(x + 3, y + 3, Math.max(1, tw - 6), 1);
      drawTextUiShadow(ctx, toast.text, x + Math.max(3, Math.floor((tw - uiTextW(toast.text)) / 2)), y + 5, "#f6fbff", "#050a12", 1);
      ctx.globalAlpha = 1;
      ctx.restore();
    };
    const getImpactAnchorCanvas = (): { cx: number; cy: number } => {
      const a0 = impactAnchorRef.current;
      if (a0) return a0;
      return {
        cx: crashImpactXRef.current || Math.round(W * 0.6),
        cy: crashImpactYRef.current || Math.round(H * 0.45),
      };
    };
    const startExplosion = (kind: "PLUTO" | "E", x: number, y: number, nowMs: number): void => {
      const cx = Math.round(x);
      const cy = Math.round(y);
      crashImpactXRef.current = cx;
      crashImpactYRef.current = cy;
      impactAnchorRef.current = { cx, cy };
      paintedImpactFxRef.current.explosionStartMs = nowMs;
      paintedImpactFxRef.current.explosionActive = true;
      paintedImpactFxRef.current.explosionFrameIdx = 0;
      paintedImpactFxRef.current.explosionStartedFrom = kind;
      paintedExplosionStartMsRef.current = nowMs;
      paintedExplosionActiveRef.current = true;
      paintedExplosionFrameIdxRef.current = 0;
      paintedExplosionStartedFromRef.current = kind;
    };
    const getPaintedExplosionAgeMs = (nowMs: number | null): number | null => {
      const start = paintedImpactFxRef.current.explosionStartMs;
      if (nowMs === null || start === null || !paintedImpactFxRef.current.explosionActive) return null;
      const age = Math.max(0, nowMs - start);
      if (age >= PAINTED_EXPLOSION_PERSIST_MS) {
        paintedImpactFxRef.current.explosionActive = false;
        paintedImpactFxRef.current.explosionFrameIdx = PAINTED_EXPLOSION_FRAME_COUNT - 1;
        paintedExplosionActiveRef.current = false;
        paintedExplosionFrameIdxRef.current = PAINTED_EXPLOSION_FRAME_COUNT - 1;
        return null;
      }
      const frameIdx = clamp(Math.floor(age / PAINTED_EXPLOSION_FRAME_MS), 0, PAINTED_EXPLOSION_FRAME_COUNT - 1);
      paintedImpactFxRef.current.explosionFrameIdx = frameIdx;
      paintedExplosionFrameIdxRef.current = frameIdx;
      paintedExplosionStartMsRef.current = paintedImpactFxRef.current.explosionStartMs;
      paintedExplosionActiveRef.current = paintedImpactFxRef.current.explosionActive;
      paintedExplosionStartedFromRef.current = paintedImpactFxRef.current.explosionStartedFrom;
      return age;
    };
    const getPaintedExplosionFrameIdx = (nowMs: number | null): number | null => {
      const age = getPaintedExplosionAgeMs(nowMs);
      if (age === null) return null;
      return paintedImpactFxRef.current.explosionFrameIdx;
    };
    const getPaintedCardPopElapsedMs = (nowMs: number | null): number | null => {
      const start = paintedCardPopStartMsRef.current;
      if (nowMs === null || start === null) return null;
      if (nowMs < start) return null;
      return nowMs - start;
    };
    const getCrashPlutoDrawRect = (): { x: number; y: number; w: number; h: number } => {
      const plutoSprite = (planetSpritesRef.current?.pluto ?? fallbackPlanetSprite("pluto"));
      const plutoScale = Math.round(1.25 * 16) / 16;
      const plutoW = Math.max(1, Math.round(plutoSprite.w * plutoScale));
      const plutoH = Math.max(1, Math.round(plutoSprite.h * plutoScale));
      const plutoX = Math.round(W * 0.62 - plutoW / 2);
      const plutoY = Math.round(H * 0.45 - plutoH / 2);
      return { x: plutoX, y: plutoY, w: plutoW, h: plutoH };
    };
    const drawPaintedImpactPluto = (nowMs: number | null, shakeX = 0, shakeY = 0): boolean => {
      if (!paintedReady() || !paintedLayersRef.current?.pluto) return false;
      const { x, y, w, h } = getCrashPlutoDrawRect();
      const exAge = getPaintedExplosionAgeMs(nowMs);
      const alpha = exAge === null
        ? (paintedExplosionStartMsRef.current !== null ? 0 : 1)
        : clamp(1 - exAge / 160, 0, 1);
      if (alpha <= 0) return false;
      drawPaintedCentered(
        paintedLayersRef.current.pluto,
        Math.round(x + w / 2 + shakeX),
        Math.round(y + h / 2 + shakeY),
        w,
        h,
        alpha,
      );
      return true;
    };
    const drawPaintedCentered = (img: PaintedImage, cx: number, cy: number, wPx: number, hPx: number, alpha = 1): void => {
      if (!(wPx > 0 && hPx > 0) || alpha <= 0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      drawPaintedCover(
        img,
        Math.round(cx - wPx / 2),
        Math.round(cy - hPx / 2),
        Math.round(wPx),
        Math.round(hPx),
      );
      ctx.restore();
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;
    };
    const drawPaintedBonkAtImpact = (nowMs: number | null, shakeX = 0, shakeY = 0): boolean => {
      if (!paintedReady()) return false;
      const bonkFrames = paintedLayersRef.current?.bonkFrames;
      const bonkStartMs = paintedImpactFxRef.current.bonkStartMs;
      paintedBonkStartMsRef.current = bonkStartMs;
      if (!bonkFrames || bonkFrames.length < PAINTED_BONK_FRAME_COUNT || bonkStartMs === null || nowMs === null) return false;
      const bonkAge = Math.max(0, nowMs - bonkStartMs);
      if (bonkAge > (PAINTED_BONK_TOTAL_MS + PAINTED_BONK_OVERLAP_MS)) {
        bonkActiveRef.current = false;
        return false;
      }
      bonkActiveRef.current = bonkAge <= PAINTED_BONK_TOTAL_MS;
      const frame = clamp(Math.floor(bonkAge / PAINTED_BONK_FRAME_MS), 0, PAINTED_BONK_FRAME_COUNT - 1);
      const img = bonkFrames[frame];
      const anchor = getImpactAnchorCanvas();
      const pop = 0.92 + 0.18 * Math.sin((frame / Math.max(1, PAINTED_BONK_FRAME_COUNT - 1)) * Math.PI);
      const size = Math.round(108 * pop);
      drawPaintedCentered(
        img,
        Math.round(anchor.cx + shakeX),
        Math.round(anchor.cy + shakeY),
        size,
        size,
        bonkAge > PAINTED_BONK_TOTAL_MS ? clamp((PAINTED_BONK_TOTAL_MS + PAINTED_BONK_OVERLAP_MS - bonkAge) / PAINTED_BONK_OVERLAP_MS, 0, 1) : 1,
      );
      return true;
    };
    const drawPaintedExplosionAtImpact = (
      nowMs: number | null,
      shakeX = 0,
      shakeY = 0,
      opts?: { alphaMul?: number; alphaOverride?: number; maxFrame?: number; compositeOperation?: GlobalCompositeOperation },
    ): boolean => {
      if (!paintedReady()) return false;
      const explosionFrames = paintedLayersRef.current?.explosionFrames;
      const age = getPaintedExplosionAgeMs(nowMs);
      if (!explosionFrames || explosionFrames.length < PAINTED_EXPLOSION_FRAME_COUNT || age === null) return false;
      const frame = clamp(Math.floor(age / PAINTED_EXPLOSION_FRAME_MS), 0, PAINTED_EXPLOSION_FRAME_COUNT - 1);
      paintedImpactFxRef.current.explosionFrameIdx = frame;
      paintedExplosionFrameIdxRef.current = frame;
      if (opts?.maxFrame !== undefined && frame > opts.maxFrame) return false;
      const img = explosionFrames[frame];
      const p = clamp(age / PAINTED_EXPLOSION_TOTAL_MS, 0, 1);
      const size = Math.round(136 + easeOut(p) * 92);
      const baseAlpha = frame <= 3 ? 0.90 : frame <= 7 ? 0.70 : 0.45;
      const holdTail = age > PAINTED_EXPLOSION_TOTAL_MS
        ? clamp(1 - (age - PAINTED_EXPLOSION_TOTAL_MS) / Math.max(1, PAINTED_EXPLOSION_PERSIST_MS - PAINTED_EXPLOSION_TOTAL_MS), 0, 1)
        : 1;
      const alpha = clamp((opts?.alphaOverride ?? (baseAlpha * holdTail)) * (opts?.alphaMul ?? 1), 0, 1);
      const anchor = getImpactAnchorCanvas();
      if (alpha <= 0) return false;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha;
      if (opts?.compositeOperation) ctx.globalCompositeOperation = opts.compositeOperation;
      const dx = Math.round(anchor.cx + shakeX - size / 2);
      const dy = Math.round(anchor.cy + shakeY - size / 2);
      if (img) {
        ctx.imageSmoothingEnabled = true;
        drawPaintedCover(img, dx, dy, size, size);
      } else {
        const cx = Math.round(anchor.cx + shakeX);
        const cy = Math.round(anchor.cy + shakeY);
        const pulse = 0.85 + 0.15 * Math.sin(age * 0.03);
        const ring1 = Math.round(10 + easeOut(p) * 34);
        const ring2 = Math.round(18 + easeOut(p) * 52);
        const ring3 = Math.round(7 + easeOut(p) * 24);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#fff4bf";
        ctx.globalAlpha = alpha * 0.22 * pulse;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(4, Math.round(8 + easeOut(p) * 18)), 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#f8fdff";
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, ring1, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffd879";
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, ring2, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#8fe8ff";
        ctx.globalAlpha = alpha * 0.72;
        ctx.beginPath(); ctx.arc(cx + 0.5, cy + 0.5, ring3, 0, Math.PI * 2); ctx.stroke();
        const sparkCount = 56;
        for (let i = 0; i < sparkCount; i += 1) {
          const ang = ((i / sparkCount) * Math.PI * 2) + age * 0.02 + ((i % 7) * 0.11);
          const rad = 8 + ((i * 17) % 28) + easeOut(p) * (14 + (i % 9) * 3);
          const sx0 = Math.round(cx + Math.cos(ang) * rad);
          const sy0 = Math.round(cy + Math.sin(ang) * (rad * 0.72));
          const s = (i % 5 === 0) ? 2 : 1;
          ctx.fillStyle = i % 3 === 0 ? "#ffffff" : (i % 3 === 1 ? "#ffd879" : "#8fe8ff");
          ctx.globalAlpha = alpha * (0.38 + ((i % 11) / 20));
          ctx.fillRect(sx0, sy0, s, s);
        }
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false;
      lctx.imageSmoothingEnabled = false;
      return true;
    };
    const drawCardPopOverlay = (
      tSec: number,
      popElapsedMs: number,
      interactive: boolean,
      tlElapsedMs: number,
    ): void => {
      const finalW = CARD_PANEL_RECT.w;
      const finalH = CARD_PANEL_RECT.h;
      const finalDisplayW = Math.max(1, Math.round(finalW * CARD_DISPLAY_SCALE));
      const finalDisplayH = Math.max(1, Math.round(finalH * CARD_DISPLAY_SCALE));
      const finalX = Math.round((W - finalDisplayW) / 2);
      const finalY = 18;
      const anchor = getImpactAnchorCanvas();
      const exCx = anchor.cx;
      const exCy = anchor.cy;
      const popDur = 520;
      const t = clamp(popElapsedMs / popDur, 0, 1);
      const useScalePop = paintedModeRef.current && cardPopStartRef.current !== null;
      const popScale = useScalePop
        ? Math.round((lerp(PAINTED_CARD_POP_START_SCALE, 1, easeOut(t)) * 256)) / 256
        : 1;
      const dw = Math.max(1, Math.round(finalDisplayW * popScale));
      const dh = Math.max(1, Math.round(finalDisplayH * popScale));
      const startCx = exCx;
      const startCy = exCy;
      const endCx = Math.round(finalX + finalDisplayW / 2);
      const endCy = Math.round(finalY + finalDisplayH / 2);
      const cx = useScalePop
        ? Math.round(lerp(startCx, endCx, smoothstep(t)))
        : Math.round(lerp(exCx, endCx, smoothstep(t)));
      const cy = useScalePop
        ? Math.round(lerp(startCy, endCy, smoothstep(t)))
        : Math.round(lerp(exCy, endCy, smoothstep(t)));
      const dx = Math.round(cx - dw / 2);
      const dy = Math.round(cy - dh / 2);
      const s = Math.round((CARD_DISPLAY_SCALE * popScale) * 256) / 256;

      if (interactive) {
        cardScaleRef.current = s;
        syncCardActionRects(dx, dy, s);
        const hoverNow = resolveCardHoverAt(mouseRef.current.x, mouseRef.current.y);
        setCursor(hoverNow);
        drawCardToBuffer(hoverNow);
      } else {
        drawCardToBuffer(null);
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (popElapsedMs < 300) {
        const q = 1 - clamp(popElapsedMs / 300, 0, 1);
        const glowCx = Math.round(dx + dw / 2);
        const glowCy = Math.round(dy + dh / 2);
        ctx.fillStyle = "#b9e7ff";
        ctx.globalAlpha = 0.45 * q;
        for (let i = 0; i < 12; i += 1) {
          const ox = Math.round(Math.cos(tSec * 5 + i) * (5 + i * 0.6) * q);
          const oy = Math.round(Math.sin(tSec * 4 + i * 1.7) * (4 + i * 0.45) * q);
          ctx.fillRect(glowCx + ox, glowCy + oy, 1, 1);
        }
        ctx.globalAlpha = 1;
      }
      if (cardBufRef.current) {
        ctx.imageSmoothingEnabled = false;
        const exAgeForCard = paintedModeRef.current ? getPaintedExplosionAgeMs(rafNowMsRef.current) : null;
        const cardAlphaCap = (paintedModeRef.current && exAgeForCard !== null && exAgeForCard <= 160) ? 0.85 : 1;
        ctx.globalAlpha = Math.min(ctx.globalAlpha, cardAlphaCap);
        ctx.drawImage(cardBufRef.current, 0, 0, finalW, finalH, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
      if (paintedModeRef.current) {
        const exAgeOverlay = getPaintedExplosionAgeMs(rafNowMsRef.current);
        if (exAgeOverlay !== null && exAgeOverlay <= 520) {
          ctx.save();
          drawPaintedExplosionAtImpact(rafNowMsRef.current, 0, 0, {
            alphaOverride: 0.45,
            maxFrame: 5,
            compositeOperation: "lighter",
          });
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (interactive) drawToast(tlElapsedMs, dy, dh);
      ctx.restore();
    };
    const drawDebugOverlay = (tl: Timeline): void => {
      if (!debugOnRef.current) return;
      const expAgeDbg = paintedModeRef.current ? getPaintedExplosionAgeMs(rafNowMsRef.current) : null;
      const expFrameDbg = paintedModeRef.current ? getPaintedExplosionFrameIdx(rafNowMsRef.current) : null;
      const expOverlayActiveDbg = paintedModeRef.current && expAgeDbg !== null && expAgeDbg <= 520 ? 1 : 0;
      const expActiveDbg = paintedModeRef.current && expAgeDbg !== null ? 1 : 0;
      const expLoadedCountDbg = paintedModeRef.current ? paintedExplosionLoadedCountRef.current : 0;
      const expMissingDbg = paintedModeRef.current ? paintedExplosionLoadErrorsRef.current.slice(0, 3) : [];
      const assetsAttemptedDbg = paintedModeRef.current ? paintedAssetsAttemptedCountRef.current : 0;
      const assetsLoadedDbg = paintedModeRef.current ? paintedAssetsLoadedCountRef.current : 0;
      const assetsTotalDbg = paintedModeRef.current ? paintedAssetsTotalCountRef.current : 0;
      const assetsReadyDbg = paintedModeRef.current ? (paintedAssetsReady() ? 1 : 0) : 0;
      const assetsErrDbg = paintedModeRef.current ? paintedAssetsErrorsRef.current.length : 0;
      const phaseBucketDbg = tl.phase === "prestart"
        ? "PRESTART"
        : (tl.phase === "countdown" || tl.phase === "liftoff")
            ? "COUNTDOWN"
            : corridorLatchRef.current
                ? "CORRIDOR"
                : (tl.phase === "card" ? "CARD" : tl.phase.toUpperCase());
      const corridorDbg = dbgBgModeRef.current === "PAINTED_CORRIDOR" ? 1 : 0;
      const drawCorrDbg = dbgDrawCorridorModeRef.current;
      const gradeDbg = dbgGradeAppliedRef.current ? 1 : 0;
      const mistCapDbg = dbgMistCapRef.current.toFixed(2);
      const expDbgLines = paintedModeRef.current
        ? [
            `BUILD ${INTERNAL_VERSION}`,
            `assetsReady ${assetsReadyDbg}`,
            `ASSETS ${assetsAttemptedDbg}/${assetsTotalDbg}  loaded ${assetsLoadedDbg}/${assetsTotalDbg}  err=${assetsErrDbg}`,
            `${phaseBucketDbg} CL:${corridorLatchRef.current ? 1 : 0} A:${assetsAttemptedDbg}/${assetsTotalDbg} L:${assetsLoadedDbg} E:${assetsErrDbg}`,
            `LATCH_REASON: ${dbgCorridorLatchReasonRef.current}`,
            `DRAWCORR: ${drawCorrDbg}`,
            `CORRIDOR: ${corridorDbg}`,
            `GRADE: ${gradeDbg}`,
            `MISTCAP: ${mistCapDbg}`,
            `INCORRIDOR: ${corridorLatchRef.current ? 1 : 0}`,
            `PAINTED: ${paintedModeRef.current ? 1 : 0}`,
            `EXP active: ${expActiveDbg}`,
            `EXP ms: ${expAgeDbg !== null ? Math.round(expAgeDbg) : "-"}`,
            `EXP idx: ${expFrameDbg ?? "-"}`,
            `EXP source: ${paintedExplosionStartedFromRef.current}`,
            `RAFms: ${rafNowMsRef.current !== null ? Math.round(rafNowMsRef.current) : "-"}`,
            `EXP loaded: ${expLoadedCountDbg}/${PAINTED_EXPLOSION_FRAME_COUNT}`,
            `EXP overlay: ${expOverlayActiveDbg}`,
            ...(expLoadedCountDbg < PAINTED_EXPLOSION_FRAME_COUNT && expMissingDbg.length > 0
              ? expMissingDbg.map((name) => `MISSING: ${name}`)
              : []),
          ]
        : [];
      const lines = tl.phase === "card"
        ? [
            `PHASE: ${tl.phase.toUpperCase()}`,
            `BG: ${dbgBgModeRef.current}`,
            `CARD ${Math.round(simElapsedRef.current)} ${pausedRef.current ? "P" : "R"} H:${hoverRef.current ?? "-"} M:${Math.round(mouseRef.current.x)},${Math.round(mouseRef.current.y)} G:${guardErrorRef.current ?? "OK"}`,
            ...expDbgLines,
          ]
        : [
            `PHASE: ${tl.phase.toUpperCase()}`,
            `BG: ${dbgBgModeRef.current}`,
            `P ${tl.phase.toUpperCase()}`,
            `T ${Math.round(simElapsedRef.current)}ms`,
            `I ${(tl.phase === "countdown" || tl.phase === "liftoff") ? dbgIntroStateRef.current : "-"}`,
            `CA ${(tl.phase === "countdown" || tl.phase === "liftoff") ? dbgCorridorAlphaRef.current.toFixed(2) : "-"}`,
            `N ${tl.phase === "montage" ? `${tl.planetIndex}:${dbgPlanetNameRef.current}` : "-"}`,
            `U ${tl.phase === "montage" ? dbgPlanetURef.current.toFixed(2) : "-"}`,
            `X ${tl.phase === "montage" ? Math.round(dbgPlanetXRef.current) : "-"} DW ${tl.phase === "montage" ? Math.round(dbgPlanetWRef.current) : "-"}`,
            `READY ${tl.phase === "montage" ? (dbgSpriteReadyRef.current ? "Y" : "N") : "-"}`,
            `ALPHA ${tl.phase === "montage" ? dbgSpriteAlphaPxRef.current : "-"}`,
            `H ${hoverRef.current ?? "-"} M ${Math.round(mouseRef.current.x)},${Math.round(mouseRef.current.y)}`,
            `S ${scaleRef.current} ${pausedRef.current ? "PAUSE" : "RUN"}`,
            `G ${guardErrorRef.current ?? "OK"}`,
            ...expDbgLines,
          ];
      let w = 0;
      for (const line of lines) w = Math.max(w, textW(line));
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "rgba(5,10,18,0.65)";
      ctx.fillRect(4, 4, w + 8, lines.length * 8 + 4);
      let y = 6;
      for (const line of lines) { drawTextShadow(ctx, line, 6, y, "#dceaff", "#05080f"); y += 8; }
      const spr = dbgSpritePreviewRef.current;
      if (tl.phase === "montage" && spr) {
        const sc = 8 / 16;
        const pw = Math.max(1, Math.round(spr.w * sc));
        const ph = Math.max(1, Math.round(spr.h * sc));
        const px = W - pw - 8;
        const py = 8;
        ctx.fillStyle = "rgba(5,10,18,0.7)";
        ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr.canvas, px, py, pw, ph);
      }
      if (paintedModeRef.current && expAgeDbg !== null) {
        const anchor = getImpactAnchorCanvas();
        const cx = Math.round(anchor.cx);
        const cy = Math.round(anchor.cy);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ff26d9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + 0.5, cy + 0.5, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ff26d9";
        ctx.fillRect(cx - 12, cy, 25, 1);
        ctx.fillRect(cx, cy - 12, 1, 25);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - 1, cy, 3, 1);
        ctx.fillRect(cx, cy - 1, 1, 3);
      }
      ctx.restore();
    };
    const drawPaintedCorridorProofMarker = (): void => {
      if (!debugOnRef.current || !dbgPaintedCorridorProofRef.current) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const s = 6;
      const pad = 6;
      const boxX = W - s - pad;
      const boxY = H - s - pad;
      ctx.fillStyle = "#00ff66";
      ctx.fillRect(boxX, boxY, s, s);
      drawTextShadow(ctx, "P_CORR_OK", Math.max(4, boxX - 56), Math.max(4, boxY - 10), "#8effb9", "#03210f");
      ctx.restore();
    };
    const renderGuardFail = (tl: Timeline): void => {
      hardResetCanvasState(ctx);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#3a0000";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#9b1010";
      ctx.fillRect(8, 8, W - 16, H - 16);
      ctx.fillStyle = "#250000";
      ctx.fillRect(12, 12, W - 24, H - 24);
      drawTextShadow(ctx, `GUARD FAIL: ${guardErrorRef.current ?? "UNKNOWN"}`, 22, 34, "#ffd0d0", "#2a0000", 2);
      drawTextShadow(ctx, `PHASE: ${tl.phase.toUpperCase()}`, 22, 76, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, `ELAPSED: ${Math.round(simElapsedRef.current)}ms`, 22, 88, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, `SCALE: ${scaleRef.current}`, 22, 100, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, `SMOOTH: main=${ctx.imageSmoothingEnabled ? "ON" : "OFF"} lo=${lctx.imageSmoothingEnabled ? "ON" : "OFF"}`, 22, 112, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, `DRAWX: ${Math.round(dbgPlanetXRef.current)}  DRAWW: ${Math.round(dbgPlanetWRef.current)}`, 22, 124, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, `U: ${dbgPlanetURef.current.toFixed(2)}  ALPHA: ${dbgSpriteAlphaPxRef.current}`, 22, 136, "#ffe6e6", "#2a0000");
      drawTextShadow(ctx, "Press R to reset", 22, 152, "#ffd0d0", "#2a0000");
    };

    const renderFrame = (now: number): void => {
      if (dead) return;
      rafRef.current = null;
      const nowMs = now;
      rafNowMsRef.current = nowMs;
      if (lastRealRef.current === null) lastRealRef.current = nowMs;
      const dtReal = clamp(nowMs - lastRealRef.current, 0, 50);
      lastRealRef.current = nowMs;
      let dt = 0;
      const isPrestartPhase = phaseRef.current === "prestart";
      if (pausedRef.current) {
        if (stepOnceRef.current) {
          if (!isPrestartPhase) {
            simElapsedRef.current += 16.666;
            dt = 16.666;
          }
          stepOnceRef.current = false;
        }
      } else if (!isPrestartPhase) {
        simElapsedRef.current += dtReal;
        dt = dtReal;
      }
      let tl: Timeline;
      if (isPrestartPhase) {
        tl = { phase: "prestart", elapsed: simElapsedRef.current, local: 0, planetIndex: 0, planetLocal: 0 };
      } else {
        tl = timelineFromElapsed(simElapsedRef.current);
        phaseRef.current = tl.phase;
      }
      if (tl.phase === "prestart") {
        corridorLatchRef.current = false;
        inCorridorRef.current = false;
        dbgCorridorLatchReasonRef.current = "NONE";
      } else {
        updateCorridorLatch({
          speedSignal:
            corridorEntryElapsedRef.current !== null
            && (Math.abs(rocketVXRef.current) > 0.5 || Math.abs(rocketVYRef.current) > 0.5),
          flybySignal:
            crashTriggeredRef.current
            || impactAnchorRef.current !== null
            || (corridorEntryElapsedRef.current !== null && (tl.planetIndex > 0 || tl.planetLocal > 0)),
          modeSignal:
            rocketInitRef.current || corridorEntryElapsedRef.current !== null,
        });
      }
      const bgMode = getBgMode(tl.phase, paintedModeRef.current, paintedReady());
      const paintedAssetsReadyNow = paintedReady();
      const usePaintedCorridor = paintedModeRef.current && paintedAssetsReadyNow && corridorLatchRef.current;
      const usePaintedLaunch = bgMode === "PAINTED_LAUNCH";
      const usePaintedPlutoFx = usePaintedCorridor;
      dbgBgModeRef.current = bgMode;
      dbgGradeAppliedRef.current = false;
      dbgMistCapRef.current = 0;
      dbgDrawCorridorModeRef.current = "LEGACY";
      dbgPaintedCorridorProofRef.current = false;
      if (!isPrestartPhase) {
        if (corridorLatchRef.current) inCorridorRef.current = true;
        if (tl.phase !== "crash") crashOnceRef.current = false;
        if (tl.phase !== "explosion") explosionOnceRef.current = false;
        if (tl.phase !== "card") cardScaleRef.current = 1;
      }
      if (tl.phase !== "montage") {
        dbgPlanetNameRef.current = "-";
        dbgPlanetURef.current = 0;
        dbgPlanetXRef.current = 0;
        dbgPlanetWRef.current = 0;
        dbgSpriteReadyRef.current = false;
        dbgSpriteAlphaPxRef.current = 0;
        dbgSpritePreviewRef.current = null;
      }

      hardResetCanvasState(ctx);
      guard(Number.isInteger(scaleRef.current) && scaleRef.current >= 1, "BAD_SCALE");
      guard(canvas.style.width === `${W * scaleRef.current}px` && canvas.style.height === `${H * scaleRef.current}px`, "SCALE_MISMATCH");
      guard(ctx.imageSmoothingEnabled === false && lctx.imageSmoothingEnabled === false, "SMOOTHING_ON");
      guard(!(simElapsedRef.current < 2000 && tl.phase === "card" && skipRequestedRef.current === false), "CARD_AT_T0");
      if (tl.phase === "montage") guard(Number.isFinite(rocketXRef.current) && Number.isFinite(rocketYRef.current) && Number.isFinite(rocketVXRef.current) && Number.isFinite(rocketVYRef.current), "ROCKET_NAN");
      if (tl.phase === "card") reachedCardRef.current = true;
      guard(!(reachedCardRef.current && tl.phase !== "card"), "LOOPED_AFTER_CARD");
      if (!DEV && forceCardRef.current && tl.phase !== "card") {
        tl = timelineFromElapsed(simElapsedRef.current);
        phaseRef.current = tl.phase;
      }
      if (guardErrorRef.current) {
        if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        renderGuardFail(tl);
        rafRef.current = null;
        return;
      }
      if (!isPrestartPhase) updateParticles(dt);
      if (!isPrestartPhase) updateImpactDust(dt);
      if (!isPrestartPhase && (tl.phase === "crash" || tl.phase === "explosion")) {
        const dtFac = Math.max(0, dt / 16.666);
        shakeTRef.current += dt / 1000;
        shakeAmpRef.current *= Math.pow(0.86, dtFac);
      } else if (shakeAmpRef.current !== 0 || shakeTRef.current !== 0) {
        shakeAmpRef.current = 0;
        shakeTRef.current = 0;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      lctx.imageSmoothingEnabled = false;
      lctx.clearRect(0, 0, LW, LH);
      lctx.fillStyle = "#000";
      lctx.fillRect(0, 0, LW, LH);

      const a = assetsRef.current;
      if (!a) {
        if (tl.phase === "prestart") {
          drawMissionBriefingGate(null, nowMs);
        } else {
          dbgBgModeRef.current = bgMode;
          const blink = Math.floor(now / 250) % 2 === 0;
          drawTextShadow(lctx, "LOADING...", 72, 52, blink ? "#dce8ff" : "#89a7dd", "#05080f");
          if (errRef.current) drawTextShadow(lctx, "LOAD ERROR", 70, 63, "#f3b7b7", "#2a0909");
        }
        dbgBgModeRef.current = bgMode;
        drawSound(); drawStamp(); drawDebugOverlay(tl); drawPaintedCorridorProofMarker();
      } else {
        const tSec = tl.elapsed / 1000;
        if (tl.phase === "prestart") {
          drawMissionBriefingGate(a, nowMs);
        } else if (tl.phase === "card") {
          if (usePaintedCorridor) {
            dbgBgModeRef.current = bgMode;
            dbgDrawCorridorModeRef.current = "PAINTED";
            drawPaintedCorridorBackground(tSec, 0.08, { bgMode });
            dbgPaintedCorridorProofRef.current = true;
          } else {
            dbgBgModeRef.current = bgMode;
            dbgDrawCorridorModeRef.current = "LEGACY";
            drawCorridor(a, tSec, 0.08);
          }
          applyCorridorGradeIfLatched({
            mode: usePaintedCorridor ? "painted" : "legacy",
            tSec,
            intensity: 0.08,
          });
          drawParticles(a, false);
          drawImpactDust();
          drawParticles(a, true);
          lctx.fillStyle = "rgba(5,8,14,0.40)";
          lctx.fillRect(0, 0, LW, LH);
          lctx.fillStyle = "rgba(3,5,9,0.08)";
          lctx.fillRect(2, 2, LW - 4, LH - 4);
          if (usePaintedPlutoFx) {
            drawPaintedImpactPluto(now);
            drawPaintedBonkAtImpact(now);
            drawPaintedExplosionAtImpact(now);
          }

          const paintedCardPopElapsed = usePaintedPlutoFx ? getPaintedCardPopElapsedMs(now) : null;
          const popElapsed = (usePaintedPlutoFx && paintedCardPopElapsed !== null)
            ? paintedCardPopElapsed
            : (paintedModeRef.current && cardPopStartRef.current !== null)
                ? Math.max(0, simElapsedRef.current - cardPopStartRef.current)
                : tl.local;
          if (!usePaintedPlutoFx || paintedCardPopElapsed !== null) {
            drawCardPopOverlay(tSec, popElapsed, true, tl.elapsed);
          }
        } else {
          const shake = (tl.phase === "crash" || tl.phase === "explosion")
            ? {
                x: Math.round(((Math.random() * 2) - 1) * shakeAmpRef.current * 0.5),
                y: Math.round(((Math.random() * 2) - 1) * shakeAmpRef.current * 0.5),
              }
            : { x: 0, y: 0 };
          lctx.save(); lctx.translate(shake.x, shake.y);
          if (tl.phase === "countdown") {
            const intro = drawIntroWorld(a, tl, tSec, usePaintedLaunch);
            drawParticles(a, false);
            drawRocket(a, intro.rocketPose, tSec);
            drawParticles(a, true);
            drawCountdownHud(tl, a.manifest.times.countdownTotal);
            if (debugOnRef.current) drawCapsule(intro.introState.replace("INTRO_", ""), 12, 0.9);
          } else if (tl.phase === "liftoff") {
            const intro = drawIntroWorld(a, tl, tSec, usePaintedLaunch);
            drawParticles(a, false);
            drawRocket(a, intro.rocketPose, tSec);
            drawParticles(a, true);
            if (debugOnRef.current) drawCapsule(intro.introState.replace("INTRO_", ""), 12, 0.85);
          } else if (tl.phase === "montage") {
            const u = clamp(tl.planetLocal / a.manifest.times.planetHold, 0, 1);
            const approach = clamp(u / 0.25, 0, 1);
            const hold = clamp((u - 0.25) / 0.5, 0, 1);
            const exit = clamp((u - 0.75) / 0.25, 0, 1);
            const travelIntensity = 0.25 + 0.75 * Math.max(smoothstep(approach), smoothstep(exit));
            if (usePaintedCorridor) {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "PAINTED";
              drawPaintedCorridorBackground(tSec, travelIntensity, { offsetX: shake.x * 2, offsetY: shake.y * 2, bgMode });
              dbgPaintedCorridorProofRef.current = true;
            } else {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "LEGACY";
              drawCorridor(a, tSec, travelIntensity);
            }
            applyCorridorGradeIfLatched({
              mode: usePaintedCorridor ? "painted" : "legacy",
              tSec,
              intensity: travelIntensity,
              offsetX: shake.x * 2,
              offsetY: shake.y * 2,
            });
            const flyby = drawPlanetFlybyBack(a, tl, tSec);
            if (flyby) {
              const mid = flyby.u >= 0.25 && flyby.u <= 0.75;
              if (mid) {
                guard(flyby.spriteAlphaPx >= 200, `SPRITE_EMPTY_${flyby.planet}`);
                guard(flyby.drawX <= W + 10, `PLANET_OFFSCREEN_${flyby.planet}`);
              }
            }
            let pose = updateRocket(dt, tl);
            guard(Number.isFinite(rocketXRef.current) && Number.isFinite(rocketYRef.current), "ROCKET_NAN");
            if (flyby && flyby.planet === "pluto" && !crashTriggeredRef.current) {
              const preLock = clamp((flyby.u - 0.42) / 0.22, 0, 1) * (1 - clamp((flyby.u - 0.72) / 0.12, 0, 1));
              if (preLock > 0) {
                const targetRX = Math.round(flyby.centerX - 14);
                const targetRY = Math.round(flyby.centerY + 2);
                const k = smoothstep(preLock) * 0.42;
                rocketXRef.current = Math.round(lerp(rocketXRef.current, targetRX, k));
                rocketYRef.current = Math.round(lerp(rocketYRef.current, targetRY, k));
                rocketVXRef.current *= 0.78;
                rocketVYRef.current *= 0.84;
                pose = montageRocketPose();
              }
              const rocketBox: Rect = {
                x: Math.round(rocketXRef.current - 20),
                y: Math.round(rocketYRef.current - 20),
                w: 40,
                h: 40,
              };
              const plutoBox: Rect = { x: flyby.drawX, y: flyby.drawY, w: flyby.drawW, h: flyby.drawH };
              const dxC = (rocketBox.x + rocketBox.w / 2) - (plutoBox.x + plutoBox.w / 2);
              const dyC = (rocketBox.y + rocketBox.h / 2) - (plutoBox.y + plutoBox.h / 2);
              const closeEnough = (dxC * dxC + dyC * dyC) <= (20 * 20);
              const inWindow = flyby.u >= 0.50 && flyby.u <= 0.70;
              const overlap = aabbOverlap(rocketBox, plutoBox, 12);
              if (inWindow && (overlap || closeEnough)) {
                crashTriggeredRef.current = true;
                const offs = phaseOffsets(a);
                const crashElapsed = offs.crash + 1;
                crashStartElapsedRef.current = crashElapsed;
                crashImpactXRef.current = Math.round(plutoBox.x + plutoBox.w * 0.34);
                crashImpactYRef.current = Math.round(plutoBox.y + plutoBox.h * 0.52);
                impactAnchorRef.current = { cx: crashImpactXRef.current, cy: crashImpactYRef.current };
                bonkStartRef.current = crashElapsed;
                bonkActiveRef.current = true;
                if (usePaintedPlutoFx) {
                  paintedImpactFxRef.current.bonkStartMs = nowMs;
                  paintedBonkStartMsRef.current = nowMs;
                  startExplosion("PLUTO", crashImpactXRef.current, crashImpactYRef.current, nowMs);
                  explosionAnimStartRef.current = crashElapsed;
                  if (cardPopStartRef.current === null) cardPopStartRef.current = crashElapsed + MIN_EXP_BEFORE_CARD_MS;
                  if (paintedCardPopStartMsRef.current === null) paintedCardPopStartMsRef.current = nowMs + MIN_EXP_BEFORE_CARD_MS;
                }
                impactFreezeUntilRef.current = crashElapsed + (usePaintedPlutoFx ? PAINTED_CRASH_FREEZE_MS : 140);
                shakeAmpRef.current = Math.max(shakeAmpRef.current, 12);
                wobbleVRef.current += 1.6;
                rocketVXRef.current = 0;
                rocketVYRef.current = 0;
                simElapsedRef.current = crashElapsed;
                lastRealRef.current = null;
              }
            }
            spawnTravelExhaust(pose, dt, travelIntensity);
            if (approach > 0.05 || exit > 0.05) spawnTrail(pose, dt);
            drawParticles(a, false);
            drawRocket(a, pose, tSec);
            drawPlanetFlybyFront(flyby, tSec);
            drawParticles(a, true);
            const labelAlpha = u < 0.35 ? Math.min(clamp(u / 0.08, 0, 1), clamp((0.35 - u) / 0.12, 0, 1)) : 0;
            drawMiniCapsule(PLANETS[tl.planetIndex].toUpperCase(), labelAlpha);
          } else if (tl.phase === "crash") {
            const p = clamp(tl.local / a.manifest.times.crash, 0, 1);
            if (usePaintedCorridor) {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "PAINTED";
              drawPaintedCorridorBackground(tSec, 0.45 + (1 - p) * 0.25, { offsetX: shake.x * 2, offsetY: shake.y * 2, bgMode });
              dbgPaintedCorridorProofRef.current = true;
            } else {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "LEGACY";
              drawCorridor(a, tSec, 0.45 + (1 - p) * 0.25);
            }
            applyCorridorGradeIfLatched({
              mode: usePaintedCorridor ? "painted" : "legacy",
              tSec,
              intensity: 0.45 + (1 - p) * 0.25,
              offsetX: shake.x * 2,
              offsetY: shake.y * 2,
            });
            drawParticles(a, false);
            drawImpactDust();
            const plutoSprite = (planetSpritesRef.current?.pluto ?? fallbackPlanetSprite("pluto"));
            const plutoScale = Math.round(1.25 * 16) / 16;
            const plutoW = Math.max(1, Math.round(plutoSprite.w * plutoScale));
            const plutoH = Math.max(1, Math.round(plutoSprite.h * plutoScale));
            const plutoX = Math.round(W * 0.62 - plutoW / 2);
            const plutoY = Math.round(H * 0.45 - plutoH / 2);
            if (!crashOnceRef.current) {
              crashOnceRef.current = true;
              crashTriggeredRef.current = true;
              crashStartElapsedRef.current = crashStartElapsedRef.current ?? simElapsedRef.current;
              bonkStartRef.current = bonkStartRef.current || simElapsedRef.current;
              bonkActiveRef.current = true;
              impactFreezeUntilRef.current = Math.max(impactFreezeUntilRef.current, simElapsedRef.current + (usePaintedPlutoFx ? PAINTED_CRASH_FREEZE_MS : 140));
              shakeAmpRef.current = Math.max(shakeAmpRef.current, 12);
              shakeTRef.current = 0;
              wobbleRef.current = 0;
              wobbleVRef.current = Math.max(wobbleVRef.current, 1.6);
              if (!impactAnchorRef.current) {
                crashImpactXRef.current = Math.round(plutoX + plutoW * 0.34);
                crashImpactYRef.current = Math.round(plutoY + plutoH * 0.52);
                impactAnchorRef.current = { cx: crashImpactXRef.current, cy: crashImpactYRef.current };
              } else {
                crashImpactXRef.current = impactAnchorRef.current.cx;
                crashImpactYRef.current = impactAnchorRef.current.cy;
              }
              if (usePaintedPlutoFx) {
                paintedImpactFxRef.current.bonkStartMs = paintedImpactFxRef.current.bonkStartMs ?? nowMs;
                paintedBonkStartMsRef.current = paintedBonkStartMsRef.current ?? paintedImpactFxRef.current.bonkStartMs;
                explosionAnimStartRef.current = explosionAnimStartRef.current ?? simElapsedRef.current;
                if (cardPopStartRef.current === null && explosionAnimStartRef.current !== null) cardPopStartRef.current = explosionAnimStartRef.current + MIN_EXP_BEFORE_CARD_MS;
                if (paintedCardPopStartMsRef.current === null) paintedCardPopStartMsRef.current = nowMs + MIN_EXP_BEFORE_CARD_MS;
                if (!paintedExplosionActiveRef.current && paintedExplosionStartMsRef.current === null) {
                  startExplosion("PLUTO", crashImpactXRef.current, crashImpactYRef.current, nowMs);
                }
              }
              bonkBeep();
              spawnBonkDustSquares(crashImpactXRef.current, crashImpactYRef.current);
              if (!usePaintedPlutoFx) {
                spawn({
                  kind: "spark",
                  x: crashImpactXRef.current,
                  y: crashImpactYRef.current,
                  vx: 0, vy: 0, g: 0,
                  size: 20,
                  life: 150, max: 150,
                  alpha: 1, rot: 0, spin: 0,
                  front: true,
                  tile: "bonk_burst",
                });
              }
            }
            const dtSec = dt / 1000;
            const freezeMs = usePaintedPlutoFx ? PAINTED_CRASH_FREEZE_MS : 140;
            const impactStartMs = usePaintedPlutoFx
              ? (paintedImpactFxRef.current.explosionStartMs ?? paintedImpactFxRef.current.bonkStartMs)
              : null;
            const freezeActive = usePaintedPlutoFx
              ? (nowMs !== null && impactStartMs !== null && (nowMs - impactStartMs) < freezeMs)
              : simElapsedRef.current < impactFreezeUntilRef.current;
            const freezeAgeMs = freezeActive
              ? (
                  usePaintedPlutoFx && nowMs !== null && impactStartMs !== null
                    ? clamp(nowMs - impactStartMs, 0, freezeMs)
                    : clamp(freezeMs - (impactFreezeUntilRef.current - simElapsedRef.current), 0, freezeMs)
                )
              : freezeMs;
            const freezeWobble = freezeActive
              ? Math.sin((freezeAgeMs / Math.max(1, freezeMs)) * Math.PI * 5) * (1 - freezeAgeMs / Math.max(1, freezeMs)) * 6
              : 0;
            const freezeShakeX = freezeActive
              ? Math.sin((freezeAgeMs / Math.max(1, freezeMs)) * Math.PI * 11) * 12
              : 0;
            const freezeShakeY = freezeActive
              ? Math.cos((freezeAgeMs / Math.max(1, freezeMs)) * Math.PI * 9) * 3
              : 0;
            const freezeTilt = freezeActive
              ? Math.sin((freezeAgeMs / Math.max(1, freezeMs)) * Math.PI * 6) * 0.122
              : 0;
            if (!freezeActive) {
              wobbleVRef.current += (-wobbleRef.current * 28 - wobbleVRef.current * 6) * dtSec;
              wobbleRef.current += wobbleVRef.current * dtSec;
              wobbleRef.current = clamp(wobbleRef.current, -0.35, 0.35);
            }
            const plutoXL = Math.round(plutoX / 2);
            const plutoYL = Math.round(plutoY / 2);
            const plutoWL = Math.max(1, Math.round(plutoW / 2));
            const plutoHL = Math.max(1, Math.round(plutoH / 2));
            if (usePaintedPlutoFx) {
              drawPaintedImpactPluto(now, shake.x * 2, shake.y * 2);
            } else {
              lctx.imageSmoothingEnabled = false;
              lctx.drawImage(plutoSprite.canvas, plutoXL, plutoYL, plutoWL, plutoHL);
            }
            if (DEV && debugOnRef.current) {
              lctx.save();
              lctx.globalAlpha = 0.25;
              lctx.strokeStyle = "#8ed3ff";
              lctx.strokeRect(plutoXL - 1, plutoYL - 1, plutoWL + 2, plutoHL + 2);
              lctx.restore();
            }
            const localAfterFreeze = Math.max(0, tl.local - freezeMs);
            const bounceT = clamp(localAfterFreeze / Math.max(1, a.manifest.times.crash - freezeMs), 0, 1);
            const rx = freezeActive
              ? (crashImpactXRef.current - 8 + freezeWobble + freezeShakeX)
              : lerp(crashImpactXRef.current - 8, crashImpactXRef.current - 36, easeOut(Math.min(bounceT * 1.8, 1))) - Math.sin(bounceT * 12) * (1 - bounceT) * 5;
            const ry = freezeActive
              ? (crashImpactYRef.current + 1 + Math.cos((freezeAgeMs / Math.max(1, freezeMs)) * Math.PI * 4) * 1.5 + freezeShakeY)
              : crashImpactYRef.current + Math.sin(bounceT * 10) * (1 - bounceT) * 2;
            const crashPose: RocketPose = {
              x: rx / 2,
              y: ry / 2,
              rot: clamp(0.14 + wobbleRef.current + freezeTilt, -0.35, 0.35),
              size: 28,
              exhaust: freezeActive ? 0.35 : 0.15,
              thrust: false,
              visible: true,
            };
            if (!freezeActive && tl.local < 220) spawnTrail(crashPose, dt);
            drawRocket(a, crashPose, tSec);
            drawParticles(a, true);
            if (debugOnRef.current) drawCapsule("PLUTO", 12, 1);
            if (usePaintedPlutoFx) {
              drawPaintedBonkAtImpact(now, shake.x * 2, shake.y * 2);
              drawPaintedExplosionAtImpact(now, shake.x * 2, shake.y * 2);
              const paintedCardPopElapsed = getPaintedCardPopElapsedMs(now);
              if (paintedCardPopElapsed !== null) {
                drawCardPopOverlay(tSec, paintedCardPopElapsed, false, tl.elapsed);
              }
            } else if (bonkActiveRef.current) {
              const bonkAge = Math.max(0, simElapsedRef.current - bonkStartRef.current);
              if (bonkAge <= 540) {
                const tBonk = clamp(bonkAge / 420, 0, 1);
                const scalePop = 1 + 0.25 * Math.exp(-tBonk * 6) * Math.sin(tBonk * 10);
                const fade = bonkAge <= 420 ? 1 : 1 - clamp((bonkAge - 420) / 120, 0, 1);
                const sc = 2;
                const label = "BONK!";
                const tw = textW(label, sc);
                const bx = clamp(Math.round(crashImpactXRef.current / 2) - Math.floor(tw / 2), 4, LW - tw - 4);
                const by = clamp(Math.round(crashImpactYRef.current / 2) - 26, 4, LH - 16);
                const ox = Math.round(tw / 2);
                const oy = 7;
                lctx.save();
                lctx.globalAlpha = fade;
                lctx.translate(bx + ox, by + oy);
                lctx.scale(scalePop, scalePop);
                lctx.translate(-(bx + ox), -(by + oy));
                drawTextShadow(lctx, label, bx, by, "#ffffff", "#0b1220", sc);
                lctx.restore();
              } else {
                bonkActiveRef.current = false;
              }
            }
          } else if (tl.phase === "explosion") {
            const breathMs = Math.min(EXPLOSION_BREATH_MS, Math.floor(a.manifest.times.explosion * 0.35));
            const p = clamp(Math.max(0, tl.local - breathMs) / Math.max(1, a.manifest.times.explosion - breathMs), 0, 1);
            const breathIn = breathMs > 0 ? smoothstep(clamp(tl.local / breathMs, 0, 1)) : 1;
            if (!explosionOnceRef.current) {
              explosionOnceRef.current = true;
              explosionAnimStartRef.current = explosionAnimStartRef.current ?? simElapsedRef.current;
              if (usePaintedPlutoFx && cardPopStartRef.current === null && explosionAnimStartRef.current !== null) cardPopStartRef.current = explosionAnimStartRef.current + MIN_EXP_BEFORE_CARD_MS;
              if (usePaintedPlutoFx && paintedCardPopStartMsRef.current === null) paintedCardPopStartMsRef.current = nowMs + MIN_EXP_BEFORE_CARD_MS;
              if (usePaintedPlutoFx && !paintedExplosionActiveRef.current && paintedExplosionStartMsRef.current === null) {
                startExplosion("PLUTO", crashImpactXRef.current, crashImpactYRef.current, nowMs);
              }
              boomBeep();
              shakeAmpRef.current = Math.max(shakeAmpRef.current, 5);
              if (!usePaintedPlutoFx) spawnSparklyPuff(crashImpactXRef.current, crashImpactYRef.current);
            }
            if (usePaintedCorridor) {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "PAINTED";
              drawPaintedCorridorBackground(tSec, 0.18 + (1 - p) * 0.24, { offsetX: shake.x * 2, offsetY: shake.y * 2, bgMode });
              dbgPaintedCorridorProofRef.current = true;
            } else {
              dbgBgModeRef.current = bgMode;
              dbgDrawCorridorModeRef.current = "LEGACY";
              drawCorridor(a, tSec, 0.18 + (1 - p) * 0.24);
            }
            applyCorridorGradeIfLatched({
              mode: usePaintedCorridor ? "painted" : "legacy",
              tSec,
              intensity: 0.18 + (1 - p) * 0.24,
              offsetX: shake.x * 2,
              offsetY: shake.y * 2,
            });
            if (usePaintedPlutoFx) drawPaintedImpactPluto(now, shake.x * 2, shake.y * 2);
            if (usePaintedPlutoFx && nowMs !== null) {
              const impactStartMs = paintedImpactFxRef.current.explosionStartMs ?? paintedImpactFxRef.current.bonkStartMs;
              if (impactStartMs !== null) {
                const freezeAgeMs = nowMs - impactStartMs;
                if (freezeAgeMs >= 0 && freezeAgeMs < PAINTED_CRASH_FREEZE_MS) {
                  const tFreeze = clamp(freezeAgeMs / Math.max(1, PAINTED_CRASH_FREEZE_MS), 0, 1);
                  const wobble = Math.sin(tFreeze * Math.PI * 5) * (1 - tFreeze) * 6;
                  const shakeXFreeze = Math.sin(tFreeze * Math.PI * 11) * 12;
                  const shakeYFreeze = Math.cos(tFreeze * Math.PI * 9) * 3;
                  const tilt = Math.sin(tFreeze * Math.PI * 6) * 0.122;
                  const crashPose: RocketPose = {
                    x: (crashImpactXRef.current - 8 + wobble + shakeXFreeze) / 2,
                    y: (crashImpactYRef.current + 1 + Math.cos(tFreeze * Math.PI * 4) * 1.5 + shakeYFreeze) / 2,
                    rot: clamp(0.14 + tilt, -0.35, 0.35),
                    size: 28,
                    exhaust: 0.25,
                    thrust: false,
                    visible: true,
                  };
                  drawRocket(a, crashPose, tSec);
                }
              }
            }
            const cx = Math.round(crashImpactXRef.current / 2);
            const cy = Math.round(crashImpactYRef.current / 2);
            if (!usePaintedPlutoFx) {
              lctx.save();
              lctx.globalAlpha = 0.25 * (1 - p);
              lctx.fillStyle = "#20324a";
              for (let i = 0; i < 10; i += 1) {
                const ox = Math.round(Math.cos((i / 10) * Math.PI * 2 + tSec * 0.8) * (4 + p * 10));
                const oy = Math.round(Math.sin((i / 10) * Math.PI * 2 + tSec * 0.6) * (3 + p * 7));
                lctx.fillRect(cx + ox - 1, cy + oy - 1, 3, 3);
              }
              lctx.restore();
            }
            drawImpactDust();
            if (!usePaintedPlutoFx) {
              const r1 = Math.round(4 + easeOut(p) * 18);
              const r2 = Math.round(8 + easeOut(p) * 26);
              lctx.save();
              lctx.globalAlpha = clamp(0.95 * (1 - p * 0.35) * breathIn, 0, MAX_GLOW_ALPHA);
              lctx.strokeStyle = "#f6fbff";
              lctx.lineWidth = 1;
              lctx.beginPath(); lctx.arc(cx + 0.5, cy + 0.5, r1, 0, Math.PI * 2); lctx.stroke();
              lctx.globalAlpha = clamp(0.45 * (1 - p * 0.2) * breathIn, 0, MAX_GLOW_ALPHA);
              lctx.strokeStyle = "#b2d7ff";
              lctx.lineWidth = 2;
              lctx.beginPath(); lctx.arc(cx + 0.5, cy + 0.5, r2, 0, Math.PI * 2); lctx.stroke();
              lctx.restore();
              drawFx(a, Math.floor(tSec * 14) % 2 ? "starburst_1" : "starburst_2", cx, cy, 18 + p * 10, clamp((0.85 - p * 0.3) * breathIn, 0, MAX_GLOW_ALPHA), p * 0.6);
              drawFx(a, "glitter_1", cx - 8, cy - 4, 6 + p * 3, clamp(0.45 * breathIn, 0, MAX_GLOW_ALPHA));
              drawFx(a, "glitter_2", cx + 10, cy + 6, 6 + p * 4, clamp(0.4 * breathIn, 0, MAX_GLOW_ALPHA));
            }
            if (usePaintedPlutoFx) {
              drawPaintedBonkAtImpact(now, shake.x * 2, shake.y * 2);
              drawPaintedExplosionAtImpact(now, shake.x * 2, shake.y * 2);
            }
            drawParticles(a, false);
            drawParticles(a, true);
            if (usePaintedPlutoFx) {
              const paintedCardPopElapsed = getPaintedCardPopElapsedMs(now);
              if (paintedCardPopElapsed !== null) {
                drawCardPopOverlay(tSec, paintedCardPopElapsed, false, tl.elapsed);
              }
            }
          }
          lctx.restore();
        }
        if (
          paintedModeRef.current
          && debugQueryOn
          && tl.phase !== "crash"
          && tl.phase !== "explosion"
          && getPaintedExplosionAgeMs(now) !== null
        ) {
          drawPaintedExplosionAtImpact(now);
        }
        dbgBgModeRef.current = bgMode;
        drawSound(); drawStamp(); drawDebugOverlay(tl); drawPaintedCorridorProofMarker();
      }

      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      lctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = false; lctx.imageSmoothingEnabled = false;
      const forceRedrawPending = forceRedrawRef.current === true;
      if (forceRedrawRef.current) forceRedrawRef.current = false;
      const toastAlive = !!(toastRef.current && (simElapsedRef.current - toastRef.current.startMs) < toastRef.current.durMs);
      const particlesAlive = particlesRef.current.length > 0 || dustRef.current.length > 0;
      const cardPopActive = tl.phase === "card" && tl.local < 560;
      const paintedExplosionActive = paintedModeRef.current && getPaintedExplosionAgeMs(rafNowMsRef.current) !== null;
      const paintedBonkActive = paintedModeRef.current
        && bonkActiveRef.current
        && paintedBonkStartMsRef.current !== null
        && rafNowMsRef.current !== null
        && (rafNowMsRef.current - paintedBonkStartMsRef.current) <= (PAINTED_BONK_TOTAL_MS + PAINTED_BONK_OVERLAP_MS);
      const isIdleEligible = tl.phase === "card"
        && !cardPopActive
        && !paintedExplosionActive
        && !paintedBonkActive
        && !toastAlive
        && !particlesAlive
        && !forceRedrawPending;
      if (tl.phase === "card" && isIdleEligible) {
        inCorridorRef.current = false;
        corridorLatchRef.current = false;
      }
      const shouldContinue = !isIdleEligible && (tl.phase !== "card" || toastAlive || particlesAlive || forceRedrawPending || cardPopActive || paintedExplosionActive || paintedBonkActive);
      rafPausedRef.current = !shouldContinue;
      if (shouldContinue) rafRef.current = window.requestAnimationFrame(renderFrame);
    };
    const ensureRaf = (): void => {
      if (dead || !alive || effectAbort.signal.aborted) return;
      rafPausedRef.current = false;
      if (rafRef.current === null) rafRef.current = window.requestAnimationFrame(renderFrame);
    };
    const startPreload = (): void => {
      if (!paintedModeRef.current) return;
      if (dead || !alive || effectAbort.signal.aborted) return;
      paintedLoadStartedRef.current = true;
      void paintedPreloadStore.start().finally(() => {
        if (dead || !alive || effectAbort.signal.aborted) return;
        forceRedrawRef.current = true;
        ensureRaf();
      });
    };
    const startMission = (): void => {
      if (phaseRef.current !== "prestart") return;
      if (!prestartCanStart()) {
        forceRedrawRef.current = true;
        ensureRaf();
        return;
      }
      resetAll("prestart_start");
      userGestureRef.current = true;
      soundOnRef.current = true;
      phaseRef.current = "countdown";
      simElapsedRef.current = 0;
      lastRealRef.current = null;
      countdownShownRef.current = null;
      void getAudio();
      startMusic();
      forceRedrawRef.current = true;
      ensureRaf();
    };

    const enterCard = (_elapsed: number): void => {
      void _elapsed;
      jumpToPhase("card");
      skipRequestedRef.current = true;
      reachedCardRef.current = true;
    };
    const loadAssets = async (): Promise<void> => {
      try {
        if (dead || !alive || effectAbort.signal.aborted) return;
        const res = await fetch(MANIFEST_PATH, { cache: "no-store", signal: effectAbort.signal }); if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
        const raw = (await res.json()) as ManifestRaw; const manifest = resolveManifest(raw);
        if (paintedModeRef.current) {
          manifest.times.crash = PAINTED_BONK_TOTAL_MS;
          manifest.times.explosion = PAINTED_EXPLOSION_TOTAL_MS;
        }
        const [scenes, fx] = await Promise.all([
          loadImageAbortable(raw.sceneAtlas.path, effectAbort.signal),
          loadImageAbortable(raw.fxAtlas.path, effectAbort.signal),
        ]);
        if (dead || !alive || effectAbort.signal.aborted) return;
        const loadedAssets: Assets = { manifest, scenes, fx };
        assetsRef.current = loadedAssets;
        cleanedFxTilesRef.current = buildCleanRocketTiles(fx, manifest);
        planetSpritesRef.current = buildPlanetSprites(scenes, manifest);
        actionsRef.current = [
          { id:"openEmail", rect:CARD_ACTION_RECTS.openEmail, onClick:()=>{ uiBeep(); window.location.href = `mailto:${CONTACT.email}`; } },
          { id:"copyEmail", rect:CARD_ACTION_RECTS.copyEmail, onClick:async()=>{ uiBeep(); try { if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable"); await navigator.clipboard.writeText(CONTACT.email); showToast("COPIED!", 1000); } catch { showToast("COPY FAILED", 1200); } } },
          { id:"social1", rect:CARD_ACTION_RECTS.social1, onClick:()=>{ uiBeep(); window.open(CONTACT.instagram, "_blank", "noopener,noreferrer"); } },
          { id:"social2", rect:CARD_ACTION_RECTS.social2, onClick:()=>{ uiBeep(); window.open(CONTACT.tiktok, "_blank", "noopener,noreferrer"); } },
          { id:"social3", rect:CARD_ACTION_RECTS.social3, onClick:()=>{ uiBeep(); window.open(CONTACT.linkedin, "_blank", "noopener,noreferrer"); } },
          { id:"social4", rect:CARD_ACTION_RECTS.social4, onClick:()=>{ uiBeep(); window.open(CONTACT.x, "_blank", "noopener,noreferrer"); } },
          { id:"backToPortals", rect:CARD_ACTION_RECTS.backToPortals, onClick:()=>{ uiBeep(); router.push(CONTACT.portals); } },
          { id:"candyCastle", rect:CARD_ACTION_RECTS.candyCastle, onClick:()=>{ uiBeep(); window.location.href = CONTACT.candy; } },
        ];
      } catch (e) {
        if (dead || !alive || effectAbort.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        errRef.current = e instanceof Error ? e.message : "Failed to load";
      }
    };

    const updateHover = (e: PointerEvent): void => {
      const p = toInternal(e);
      mouseRef.current = p;
      if (rafPausedRef.current) ensureRaf();
      if (phaseRef.current !== "card") {
        if (hit(getSoundMainRect(), p.x, p.y)) return setCursor("soundToggle");
        return setCursor(null);
      }
      setCursor(resolveCardHoverAt(p.x, p.y));
      forceRedrawRef.current = true;
      ensureRaf();
    };
    const onPointerDown = (e: PointerEvent): void => {
      const p = toInternal(e);
      mouseRef.current = p;
      if (rafPausedRef.current) ensureRaf();
      if (phaseRef.current === "prestart") {
        if (!prestartCanStart()) {
          forceRedrawRef.current = true;
          ensureRaf();
          return;
        }
        userGestureRef.current = true;
        startMission();
        return;
      }
      userGestureRef.current = true;
      if (phaseRef.current === "card") {
        forceRedrawRef.current = true;
        ensureRaf();
      }
      const hovered = resolveCardHoverAt(p.x, p.y);
      if (hovered === "soundToggle") {
        const next = !soundOnRef.current;
        if (next && !userGestureRef.current) {
          soundOnRef.current = false;
          showToast("CLICK TO ENABLE SOUND");
          updateHover(e);
          return;
        }
        soundOnRef.current = next;
        if (soundOnRef.current) {
          void getAudio();
          startMusic();
          setTrackedTimeout(() => beep(650, 60, "square", 0.03, 840), 0);
        } else {
          stopMusic();
          uiBeep();
        }
        forceRedrawRef.current = true;
        ensureRaf();
        if (debugOnRef.current) console.log("CONTACT_CARD_CLICK soundToggle");
        updateHover(e);
        return;
      }
      if (phaseRef.current !== "card") {
        skipRequestedRef.current = true;
        reachedCardRef.current = true;
        enterCard(simElapsedRef.current);
        uiBeep();
        return;
      }
      const targetId = hovered;
      if (!targetId) return;
      for (const a of actionsRef.current) {
        if (a.id !== targetId) continue;
        if (debugOnRef.current) console.log(`CONTACT_CARD_CLICK ${a.id}`);
        void a.onClick();
        return;
      }
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (rafPausedRef.current) ensureRaf();
      const key = e.key;
      if (phaseRef.current === "prestart" && (key === "Enter" || key === " ")) {
        e.preventDefault();
        if (!prestartCanStart()) {
          forceRedrawRef.current = true;
          ensureRaf();
          return;
        }
        userGestureRef.current = true;
        startMission();
        return;
      }
      if (phaseRef.current === "prestart") return;
      userGestureRef.current = true;
      if (key === "d" || key === "D") { if (debugToggleAllowed) debugOnRef.current = !debugOnRef.current; return; }
      if ((key === "e" || key === "E") && debugQueryOn && paintedModeRef.current) {
        const cx = Math.round(W * 0.5);
        const cy = Math.round(H * 0.5);
        startExplosion("E", cx, cy, rafNowMsRef.current ?? 0);
        forceRedrawRef.current = true;
        ensureRaf();
        return;
      }
      if (key === " ") { e.preventDefault(); pausedRef.current = !pausedRef.current; return; }
      if (key === ".") { if (pausedRef.current) stepOnceRef.current = true; return; }
      if (key === "r" || key === "R") {
        resetAll("key");
        if (rafRef.current === null) rafRef.current = window.requestAnimationFrame(renderFrame);
        return;
      }
      if (key === "1") { jumpToPhase("countdown"); return; }
      if (key === "2") { jumpToPhase("liftoff"); return; }
      if (key === "3") { jumpToPhase("montage"); return; }
      if (key === "4") { jumpToPhase("crash"); return; }
      if (key === "5") { jumpToPhase("explosion"); return; }
      if (key === "6") { jumpToPhase("card"); return; }
    };
    const onLeave = (): void => {
      mouseRef.current = { x: -999, y: -999 };
      setCursor(null);
      if (phaseRef.current === "card") {
        forceRedrawRef.current = true;
        ensureRaf();
      }
    };
    const onPointerEnter = (e: PointerEvent): void => {
      updateHover(e);
      if (phaseRef.current === "card") forceRedrawRef.current = true;
      ensureRaf();
    };

    resetAll("mount");
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointermove", updateHover);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onPointerDown);
    if (!didStartPreloadRef.current) {
      didStartPreloadRef.current = true;
      startPreload();
    }
    void loadAssets();
    rafRef.current = window.requestAnimationFrame(renderFrame);

    return () => {
      alive = false;
      dead = true;
      effectAbort.abort();
      if (lifecycleAbortRef.current === effectAbort) lifecycleAbortRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointermove", updateHover);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      for (const img of preloadImgsRef.current) {
        img.onload = null;
        img.onerror = null;
        try { img.src = ""; } catch {}
      }
      preloadImgsRef.current = [];
      clearTrackedTimers();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      stopMusic();
      const audio = audioRef.current;
      audioRef.current = null;
      if (audio) void audio.close();
    };
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block"
        style={{ imageRendering: "pixelated" }}
        aria-label={`Contact Mission ${INTERNAL_VERSION} canvas cutscene`}
      />
    </div>
  );
}
