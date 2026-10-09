"use client";

import { Crown } from "lucide-react";
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
    <div className="space-y-2.5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
        <label htmlFor="event-name" className="sr-only">
          Nombre del evento
        </label>
        <input
          id="event-name"
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nombre del evento"
          autoComplete="off"
          className="w-full bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-white/80"
        />
        {organizations.length > 0 &&
          (mode === "organizer" && organizations.length === 1 ? (
            <p className="mt-1 text-xs text-white/45">
              Publicas como{" "}
              <span className="font-medium text-white/80">{organizations[0].name}</span>
            </p>
          ) : (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/45">
              {mode === "admin" ? "Organización" : "Publicas como"}
              <select
                value={data.organizationId}
                onChange={(e) => onChange({ organizationId: e.target.value })}
                className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-xs text-white/80"
                style={{ colorScheme: "dark" }}
              >
                {mode === "admin" && (
                  <option value="" className="bg-[#111111]">
                    Plataforma (sin organización)
                  </option>
                )}
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-[#111111]">
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
        <Crown className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
        <span className="sr-only">Organizador</span>
        <input
          id="event-artist"
          type="text"
          value={data.artist}
          onChange={(e) => onChange({ artist: e.target.value })}
          placeholder="Organizado por"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
        />
      </label>
    </div>
  );
}
