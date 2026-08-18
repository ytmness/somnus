"use client";

import type { EventFormData, EventFormMode, OrganizationOption } from "../types";

interface EventHeaderFieldsProps {
  data: EventFormData;
  mode: EventFormMode;
  organizations?: OrganizationOption[];
  onChange: (patch: Partial<EventFormData>) => void;
}

export function EventHeaderFields({
  data,
  mode,
  organizations = [],
  onChange,
}: EventHeaderFieldsProps) {
  return (
    <div className="space-y-4">
      {organizations.length > 0 && (
        <div>
          {mode === "organizer" && organizations.length === 1 ? (
            <p className="text-xs text-white/45">
              Posting as{" "}
              <span className="text-white/80 font-medium">
                {organizations[0].name}
              </span>
            </p>
          ) : (
            <label className="inline-flex items-center gap-2 text-xs text-white/45">
              {mode === "admin" ? "Organization" : "Posting as"}
              <select
                value={data.organizationId}
                onChange={(e) => onChange({ organizationId: e.target.value })}
                className="bg-transparent border border-white/15 rounded-full px-3 py-1 text-white/80 text-xs"
              >
                {mode === "admin" && (
                  <option value="" className="bg-[#0A0A0A]">
                    Platform (no organization)
                  </option>
                )}
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-[#0A0A0A]">
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <input
        id="event-name"
        type="text"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Nombre del evento"
        autoComplete="off"
        className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#5B8DEF] focus:outline-none focus:ring-0 text-3xl sm:text-4xl font-bold text-white placeholder:text-white/25 pb-2 transition-colors"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="event-artist"
            className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
          >
            Organizador *
          </label>
          <input
            id="event-artist"
            type="text"
            value={data.artist}
            onChange={(e) => onChange({ artist: e.target.value })}
            className="somnus-input !py-2.5 text-sm"
            placeholder="Nombre del organizador"
            autoComplete="off"
          />
        </div>
        <div>
          <label
            htmlFor="event-tour"
            className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
          >
            Tour (optional)
          </label>
          <input
            id="event-tour"
            type="text"
            value={data.tour}
            onChange={(e) => onChange({ tour: e.target.value })}
            className="somnus-input !py-2.5 text-sm"
            placeholder="e.g. Awake Tour 2026"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
