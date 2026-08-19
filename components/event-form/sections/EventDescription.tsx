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
        About / descripción (opcional)
      </label>
      <textarea
        id="event-desc"
        value={data.description}
        onChange={(e) => {
          onChange({ description: e.target.value });
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        rows={6}
        className="somnus-input resize-y min-h-[8rem] leading-relaxed"
        placeholder={
          "Ejemplo:\n\nGénero: House, Techno\n\nDress code: Smart casual\n\nCover: incluido en el boleto\n\nPulsa Enter para dejar espacio entre párrafos."
        }
      />
      <p className="mt-1.5 text-[11px] text-white/40">
        Usa Enter para separar párrafos o secciones (género, cover, horarios…). Se
        verá igual en la ficha del evento.
      </p>
    </div>
  );
}
