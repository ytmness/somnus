"use client";

import { Plus, Trash2 } from "lucide-react";

export type PricePhaseFormRow = {
  price: number;
  startsAt: string;
  endsAt: string;
  label?: string;
};

function toDateTimeLocalValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface TicketPricePhasesFieldsProps {
  phases: PricePhaseFormRow[];
  onChange: (next: PricePhaseFormRow[]) => void;
  defaultPriceHint: number;
}

/**
 * Fases opcionales: del día/hora A al B, precio X. Fuera de fases aplica el precio base del tipo.
 */
export function TicketPricePhasesFields({
  phases,
  onChange,
  defaultPriceHint,
}: TicketPricePhasesFieldsProps) {
  const addRow = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    onChange([
      ...phases,
      {
        price: defaultPriceHint,
        startsAt: toDateTimeLocalValue(now),
        endsAt: toDateTimeLocalValue(end),
        label: "",
      },
    ]);
  };

  const updateRow = (i: number, patch: Partial<PricePhaseFormRow>) => {
    const next = phases.map((p, j) => (j === i ? { ...p, ...patch } : p));
    onChange(next);
  };

  const removeRow = (i: number) => {
    onChange(phases.filter((_, j) => j !== i));
  };

  return (
    <div className="md:col-span-3 rounded-lg border border-regia-gold/20 bg-white/[0.03] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white/90">Fases de precio (opcional)</p>
          <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
            Ej. preventa del 1 al 15; fuera de estas fechas se usa el precio base de arriba.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs text-regia-gold hover:text-white border border-regia-gold/40 rounded-lg px-2 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir fase
        </button>
      </div>

      {phases.length === 0 ? (
        <p className="text-xs text-white/35">Sin fases: siempre el precio base.</p>
      ) : (
        <div className="space-y-3">
          {phases.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-white/10 rounded-lg p-3 bg-black/20"
            >
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">Etiqueta</label>
                <input
                  type="text"
                  value={row.label ?? ""}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="Preventa"
                  className="w-full px-2 py-1.5 rounded bg-white/10 border border-regia-gold/25 text-white text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/50 mb-1">Precio (MXN)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded bg-white/10 border border-regia-gold/25 text-white text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">Desde</label>
                <input
                  type="datetime-local"
                  value={row.startsAt}
                  onChange={(e) => updateRow(i, { startsAt: e.target.value })}
                  className="w-full px-2 py-1.5 rounded bg-white/10 border border-regia-gold/25 text-white text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">Hasta</label>
                <input
                  type="datetime-local"
                  value={row.endsAt}
                  onChange={(e) => updateRow(i, { endsAt: e.target.value })}
                  className="w-full px-2 py-1.5 rounded bg-white/10 border border-regia-gold/25 text-white text-sm"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="p-2 text-white/50 hover:text-red-400"
                  aria-label="Quitar fase"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
