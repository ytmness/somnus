"use client";

import type { EventFormData, EventFormStatus } from "../types";

interface EventPublishToggleProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

export function EventPublishToggle({ data, onChange }: EventPublishToggleProps) {
  const setStatus = (status: EventFormStatus) => {
    if (status === "DRAFT") {
      onChange({ status, isActive: false });
      return;
    }
    onChange({ status });
  };

  return (
    <div className="space-y-3" id="section-publish">
      <div className="rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5">
        <p className="text-sm font-medium text-white mb-1">Publish status</p>
        <p className="text-xs text-white/45 mb-3">
          Drafts stay hidden. Published events can appear in Explore when active.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStatus("DRAFT")}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border ${
              data.status === "DRAFT"
                ? "border-[#5B8DEF] bg-[#5B8DEF]/15 text-white"
                : "border-white/12 bg-transparent text-white/60 hover:text-white"
            }`}
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => setStatus("PUBLISHED")}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border ${
              data.status === "PUBLISHED"
                ? "border-[#5B8DEF] bg-[#5B8DEF]/15 text-white"
                : "border-white/12 bg-transparent text-white/60 hover:text-white"
            }`}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-white">Shown in Explore</p>
          <p className="text-xs text-white/45 mt-0.5">
            {data.status === "DRAFT"
              ? "Disabled while the event is a draft."
              : "Visible on the public events page when active."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.isActive && data.status !== "DRAFT"}
          disabled={data.status === "DRAFT"}
          onClick={() => {
            if (data.status === "DRAFT") return;
            onChange({ isActive: !data.isActive });
          }}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
            data.isActive && data.status !== "DRAFT"
              ? "bg-[#5B8DEF]"
              : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              data.isActive && data.status !== "DRAFT"
                ? "translate-x-5"
                : "translate-x-0"
            }`}
            aria-hidden
          />
        </button>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5 cursor-pointer">
        <div>
          <p className="text-sm font-medium text-white">Members only</p>
          <p className="text-xs text-white/45 mt-0.5">
            Require an active org membership to see or buy.
          </p>
        </div>
        <input
          type="checkbox"
          checked={data.membersOnly}
          onChange={(e) => onChange({ membersOnly: e.target.checked })}
          className="h-4 w-4 rounded border-white/30 bg-transparent"
        />
      </label>
    </div>
  );
}
