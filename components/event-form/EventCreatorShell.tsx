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
  aside?: React.ReactNode;
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
  aside,
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 pt-20 pb-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-creator-title"
    >
      <div className="relative flex w-full min-h-0 max-h-[min(calc(100dvh-6rem),920px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111111] shadow-2xl sm:max-w-6xl">
        <h2 id="event-creator-title" className="sr-only">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-2 text-white/70 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {isLoading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center p-12">
            <p className="text-white/60 text-sm" role="status">
              Cargando evento…
            </p>
          </div>
        ) : (
          <>
            {/* min-h-0 is required so this flex child can scroll inside max-height */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid items-start gap-4 p-4 pr-12 sm:p-6 sm:pr-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.9fr)] lg:gap-6">
                <div className="min-w-0 space-y-2.5">{children}</div>
                <div className="min-w-0 space-y-3">
                  <div className="aspect-square w-full">{flyer}</div>
                  {aside}
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
                  Cancelar
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
