"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  TicketPricePhasesFields,
  type PricePhaseFormRow,
} from "@/components/admin/TicketPricePhasesFields";
import {
  TableGroupPriceFields,
  type TableGroupPriceFormRow,
} from "@/components/admin/TableGroupPriceFields";
import {
  createEmptyTicketType,
  type EventFormData,
  type TicketTypeForm,
} from "../types";
import { cn } from "@/lib/utils";

interface EventTicketsSectionProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
  isEdit?: boolean;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 cursor-pointer">
      <span className="text-xs text-white/75">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-[#7BA3E8]" : "bg-white/20"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </label>
  );
}

export function EventTicketsSection({
  data,
  onChange,
  isEdit = false,
}: EventTicketsSectionProps) {
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});
  /** Local-only preview — never persisted */
  const [previewByIndex, setPreviewByIndex] = useState<
    Record<number, { soldOut: boolean; hidden: boolean }>
  >({});

  const updateTicket = (index: number, patch: Partial<TicketTypeForm>) => {
    const next = data.ticketTypes.map((tt, i) =>
      i === index ? { ...tt, ...patch } : tt
    );
    onChange({ ticketTypes: next });
  };

  const setPreview = (
    index: number,
    patch: Partial<{ soldOut: boolean; hidden: boolean }>
  ) => {
    setPreviewByIndex((prev) => ({
      ...prev,
      [index]: {
        soldOut: prev[index]?.soldOut ?? false,
        hidden: prev[index]?.hidden ?? false,
        ...patch,
      },
    }));
  };

  const addTicket = (kind: "STANDARD" | "TABLE") => {
    onChange({
      ticketTypes: [
        ...data.ticketTypes,
        { ...createEmptyTicketType(kind), name: "", description: "" },
      ],
    });
  };

  const removeTicket = (index: number) => {
    if (data.ticketTypes.length <= 1) return;
    const target = data.ticketTypes[index];
    if (isEdit && target.id) return;
    if ((target.soldQuantity ?? 0) > 0) return;
    onChange({
      ticketTypes: data.ticketTypes.filter((_, i) => i !== index),
    });
    setAdvancedOpen((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setPreviewByIndex((prev) => {
      const next: typeof prev = {};
      Object.keys(prev).forEach((k) => {
        const i = Number(k);
        if (i < index) next[i] = prev[i];
        else if (i > index) next[i - 1] = prev[i];
      });
      return next;
    });
  };

  const toggleAdvanced = (index: number) =>
    setAdvancedOpen((prev) => ({ ...prev, [index]: !prev[index] }));

  return (
    <div className="space-y-3" id="section-tickets">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-wider text-white/45">
          Ticket tiers
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => addTicket("STANDARD")}
            className="somnus-nav-link inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#7BA3E8] hover:text-white shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nueva entrada
          </button>
          <button
            type="button"
            onClick={() => addTicket("TABLE")}
            className="somnus-nav-link inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#7BA3E8] hover:text-white shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nueva mesa
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {data.ticketTypes.map((tt, index) => {
          const isAdvanced = Boolean(advancedOpen[index]);
          const phaseCount = tt.pricePhases.length;
          const sold = tt.soldQuantity ?? 0;
          const canRemove =
            data.ticketTypes.length > 1 &&
            sold === 0 &&
            !(isEdit && Boolean(tt.id));
          const isTable = tt.kind === "TABLE";
          const otherTiers = data.ticketTypes.filter(
            (_, i) => i !== index && Boolean(data.ticketTypes[i].id || data.ticketTypes[i].name)
          );
          const preview = previewByIndex[index] ?? {
            soldOut: false,
            hidden: false,
          };

          return (
            <div
              key={tt.id || `new-${index}`}
              className="rounded-xl border border-white/12 bg-white/[0.02] p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-white/50">
                  {isTable ? "Mesa" : "Entrada"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2.5 items-end">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={tt.name}
                    onChange={(e) => updateTicket(index, { name: e.target.value })}
                    className="somnus-input !py-2 text-sm"
                    placeholder={isTable ? "Mesa VIP" : "General"}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    {isTable ? "Table price" : "Price"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={tt.price || ""}
                    onChange={(e) =>
                      updateTicket(index, { price: parseFloat(e.target.value) || 0 })
                    }
                    className="somnus-input !py-2 text-sm"
                    placeholder="850"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={sold > 0 ? sold : 1}
                    value={tt.maxQuantity || ""}
                    onChange={(e) =>
                      updateTicket(index, {
                        maxQuantity: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="somnus-input !py-2 text-sm"
                    placeholder={isTable ? "10" : "200"}
                  />
                </div>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeTicket(index)}
                    className="somnus-nav-link p-2 text-white/45 hover:text-red-400 justify-self-end"
                    aria-label={`Remove ticket tier ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>

              {isEdit && sold > 0 && (
                <p className="text-[11px] text-white/40">
                  {sold} sold — qty cannot go below that
                </p>
              )}

              <div className="space-y-2 rounded-lg border border-dashed border-white/15 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  Vista previa (no se guarda)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleRow
                    label="Agotado"
                    checked={preview.soldOut}
                    onChange={(soldOut) => setPreview(index, { soldOut })}
                  />
                  <ToggleRow
                    label="Oculto"
                    checked={preview.hidden}
                    onChange={(hidden) => setPreview(index, { hidden })}
                  />
                </div>

                {preview.hidden ? (
                  <div className="rounded-xl border border-white/10 border-dashed px-4 py-6 text-center">
                    <p className="text-xs text-white/45">
                      Oculto — no aparece en la lista de boletos
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-xl border border-white/12 bg-white/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      preview.soldOut && "opacity-70"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm truncate">
                          {tt.name.trim() || (isTable ? "Mesa VIP" : "General")}
                        </span>
                        {preview.soldOut && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                            Sold out
                          </span>
                        )}
                        {isTable && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            Table
                          </span>
                        )}
                      </div>
                      {tt.description.trim() ? (
                        <p className="text-white/55 text-xs mt-1 line-clamp-2">
                          {tt.description}
                        </p>
                      ) : null}
                      <p className="text-white/80 text-sm mt-1.5 tabular-nums">
                        ${(tt.price || 0).toLocaleString("en-US")} MXN
                        {isTable ? " / table" : ""}
                      </p>
                    </div>
                    {!preview.soldOut && (
                      <div className="flex items-center gap-1 border border-white/20 rounded-lg opacity-80 pointer-events-none select-none">
                        <span className="p-2 text-white/50 text-xs">−</span>
                        <span className="px-3 py-1.5 text-white/70 text-sm tabular-nums">
                          0
                        </span>
                        <span className="p-2 text-white/50 text-xs">+</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleAdvanced(index)}
                aria-expanded={isAdvanced}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
              >
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    isAdvanced && "rotate-180"
                  )}
                  aria-hidden
                />
                Advanced
                {phaseCount > 0 && !isAdvanced && (
                  <span className="text-[#7BA3E8]">
                    · {phaseCount} phase{phaseCount > 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {isAdvanced && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={tt.description}
                      onChange={(e) =>
                        updateTicket(index, { description: e.target.value })
                      }
                      className="somnus-input !py-2 text-sm"
                      placeholder={
                        isTable
                          ? "Includes bottle service…"
                          : "Standing room, near the booth…"
                      }
                    />
                  </div>

                  {isTable && (
                    <>
                      <div className="w-28">
                        <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                          Capacity (guests)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={tt.tableCapacity ?? ""}
                          onChange={(e) =>
                            updateTicket(index, {
                              tableCapacity:
                                parseInt(e.target.value, 10) || null,
                            })
                          }
                          className="somnus-input !py-2 text-sm"
                        />
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                          Online payment
                        </p>
                        <div className="inline-flex rounded-lg border border-white/15 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateTicket(index, { depositEnabled: false })
                            }
                            className={cn(
                              "px-3 py-1.5 text-xs uppercase tracking-wider",
                              !tt.depositEnabled
                                ? "bg-white text-black"
                                : "text-white/70 hover:text-white"
                            )}
                          >
                            Full amount
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateTicket(index, { depositEnabled: true })
                            }
                            className={cn(
                              "px-3 py-1.5 text-xs uppercase tracking-wider",
                              tt.depositEnabled
                                ? "bg-white text-black"
                                : "text-white/70 hover:text-white"
                            )}
                          >
                            Deposit only
                          </button>
                        </div>
                      </div>

                      {tt.depositEnabled && (
                        <div className="w-28">
                          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                            Deposit %
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={tt.depositPercent ?? ""}
                            onChange={(e) =>
                              updateTicket(index, {
                                depositPercent:
                                  parseInt(e.target.value, 10) || null,
                              })
                            }
                            className="somnus-input !py-2 text-sm"
                          />
                        </div>
                      )}

                      <ToggleRow
                        label="Variable prices by group size"
                        checked={tt.variablePricingEnabled}
                        onChange={(variablePricingEnabled) =>
                          updateTicket(index, { variablePricingEnabled })
                        }
                      />

                      {tt.variablePricingEnabled && (
                        <TableGroupPriceFields
                          rows={tt.groupPriceRows}
                          onChange={(groupPriceRows: TableGroupPriceFormRow[]) =>
                            updateTicket(index, { groupPriceRows })
                          }
                          defaultPriceHint={tt.price}
                        />
                      )}
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Sales start
                      </label>
                      <input
                        type="datetime-local"
                        value={tt.salesStartDate}
                        onChange={(e) =>
                          updateTicket(index, {
                            salesStartDate: e.target.value,
                          })
                        }
                        className="somnus-input !py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Sales end
                      </label>
                      <input
                        type="datetime-local"
                        value={tt.salesEndDate}
                        onChange={(e) =>
                          updateTicket(index, { salesEndDate: e.target.value })
                        }
                        className="somnus-input !py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Valid until
                      </label>
                      <input
                        type="datetime-local"
                        value={tt.validUntil}
                        onChange={(e) =>
                          updateTicket(index, { validUntil: e.target.value })
                        }
                        className="somnus-input !py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Min purchase
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={tt.minPurchaseQty}
                        onChange={(e) =>
                          updateTicket(index, {
                            minPurchaseQty: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="somnus-input !py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Max purchase
                      </label>
                      <input
                        type="number"
                        min={tt.minPurchaseQty}
                        value={tt.maxPurchaseQty ?? ""}
                        onChange={(e) =>
                          updateTicket(index, {
                            maxPurchaseQty: e.target.value
                              ? parseInt(e.target.value, 10)
                              : null,
                          })
                        }
                        className="somnus-input !py-2 text-sm"
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <ToggleRow
                    label="Requires approval"
                    checked={tt.requiresApproval}
                    onChange={(requiresApproval) =>
                      updateTicket(index, { requiresApproval })
                    }
                  />
                  {tt.requiresApproval && (
                    <p className="text-[10px] text-white/40 -mt-1">
                      Org/admin must review the buyer’s profile and approve
                      before the card is charged.
                    </p>
                  )}

                  <ToggleRow
                    label="Password protected"
                    checked={tt.passwordEnabled}
                    onChange={(passwordEnabled) =>
                      updateTicket(index, {
                        passwordEnabled,
                        clearPassword: !passwordEnabled && tt.hasPassword,
                        password: passwordEnabled ? tt.password : "",
                      })
                    }
                  />

                  {tt.passwordEnabled && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        {tt.hasPassword
                          ? "New password (leave blank to keep)"
                          : "Password"}
                      </label>
                      <input
                        type="text"
                        value={tt.password}
                        onChange={(e) =>
                          updateTicket(index, {
                            password: e.target.value,
                            clearPassword: false,
                          })
                        }
                        className="somnus-input !py-2 text-sm max-w-xs"
                        placeholder="••••••"
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {!isTable && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Linked ticket (optional)
                      </label>
                      <select
                        value={tt.linkedTicketTypeId || ""}
                        onChange={(e) =>
                          updateTicket(index, {
                            linkedTicketTypeId: e.target.value || null,
                          })
                        }
                        className="somnus-input !py-2 text-sm max-w-sm"
                      >
                        <option value="" className="bg-[#0A0A0A]">
                          None
                        </option>
                        {otherTiers.map((other, oi) => {
                          const real = data.ticketTypes.find(
                            (x) => x === other
                          );
                          const key = real?.id || `idx-${data.ticketTypes.indexOf(other)}`;
                          return (
                            <option
                              key={key}
                              value={real?.id || ""}
                              disabled={!real?.id}
                              className="bg-[#0A0A0A]"
                            >
                              {other.name || `Tier ${oi + 1}`}
                              {!real?.id ? " (save first)" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-white/35 mt-1">
                        Like price phases: buyers need this linked tier in the cart.
                      </p>
                    </div>
                  )}

                  {!isTable && (
                    <TicketPricePhasesFields
                      phases={tt.pricePhases}
                      onChange={(next: PricePhaseFormRow[]) =>
                        updateTicket(index, { pricePhases: next })
                      }
                      defaultPriceHint={tt.price}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
