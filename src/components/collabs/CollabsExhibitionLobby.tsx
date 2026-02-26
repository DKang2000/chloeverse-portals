"use client";

import Script from "next/script";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process?: () => void;
      };
    };
  }
}

type ExhibitionItem = {
  id: string;
  url: string;
  title: string;
  description: string;
};

type ScreenBox = { x: number; y: number; w: number; h: number };
type CropSettings = {
  s: number;
  tx: number;
  ty: number;
  maskTop: number;
  maskBottom: number;
  maskLeft: number;
  maskRight: number;
};
type CropMap = Record<string, CropSettings>;

type CalibAction =
  | {
      mode: "drag" | "resize";
      pointerId: number;
      startX: number;
      startY: number;
      startBox: ScreenBox;
      rect: DOMRect;
    }
  | null;

type ScreenSlot = {
  index: number;
  token: number;
};

const ROOM_BG_SRC = "/collabs/exhibition/room_bg_final_baked_4096x2002.webp";
const ROOM_PEDESTAL_SRC = "/collabs/exhibition/room_pedestal_4096x2002.png";
const PLATE_W = 4096;
const PLATE_H = 2002;
const STAGE_OVERSCAN = 1.09;
const PERSPECTIVE_PX = 1100;
const DEFAULT_DEADZONE = 0.035;
const DEFAULT_MAX_X = 16;
const DEFAULT_MAX_Y = 12;
const ROT_MAX = 1.15;
const DEFAULT_ROT_MAX = ROT_MAX;
const DEFAULT_ZOOM = 1.02;
const POS_LAMBDA = 3.2; // lower = more drift; higher = snappier
const ROT_LAMBDA = 5.0;
const DEFAULT_INV = 1;
const TEXT_CROSSFADE_MS = 380;
const SCREEN_CROSSFADE_MS = 380;
const SCREEN_BOX_KEY = "collabs.exhibit.screenBox.v3";
const IG_CROP_KEY = "collabs.exhibit.igCrop.v2";
const FRAME_EXPAND_X = 0.04;
const FRAME_EXPAND_TOP = 0.01;
const FRAME_EXPAND_BOTTOM = 0.04;
const FRAME_SHIFT_DOWN_PX = 8;

const DEFAULT_SCREEN_BOX: ScreenBox = {
  x: 0.5522,
  y: 0.2933,
  w: 0.3086,
  h: 0.369,
};

const TEXT_ANCHOR = { x: 690, y: 430 } as const;
const TEXT_BLOCK_W = 620;
const TEXT_BLOCK_MAX_W = 720;
const LABELS = ["Adobe", "OpenAI", "Ume - Williamsburg", "Beauty/fashion", "Adidas"] as const;
const REVEAL_TEXT = "CLICK TO REVEAL";

const EXHIBITIONS: ExhibitionItem[] = [
  { id: "DQukZZpjrpu", url: "https://www.instagram.com/p/DQukZZpjrpu/", title: LABELS[0], description: "" },
  { id: "DUjezQzjpYx", url: "https://www.instagram.com/reel/DUjezQzjpYx/", title: LABELS[1], description: "" },
  { id: "DTRjg4rkcIT", url: "https://www.instagram.com/p/DTRjg4rkcIT/", title: LABELS[2], description: "" },
  { id: "DT14hYEDq__", url: "https://www.instagram.com/p/DT14hYEDq__/", title: LABELS[3], description: "" },
  { id: "DPEZ7PfERdU", url: "https://www.instagram.com/p/DPEZ7PfERdU/", title: LABELS[4], description: "" },
];

const DEFAULT_CROP: CropSettings = {
  s: 1.35,
  tx: 0,
  ty: -240,
  maskTop: 70,
  maskBottom: 85,
  maskLeft: 0,
  maskRight: 0,
};

const IG_MODAL_EMBED_SCALE = 1.16;
const EMBED_POLL_INTERVAL_MS = 150;
const EMBED_TIMEOUT_MS = 4500;
const IFRAME_OVERSCAN = 14;
const TOP_CAP_H = 88;
const BOTTOM_CAP_H = TOP_CAP_H;
const MODAL_CROP_VISIBLE: CropSettings = { s: 1.06, tx: 0, ty: -22, maskTop: 0, maskBottom: 0, maskLeft: 0, maskRight: 0 };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normPointer(clientX: number, clientY: number, rect: DOMRect) {
  if (rect.width <= 0 || rect.height <= 0) return { nx: 0, ny: 0 };
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
  return {
    nx: Math.max(-1, Math.min(1, nx)),
    ny: Math.max(-1, Math.min(1, ny)),
  };
}

function applyDeadzone(v: number, dz: number) {
  const abs = Math.abs(v);
  if (abs <= dz) return 0;
  const scaled = (abs - dz) / (1 - dz);
  return Math.sign(v) * scaled;
}

function softClamp(v: number) {
  return Math.tanh(v * 1.25);
}

function applyPow(v: number, p: number) {
  return Math.sign(v) * Math.pow(Math.abs(v), p);
}


function setLayerTransform(el: HTMLDivElement | null, x: number, y: number, rx: number, ry: number, s: number) {
  if (!el) return;
  el.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
  el.style.transformOrigin = "50% 50%";
  el.style.backfaceVisibility = "hidden";
}

