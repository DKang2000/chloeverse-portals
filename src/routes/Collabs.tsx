"use client";

import { useEffect, useRef, useState } from "react";
import { fadeVolumeTo, initBgm, startBgmOnFirstGesture, stopBgm, toggleMute } from "@/lib/collabsBgm";

type PortalAudioEvent = {
  source: "collabs-portal";
  type: "door-open" | "portal-suction-start" | "user-gesture";
};

export default function CollabsRoute() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    initBgm();
    startBgmOnFirstGesture(window);
    startBgmOnFirstGesture(document);

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as Partial<PortalAudioEvent> | null;
      if (!payload || payload.source !== "collabs-portal") return;

      if (payload.type === "door-open" || payload.type === "user-gesture") {
        startBgmOnFirstGesture();
      } else if (payload.type === "portal-suction-start") {
        fadeVolumeTo(0, 600);
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      stopBgm({ resetTime: true, clearGestureListeners: true });
    };
  }, []);

  const bindIframeGestureFallbacks = () => {
    const frameWindow = iframeRef.current?.contentWindow ?? null;
    if (!frameWindow) return;
    startBgmOnFirstGesture(frameWindow);
    try {
      startBgmOnFirstGesture(frameWindow.document);
    } catch {}
  };

  const onMuteToggle = () => {
    startBgmOnFirstGesture();
    setMuted(toggleMute());
  };

  return (
    <>
      <iframe
        ref={iframeRef}
        src="/infinite-world/index.html?v=door-tune-20260305f"
        title="Infinite World"
        onLoad={bindIframeGestureFallbacks}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          border: 0,
          display: "block",
        }}
        allow="fullscreen; pointer-lock; gamepad; autoplay"
        allowFullScreen={true}
      />
      <button
        type="button"
        onClick={onMuteToggle}
        aria-label={muted ? "Unmute soundtrack" : "Mute soundtrack"}
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 30,
          border: muted ? "1px solid rgba(11,14,20,0.32)" : "1px solid rgba(255,255,255,0.35)",
          background: muted ? "rgba(255,255,255,0.72)" : "rgba(12,14,19,0.45)",
          color: muted ? "rgba(12,16,23,0.92)" : "rgba(248,250,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: "9999px",
          width: "2.15rem",
          height: "2.15rem",
          display: "grid",
          placeItems: "center",
          padding: 0,
          fontSize: "1.1rem",
          fontWeight: 600,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        {"\u266A"}
      </button>
    </>
  );
}
