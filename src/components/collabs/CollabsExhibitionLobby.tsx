"use client";

import Script from "next/script";
import type * as React from "react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

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

const ROOM_PLATE_SRC = "/collabs/exhibition/room_base.png";
const PLATE_W = 2048;
const PLATE_H = 1018;
const STAGE_OVERSCAN = 1.16;
const TEXT_CROSSFADE_MS = 380;
const SCREEN_CROSSFADE_MS = 380;
const SCREEN_BOX_KEY = "collabs.exhibit.screenBox.v2";
const IG_CROP_KEY = "collabs.exhibit.igCrop.v1";

const TOP_MATTE_SRC_Y = 100;
const TOP_MATTE_H = 90;
const BOTTOM_MATTE_SRC_Y = 820;
const BOTTOM_MATTE_H = 96;
const CURSOR_PATCH_RECT = { x: 1285, y: 705, w: 120, h: 120 } as const;
const CURSOR_PATCH_SRC = { x: 1100, y: 705 } as const;

const DEFAULT_SCREEN_BOX: ScreenBox = {
  x: 0.5522,
  y: 0.2933,
  w: 0.3086,
  h: 0.369,
};

const HAMBURGER_HITBOX = { x: 1968, y: 40, w: 90, h: 70 } as const;
const PREV_HITBOX = { x: 0, y: 930, w: 300, h: 88 } as const;
const NEXT_HITBOX = { x: 1740, y: 930, w: 308, h: 88 } as const;

const TEXT_ANCHOR = { x: 520, y: 430 } as const;
const TEXT_BLOCK_W = 620;
const TEXT_BLOCK_MAX_W = 720;

const EXHIBITIONS: ExhibitionItem[] = [
  { id: "DQukZZpjrpu", url: "https://www.instagram.com/p/DQukZZpjrpu/", title: "Exhibition 01", description: "Instagram post DQukZZpjrpu" },
  { id: "DUjezQzjpYx", url: "https://www.instagram.com/reel/DUjezQzjpYx/", title: "Exhibition 02", description: "Instagram reel DUjezQzjpYx" },
  { id: "DTRjg4rkcIT", url: "https://www.instagram.com/p/DTRjg4rkcIT/", title: "Exhibition 03", description: "Instagram post DTRjg4rkcIT" },
  { id: "DT14hYEDq__", url: "https://www.instagram.com/p/DT14hYEDq__/", title: "Exhibition 04", description: "Instagram post DT14hYEDq__" },
  { id: "DPEZ7PfERdU", url: "https://www.instagram.com/p/DPEZ7PfERdU/", title: "Exhibition 05", description: "Instagram post DPEZ7PfERdU" },
];