function clampScreenBox(box: ScreenBox): ScreenBox {
  const minW = 0.08;
  const minH = 0.12;
  const w = Math.min(1, Math.max(minW, box.w));
  const h = Math.min(1, Math.max(minH, box.h));
  const x = Math.min(1 - w, Math.max(0, box.x));
  const y = Math.min(1 - h, Math.max(0, box.y));
  return { x, y, w, h };
}

function parseScreenBox(raw: string | null): ScreenBox | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ScreenBox>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number" || typeof parsed.w !== "number" || typeof parsed.h !== "number") return null;
    return clampScreenBox(parsed as ScreenBox);
  } catch {
    return null;
  }
}

function clampCrop(crop: Partial<CropSettings> | null | undefined): CropSettings {
  return {
    s: Math.min(1.6, Math.max(0.35, Number(crop?.s ?? DEFAULT_CROP.s))),
    tx: Math.round(Number(crop?.tx ?? DEFAULT_CROP.tx)),
    ty: Math.round(Number(crop?.ty ?? DEFAULT_CROP.ty)),
    maskTop: Math.max(0, Math.round(Number(crop?.maskTop ?? DEFAULT_CROP.maskTop))),
    maskBottom: Math.max(0, Math.round(Number(crop?.maskBottom ?? DEFAULT_CROP.maskBottom))),
    maskLeft: Math.max(0, Math.round(Number(crop?.maskLeft ?? DEFAULT_CROP.maskLeft))),
    maskRight: Math.max(0, Math.round(Number(crop?.maskRight ?? DEFAULT_CROP.maskRight))),
  };
}

function defaultCropMap(): CropMap {
  const map: CropMap = {};
  for (const item of EXHIBITIONS) map[item.url] = { ...DEFAULT_CROP };
  return map;
}

function parseCropMap(raw: string | null): CropMap | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<CropSettings>>;
    const next = defaultCropMap();
    for (const item of EXHIBITIONS) next[item.url] = clampCrop(parsed[item.url]);
    return next;
  } catch {
    return null;
  }
}

function formatCrop(crop: CropSettings) {
  return `s ${crop.s.toFixed(3)} tx ${crop.tx} ty ${crop.ty} mt ${crop.maskTop} mb ${crop.maskBottom} ml ${crop.maskLeft} mr ${crop.maskRight}`;
}

