"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface EventCreatorShellProps {
  title?: string;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel?: string;
  error: string | null;
  flyer: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
}

export function EventCreatorShell({
  title = "Create event",
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel = "Saving…",
  error,
  flyer,
  children,
  isLoading = false,
}: EventCreatorShellProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  /**
   * Portaled to body: callers render this inside `.liquid-glass` cards, and
   * their `backdrop-filter` would make them the containing block for the fixed
   * overlay, sizing it against the card instead of the viewport.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-3 pt-28 pb-5 sm:p-6 sm:pt-32 sm:pb-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-creator-title"
    >
      <div className="w-full max-h-[min(calc(100dvh-8.5rem),780px)] sm:max-w-5xl bg-[#0A0A0A] liquid-glass rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl min-h-0">
        <header className="shrink-0 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <h2
            id="event-creator-title"
            className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="somnus-nav-link p-2 text-white/70 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </header>

        {isLoading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center p-12">
            <p className="text-white/60 text-sm" role="status">
              Loading event…
            </p>
          </div>
        ) : (
          <>
            {/* min-h-0 is required so this flex child can scroll inside max-height */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <div className="flex flex-col lg:flex-row lg:items-start">
                <div className="w-full lg:w-[42%] lg:sticky lg:top-0 shrink-0 p-4 sm:p-5 lg:pr-2">
                  <div className="mx-auto w-full max-w-[17.5rem] sm:max-w-[19rem] lg:max-w-[22rem] aspect-[3/4]">
                    {flyer}
                  </div>
                </div>
                <div className="w-full lg:w-[58%] p-4 sm:p-5 lg:pl-3 space-y-5 pb-6">
                  {children}
                </div>
              </div>
            </div>

            <footer className="shrink-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-6 py-3.5 space-y-3">
              {error && (
                <p className="text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="somnus-nav-link px-4 py-2.5 text-xs sm:text-sm uppercase tracking-wider text-white/70 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="somnus-btn px-6 py-3 text-sm disabled:opacity-50"
                >
                  {isSubmitting ? submittingLabel : submitLabel}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
