"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOTTOM_CAP_H,
  CollabsInstagramEmbedRuntime,
  InstagramProjectsEmbed,
  MODAL_CROP_VISIBLE,
  TOP_CAP_H,
} from "@/components/collabs/InstagramProjectsEmbed";
import { REELS } from "@/components/collabs/reelsData";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function CollabsShell({
  routeMode,
  children,
}: {
  routeMode: "home" | "reels";
  children: React.ReactNode;
}) {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [modalEmbedReady, setModalEmbedReady] = useState(false);
  const [modalUserInteracted, setModalUserInteracted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const priorFocusRef = useRef<HTMLElement | null>(null);

  const activeItem = selectedFrameIndex === null ? null : (REELS[selectedFrameIndex] ?? null);
  const modalOpen = Boolean(activeItem);

  const closeModal = useCallback(() => {
    setSelectedFrameIndex(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;

    priorFocusRef.current = document.activeElement as HTMLElement | null;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      priorFocusRef.current?.focus();
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.tabIndex !== -1 &&
          element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal, modalOpen]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-white text-[#181a19]">
      {routeMode === "home" ? (
        <section className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_18%,rgba(238,242,238,0.86),rgba(255,255,255,1)_68%)] p-8">
          <div className="w-full max-w-xl rounded-3xl border border-[#e4e8e4] bg-white/90 p-10 text-center shadow-[0_22px_60px_rgba(25,31,25,0.1)] backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-[#6d746d]">Museum Landing</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[#171b17]">Collabs</h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#4f564f]">
              Rebuilding this experience from scratch. Reels are fully live.
            </p>
            <a
              href="/collabs/reels"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-[#171b17] px-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#171b17] transition hover:bg-[#171b17] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171b17]"
            >
              Enter Reels
            </a>
          </div>
        </section>
      ) : null}

      {routeMode === "reels" ? (
        <section data-collabs-ui="reels-gallery" className="relative min-h-screen bg-[radial-gradient(circle_at_50%_18%,rgba(246,248,246,0.98),rgba(255,255,255,1)_66%)] p-8 md:p-10">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-10">
              <p className="text-xs uppercase tracking-[0.24em] text-[#6a716a]">Collabs</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#171b17] sm:text-5xl">Reels</h1>
            </div>
            <div className="grid gap-4">
              {REELS.map((reel, index) => (
                <button
                  key={reel.id}
                  type="button"
                  onClick={() => {
                    setModalEmbedReady(false);
                    setModalUserInteracted(false);
                    setSelectedFrameIndex(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setModalEmbedReady(false);
                    setModalUserInteracted(false);
                    setSelectedFrameIndex(index);
                  }}
                  aria-label={`Open ${reel.title} reel`}
                  className="group relative block h-32 w-full cursor-pointer overflow-hidden rounded-2xl border border-[#d7dbd7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,245,0.95))] p-6 text-left transition hover:border-[#bcc8bd] hover:shadow-[0_18px_44px_rgba(23,27,23,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f6d5f]"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b726b]">Frame {index + 1}</p>
                  <p className="mt-3 text-xl font-semibold text-[#171b17]">{reel.title}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {modalOpen && activeItem ? (
        <>
          <CollabsInstagramEmbedRuntime />
          <div
            data-collabs-modal="open"
            className="fixed inset-0 z-50 bg-black/90 p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collabs-reels-modal-title"
            onClick={closeModal}
          >
            <div ref={modalRef} className="mx-auto flex h-full w-full max-w-7xl flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeModal();
                  }}
                  className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#f0e4ce] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Close
                </button>
              </div>
              <div className="grid min-h-0 flex-1 place-items-center" onClick={(event) => event.stopPropagation()}>
                <h2 id="collabs-reels-modal-title" className="sr-only">
                  {activeItem.title} reel
                </h2>
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
                          token={999000 + (selectedFrameIndex ?? 0)}
                          crop={MODAL_CROP_VISIBLE}
                          onReadyChange={setModalEmbedReady}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-white" style={{ height: TOP_CAP_H }} />
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-white"
                        style={{ height: BOTTOM_CAP_H, pointerEvents: "none" }}
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
        </>
      ) : null}
      {children}
    </main>
  );
}

