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
 * Optional phases: from A to B at price X. Outside phases, base ticket price applies.
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
    <div className="md:col-span-3 rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white/90">
            Price phases (optional)
          </p>
          <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
            e.g. early bird — outside these windows the base price above applies.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="somnus-nav-link inline-flex items-center gap-1 text-xs text-[#7BA3E8] hover:text-white border border-white/20 rounded-lg px-2 py-1"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Add phase
        </button>
      </div>

      {phases.length === 0 ? (
        <p className="text-xs text-white/35">No phases — base price only.</p>
      ) : (
        <div className="space-y-3">
          {phases.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-white/10 rounded-lg p-3 bg-black/20"
            >
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={row.label ?? ""}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="Early bird"
                  className="somnus-input !px-2 !py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-white/50 mb-1">
                  Price (MXN)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.price}
                  onChange={(e) =>
                    updateRow(i, { price: parseFloat(e.target.value) || 0 })
                  }
                  className="somnus-input !px-2 !py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">
                  From
                </label>
                <input
                  type="datetime-local"
                  value={row.startsAt}
                  onChange={(e) => updateRow(i, { startsAt: e.target.value })}
                  className="somnus-input !px-2 !py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-white/50 mb-1">
                  Until
                </label>
                <input
                  type="datetime-local"
                  value={row.endsAt}
                  onChange={(e) => updateRow(i, { endsAt: e.target.value })}
                  className="somnus-input !px-2 !py-1.5 text-sm"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="somnus-nav-link p-2 text-white/50 hover:text-red-400"
                  aria-label="Remove phase"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
