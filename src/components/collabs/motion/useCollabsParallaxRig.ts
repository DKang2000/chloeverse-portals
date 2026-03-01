"use client";

import { useEffect, useRef, useState } from "react";

export type CollabsPointer = { x: number; y: number };

type RigTransforms = {
  backplate: string;
  ring: string;
  mist: string;
};

const IDENTITY: RigTransforms = {
  backplate: "translate3d(0px,0px,0) rotateX(0deg) rotateY(0deg) scale(1.03)",
  ring: "translate3d(0px,0px,0) rotateX(0deg) rotateY(0deg)",
  mist: "translate3d(0px,0px,0) rotateX(0deg) rotateY(0deg)",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function useCollabsParallaxRig({
  reducedMotion,
  pointerOverride,
  deterministic,
}: {
  reducedMotion: boolean;
  pointerOverride?: CollabsPointer | null;
  deterministic?: boolean;
}) {
  const [livePointer, setLivePointer] = useState<CollabsPointer>({ x: 0.5, y: 0.5 });
  const [dragging, setDragging] = useState(false);
  const [hoverPortal, setHoverPortal] = useState(false);
  const [transforms, setTransforms] = useState<RigTransforms>(IDENTITY);
  const dragStartRef = useRef<CollabsPointer | null>(null);
  const velRef = useRef({ x: 0, y: 0 });
  const smoothRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0 });

  useEffect(() => {
    if (pointerOverride) return;
    const onMove = (event: PointerEvent) => {
      const next = {
        x: clamp01(event.clientX / Math.max(1, window.innerWidth)),
        y: clamp01(event.clientY / Math.max(1, window.innerHeight)),
      };
      setLivePointer(next);
      if (dragStartRef.current) {
        const dx = next.x - dragStartRef.current.x;
        const dy = next.y - dragStartRef.current.y;
        velRef.current.x = dx * 0.45;
        velRef.current.y = dy * 0.45;
      }
    };
    const onDown = (event: PointerEvent) => {
      dragStartRef.current = {
        x: clamp01(event.clientX / Math.max(1, window.innerWidth)),
        y: clamp01(event.clientY / Math.max(1, window.innerHeight)),
      };
      setDragging(true);
    };
    const onUp = () => {
      dragStartRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [pointerOverride]);

  const pointer = pointerOverride ?? livePointer;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pX = (pointer.x - 0.5) * 2;
      const pY = (pointer.y - 0.5) * 2;
      const dragBoost = dragging ? 1.75 : 1;
      const benchBoost = deterministic ? 1.62 : 1;
      const benchMotion = deterministic ? 0.72 : 1;
      const motionScale = reducedMotion ? 0.12 : 1;

      const rxTarget = (-pY * 6.8 * dragBoost + velRef.current.y * 4.6) * motionScale * benchBoost * benchMotion;
      const ryTarget = (pX * 8.7 * dragBoost + velRef.current.x * 6.1) * motionScale * benchBoost * benchMotion;
      const txTarget = pX * 26 * dragBoost * motionScale * benchBoost * benchMotion;
      const tyTarget = pY * 18 * dragBoost * motionScale * benchBoost * benchMotion;

      const smooth = reducedMotion ? 0.42 : deterministic ? 1 : 0.1;
      const s = smoothRef.current;
      s.rx += (rxTarget - s.rx) * smooth;
      s.ry += (ryTarget - s.ry) * smooth;
      s.tx += (txTarget - s.tx) * smooth;
      s.ty += (tyTarget - s.ty) * smooth;

      velRef.current.x *= reducedMotion ? 0 : 0.92;
      velRef.current.y *= reducedMotion ? 0 : 0.92;

      const benchScale = deterministic ? 1 : 1.03;
      setTransforms({
        backplate: `translate3d(${(s.tx * 0.34).toFixed(2)}px, ${(s.ty * 0.34).toFixed(2)}px, 0) rotateX(${(s.rx * 0.42).toFixed(2)}deg) rotateY(${(s.ry * 0.42).toFixed(2)}deg) scale(${benchScale})`,
        ring: `translate3d(${(s.tx * 0.62).toFixed(2)}px, ${(s.ty * 0.62).toFixed(2)}px, 0) rotateX(${(s.rx * 0.82).toFixed(2)}deg) rotateY(${(s.ry * 0.82).toFixed(2)}deg)`,
        mist: `translate3d(${(s.tx * 0.92).toFixed(2)}px, ${(s.ty * 0.92).toFixed(2)}px, 0) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`,
      });

      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [deterministic, dragging, pointer.x, pointer.y, reducedMotion]);

  return {
    pointer,
    dragging,
    hoverPortal,
    setHoverPortal,
    transforms,
  };
}
