"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { pickInvitePoolAnchor, listInvitePoolTicketTypes } from "@/lib/ticket-pricing";
import { expandTableNumbers, MAX_TABLES_PER_BATCH } from "@/lib/table-invite";
import { TableStaffManager } from "@/components/admin/TableStaffManager";

const MAX_TRADITIONAL_SLOTS = 500;
const DEFAULT_MIN_CONFIRM = 20;

interface TableTypeOption {
  id: string;
  name: string;
  unitPrice: number;
  tablePrice: number;
  cupos: number;
}

interface EventOption {
  id: string;
  name: string;
  hasTables: boolean;
  /** Asientos del tipo mesa (referencia) */
  defaultSeatsForPool: number;
  /** Precio ancla del primer tipo (hint) */
  pricePerPersonHint: number;
  tableTypes: TableTypeOption[];
}

interface InviteRow {
  id: string;
  tableNumber: string;
  seatNumber: number | null;
  invitedName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  status: string;
  paidAt: string | null;
  pricePerSeat: number;
  /** Solo para mostrar en el panel */
  totalCollected?: number;
  url: string;
  inviteToken: string;
  expiresAt: string | null;
  createdAt: string;
  isPool?: boolean;
  maxSlots?: number | null;
  splitAmong?: number;
  minPaidToConfirm?: number;
  paidCount?: number;
  tableConfirmed?: boolean;
  ticketTypeName?: string | null;
}