const DEFAULT_CROP: CropSettings = {
  s: 0.78,
  tx: -40,
  ty: -120,
  maskTop: 8,
  maskBottom: 46,
  maskLeft: 8,
  maskRight: 8,
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
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

function rectStyle(box: { x: number; y: number; w: number; h: number }, px: (v: number) => number, py: (v: number) => number, ps: (v: number) => number): CSSProperties {
  return { left: px(box.x), top: py(box.y), width: ps(box.w), height: ps(box.h) };
}

function formatCrop(crop: CropSettings) {
  return `s ${crop.s.toFixed(3)} tx ${crop.tx} ty ${crop.ty} mt ${crop.maskTop} mb ${crop.maskBottom} ml ${crop.maskLeft} mr ${crop.maskRight}`;
}

function InstagramEmbedCrop({ url, crop, token, onReadyChange }: { url: string; crop: CropSettings; token: number; onReadyChange?: (ready: boolean) => void; }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    onReadyChange?.(false);
  }, [url, token, onReadyChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let settled = false;
    const markReady = () => {
      if (settled || !host.querySelector("iframe")) return;
      settled = true;
      setReady(true);
      onReadyChange?.(true);
    };
    const observer = new MutationObserver(markReady);
    observer.observe(host, { childList: true, subtree: true });
    markReady();
    return () => observer.disconnect();
  }, [url, token, onReadyChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => window.instgrm?.Embeds?.process?.(), 0);
    return () => window.clearTimeout(id);
  }, [url, token]);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-black">
      {!ready ? <div className="absolute inset-0 bg-black" aria-hidden="true" /> : null}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 will-change-transform" style={{ transform: `translate3d(${crop.tx}px, ${crop.ty}px, 0) scale(${crop.s})`, transformOrigin: "top left" }}>
          <blockquote key={`${url}-${token}`} className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14" style={{ margin: 0, width: 540, minWidth: "326px", maxWidth: "540px", background: "#000" }}>
            <a href={url} target="_blank" rel="noreferrer noopener">Instagram</a>
          </blockquote>
        </div>
        {crop.maskTop > 0 ? <div className="pointer-events-none absolute inset-x-0 top-0 bg-black" style={{ height: crop.maskTop }} /> : null}
        {crop.maskBottom > 0 ? <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black" style={{ height: crop.maskBottom }} /> : null}
        {crop.maskLeft > 0 ? <div className="pointer-events-none absolute inset-y-0 left-0 bg-black" style={{ width: crop.maskLeft }} /> : null}
        {crop.maskRight > 0 ? <div className="pointer-events-none absolute inset-y-0 right-0 bg-black" style={{ width: crop.maskRight }} /> : null}
      </div>
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
  const [viewport, setViewport] = useState({ vw: 1, vh: 1 });
  const [plateMissing, setPlateMissing] = useState(false);
  const [mattes, setMattes] = useState<{ top: string | null; bottom: string | null; cursor: string | null }>({ top: null, bottom: null, cursor: null });
  const [screenFrontSlot, setScreenFrontSlot] = useState<0 | 1>(0);
  const [screenSlots, setScreenSlots] = useState<[ScreenSlot | null, ScreenSlot | null]>([{ index: 0, token: 0 }, null]);
  const [screenFadeProgress, setScreenFadeProgress] = useState(0);
  const [textFadeProgress, setTextFadeProgress] = useState(0);
  const [incomingScreenReady, setIncomingScreenReady] = useState(false);
  const [calibSaveFlash, setCalibSaveFlash] = useState(false);
  const [cropSaveFlash, setCropSaveFlash] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const plateStageRef = useRef<HTMLDivElement | null>(null);
  const motionRafRef = useRef<number | null>(null);
  const textFadeRafRef = useRef<number | null>(null);
  const screenFadeRafRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const pointerNormRef = useRef({ x: 0, y: 0 });
  const motionStateRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, vx: 0, vy: 0, vrx: 0, vry: 0 });
  const calibActionRef = useRef<CalibAction>(null);
  const swapTokenRef = useRef(1);
  const pendingSwapRef = useRef<{ token: number; backSlot: 0 | 1; index: number } | null>(null);
  const matteSamplingStartedRef = useRef(false);
  const matteSamplingDoneRef = useRef(false);
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

  const screenRect = {
    left: px(screenBox.x * PLATE_W),
    top: py(screenBox.y * PLATE_H),
    width: ps(screenBox.w * PLATE_W),
    height: ps(screenBox.h * PLATE_H),
  };

  const textBlockStyle: CSSProperties = {
    left: px(TEXT_ANCHOR.x),
    top: py(TEXT_ANCHOR.y),
    transform: "translate(-50%, -50%)",
    width: ps(TEXT_BLOCK_W),
    maxWidth: `min(92vw, ${ps(TEXT_BLOCK_MAX_W)}px)`,
  };
  const topMatteStyle: CSSProperties = { left: offX, top: offY, width: coverW, height: ps(TOP_MATTE_H), backgroundImage: mattes.top ? `url(${mattes.top})` : undefined, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
  const bottomMatteStyle: CSSProperties = { left: offX, top: offY + ps(PLATE_H - BOTTOM_MATTE_H), width: coverW, height: ps(BOTTOM_MATTE_H), backgroundImage: mattes.bottom ? `url(${mattes.bottom})` : undefined, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
  const cursorMatteStyle: CSSProperties = { left: px(CURSOR_PATCH_RECT.x), top: py(CURSOR_PATCH_RECT.y), width: ps(CURSOR_PATCH_RECT.w), height: ps(CURSOR_PATCH_RECT.h), backgroundImage: mattes.cursor ? `url(${mattes.cursor})` : undefined, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };

  const textActiveOpacity = pendingIndex === null ? 1 : 1 - textFadeProgress;
  const textIncomingOpacity = pendingIndex === null ? 0 : textFadeProgress;
  const backSlot = pendingIndex === null ? null : (((screenFrontSlot + 1) % 2) as 0 | 1);
  const frontOpacity = pendingIndex === null ? 1 : incomingScreenReady ? 1 - screenFadeProgress : 1;
  const backOpacity = pendingIndex !== null && incomingScreenReady ? screenFadeProgress : 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setIsCalibMode(params.get("calib") === "1");
    setIsCropMode(params.get("crop") === "1");
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
    const stage = plateStageRef.current;
    if (!stage) return;
    stage.style.setProperty("--room-x", "0px");
    stage.style.setProperty("--room-y", "0px");
    stage.style.setProperty("--room-rx", "0deg");
    stage.style.setProperty("--room-ry", "0deg");
  }, []);

  useEffect(() => {
    const stage = plateStageRef.current;
    if (!stage) return;
    let prev = performance.now();
    const stiffness = 90;
    const damping = 16;
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const nxC = Math.tanh(pointerNormRef.current.x * 1.35);
      const nyC = Math.tanh(pointerNormRef.current.y * 1.35);
      const target = { x: -nxC * 18, y: -nyC * 13, ry: nxC * 1.1, rx: -nyC * 0.85 };
      const s = motionStateRef.current;
      const step = (value: number, velocity: number, targetValue: number) => {
        const accel = stiffness * (targetValue - value) - damping * velocity;
        const nextVelocity = velocity + accel * dt;
        const nextValue = value + nextVelocity * dt;
        return { value: nextValue, velocity: nextVelocity };
      };
      const sx = step(s.x, s.vx, target.x); s.x = sx.value; s.vx = sx.velocity;
      const sy = step(s.y, s.vy, target.y); s.y = sy.value; s.vy = sy.velocity;
      const srx = step(s.rx, s.vrx, target.rx); s.rx = srx.value; s.vrx = srx.velocity;
      const sry = step(s.ry, s.vry, target.ry); s.ry = sry.value; s.vry = sry.velocity;
      stage.style.setProperty("--room-x", `${s.x.toFixed(3)}px`);
      stage.style.setProperty("--room-y", `${s.y.toFixed(3)}px`);
      stage.style.setProperty("--room-rx", `${s.rx.toFixed(3)}deg`);
      stage.style.setProperty("--room-ry", `${s.ry.toFixed(3)}deg`);
      motionRafRef.current = window.requestAnimationFrame(tick);
    };
    motionRafRef.current = window.requestAnimationFrame(tick);
    return () => { if (motionRafRef.current !== null) window.cancelAnimationFrame(motionRafRef.current); };
  }, []);

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

  const samplePlateMattes = () => {
    if (typeof window === "undefined") return;
    if (matteSamplingStartedRef.current || matteSamplingDoneRef.current) return;
    matteSamplingStartedRef.current = true;
    const img = new window.Image();
    img.onload = () => {
      try {
        const source = document.createElement("canvas");
        source.width = PLATE_W;
        source.height = PLATE_H;
        const sourceCtx = source.getContext("2d");
        if (!sourceCtx) {
          matteSamplingStartedRef.current = false;
          return;
        }
        sourceCtx.drawImage(img, 0, 0, PLATE_W, PLATE_H);
        const extract = (sx: number, sy: number, sw: number, sh: number) => {
          const canvas = document.createElement("canvas");
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
          return canvas.toDataURL("image/png");
        };
        setMattes({
          top: extract(0, TOP_MATTE_SRC_Y, PLATE_W, TOP_MATTE_H),
          bottom: extract(0, BOTTOM_MATTE_SRC_Y, PLATE_W, BOTTOM_MATTE_H),
          cursor: extract(CURSOR_PATCH_SRC.x, CURSOR_PATCH_SRC.y, CURSOR_PATCH_RECT.w, CURSOR_PATCH_RECT.h),
        });
        matteSamplingDoneRef.current = true;
      } catch {
        matteSamplingStartedRef.current = false;
      }
    };
    img.onerror = () => {
      matteSamplingStartedRef.current = false;
    };
    img.src = ROOM_PLATE_SRC;
  };

  const handlePlateLoad = () => {
    setPlateMissing(false);
    samplePlateMattes();
  };

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

  const onSlotReady = (slotId: 0 | 1, token: number, ready: boolean) => {
    if (!ready) return;
    const pending = pendingSwapRef.current;
    if (!pending || pending.backSlot !== slotId || pending.token !== token || incomingScreenReady) return;
    setIncomingScreenReady(true);
    startScreenFade();
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

      <div
        ref={rootRef}
        className="fixed inset-0 overflow-hidden text-white"
        style={{ background: "#2d241f", WebkitTapHighlightColor: "transparent" as never }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          pointerNormRef.current = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
        }}
        onPointerLeave={() => {
          pointerNormRef.current = { x: 0, y: 0 };
        }}
      >
        <div className="absolute inset-0" style={{ perspective: "900px" }}>
          <div
            ref={plateStageRef}
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(var(--room-x, 0px), var(--room-y, 0px), 0) rotateX(var(--room-rx, 0deg)) rotateY(var(--room-ry, 0deg)) scale(${STAGE_OVERSCAN})`,
              transformStyle: "preserve-3d",
            }}
          >
            <img
              src={ROOM_PLATE_SRC}
              alt=""
              aria-hidden="true"
              draggable={false}
              onLoad={handlePlateLoad}
              onError={() => setPlateMissing(true)}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />

            {mattes.top ? <div className="pointer-events-none absolute" style={topMatteStyle} aria-hidden="true" /> : null}
            {mattes.bottom ? <div className="pointer-events-none absolute" style={bottomMatteStyle} aria-hidden="true" /> : null}
            {mattes.cursor ? <div className="pointer-events-none absolute" style={cursorMatteStyle} aria-hidden="true" /> : null}

            <div className="absolute" style={{ left: screenRect.left, top: screenRect.top, width: screenRect.width, height: screenRect.height }}>
              <button
                type="button"
                aria-label={`Open ${activeItem.title} reel`}
                onClick={openModal}
                disabled={pendingIndex !== null || menuOpen}
                className="absolute inset-0 z-20 cursor-pointer bg-transparent p-0 disabled:cursor-default"
              />

              <div className="relative h-full w-full overflow-hidden rounded-[1.2rem] bg-black">
                {[0, 1].map((slotId) => {
                  const slot = screenSlots[slotId as 0 | 1];
                  if (!slot) return null;
                  const item = EXHIBITIONS[slot.index];
                  if (!item) return null;
                  const crop = cropMap[item.url] ?? DEFAULT_CROP;
                  const opacity = slotId === screenFrontSlot ? frontOpacity : backSlot !== null && slotId === backSlot ? backOpacity : 0;
                  return (
                    <div key={`screen-slot-${slotId}-${slot.token}`} className="absolute inset-0 transition-opacity duration-150" style={{ opacity }}>
                      <InstagramEmbedCrop
                        url={item.url}
                        crop={crop}
                        token={slot.token}
                        onReadyChange={(ready) => onSlotReady(slotId as 0 | 1, slot.token, ready)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {isCalibMode ? (
              <div
                className="absolute z-30 rounded-md border-2 border-dashed border-[#f7ebd0] bg-[#f7ebd0]/5"
                style={{ left: screenRect.left, top: screenRect.top, width: screenRect.width, height: screenRect.height, boxShadow: "0 0 0 1px rgba(0,0,0,0.28) inset" }}
                onPointerDown={(event) => startCalibAction(event, "drag")}
              >
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.2em] text-[#f7ebd0]/85">Screen Box</div>
                <div className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border border-[#f7ebd0] bg-black/70" onPointerDown={(event) => startCalibAction(event, "resize")} />
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-20">
              <div className="absolute" style={textBlockStyle}>
                <div className="relative min-h-[8rem]">
                  <div className="absolute inset-0" style={{ opacity: textActiveOpacity, transition: "opacity 80ms linear" }}>
                    <h1 className="text-[2.1rem] font-semibold leading-[0.92] tracking-tight text-white sm:text-[2.7rem] md:text-[3.4rem] lg:text-[4.2rem]">{activeItem.title}</h1>
                    <p className="mt-4 max-w-[30rem] text-sm leading-6 text-white/88 md:text-base">{activeItem.description}</p>
                  </div>
                  {incomingItem ? (
                    <div className="absolute inset-0" style={{ opacity: textIncomingOpacity, transition: "opacity 80ms linear" }}>
                      <h1 className="text-[2.1rem] font-semibold leading-[0.92] tracking-tight text-white sm:text-[2.7rem] md:text-[3.4rem] lg:text-[4.2rem]">{incomingItem.title}</h1>
                      <p className="mt-4 max-w-[30rem] text-sm leading-6 text-white/88 md:text-base">{incomingItem.description}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="pointer-events-auto absolute cursor-pointer bg-transparent p-0 opacity-0"
                style={rectStyle(HAMBURGER_HITBOX, px, py, ps)}
              />

              <button
                type="button"
                aria-label="Previous reel"
                onClick={() => beginSwap(-1)}
                disabled={pendingIndex !== null}
                className="pointer-events-auto absolute cursor-pointer bg-transparent p-0 opacity-0 disabled:cursor-default"
                style={rectStyle(PREV_HITBOX, px, py, ps)}
              />

              <button
                type="button"
                aria-label="Next reel"
                onClick={() => beginSwap(1)}
                disabled={pendingIndex !== null}
                className="pointer-events-auto absolute cursor-pointer bg-transparent p-0 opacity-0 disabled:cursor-default"
                style={rectStyle(NEXT_HITBOX, px, py, ps)}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-30">
          {plateMissing ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className="max-w-2xl rounded-2xl border border-[#ffdf9f]/40 bg-black/70 px-6 py-5 text-center shadow-2xl">
                <p className="text-sm uppercase tracking-[0.24em] text-[#ffdca4]">Missing Room Plate</p>
                <p className="mt-3 text-lg font-medium text-white">Expected asset not found:</p>
                <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-[#ffeecf]">public/collabs/exhibition/room_base.png</p>
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
        </div>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 bg-black/45" role="dialog" aria-modal="true" aria-label="Exhibition menu" onClick={() => setMenuOpen(false)}>
            <div className="ml-auto flex h-full w-full max-w-[24rem] flex-col border-l border-white/12 bg-[#11100f]/95 p-4" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/70">Exhibitions</div>
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10">Close</button>
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
                      <span className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/55">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white/95">{item.id}</span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-white/65">{item.url}</span>
                      </span>
                    </button>
                  );
                })}
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
                <div className="relative h-full max-h-[84vh] w-full max-w-[min(92vw,980px)] overflow-hidden rounded-2xl border border-white/12 bg-black">
                  <InstagramEmbedCrop url={activeItem.url} crop={activeCrop} token={999000 + activeIndex} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
