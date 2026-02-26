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

export type CropSettings = {
  s: number;
  tx: number;
  ty: number;
  maskTop: number;
  maskBottom: number;
  maskLeft: number;
  maskRight: number;
};

const IG_MODAL_EMBED_SCALE = 1.16;
const EMBED_POLL_INTERVAL_MS = 150;
const EMBED_TIMEOUT_MS = 4500;
const IFRAME_OVERSCAN = 14;

export const TOP_CAP_H = 88;
export const BOTTOM_CAP_H = TOP_CAP_H;
export const MODAL_CROP_VISIBLE: CropSettings = {
  s: 1.06,
  tx: 0,
  ty: -22,
  maskTop: 0,
  maskBottom: 0,
  maskLeft: 0,
  maskRight: 0,
};

export function CollabsInstagramEmbedRuntime() {
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
    </>
  );
}

export function InstagramProjectsEmbed({
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
    if (typeof window === "undefined") return;
    let elapsed = 0;
    onReadyChange?.(false);
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
              style={{
                transform: `translate3d(${crop.tx}px, ${crop.ty}px, 0) scale(${crop.s})`,
                transformOrigin: "top center",
              }}
            >
              <div
                key={`${url}-${token}`}
                ref={hostRef}
                className="collabsModalInstaHost h-full w-full overflow-hidden bg-white"
                style={{ "--ig-embed-scale": IG_MODAL_EMBED_SCALE } as React.CSSProperties}
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