export function InvitesManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [eventName, setEventName] = useState("");
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generar nuevos invites desde admin
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateEventId, setGenerateEventId] = useState("");
  const [generateTableNumber, setGenerateTableNumber] = useState("");
  const [generateSlots, setGenerateSlots] = useState(5);
  const [generateMinConfirm, setGenerateMinConfirm] = useState(DEFAULT_MIN_CONFIRM);
  const [generateTotalPrice, setGenerateTotalPrice] = useState("");
  const [generateTicketTypeId, setGenerateTicketTypeId] = useState("");
  const [generateTableCount, setGenerateTableCount] = useState(1);
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{
      token: string;
      name: string;
      url: string;
      pricePerSeat: number;
      seatNumber: number | null;
      tableNumber?: string;
      maxSlots?: number | null;
      splitAmong?: number;
      minPaidToConfirm?: number;
      isPool?: boolean;
      ticketTypeName?: string;
      ticketTypeId?: string;
    }>
  >([]);
  const [usePoolMode, setUsePoolMode] = useState(true); // Money pool: un link para toda la mesa

  const mapApiEventToOption = useCallback((e: any): EventOption => {
    const listed = listInvitePoolTicketTypes(e.ticketTypes || []);
    const anchor = pickInvitePoolAnchor(e.ticketTypes || []);
    const tableCapacity = Number(
      (anchor?.ticket as { tableCapacity?: number | null } | undefined)
        ?.tableCapacity
    );
    return {
      id: e.id,
      name: e.name,
      hasTables: listed.length > 0,
      defaultSeatsForPool:
        Number.isFinite(tableCapacity) && tableCapacity > 0
          ? tableCapacity
          : 4,
      pricePerPersonHint: listed[0]?.unitPrice ?? 0,
      tableTypes: listed.map((row) => ({
        id: String(row.ticket.id || ""),
        name: String(row.ticket.name || "Mesa"),
        unitPrice: row.unitPrice,
        tablePrice: row.tablePrice,
        cupos: row.cupos,
      })).filter((tt) => tt.id),
    };
  }, []);

  const loadEvents = useCallback(
    async (opts?: { silent?: boolean }): Promise<EventOption[] | null> => {
      if (!opts?.silent) setIsLoadingEvents(true);
      try {
        const res = await fetch("/api/events", { credentials: "include" });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const allEvents: EventOption[] = data.data.map(mapApiEventToOption);
          setEvents(allEvents);
          setSelectedEventId((prev) => {
            if (allEvents.length === 0) return "";
            if (prev && allEvents.some((x) => x.id === prev)) return prev;
            return allEvents[0].id;
          });
          return allEvents;
        }
        return null;
      } catch {
        toast.error("Error al cargar eventos");
        return null;
      } finally {
        if (!opts?.silent) setIsLoadingEvents(false);
      }
    },
    [mapApiEventToOption]
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setInvites([]);
      setEventName("");
      return;
    }
    const loadInvites = async () => {
      setIsLoadingInvites(true);
      try {
        const res = await fetch(`/api/admin/events/${selectedEventId}/invites`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && data.data) {
          setInvites(data.data.invites || []);
          setEventName(data.data.event?.name || "");
        } else {
          setInvites([]);
        }
      } catch {
        toast.error("Error al cargar invitaciones");
        setInvites([]);
      } finally {
        setIsLoadingInvites(false);
      }
    };
    loadInvites();
  }, [selectedEventId]);

  const seatsDefaultForEventId = (eventId: string) =>
    events.find((e) => e.id === eventId)?.defaultSeatsForPool ?? 4;

  const pricePerPersonForEventId = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    const selected = ev?.tableTypes.find((tt) => tt.id === generateTicketTypeId);
    return selected?.unitPrice ?? ev?.pricePerPersonHint ?? 0;
  };

  const tableTypesForGenerate = events.find((e) => e.id === generateEventId)?.tableTypes ?? [];

  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copiado");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const cancelInvite = async (inviteToken: string, isPool: boolean, status: string) => {
    try {
      // No tocar pagos ya realizados
      if (status === "PAID") {
        toast.error("No se puede cancelar una invitación ya pagada");
        return;
      }

      const ok = window.confirm(
        isPool ? "¿Cancelar esta mesa? El link compartido ya no será usable." : "¿Cancelar este link?"
      );
      if (!ok) return;

      const res = await fetch(
        `/api/admin/events/${selectedEventId}/invites/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken, isPool }),
          credentials: "include",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cancelar");
      }

      toast.success(data.message || "Cancelado");

      // Refrescar lista de invites
      const invRes = await fetch(`/api/admin/events/${selectedEventId}/invites`, {
        credentials: "include",
      });
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      } else {
        setInvites([]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al cancelar");
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = generateEventId || selectedEventId;
    if (!eventId) {
      toast.error("Elige un evento");
      return;
    }
    const tableKey = generateTableNumber.trim();
    if (tableKey.length < 1 || tableKey.length > 120) {
      toast.error("Indica un nombre o número de mesa (1–120 caracteres).");
      return;
    }
    const tableNames = expandTableNumbers(tableKey, generateTableCount);
    if (tableNames.length === 0) {
      toast.error("Indica al menos una mesa.");
      return;
    }
    const slots = Math.min(MAX_TRADITIONAL_SLOTS, Math.max(1, generateSlots));
    const totalPrice = parseFloat(generateTotalPrice.replace(/,/g, "."));
    const ticketTypeId = generateTicketTypeId.trim();

    if (!usePoolMode) {
      if (isNaN(totalPrice) || totalPrice <= 0) {
        toast.error("Precio total de la mesa debe ser mayor que 0");
        return;
      }
    } else {
      const freshRes = await fetch(`/api/events/${eventId}`, {
        credentials: "include",
      });
      const freshJson = await freshRes.json();
      const ticketTypes = freshJson?.data?.ticketTypes;
      const listed =
        Array.isArray(ticketTypes) && ticketTypes.length > 0
          ? listInvitePoolTicketTypes(ticketTypes)
          : [];
      const chosen = ticketTypeId
        ? listed.find((row) => row.ticket.id === ticketTypeId)
        : listed.length === 1
        ? listed[0]
        : null;
      if (!chosen || chosen.unitPrice <= 0) {
        toast.error(
          listed.length > 1
            ? "Elige un tipo de mesa para el link."
            : "No hay precio de mesa válido para el link. Agrega una mesa con precio mayor a 0, guarda el evento y vuelve a intentar."
        );
        return;
      }
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, pricePerPersonHint: chosen.unitPrice } : ev
        )
      );
    }

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const allInvites: Array<{
        token: string;
        name: string;
        url: string;
        pricePerSeat: number;
        seatNumber: number | null;
        tableNumber?: string;
        maxSlots?: number | null;
        splitAmong?: number;
        minPaidToConfirm?: number;
        isPool?: boolean;
        ticketTypeName?: string;
        ticketTypeId?: string;
      }> = [];
      for (const name of tableNames) {
        const body: Record<string, unknown> = usePoolMode
          ? {
              mode: "pool",
              ticketTypeId: ticketTypeId || undefined,
            }
          : { slots, totalTablePrice: totalPrice, ticketTypeId: ticketTypeId || undefined };
        const res = await fetch(
          `/api/events/${eventId}/tables/${encodeURIComponent(name)}/invites`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            tableNames.length > 1
              ? `${name}: ${data.error || "Error al generar invites"}`
              : data.error || "Error al generar invites"
          );
        }
        if (data.success && Array.isArray(data.data?.invites)) {
          allInvites.push(...data.data.invites);
        } else {
          throw new Error("No se recibieron los links");
        }
      }

      setGeneratedLinks(allInvites);
      setSelectedEventId(eventId);
      setShowGenerate(false);
      setGenerateTableNumber("");
      setGenerateTotalPrice("");
      toast.success(
        allInvites.length === 1
          ? "Link generado. Cópialo y compártelo."
          : `${allInvites.length} links generados. Cópialos y compártelos.`
      );
      const invRes = await fetch(`/api/admin/events/${eventId}/invites`, {
        credentials: "include",
      });
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al generar");
    } finally {
      setIsSubmittingGenerate(false);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando eventos...</p>
      </div>
    );
  }

  const eventsWithTables = events.filter((e) => e.hasTables);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-white/5 border border-white/10 p-6">
        <p className="text-white/70 mb-4">No hay eventos</p>
        <p className="text-white/50 text-sm mb-4">
          Crea un evento desde la pestaña Eventos. Para usar invites de mesas,
          al crearlo agrega un tipo de boleto con opción &quot;Mesa VIP&quot;.
        </p>
        <Link href="/admin">
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
            Ir a Eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aviso si ningún evento tiene mesas */}
      {eventsWithTables.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
          <p className="text-amber-200 text-sm">
            <strong>Ningún evento tiene mesas VIP configuradas.</strong> Edita un
            evento en la pestaña Eventos y agrega un tipo de boleto con
            &quot;Mesa&quot; / VIP.
          </p>
        </div>
      )}

      {/* Generar nuevos invites */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-2">Generar links de pago</h3>
        <p className="text-white/50 text-sm mb-4">
          Links para cobrar mesas VIP del evento. Elige si quieres una sola URL para el grupo o un link por asiento.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePoolMode}
              onChange={(e) => {
                const v = e.target.checked;
                setUsePoolMode(v);
                const ev = events.find((x) => x.id === (generateEventId || selectedEventId));
                if (ev?.hasTables && !v) {
                  setGenerateSlots(
                    Math.min(
                      MAX_TRADITIONAL_SLOTS,
                      Math.max(1, ev.defaultSeatsForPool)
                    )
                  );
                }
              }}
              className="rounded border-white/30 bg-white/10 text-white focus:ring-white/30"
            />
            <span className="text-white/85 text-sm font-medium">Link compartido (recomendado)</span>
          </label>
          <span className="text-white/45 text-xs">
            {usePoolMode
              ? "Una URL; cada quien paga y deja su nombre."
              : `Una URL por persona (hasta ${MAX_TRADITIONAL_SLOTS}).`}
          </span>
        </div>
        {!showGenerate ? (
          <Button
            onClick={async () => {
              const fresh = (await loadEvents({ silent: true })) ?? events;
              const withTables = fresh.filter((e) => e.hasTables);
              const pick =
                withTables.find((e) => e.id === selectedEventId) ||
                withTables[0];
              const eid = pick?.id || selectedEventId;
              setShowGenerate(true);
              setGenerateEventId(eid);
              setGenerateTableNumber("");
              setGenerateSlots(Math.min(MAX_TRADITIONAL_SLOTS, Math.max(1, pick?.defaultSeatsForPool ?? 5)));
              setGenerateMinConfirm(DEFAULT_MIN_CONFIRM);
              setGenerateTotalPrice("");
              setGenerateTicketTypeId(pick?.tableTypes[0]?.id ?? "");
              setGenerateTableCount(1);
              setGeneratedLinks([]);
            }}
            className="bg-white/20 text-white hover:bg-white/30"
            title={eventsWithTables.length === 0 ? "Necesitas un evento con mesas VIP" : ""}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generar links
          </Button>
        ) : (
          <form onSubmit={handleGenerateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Evento *
                </label>
                <select
                  value={generateEventId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setGenerateEventId(id);
                    const ev = events.find((x) => x.id === id);
                    setGenerateTicketTypeId(ev?.tableTypes[0]?.id ?? "");
                    if (ev?.hasTables && !usePoolMode) {
                      setGenerateSlots(
                        Math.min(
                          MAX_TRADITIONAL_SLOTS,
                          Math.max(1, ev.defaultSeatsForPool)
                        )
                      );
                    }
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} disabled={!ev.hasTables}>
                      {ev.name}
                      {!ev.hasTables ? " (sin mesas VIP)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Tipo de mesa *
                </label>
                <select
                  value={generateTicketTypeId}
                  onChange={(e) => setGenerateTicketTypeId(e.target.value)}
                  required={tableTypesForGenerate.length > 1}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {tableTypesForGenerate.length === 0 ? (
                    <option value="">Sin tipos de mesa</option>
                  ) : (
                    tableTypesForGenerate.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name} · ${tt.tablePrice.toLocaleString("es-MX")} mesa · {tt.cupos} cupos · $
                        {tt.unitPrice.toLocaleString("es-MX")} c/u
                      </option>
                    ))
                  )}
                </select>
                <p className="text-white/45 text-xs mt-1">
                  Este link solo vende ese tipo. Para otro tipo, genera otro link.
                </p>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Nombre o número de mesa *
                </label>
                <input
                  type="text"
                  value={generateTableNumber}
                  onChange={(e) => setGenerateTableNumber(e.target.value)}
                  placeholder="Ej: 1, Terraza A…"
                  required
                  maxLength={120}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Cuántas mesas
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_TABLES_PER_BATCH}
                  value={generateTableCount}
                  onChange={(e) =>
                    setGenerateTableCount(
                      Math.min(
                        MAX_TABLES_PER_BATCH,
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    )
                  }
                  className="w-full max-w-[120px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <p className="text-white/45 text-xs mt-1">
                  Si pones 1 y cantidad 5, crea mesas 1–5. Cada una tiene su propio link.
                </p>
              </div>
            </div>

            {usePoolMode ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                <p className="text-white/55 text-xs leading-relaxed">
                  El precio de la mesa se divide entre los cupos. Cada persona paga{" "}
                  <strong className="text-white/90">
                    ${pricePerPersonForEventId(generateEventId).toLocaleString("es-MX")}
                  </strong>
                  {(() => {
                    const tt = tableTypesForGenerate.find((t) => t.id === generateTicketTypeId);
                    if (!tt) return ".";
                    return ` (${tt.cupos} cupos · mesa $${tt.tablePrice.toLocaleString("es-MX")}). La mesa se confirma al pagar todos los cupos.`;
                  })()}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Precio total de la mesa (MXN) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={generateTotalPrice}
                    onChange={(e) => setGenerateTotalPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder="Ej: 5000"
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <p className="text-white/50 text-xs mt-1">Se reparte entre los links que generes abajo.</p>
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-1">
                    Número de links (asientos) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_TRADITIONAL_SLOTS}
                    value={generateSlots}
                    onChange={(e) =>
                      setGenerateSlots(
                        Math.min(
                          MAX_TRADITIONAL_SLOTS,
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      )
                    }
                    className="w-full max-w-[120px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <p className="text-white/50 text-xs mt-1">Un link por persona; cada quien completa sus datos al pagar.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmittingGenerate}
                className="bg-white text-black hover:bg-white/90"
              >
                {isSubmittingGenerate ? "Generando..." : "Generar links"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowGenerate(false);
                  setGeneratedLinks([]);
                }}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {generatedLinks.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/80 font-medium mb-3">
              {generatedLinks[0]?.isPool ? "Link compartido:" : "Links generados:"}
            </p>
            <div className="space-y-2">
              {generatedLinks.map((link, i) => (
                <div
                  key={link.token}
                  className="flex flex-wrap items-center gap-2 p-2 rounded bg-white/5"
                >
                  <span className="text-white/80 text-sm">
                    {link.isPool
                      ? `${link.tableNumber ? `Mesa ${link.tableNumber} · ` : ""}${
                          link.ticketTypeName ? `${link.ticketTypeName} · ` : ""
                        }$${link.pricePerSeat?.toLocaleString("es-MX") ?? "—"} / cupo${
                          link.minPaidToConfirm != null
                            ? ` · ${link.minPaidToConfirm} cupos`
                            : ""
                        } ·`
                      : `Asiento ${link.seatNumber} ·`}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyLink(link.url, link.token)}
                    className="text-white/90 hover:text-white text-sm flex items-center gap-1"
                  >
                    {copiedId === link.token ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedId === link.token ? "Copiado" : "Copiar link"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ver invites existentes */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">
          Ver y copiar links existentes
        </h3>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="text-white/80 text-sm font-medium">Evento:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[240px]"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
                {!ev.hasTables ? " (sin mesas VIP)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingInvites ? (
        <div className="text-center py-8">
          <p className="text-white/70">Cargando invitaciones...</p>
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 rounded-lg bg-white/5 border border-white/10">
          <Link2 className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/70 mb-2">No hay invites para este evento</p>
          <p className="text-white/50 text-sm">Genera links arriba.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Mesa
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Asiento
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Invitado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Timeline / Pagado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Precio
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Recaudado
                </th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold text-sm">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="py-3 px-4 text-white/90">
                    <p>{inv.tableNumber}</p>
                    {inv.ticketTypeName ? (
                      <p className="text-[11px] text-white/45 mt-0.5">{inv.ticketTypeName}</p>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 text-white/80">
                    {inv.isPool ? "Link compartido" : inv.seatNumber}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-white/90 font-medium">
                      {inv.invitedName === "Pendiente" ? "—" : inv.invitedName}
                    </p>
                    {inv.invitedEmail && inv.invitedEmail !== "" && (
                      <p className="text-xs text-white/60">{inv.invitedEmail}</p>
                    )}
                    {inv.invitedPhone && inv.invitedPhone !== "" && (
                      <p className="text-xs text-white/50">{inv.invitedPhone}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        inv.status === "PAID"
                          ? "bg-green-500/20 text-green-400"
                          : inv.status === "POOL"
                          ? "bg-blue-500/20 text-blue-400"
                          : inv.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-400"
                          : inv.status === "EXPIRED"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {inv.status === "POOL" && inv.paidCount != null
                        ? inv.tableConfirmed
                          ? `Confirmada · ${inv.paidCount} pagos`
                          : inv.minPaidToConfirm != null
                          ? `${inv.paidCount}/${inv.minPaidToConfirm} cupos`
                          : `${inv.paidCount} pagos`
                        : inv.status === "PAID"
                        ? "Pagado"
                        : inv.status === "PENDING"
                        ? "Pendiente"
                        : inv.status === "EXPIRED"
                        ? "Expirado"
                        : inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/70 text-sm">
                    {inv.paidAt
                      ? new Date(inv.paidAt).toLocaleString("es-MX", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-white/80">
                    ${inv.pricePerSeat.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-white/80">
                    {inv.isPool && typeof inv.totalCollected === "number"
                      ? `$${inv.totalCollected.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/70 hover:text-white"
                        onClick={() => copyLink(inv.url, inv.inviteToken)}
                      >
                        {copiedId === inv.inviteToken ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span className="ml-1 text-xs">
                          {copiedId === inv.inviteToken ? "Copiado" : "Copiar"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={`${
                          inv.status === "PAID" ? "pointer-events-none opacity-50" : "text-red-400 hover:text-red-300"
                        }`}
                        onClick={() => cancelInvite(inv.inviteToken, !!inv.isPool, inv.status)}
                        aria-label="Cancelar mesa o link"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="ml-1 text-xs">Eliminar</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEventId && <TableStaffManager eventId={selectedEventId} />}
    </div>
  );
}
