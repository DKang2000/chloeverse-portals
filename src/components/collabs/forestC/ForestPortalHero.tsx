"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./ForestPortalHero.module.css";
import { usePointerRig } from "@/components/collabs/motion/usePointerRig";

export default function ForestPortalHero({
  reducedMotion,
  benchMode,
  pointerOverride,
  onEnter,
  onPortalHover,
  onDraggingChange,
}: {
  reducedMotion: boolean;
  benchMode: boolean;
  pointerOverride?: { x: number; y: number } | null;
  onEnter: () => void;
  onPortalHover?: (v: boolean) => void;
  onDraggingChange?: (v: boolean) => void;
}) {
  const { pointer, dragging, hoverPortal, setHoverPortal, transforms } = usePointerRig({
    reducedMotion,
    pointerOverride: benchMode ? pointerOverride ?? { x: 0.5, y: 0.5 } : pointerOverride,
    deterministic: benchMode,
  });
  const [zooming, setZooming] = useState(false);
  const [ripple, setRipple] = useState({ x: 50, y: 90, life: 0 });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onPortalHover?.(hoverPortal);
  }, [hoverPortal, onPortalHover]);

  useEffect(() => {
    onDraggingChange?.(dragging);
  }, [dragging, onDraggingChange]);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || benchMode) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const ny = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
    if (ny < 66) return;
    setRipple({ x: nx, y: ny, life: 1 });
    window.setTimeout(() => setRipple((r) => ({ ...r, life: 0 })), 380);
  };

  const onEnterClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (benchMode) return;
    if (reducedMotion) return;
    event.preventDefault();
    if (zooming) return;
    setZooming(true);
    window.setTimeout(onEnter, 650);
  };

  const cls = `${styles.heroRoot} ${benchMode ? styles.benchStatic : ""} ${zooming ? styles.zooming : ""}`;
  const ringOpacity = benchMode ? 0.88 : reducedMotion ? 0.2 : 0.22 + (hoverPortal ? 0.18 : 0);
  const textClass = `${styles.portalText} ${benchMode || reducedMotion ? styles.portalTextStatic : styles.portalTextShimmer}`;

  if (benchMode) {
    return (
      <div ref={rootRef} className={cls} onPointerMove={onMove}>
        <div className={styles.layer} style={{ transform: transforms.backplate }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/collabs/bg/forest_portal_bg.png"
            alt="Forest portal"
            className={styles.benchImage}
          />
        </div>
        <div className={styles.layer} style={{ transform: transforms.ring }}>
          <div className={styles.portalZone}>
            <div className={`${styles.ringShimmer} ${styles.benchRingBoost}`} style={{ opacity: ringOpacity }} />
            <div className={styles.benchPortalBright} />
          </div>
        </div>
        <div className={styles.enterWrap}>
          <a
            href="/collabs/reels"
            className={styles.enterLink}
            onClick={onEnterClick}
            onMouseEnter={() => setHoverPortal(true)}
            onMouseLeave={() => setHoverPortal(false)}
            onFocus={() => setHoverPortal(true)}
            onBlur={() => setHoverPortal(false)}
            aria-label="Enter Collabs Reels"
          >
            ENTER
          </a>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cls} onPointerMove={onMove}>
      <div className={`${styles.layer} ${zooming ? styles.backplateZoom : ""}`} style={{ transform: transforms.backplate }}>
        <Image
          src="/assets/collabs/bg/forest_portal_bg.png"
          alt="Forest portal"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className={styles.layer} style={{ transform: transforms.ring }}>
        <div className={styles.portalZone}>
          <div className={styles.ringShimmer} style={{ opacity: ringOpacity }} />
          <div className={textClass}>
            COLLABS
          </div>
        </div>
      </div>

      <div className={styles.layer} style={{ transform: transforms.mist }}>
        {!benchMode ? <div className={styles.waterFx} /> : null}
        {!benchMode && ripple.life > 0 ? (
          <div className={styles.rippleRing} style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, opacity: ripple.life, transform: "translate(-50%, -50%) scale(1.35)" }} />
        ) : null}
        {!benchMode ? <div className={styles.mist} /> : null}
      </div>

      <div className={styles.enterWrap}>
        <a
          href="/collabs/reels"
          className={styles.enterLink}
          onClick={onEnterClick}
          onMouseEnter={() => setHoverPortal(true)}
          onMouseLeave={() => setHoverPortal(false)}
          onFocus={() => setHoverPortal(true)}
          onBlur={() => setHoverPortal(false)}
          aria-label="Enter Collabs Reels"
        >
          ENTER
        </a>
      </div>
      <div
        hidden
        suppressHydrationWarning
        data-collabs-hero-state={`${dragging ? "drag" : "idle"}:${pointer.x.toFixed(3)},${pointer.y.toFixed(3)}`}
      />
    </div>
  );
}
