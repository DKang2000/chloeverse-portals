"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const WHEEL_TO_INDEX = 0.0025;
const DRAG_TO_INDEX = 0.0052;
const SPRING_STRENGTH = 17;
const SPRING_DAMPING = 8.4;
const TARGET_SNAP_STRENGTH = 9.5;
const POINTER_SMOOTHING = 8.5;
const DRAG_ACTIVATE_DISTANCE = 12;
const DRAG_CLICK_SUPPRESS_DISTANCE = 22;

function wrapIndex(value: number, modulo: number): number {
  if (modulo <= 0) return 0;
  return ((value % modulo) + modulo) % modulo;
}

function shortestWrappedDelta(index: number, position: number, count: number): number {
  if (count <= 0) return 0;
  const half = count / 2;
  const raw = index - position;
  return ((raw + half) % count + count) % count - half;
}

type Options = {
  cardCount: number;
};

type CardHandlers = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
};

export function useReelsStageMotion({ cardCount }: Options) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const [motionEnabled, setMotionEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [scrollEnergy, setScrollEnergy] = useState(0);

  const hoverRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const scrollEnergyRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const scrollImpulseRef = useRef(0);
  const lastInputTimeRef = useRef(0);

  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    lastY: 0,
    movedDistance: 0,
  });

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(reduceMq.matches);
      setMotionEnabled(true);
    };

    apply();
    reduceMq.addEventListener("change", apply);
    return () => reduceMq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!viewport || !stage || !content || !motionEnabled || cardCount <= 0 || typeof window === "undefined") {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * WHEEL_TO_INDEX;
      targetScrollRef.current += delta;
      scrollImpulseRef.current = Math.min(1.5, scrollImpulseRef.current + Math.min(1, Math.abs(delta) * 2.8));
      lastInputTimeRef.current = performance.now();
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });

    let previousTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min(1 / 24, Math.max(1 / 240, (time - previousTime) / 1000));
      previousTime = time;

      const motionScale = reducedMotion ? 0.42 : 1;

      pointerCurrentRef.current.x +=
        (pointerTargetRef.current.x - pointerCurrentRef.current.x) * (1 - Math.exp(-POINTER_SMOOTHING * dt));
      pointerCurrentRef.current.y +=
        (pointerTargetRef.current.y - pointerCurrentRef.current.y) * (1 - Math.exp(-POINTER_SMOOTHING * dt));

      const now = performance.now();
      const idleSnap = !dragRef.current.active && now - lastInputTimeRef.current > 90;
      if (idleSnap) {
        const nearest = Math.round(targetScrollRef.current);
        targetScrollRef.current +=
          (nearest - targetScrollRef.current) * (1 - Math.exp(-TARGET_SNAP_STRENGTH * dt));
      }

      const acceleration = (targetScrollRef.current - currentScrollRef.current) * SPRING_STRENGTH;
      velocityRef.current += acceleration * dt;
      velocityRef.current *= Math.exp(-SPRING_DAMPING * dt);
      currentScrollRef.current += velocityRef.current * dt;

      const stageDriftX = pointerCurrentRef.current.x * 26 * motionScale;
      const stageDriftY = pointerCurrentRef.current.y * 18 * motionScale;
      const stageRotY = pointerCurrentRef.current.x * -4.2 * motionScale;
      const stageRotX = pointerCurrentRef.current.y * 2.8 * motionScale;
      const stageIdleY = Math.sin(time * 0.00028) * 8 * motionScale;
      stage.style.transform = `translate3d(${stageDriftX.toFixed(2)}px, ${(stageDriftY + stageIdleY).toFixed(2)}px, 0) rotateX(${stageRotX.toFixed(2)}deg) rotateY(${stageRotY.toFixed(2)}deg)`;

      const contentParallaxX = pointerCurrentRef.current.x * -8 * motionScale;
      const contentParallaxY = pointerCurrentRef.current.y * 5 * motionScale;
      content.style.transform = `translate3d(${contentParallaxX.toFixed(2)}px, ${contentParallaxY.toFixed(2)}px, 0)`;

      const active = wrapIndex(Math.round(currentScrollRef.current), cardCount);
      if (active !== activeIndexRef.current) {
        activeIndexRef.current = active;
        setActiveIndex(active);
      }

      const hovered = hoverRef.current;
      const hoverMode = hovered !== null;

      for (let i = 0; i < cardRefs.current.length; i += 1) {
        const card = cardRefs.current[i];
        if (!card) continue;

        const delta = shortestWrappedDelta(i, currentScrollRef.current, cardCount);
        const absDelta = Math.abs(delta);
        const focus = Math.max(0, 1 - absDelta / 2.7);
        const localHover = hovered === i ? 1 : 0;
        const dimByHover = hoverMode && localHover === 0 ? 0.84 : 1;

        const x = delta * (292 * motionScale);
        const y =
          Math.sin(time * 0.00045 + i * 1.2) * (9 * motionScale) +
          Math.cos(delta * 1.15) * 6 -
          22 -
          localHover * 6;
        const z = -Math.pow(absDelta, 1.45) * (430 * motionScale) + focus * 140 + localHover * 86;
        const rotY = -delta * (17.5 * motionScale) + pointerCurrentRef.current.x * 2.7 * focus;
        const rotX = (3 + absDelta * 2.4) * motionScale - pointerCurrentRef.current.y * 2.2;
        const scale = 0.7 + focus * 0.35 + localHover * 0.045;
        const blur = (reducedMotion ? 0.45 : 1.9) * Math.pow(absDelta, 1.2) + (hoverMode && localHover === 0 ? 0.7 : 0);
        const brightness = (0.7 + focus * 0.36 + localHover * 0.17 - (hoverMode && localHover === 0 ? 0.08 : 0)) * dimByHover;
        const saturate = 0.72 + focus * 0.36 + localHover * 0.18;
        const opacity = Math.max(0.2, (0.24 + focus * 0.78) * dimByHover);

        card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        card.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = String(120 + Math.round(focus * 220) + localHover * 10);
        card.style.setProperty("--focus", focus.toFixed(4));
        card.style.setProperty("--hover", String(localHover));
        card.style.setProperty("--depth", z.toFixed(2));
        card.style.setProperty("--delta", delta.toFixed(3));
        card.dataset.focused = i === active ? "true" : "false";
      }

      scrollImpulseRef.current *= Math.exp(-(reducedMotion ? 8 : 5.5) * dt);
      const energy = Math.min(1, Math.abs(velocityRef.current) * 0.68 + scrollImpulseRef.current * 0.55);
      if (Math.abs(energy - scrollEnergyRef.current) > 0.04) {
        scrollEnergyRef.current = energy;
        setScrollEnergy(energy);
      }
      viewport.style.setProperty("--scroll-energy", energy.toFixed(4));

      if (Math.abs(currentScrollRef.current) > 2000 || Math.abs(targetScrollRef.current) > 2000) {
        const wrapped = wrapIndex(currentScrollRef.current, cardCount);
        currentScrollRef.current = wrapped;
        targetScrollRef.current = wrapped;
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      viewport.removeEventListener("wheel", onWheel);
      document.body.style.overflow = previousBodyOverflow;
      stage.style.transform = "";
      content.style.transform = "";
      setDragging(false);
    };
  }, [cardCount, motionEnabled, reducedMotion]);

  const setCardRef = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      cardRefs.current[index] = element;
    },
    [],
  );

  const viewportHandlers = useMemo(
    () => ({
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const ny = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
        pointerTargetRef.current.x = Math.max(-1, Math.min(1, nx));
        pointerTargetRef.current.y = Math.max(-1, Math.min(1, ny));

        if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
        const deltaY = event.clientY - dragRef.current.lastY;
        dragRef.current.lastY = event.clientY;
        dragRef.current.movedDistance += Math.abs(deltaY);
        targetScrollRef.current += deltaY * DRAG_TO_INDEX;
        scrollImpulseRef.current = Math.min(1.25, scrollImpulseRef.current + Math.min(0.95, Math.abs(deltaY) * 0.014));
        lastInputTimeRef.current = performance.now();
        if (dragRef.current.movedDistance > DRAG_ACTIVATE_DISTANCE && !dragging) setDragging(true);
        if (dragRef.current.movedDistance > DRAG_CLICK_SUPPRESS_DISTANCE) {
          suppressClickUntilRef.current = performance.now() + 240;
        }
      },
      onPointerLeave: () => {
        pointerTargetRef.current.x = 0;
        pointerTargetRef.current.y = 0;
      },
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const target = event.target as HTMLElement | null;
        if (
          target?.closest(
            "[data-collabs-anchor],button,a,input,textarea,select,[role='button'],[data-no-drag]",
          )
        ) {
          return;
        }
        dragRef.current.active = true;
        dragRef.current.pointerId = event.pointerId;
        dragRef.current.lastY = event.clientY;
        dragRef.current.movedDistance = 0;
        setDragging(false);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
        dragRef.current.active = false;
        dragRef.current.pointerId = -1;
        dragRef.current.lastY = 0;
        if (dragRef.current.movedDistance > DRAG_CLICK_SUPPRESS_DISTANCE) {
          suppressClickUntilRef.current = performance.now() + 220;
        }
        dragRef.current.movedDistance = 0;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current.pointerId !== event.pointerId) return;
        dragRef.current.active = false;
        dragRef.current.pointerId = -1;
        dragRef.current.lastY = 0;
        dragRef.current.movedDistance = 0;
        setDragging(false);
      },
    }),
    [dragging],
  );

  const getCardHandlers = useCallback(
    (index: number): CardHandlers => ({
      onPointerEnter: () => {
        hoverRef.current = index;
        setHoveredIndex(index);
      },
      onPointerLeave: () => {
        if (hoverRef.current === index) {
          hoverRef.current = null;
          setHoveredIndex(null);
        }
      },
      onPointerMove: (event) => {
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
        const my = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
        target.style.setProperty("--mx", `${Math.max(0, Math.min(100, mx)).toFixed(2)}%`);
        target.style.setProperty("--my", `${Math.max(0, Math.min(100, my)).toFixed(2)}%`);
      },
      onFocus: () => {
        hoverRef.current = index;
        setHoveredIndex(index);
      },
      onBlur: () => {
        if (hoverRef.current === index) {
          hoverRef.current = null;
          setHoveredIndex(null);
        }
      },
    }),
    [],
  );

  const shouldSuppressClick = useCallback(() => performance.now() < suppressClickUntilRef.current, []);

  return {
    viewportRef,
    stageRef,
    contentRef,
    setCardRef,
    getCardHandlers,
    viewportHandlers,
    motionEnabled,
    reducedMotion,
    dragging,
    activeIndex,
    hoveredIndex,
    scrollEnergy,
    shouldSuppressClick,
  };
}
