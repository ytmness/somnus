"use client";

import { useCallback, useEffect, useState } from "react";
import type { TourStep } from "./tours";

interface ProductTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

export function ProductTour({ steps, open, onClose }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(
      `[data-tour="${step.target}"]`
    ) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, index, measure]);

  if (!open || !step) return null;

  const isLast = index >= steps.length - 1;
  const pad = 8;

  const cardStyle: React.CSSProperties = (() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "22rem",
      };
    }
    const below = rect.top + rect.height + pad + 12;
    const spaceBelow = window.innerHeight - below;
    const preferBelow = spaceBelow > 220;
    const top = preferBelow
      ? below
      : Math.max(16, rect.top - pad - 200);
    const left = Math.min(
      Math.max(16, rect.left),
      window.innerWidth - 16 - 320
    );
    return {
      top,
      left,
      maxWidth: "22rem",
      width: "min(22rem, calc(100vw - 2rem))",
    };
  })();

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      {rect ? (
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
      ) : (
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          aria-label="Close tour overlay"
          onClick={onClose}
        />
      )}

      <div
        className="absolute z-[91] liquid-glass rounded-2xl border border-white/15 p-5 shadow-2xl"
        style={cardStyle}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">
          Step {index + 1} of {steps.length}
        </p>
        <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-white/70 leading-relaxed mb-5">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="somnus-nav-link text-xs uppercase tracking-wider text-white/50 hover:text-white"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="somnus-nav-link px-3 py-2 text-xs uppercase tracking-wider text-white/70 hover:text-white"
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
              className="somnus-btn px-4 py-2 text-xs"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
