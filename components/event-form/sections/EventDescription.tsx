"use client";

import type { EventFormData } from "../types";

interface EventDescriptionProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

export function EventDescription({ data, onChange }: EventDescriptionProps) {
  return (
    <div>
      <label
        htmlFor="event-desc"
        className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
      >
        Description (optional)
      </label>
      <textarea
        id="event-desc"
        value={data.description}
        onChange={(e) => {
          onChange({ description: e.target.value });
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        rows={3}
        className="somnus-input resize-none min-h-[4.5rem]"
        placeholder="Tell people what it's about, kinds of music, dress code…"
      />
    </div>
  );
}
