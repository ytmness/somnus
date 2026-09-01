"use client";

import { useCallback, useEffect, useState } from "react";
import type { TourStep } from "./tours";

interface ProductTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

function isNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

function isMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function resolveTarget(step: TourStep | undefined): string | undefined {
  if (!step) return undefined;
  if (step.targetMobile && isMobileLayout()) {
    return step.targetMobile;
  }
  return step.target;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function ProductTour({ steps, open, onClose }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [narrow, setNarrow] = useState(false);

  const step = steps[index];
  const targetKey = resolveTarget(step);

  const measure = useCallback(() => {
    setNarrow(isNarrowViewport());
    if (!targetKey) {
      setRect(null);
      return;
    }
    const el = document.querySelector(
      `[data-tour="${targetKey}"]`
    ) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Element hidden (display:none / zero size) — treat as missing
    if (r.width < 2 && r.height < 2) {
      setRect(null);
      return;
    }
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
    el.scrollIntoView({
      block: isNarrowViewport() ? "center" : "nearest",
      behavior: "smooth",
      inline: "nearest",
    });
  }, [targetKey]);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    measure();
    // Re-measure after scrollIntoView settles (mobile address bar / layout)
    const t1 = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 320);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, [open, index, measure]);

  // Lock body scroll while tour is open (esp. mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !step) return null;

  const isLast = index >= steps.length - 1;
  const pad = narrow ? 6 : 8;
  const safeTop = "max(1rem, env(safe-area-inset-top, 0px))";
  const safeBottom = "max(1rem, env(safe-area-inset-bottom, 0px))";
  const safeLeft = "max(1rem, env(safe-area-inset-left, 0px))";
  const safeRight = "max(1rem, env(safe-area-inset-right, 0px))";

  const cardStyle: React.CSSProperties = (() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(22 * 16, vw - 32);
    const estCardH = narrow ? 220 : 200;

    // Welcome / missing target / phones: bottom sheet (readable + thumb-friendly)
    if (!rect || narrow) {
      return {
        left: safeLeft,
        right: safeRight,
        bottom: safeBottom,
        top: "auto",
        maxWidth: "100%",
        width: "auto",
        transform: "none",
      };
    }

    const below = rect.top + rect.height + pad + 12;
    const spaceBelow = vh - below;
    const spaceAbove = rect.top - 16;
    const preferBelow = spaceBelow >= estCardH || spaceBelow >= spaceAbove;

    let top = preferBelow
      ? below
      : Math.max(16, rect.top - pad - estCardH);
    top = clamp(top, 16, Math.max(16, vh - estCardH - 16));

    let left = clamp(rect.left, 16, Math.max(16, vw - 16 - cardW));

    return {
      top,
      left,
      maxWidth: "22rem",
      width: `min(22rem, calc(100vw - 2rem))`,
    };
  })();

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="somnus-tour-title"
    >
      {/* Full-screen blocker — prevents taps leaking to the page on mobile */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        style={{
          background: rect ? "transparent" : "rgba(0,0,0,0.72)",
        }}
        aria-label="Tour overlay"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {rect && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "1px solid rgba(123, 163, 232, 0.55)",
          }}
          aria-hidden
        />
      )}

      <div
        className="absolute z-[101] liquid-glass rounded-2xl border border-white/15 p-4 sm:p-5 shadow-2xl max-h-[min(70dvh,28rem)] overflow-y-auto"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">
          Step {index + 1} of {steps.length}
        </p>
        <h3
          id="somnus-tour-title"
          className="text-base sm:text-lg font-semibold text-white mb-2"
        >
          {step.title}
        </h3>
        <p className="text-sm text-white/70 leading-relaxed mb-5">
          {narrow && step.bodyMobile ? step.bodyMobile : step.body}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="somnus-nav-link text-xs uppercase tracking-wider text-white/50 hover:text-white py-2 px-1"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="somnus-nav-link px-3 py-2.5 text-xs uppercase tracking-wider text-white/70 hover:text-white"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setIndex((i) => i + 1);
              }}
              className="somnus-btn px-5 py-2.5 text-xs min-h-[44px]"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
