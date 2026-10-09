"use client";

import { Lock } from "lucide-react";
import type { EventFormData } from "../types";

interface EventPublishToggleProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

type Visibility = "draft" | "public" | "members" | "hidden";

function visibilityOf(data: EventFormData): Visibility {
  if (data.status === "DRAFT") return "draft";
  if (data.membersOnly) return "members";
  if (!data.isActive) return "hidden";
  return "public";
}

export function EventPublishToggle({ data, onChange }: EventPublishToggleProps) {
  const setVisibility = (value: Visibility) => {
    if (value === "draft") {
      onChange({ status: "DRAFT", isActive: false });
      return;
    }
    if (value === "members") {
      onChange({ status: "PUBLISHED", isActive: true, membersOnly: true });
      return;
    }
    if (value === "hidden") {
      onChange({ status: "PUBLISHED", isActive: false, membersOnly: false });
      return;
    }
    onChange({ status: "PUBLISHED", isActive: true, membersOnly: false });
  };

  return (
    <div
      id="section-publish"
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
    >
      <p className="flex min-w-0 items-center gap-2 text-sm text-white">
        <Lock className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
        <span className="truncate">¿Quién puede verlo?</span>
      </p>
      <label className="sr-only" htmlFor="event-visibility">
        Quién puede ver el evento
      </label>
      <select
        id="event-visibility"
        value={visibilityOf(data)}
        onChange={(e) => setVisibility(e.target.value as Visibility)}
        className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        style={{ colorScheme: "dark" }}
      >
        <option value="public">Público</option>
        <option value="members">Solo miembros</option>
        <option value="hidden">Oculto</option>
        <option value="draft">Borrador</option>
      </select>
    </div>
  );
}
