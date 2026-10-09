"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandablePillProps {
  icon: LucideIcon;
  label: string;
  valueText: string;
  placeholder: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasValue: boolean;
  appearance?: "bar" | "chip";
}

/**
 * Rounded pill/chip that expands inline to reveal its fields on click —
 * keeps secondary inputs (dates, location, capacity) out of the way until needed.
 */
export function ExpandablePill({
  icon: Icon,
  label,
  valueText,
  placeholder,
  isOpen,
  onToggle,
  children,
  hasValue,
  appearance = "bar",
}: ExpandablePillProps) {
  const chip = appearance === "chip";

  return (
    <div className={chip ? "contents" : "w-full"}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
          chip
            ? cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                hasValue || isOpen
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/15 bg-transparent text-white/80 hover:bg-white/10"
              )
            : cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5",
                isOpen
                  ? "border-white/20 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"
              )
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            chip ? "" : "text-sm",
            hasValue ? "text-white" : "text-white/45"
          )}
        >
          {chip ? label : hasValue ? valueText : placeholder}
        </span>
        {!chip && (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-white/35 transition-transform",
              isOpen && "rotate-180"
            )}
            aria-hidden
          />
        )}
      </button>
      {isOpen && (
        <div
          className={cn(
            "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3",
            chip ? "basis-full" : "mt-2"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
