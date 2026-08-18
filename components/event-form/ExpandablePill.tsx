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
  size?: "default" | "sm";
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
  size = "default",
}: ExpandablePillProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        isOpen
          ? "border-[#5B8DEF]/50 bg-white/[0.04]"
          : "border-white/12 bg-white/[0.02] hover:border-white/25"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center gap-3 text-left",
          size === "sm" ? "px-3 py-2.5" : "px-4 py-3.5"
        )}
      >
        <Icon
          className={cn(
            "shrink-0 text-white/50",
            size === "sm" ? "w-4 h-4" : "w-5 h-5"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/45">
            {label}
          </span>
          <span
            className={cn(
              "block truncate text-sm",
              hasValue ? "text-white" : "text-white/40"
            )}
          >
            {hasValue ? valueText : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/40 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-white/10">{children}</div>
      )}
    </div>
  );
}
