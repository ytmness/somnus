"use client";

import type { EventFormData } from "../types";

interface EventPublishToggleProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

export function EventPublishToggle({ data, onChange }: EventPublishToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-white">Shown in Explore</p>
        <p className="text-xs text-white/45 mt-0.5">
          Visible on the public events page as soon as it&apos;s published.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={data.isActive}
        onClick={() => onChange({ isActive: !data.isActive })}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          data.isActive ? "bg-[#5B8DEF]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            data.isActive ? "translate-x-5" : "translate-x-0"
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}
