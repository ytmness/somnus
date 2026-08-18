"use client";

import { Plus, Trash2 } from "lucide-react";

export type TableGroupPriceFormRow = {
  minGuests: number;
  maxGuests: number;
  price: number;
};

interface TableGroupPriceFieldsProps {
  rows: TableGroupPriceFormRow[];
  onChange: (next: TableGroupPriceFormRow[]) => void;
  defaultPriceHint: number;
}

export function TableGroupPriceFields({
  rows,
  onChange,
  defaultPriceHint,
}: TableGroupPriceFieldsProps) {
  const addRow = () => {
    const last = rows[rows.length - 1];
    const min = last ? last.maxGuests + 1 : 1;
    onChange([
      ...rows,
      {
        minGuests: min,
        maxGuests: min + 3,
        price: defaultPriceHint || 0,
      },
    ]);
  };

  const update = (index: number, patch: Partial<TableGroupPriceFormRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const remove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          Group prices
        </p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#7BA3E8] hover:text-white"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Add row
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-white/40">
          No group prices — base table price only.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
            >
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Min guests
                </label>
                <input
                  type="number"
                  min={1}
                  value={row.minGuests}
                  onChange={(e) =>
                    update(index, {
                      minGuests: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="somnus-input !py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Max guests
                </label>
                <input
                  type="number"
                  min={row.minGuests}
                  value={row.maxGuests}
                  onChange={(e) =>
                    update(index, {
                      maxGuests: parseInt(e.target.value, 10) || row.minGuests,
                    })
                  }
                  className="somnus-input !py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.price || ""}
                  onChange={(e) =>
                    update(index, { price: parseFloat(e.target.value) || 0 })
                  }
                  className="somnus-input !py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-white/40 hover:text-red-400"
                aria-label={`Remove group price ${index + 1}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