function InstagramProjectsEmbed({
  url,
  token,
  crop,
  onReadyChange,
}: {
  url: string;
  token: number;
  crop: CropSettings;
  onReadyChange?: (ready: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [, setIframePresent] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  useEffect(() => {
    setIframePresent(false);
    setEmbedFailed(false);
    onReadyChange?.(false);
  }, [url, token, onReadyChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let elapsed = 0;
    const process = () => window.instgrm?.Embeds?.process?.();
    const checkIframe = () => {
      const iframe = hostRef.current?.querySelector("iframe");
      if (!iframe) return false;
      setIframePresent(true);
      onReadyChange?.(true);
      return true;
    };

    process();
    checkIframe();

    const pollId = window.setInterval(() => {
      if (checkIframe()) {
        window.clearInterval(pollId);
        return;
      }
      elapsed += EMBED_POLL_INTERVAL_MS;
      if (elapsed >= EMBED_TIMEOUT_MS) {
        window.clearInterval(pollId);
        setEmbedFailed(true);
      }
    }, EMBED_POLL_INTERVAL_MS);

    const host = hostRef.current;
    const observer = new MutationObserver(() => {
      checkIframe();
    });
    if (host) observer.observe(host, { childList: true, subtree: true });

    const raf = window.requestAnimationFrame(process);
    const t250 = window.setTimeout(process, 250);
    const t900 = window.setTimeout(process, 900);

    return () => {
      observer.disconnect();
      window.clearInterval(pollId);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t250);
      window.clearTimeout(t900);
    };
  }, [url, token, onReadyChange]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {!embedFailed ? (
        <div className="absolute inset-0 z-0 overflow-hidden bg-white">
          <div
            className="absolute"
            style={{
              left: -IFRAME_OVERSCAN,
              top: -IFRAME_OVERSCAN,
              right: -IFRAME_OVERSCAN,
              bottom: -IFRAME_OVERSCAN,
            }}
          >
            <div
              className="h-full w-full will-change-transform"
              style={{ transform: `translate3d(${crop.tx}px, ${crop.ty}px, 0) scale(${crop.s})`, transformOrigin: "top center" }}
            >
              <div
                key={`${url}-${token}`}
                ref={hostRef}
                className="collabsModalInstaHost h-full w-full overflow-hidden bg-white"
                style={{ ["--ig-embed-scale" as "--ig-embed-scale"]: IG_MODAL_EMBED_SCALE } as React.CSSProperties}
              >
                <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
                  <a href={url} target="_blank" rel="noreferrer">
                    View on Instagram
                  </a>
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-full w-full place-items-center bg-white">
          <a href={url} target="_blank" rel="noreferrer noopener" className="text-sm text-blue-400">
            Open on Instagram
          </a>
        </div>
      )}
    </div>
  );
}

export default function CollabsExhibitionLobby() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [screenBox, setScreenBox] = useState<ScreenBox>(DEFAULT_SCREEN_BOX);
  const [cropMap, setCropMap] = useState<CropMap>(() => defaultCropMap());
  const [isCalibMode, setIsCalibMode] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState(() => {
    if (typeof window === "undefined") return { vw: 1, vh: 1 };
    return { vw: window.innerWidth || 1, vh: window.innerHeight || 1 };
  });
  const [plateMissing, setPlateMissing] = useState(false);
  const [screenFrontSlot, setScreenFrontSlot] = useState<0 | 1>(0);
  const [, setScreenSlots] = useState<[ScreenSlot | null, ScreenSlot | null]>([{ index: 0, token: 0 }, null]);
  const [, setScreenFadeProgress] = useState(0);
  const [textFadeProgress, setTextFadeProgress] = useState(0);
  const [, setIncomingScreenReady] = useState(false);
  const [calibSaveFlash, setCalibSaveFlash] = useState(false);
  const [cropSaveFlash, setCropSaveFlash] = useState(false);
  const [modalEmbedReady, setModalEmbedReady] = useState(false);
  const [modalUserInteracted, setModalUserInteracted] = useState(false);
  const [tuneHud, setTuneHud] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const plateStageRef = useRef<HTMLDivElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const pedestalLayerRef = useRef<HTMLDivElement | null>(null);
  const motionRafRef = useRef<number | null>(null);
  const textFadeRafRef = useRef<number | null>(null);
  const screenFadeRafRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const motionCfgRef = useRef({
    deadzone: DEFAULT_DEADZONE,
    maxX: DEFAULT_MAX_X,
    maxY: DEFAULT_MAX_Y,
    rot: DEFAULT_ROT_MAX,
    zoom: DEFAULT_ZOOM,
    inv: DEFAULT_INV,
    curvePow: 1.55,
    posLambda: POS_LAMBDA,
    rotLambda: ROT_LAMBDA,
  });
  const pointerRef = useRef({ nx: 0, ny: 0, amp: 1 });
  const camRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const lastTRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0);
  const reducedMotionRef = useRef(false);
  const calibActionRef = useRef<CalibAction>(null);
  const swapTokenRef = useRef(1);
  const pendingSwapRef = useRef<{ token: number; backSlot: 0 | 1; index: number } | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const pendingIndexRef = useRef<number | null>(pendingIndex);
  const screenFrontSlotRef = useRef<0 | 1>(screenFrontSlot);

  activeIndexRef.current = activeIndex;
  pendingIndexRef.current = pendingIndex;
  screenFrontSlotRef.current = screenFrontSlot;

  const activeItem = EXHIBITIONS[activeIndex] ?? EXHIBITIONS[0];
  const incomingItem = pendingIndex === null ? null : (EXHIBITIONS[pendingIndex] ?? null);
  const activeCrop = cropMap[activeItem.url] ?? DEFAULT_CROP;

  const vw = viewport.vw || 1;
  const vh = viewport.vh || 1;
  const scale = Math.max(vw / PLATE_W, vh / PLATE_H);
  const coverW = PLATE_W * scale;
  const coverH = PLATE_H * scale;
  const offX = (vw - coverW) / 2;
  const offY = (vh - coverH) / 2;
  const px = (x: number) => offX + x * scale;
  const py = (y: number) => offY + y * scale;
  const ps = (v: number) => v * scale;

  const screenRect = mounted
    ? {
        left: px(screenBox.x * PLATE_W),
        top: py(screenBox.y * PLATE_H),
        width: ps(screenBox.w * PLATE_W),
        height: ps(screenBox.h * PLATE_H),
      }
    : { left: 0, top: 0, width: 0, height: 0 };
  const frameRect = {
    left: screenRect.left - screenRect.width * FRAME_EXPAND_X,
    top:
      screenRect.top
      - screenRect.height * FRAME_EXPAND_TOP
      + ps(FRAME_SHIFT_DOWN_PX),
    width: screenRect.width * (1 + FRAME_EXPAND_X * 2),
    height:
      screenRect.height * (1 + FRAME_EXPAND_TOP + FRAME_EXPAND_BOTTOM)
      - ps(FRAME_SHIFT_DOWN_PX),
  };

  const textActiveOpacity = pendingIndex === null ? 1 : 1 - textFadeProgress;
  const textIncomingOpacity = pendingIndex === null ? 0 : textFadeProgress;
  const motionCfg = motionCfgRef.current;
  const tuneQuery = `?tune=1&inv=${motionCfg.inv}&mx=${motionCfg.maxX.toFixed(2)}&my=${motionCfg.maxY.toFixed(2)}&rot=${motionCfg.rot.toFixed(2)}&zoom=${motionCfg.zoom.toFixed(3)}&pl=${motionCfg.posLambda.toFixed(2)}&rl=${motionCfg.rotLambda.toFixed(2)}&dz=${motionCfg.deadzone.toFixed(3)}&pow=${motionCfg.curvePow.toFixed(2)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setIsCalibMode(params.get("calib") === "1");
    setIsCropMode(params.get("crop") === "1");
    setTuneHud(params.get("tune") === "1");

    const cfg = motionCfgRef.current;
    const getNum = (key: string) => {
      const raw = params.get(key);
      if (raw === null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const dz = getNum("dz");
    const mx = getNum("mx");
    const my = getNum("my");
    const rot = getNum("rot");
    const zoom = getNum("zoom");
    const pow = getNum("pow");
    const pl = getNum("pl");
    const rl = getNum("rl");
    const inv = getNum("inv");

    if (dz !== null) cfg.deadzone = clampNum(dz, 0, 0.2);
    if (mx !== null) cfg.maxX = clampNum(mx, 0, 90);
    if (my !== null) cfg.maxY = clampNum(my, 0, 70);
    if (rot !== null) cfg.rot = clampNum(rot, 0, 4);
    if (zoom !== null) cfg.zoom = clampNum(zoom, 1, 1.1);
    if (pow !== null) cfg.curvePow = clampNum(pow, 1, 3);
    if (pl !== null) cfg.posLambda = clampNum(pl, 1.2, 10);
    if (rl !== null) cfg.rotLambda = clampNum(rl, 1.2, 12);
    if (inv !== null) cfg.inv = inv >= 0.5 ? 1 : 0;

    pointerRef.current = { nx: 0, ny: 0, amp: 1 };
    camRef.current = { x: 0, y: 0, rx: 0, ry: 0 };

    const savedScreenBox = parseScreenBox(window.localStorage.getItem(SCREEN_BOX_KEY));
    if (savedScreenBox) setScreenBox(savedScreenBox);
    const savedCrop = parseCropMap(window.localStorage.getItem(IG_CROP_KEY));
    if (savedCrop) setCropMap(savedCrop);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewport({ vw: window.innerWidth || 1, vh: window.innerHeight || 1 });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotionRef.current = media.matches;
    };
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (!plateStageRef.current) return;
    pointerRef.current = { nx: 0, ny: 0, amp: 1 };
    camRef.current = { x: 0, y: 0, rx: 0, ry: 0 };
    const s0 = STAGE_OVERSCAN * motionCfgRef.current.zoom;
    setLayerTransform(bgLayerRef.current, 0, 0, 0, 0, s0);
    setLayerTransform(pedestalLayerRef.current, 0, 0, 0, 0, s0 * 1.01);
    lastTRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!plateStageRef.current) return;
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTRef.current) / 1000));
      lastTRef.current = now;
      const pointer = pointerRef.current;
      const cam = camRef.current;
      if (reducedMotionRef.current) {
        cam.x = 0;
        cam.y = 0;
        cam.rx = 0;
        cam.ry = 0;
      } else {
        const cfg = motionCfgRef.current;
        const tx = pointer.nx * cfg.maxX * pointer.amp;
        const ty = pointer.ny * cfg.maxY * pointer.amp;
        const tryDeg = pointer.nx * cfg.rot * pointer.amp;
        const trxDeg = -pointer.ny * cfg.rot * pointer.amp;
        const ap = 1 - Math.exp(-cfg.posLambda * dt);
        const ar = 1 - Math.exp(-cfg.rotLambda * dt);
        cam.x += (tx - cam.x) * ap;
        cam.y += (ty - cam.y) * ap;
        cam.rx += (trxDeg - cam.rx) * ar;
        cam.ry += (tryDeg - cam.ry) * ar;

      }

      const baseScale = STAGE_OVERSCAN * motionCfgRef.current.zoom;
      const BG_MUL = 1.0;
      const PED_MUL = 1.25;
      if (bgLayerRef.current && pedestalLayerRef.current) {
        const rx = cam.rx;
        const ry = cam.ry;
        setLayerTransform(bgLayerRef.current, cam.x * BG_MUL, cam.y * BG_MUL, rx, ry, baseScale);
        setLayerTransform(pedestalLayerRef.current, cam.x * PED_MUL, cam.y * PED_MUL, rx, ry, baseScale * 1.01);
      }
      motionRafRef.current = window.requestAnimationFrame(tick);
    };
    motionRafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (motionRafRef.current !== null) {
        window.cancelAnimationFrame(motionRafRef.current);
        motionRafRef.current = null;
      }
    };
  }, [viewport.vh, viewport.vw]);

  useEffect(() => {
    if (!isCalibMode) return;
    const onPointerMove = (event: PointerEvent) => {
      const action = calibActionRef.current;
      if (!action || event.pointerId !== action.pointerId) return;
      const dx = (event.clientX - action.startX) / action.rect.width;
      const dy = (event.clientY - action.startY) / action.rect.height;
      if (action.mode === "drag") {
        setScreenBox((prev) => clampScreenBox({ ...prev, x: action.startBox.x + dx, y: action.startBox.y + dy }));
        return;
      }
      setScreenBox(() => clampScreenBox({ x: action.startBox.x, y: action.startBox.y, w: action.startBox.w + dx, h: action.startBox.h + dy }));
    };
    const onPointerUp = (event: PointerEvent) => {
      const action = calibActionRef.current;
      if (!action || event.pointerId !== action.pointerId) return;
      calibActionRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      calibActionRef.current = null;
    };
  }, [isCalibMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      if (modalOpen) setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    setModalEmbedReady(false);
    setModalUserInteracted(false);
  }, [modalOpen, activeItem.url]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalOpen || menuOpen || pendingIndex !== null) return;
      if (isCropMode) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        beginSwap(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        beginSwap(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, modalOpen, pendingIndex, isCropMode]);

  useEffect(() => {
    if (!isCalibMode || isCropMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "s") {
        try {
          window.localStorage.setItem(SCREEN_BOX_KEY, JSON.stringify(screenBox));
          setCalibSaveFlash(true);
          if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = window.setTimeout(() => {
            setCalibSaveFlash(false);
            flashTimeoutRef.current = null;
          }, 800);
        } catch {}
      }
      if (key === "r") setScreenBox(DEFAULT_SCREEN_BOX);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCalibMode, isCropMode, screenBox]);

  useEffect(() => {
    if (!isCropMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 10 : 1;
      const scaleStep = event.shiftKey ? 0.03 : 0.01;
      let handled = false;
      const apply = (updater: (prev: CropSettings) => CropSettings) => {
        setCropMap((prev) => ({ ...prev, [activeItem.url]: clampCrop(updater(prev[activeItem.url] ?? DEFAULT_CROP)) }));
      };
      switch (event.key) {
        case "ArrowLeft": handled = true; apply((prev) => ({ ...prev, tx: prev.tx - step })); break;
        case "ArrowRight": handled = true; apply((prev) => ({ ...prev, tx: prev.tx + step })); break;
        case "ArrowUp": handled = true; apply((prev) => ({ ...prev, ty: prev.ty - step })); break;
        case "ArrowDown": handled = true; apply((prev) => ({ ...prev, ty: prev.ty + step })); break;
        case "+":
        case "=": handled = true; apply((prev) => ({ ...prev, s: prev.s + scaleStep })); break;
        case "-":
        case "_": handled = true; apply((prev) => ({ ...prev, s: prev.s - scaleStep })); break;
        case "[": handled = true; apply((prev) => ({ ...prev, maskTop: prev.maskTop - step })); break;
        case "]": handled = true; apply((prev) => ({ ...prev, maskTop: prev.maskTop + step })); break;
        case ";": handled = true; apply((prev) => ({ ...prev, maskBottom: prev.maskBottom - step })); break;
        case "'": handled = true; apply((prev) => ({ ...prev, maskBottom: prev.maskBottom + step })); break;
        case "s":
        case "S":
          handled = true;
          try {
            window.localStorage.setItem(IG_CROP_KEY, JSON.stringify(cropMap));
            setCropSaveFlash(true);
            if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
            flashTimeoutRef.current = window.setTimeout(() => {
              setCropSaveFlash(false);
              flashTimeoutRef.current = null;
            }, 800);
          } catch {}
          break;
      }
      if (handled) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCropMode, activeItem.url, cropMap]);

  useEffect(() => {
    return () => {
      if (motionRafRef.current !== null) window.cancelAnimationFrame(motionRafRef.current);
      if (textFadeRafRef.current !== null) window.cancelAnimationFrame(textFadeRafRef.current);
      if (screenFadeRafRef.current !== null) window.cancelAnimationFrame(screenFadeRafRef.current);
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const handlePlateLoad = () => setPlateMissing(false);

  const runFade = (ms: number, setProgress: (value: number) => void, rafRef: React.MutableRefObject<number | null>, onDone?: () => void) => {
    if (typeof window === "undefined") return;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = clamp01((now - start) / ms);
      setProgress(p);
      if (p >= 1) {
        rafRef.current = null;
        onDone?.();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    setProgress(0);
    rafRef.current = window.requestAnimationFrame(tick);
  };

  const finalizeSwap = () => {
    const pending = pendingSwapRef.current;
    if (!pending) return;
    const oldFront = screenFrontSlotRef.current;
    setActiveIndex(pending.index);
    setScreenFrontSlot(pending.backSlot);
    setScreenSlots((prev) => {
      const next = [...prev] as [ScreenSlot | null, ScreenSlot | null];
      next[oldFront] = null;
      return next;
    });
    setPendingIndex(null);
    setIncomingScreenReady(false);
    setScreenFadeProgress(0);
    setTextFadeProgress(0);
    pendingSwapRef.current = null;
  };

  const startScreenFade = () => {
    runFade(SCREEN_CROSSFADE_MS, setScreenFadeProgress, screenFadeRafRef, finalizeSwap);
  };

  const beginSwapToIndex = (nextIndex: number) => {
    if (pendingIndexRef.current !== null) return;
    const current = activeIndexRef.current;
    if (nextIndex === current || nextIndex < 0 || nextIndex >= EXHIBITIONS.length) return;
    const nextBackSlot = ((screenFrontSlotRef.current + 1) % 2) as 0 | 1;
    const token = swapTokenRef.current++;
    setPendingIndex(nextIndex);
    setIncomingScreenReady(false);
    setScreenFadeProgress(0);
    setTextFadeProgress(0);
    setScreenSlots((prev) => {
      const next = [...prev] as [ScreenSlot | null, ScreenSlot | null];
      next[nextBackSlot] = { index: nextIndex, token };
      return next;
    });
    pendingSwapRef.current = { token, backSlot: nextBackSlot, index: nextIndex };
    runFade(TEXT_CROSSFADE_MS, setTextFadeProgress, textFadeRafRef);
    setIncomingScreenReady(true);
    startScreenFade();
  };

  const beginSwap = (delta: number) => {
    if (pendingIndexRef.current !== null || EXHIBITIONS.length < 2) return;
    const current = activeIndexRef.current;
    beginSwapToIndex((current + delta + EXHIBITIONS.length) % EXHIBITIONS.length);
  };

  const jumpToIndex = (index: number) => {
    if (index === activeIndexRef.current || pendingIndexRef.current !== null) {
      setMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    beginSwapToIndex(index);
  };

  const openModal = () => {
    if (pendingIndex !== null || menuOpen) return;
    setModalOpen(true);
  };

  const startCalibAction = (event: React.PointerEvent<HTMLDivElement>, mode: "drag" | "resize") => {
    if (!isCalibMode) return;
    calibActionRef.current = { mode, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startBox: screenBox, rect: new DOMRect(offX, offY, coverW, coverH) };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== "undefined") window.instgrm?.Embeds?.process?.();
        }}
      />
      <style jsx global>{`
        @keyframes revealClip {
          0% { clip-path: inset(0 100% 0 0); }
          28% { clip-path: inset(0 0% 0 0); }
          82% { clip-path: inset(0 0% 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        @keyframes caretBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .revealWrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .revealText {
          display: inline-block;
          white-space: nowrap;
          clip-path: inset(0 100% 0 0);
          animation: revealClip 5.2s ease-in-out infinite;
        }
        .revealCaret {
          width: 2px;
          height: 1.1em;
          margin-left: 8px;
          background: rgba(255,255,255,0.7);
          animation: caretBlink 0.9s steps(1,end) infinite;
        }
        .collabsModalInstaHost {
          overflow: hidden;
        }
        .collabsModalInstaHost,
        .collabsModalInstaHost .instagram-media {
          background: #fff !important;
        }
        .collabsModalInstaHost .instagram-media {
          margin: 0 !important;
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          background: #fff !important;
          border: 0 !important;
          box-shadow: none !important;
        }
        .collabsModalInstaHost iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          outline: 0 !important;
          transform-origin: top center !important;
          transform: scale(var(--ig-embed-scale, 1.16)) !important;
          background: #fff !important;
        }
      `}</style>

      <div
        ref={rootRef}
        className="fixed inset-0 overflow-hidden text-white"
        style={{ background: "#2d241f", WebkitTapHighlightColor: "transparent" as never }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const cfg = motionCfgRef.current;
          const { nx, ny } = normPointer(event.clientX, event.clientY, rect);
          const nxSoft = softClamp(applyDeadzone(nx, cfg.deadzone));
          const nySoft = softClamp(applyDeadzone(ny, cfg.deadzone));
          const nxShaped = applyPow(nxSoft, cfg.curvePow);
          const nyShaped = applyPow(nySoft, cfg.curvePow);
          const dir = cfg.inv ? -1 : 1;
          pointerRef.current = {
            nx: dir * nxShaped,
            ny: dir * nyShaped,
            amp: event.pointerType === "mouse" ? 1 : 0.4,
          };
        }}
        onPointerLeave={() => {
          pointerRef.current = { ...pointerRef.current, nx: 0, ny: 0 };
        }}
      >
        <div className="absolute inset-0" style={{ perspective: `${PERSPECTIVE_PX}px` }}>
          <div
            ref={plateStageRef}
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <div ref={bgLayerRef} className="absolute inset-0 will-change-transform">
              <img
                src={ROOM_BG_SRC}
                alt=""
                aria-hidden="true"
                draggable={false}
                onLoad={handlePlateLoad}
                onError={() => setPlateMissing(true)}
                className="absolute inset-0 h-full w-full select-none object-cover"
              />

              {mounted && isCalibMode ? (
                <div
                  className="absolute z-30 rounded-md border-2 border-dashed border-[#f7ebd0] bg-[#f7ebd0]/5"
                  style={{ left: screenRect.left, top: screenRect.top, width: screenRect.width, height: screenRect.height, boxShadow: "0 0 0 1px rgba(0,0,0,0.28) inset" }}
                  onPointerDown={(event) => startCalibAction(event, "drag")}
                >
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.2em] text-[#f7ebd0]/85">Screen Box</div>
                  <div className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border border-[#f7ebd0] bg-black/70" onPointerDown={(event) => startCalibAction(event, "resize")} />
                </div>
              ) : null}
            </div>

            <div ref={pedestalLayerRef} className="absolute inset-0 will-change-transform pointer-events-none">
              <img src={ROOM_PEDESTAL_SRC} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-cover select-none" />
            </div>

          </div>

          <div className="absolute inset-0 pointer-events-none">
            {mounted ? (
              <div
                className="absolute z-[70] pointer-events-none"
                style={{
                  left: frameRect.left,
                  top: frameRect.top,
                  width: frameRect.width,
                  height: frameRect.height,
                }}
              >
                <div
                  className="pointer-events-auto relative h-full w-full cursor-pointer overflow-hidden rounded-[22px] bg-black ring-1 ring-white/15"
                  style={{
                    boxShadow: "0 35px 110px rgba(0,0,0,0.55)",
                    transform: "perspective(1400px) rotateZ(-10deg) rotateY(18deg) rotateX(2.5deg)",
                    transformOrigin: "50% 55%",
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openModal();
                  }}
                  role="button"
                  tabIndex={pendingIndex !== null || menuOpen ? -1 : 0}
                  aria-label={`Open ${activeItem.title} reel`}
                  onKeyDown={(event) => {
                    if (pendingIndex !== null || menuOpen) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openModal();
                    }
                  }}
                >
                  <div className="absolute inset-0 bg-black" />
                  <div
                    className="pointer-events-none absolute top-1/2 w-[2px] -translate-y-1/2 bg-white/75"
                    style={{ left: "30%", height: "70%" }}
                  />
                  <div className="pointer-events-none absolute left-[38%] top-1/2 -translate-y-1/2 text-white/85">
                    <div className="flex items-center text-[11px] tracking-[0.22em]">
                      <span className="revealWrap">
                        <span className="revealText uppercase">{REVEAL_TEXT}</span>
                        <span className="revealCaret" />
                      </span>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/0 opacity-40" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <a
          href="https://chloeverse.io"
          className="fixed left-6 top-[18px] z-[60] flex items-center gap-3 text-white/85 transition hover:text-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black/35 ring-1 ring-white/10 text-[11px] font-medium">
            C
          </span>
          <span className="text-[11px] tracking-[0.28em]">CHLOEVERSE</span>
        </a>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          disabled={modalOpen}
          className="fixed right-6 top-[18px] z-[80] grid h-10 w-10 place-items-center rounded-full bg-black/0 transition hover:bg-black/15 disabled:opacity-40"
        >
          <span className="block w-5 space-y-1">
            <span className="block h-[2px] w-full bg-white/85" />
            <span className="block h-[2px] w-full bg-white/85" />
            <span className="block h-[2px] w-full bg-white/85" />
          </span>
        </button>

        <div
          className="pointer-events-none fixed left-0 right-0 z-[70]"
          style={{ bottom: "calc(44px + env(safe-area-inset-bottom))" }}
        >
          <div
            className="mx-auto w-full max-w-[1400px] px-[34px]"
            style={{
              paddingLeft: "calc(34px + env(safe-area-inset-left))",
              paddingRight: "calc(34px + env(safe-area-inset-right))",
            }}
          >
            <div className="flex items-end justify-between gap-4">
              <button
                type="button"
                onClick={() => beginSwap(-1)}
                disabled={pendingIndex !== null || menuOpen || modalOpen}
                className="pointer-events-auto flex min-w-0 flex-col items-start px-6 py-4 text-[11px] tracking-[0.28em] text-white/85 transition hover:text-white disabled:opacity-35"
              >
                <span>PREVIOUS</span>
                <span className="mt-2 h-px w-16 bg-white/35" />
              </button>

              <a
                href="https://imchloekang.com"
                target="_blank"
                rel="noreferrer noopener"
                className="pointer-events-auto flex min-w-0 flex-col items-center px-6 py-4 text-[11px] tracking-[0.28em] text-white/85 transition hover:text-white"
              >
                <span className="truncate">CANDY CASTLE</span>
                <span className="mt-2 h-px w-20 bg-white/35" />
              </a>

              <button
                type="button"
                onClick={() => beginSwap(1)}
                disabled={pendingIndex !== null || menuOpen || modalOpen}
                className="pointer-events-auto flex min-w-0 flex-col items-end px-6 py-4 text-[11px] tracking-[0.28em] text-white/85 transition hover:text-white disabled:opacity-35"
              >
                <span>NEXT</span>
                <span className="mt-2 h-px w-16 bg-white/35" />
              </button>
            </div>
          </div>
        </div>

        {mounted && !modalOpen ? (
          <div className="pointer-events-none fixed inset-0 z-[65]">
            <div
              className="absolute"
              style={{
                left: "clamp(260px, 29vw, 560px)",
                top: "clamp(324px, 42vh, 560px)",
                width: "min(620px, 44vw)",
                maxWidth: "92vw",
              }}
            >
              <div className="relative min-h-[8rem]">
                <div className="absolute inset-0" style={{ opacity: textActiveOpacity, transition: "opacity 80ms linear" }}>
                  <h1 className="whitespace-pre-wrap text-[2.1rem] font-semibold leading-[0.92] tracking-tight text-white sm:text-[2.7rem] md:text-[3.4rem] lg:text-[4.2rem]">{activeItem.title}</h1>
                </div>
                {incomingItem ? (
                  <div className="absolute inset-0" style={{ opacity: textIncomingOpacity, transition: "opacity 80ms linear" }}>
                    <h1 className="whitespace-pre-wrap text-[2.1rem] font-semibold leading-[0.92] tracking-tight text-white sm:text-[2.7rem] md:text-[3.4rem] lg:text-[4.2rem]">{incomingItem.title}</h1>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-30">
          {plateMissing ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className="max-w-2xl rounded-2xl border border-[#ffdf9f]/40 bg-black/70 px-6 py-5 text-center shadow-2xl">
                <p className="text-sm uppercase tracking-[0.24em] text-[#ffdca4]">Missing Room Plate</p>
                <p className="mt-3 text-lg font-medium text-white">Expected asset not found:</p>
                <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-[#ffeecf]">public/collabs/exhibition/room_bg_4096x2002.png</p>
              </div>
            </div>
          ) : null}

          {isCalibMode ? (
            <div className="pointer-events-none absolute bottom-20 left-4 rounded-xl border border-white/20 bg-black/70 px-4 py-3 text-xs leading-5 text-[#f4ead7] md:left-8">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#e4cc9f]">Calibration {calibSaveFlash ? "saved" : ""}</div>
              <div>x: {screenBox.x.toFixed(4)}</div>
              <div>y: {screenBox.y.toFixed(4)}</div>
              <div>w: {screenBox.w.toFixed(4)}</div>
              <div>h: {screenBox.h.toFixed(4)}</div>
              <div className="mt-2 text-white/75">Drag/Resize, S save, R reset</div>
            </div>
          ) : null}

          {isCropMode ? (
            <div className="pointer-events-none absolute left-4 top-4 max-w-[22rem] rounded-xl border border-white/20 bg-black/75 px-4 py-3 text-xs leading-5 text-[#efe7da]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#d8c6a6]">Crop Tuning {cropSaveFlash ? "saved" : ""}</div>
              <div className="mt-1 truncate">{activeItem.id}</div>
              <div className="mt-1 font-mono text-[11px] text-white/85">{formatCrop(activeCrop)}</div>
              <div className="mt-2 text-white/70">Arrows move, Shift = bigger, +/- scale, [ ] top mask, ; ' bottom mask, S save</div>
            </div>
          ) : null}

          {tuneHud ? (
            <div className="pointer-events-none absolute left-4 top-4 max-w-[36rem] rounded-xl border border-white/20 bg-black/75 px-4 py-3 text-xs leading-5 text-[#efe7da]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#d8c6a6]">Motion Tuning</div>
              <div className="mt-1 font-mono text-[11px] text-white/85">
                inv {motionCfg.inv} mx {motionCfg.maxX.toFixed(2)} my {motionCfg.maxY.toFixed(2)} rot {motionCfg.rot.toFixed(2)} zoom {motionCfg.zoom.toFixed(3)}
              </div>
              <div className="font-mono text-[11px] text-white/85">
                pl {motionCfg.posLambda.toFixed(2)} rl {motionCfg.rotLambda.toFixed(2)} dz {motionCfg.deadzone.toFixed(3)} pow {motionCfg.curvePow.toFixed(2)}
              </div>
              <div className="mt-2 break-all font-mono text-[11px] text-[#d6e3ff]">{tuneQuery}</div>
            </div>
          ) : null}
        </div>

        {menuOpen ? (
          <div className="fixed inset-0 z-[75] bg-black/45" role="dialog" aria-modal="true" aria-label="Exhibition menu" onClick={() => setMenuOpen(false)}>
            <div className="ml-auto flex h-full w-full max-w-[24rem] flex-col border-l border-white/12 bg-[#11100f]/95 p-4 pt-20" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/70">Exhibitions</div>
              </div>

              <div className="flex-1 space-y-2 overflow-auto pr-1">
                {EXHIBITIONS.map((item, index) => {
                  const isCurrent = index === activeIndex && pendingIndex === null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => jumpToIndex(index)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${isCurrent ? "border-white/35 bg-white/10" : "border-white/10 bg-black/20 hover:bg-white/5"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate whitespace-pre text-sm font-medium text-white/95">
                          {String(index + 1).padStart(2, "0")} {item.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="sticky bottom-[92px] mt-6">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {modalOpen ? (
          <div className="fixed inset-0 z-50 bg-black/90 p-4 md:p-6" role="dialog" aria-modal="true" aria-label={`${activeItem.title} reel`} onClick={() => setModalOpen(false)}>
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setModalOpen(false);
                  }}
                  className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#f0e4ce] transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="grid min-h-0 flex-1 place-items-center" onClick={(event) => event.stopPropagation()}>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-[-30px] rounded-[46px] bg-[radial-gradient(circle_at_50%_38%,rgba(132,171,238,0.24),rgba(0,0,0,0)_68%)] blur-xl" />
                  <div
                    data-phone-shell="true"
                    className="relative h-[92vh] min-h-[560px] max-h-[920px] w-auto aspect-[608/1000] overflow-hidden rounded-[34px] bg-white p-0 ring-0 border-0 outline-none shadow-[0_40px_140px_rgba(0,0,0,0.55)] md:h-[94vh] md:min-h-[740px] md:max-h-[1120px] md:p-0"
                    style={{
                      border: "none",
                      outline: "none",
                      boxShadow: "0 40px 140px rgba(0,0,0,0.55)",
                      backgroundClip: "padding-box",
                    }}
                  >
                    <div
                      className="relative mx-auto h-full aspect-[9/16] overflow-hidden rounded-[28px] bg-white"
                      onPointerDownCapture={() => setModalUserInteracted(true)}
                    >
                      <div className="absolute inset-0 z-0">
                        <InstagramProjectsEmbed
                          key={`modal:${activeItem.url}:${modalOpen ? 1 : 0}`}
                          url={activeItem.url}
                          token={999000 + activeIndex}
                          crop={MODAL_CROP_VISIBLE}
                          onReadyChange={setModalEmbedReady}
                        />
                      </div>
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-white"
                        style={{
                          height: TOP_CAP_H,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-white"
                        style={{
                          height: BOTTOM_CAP_H,
                          pointerEvents: "none",
                        }}
                      >
                        <a
                          href={activeItem.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block h-full px-4 text-[13px] font-medium text-blue-600"
                          style={{ pointerEvents: "auto", display: "flex", alignItems: "center" }}
                        >
                          View more on Instagram
                        </a>
                      </div>
                      {modalEmbedReady && !modalUserInteracted ? (
                        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                          <div className="grid h-16 w-16 place-items-center rounded-full bg-black/35 ring-1 ring-white/25">
                            <div className="ml-1 h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white/85" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
