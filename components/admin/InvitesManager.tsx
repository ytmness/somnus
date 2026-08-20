"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { effectiveTicketPriceAt } from "@/lib/ticket-pricing";
import { TableStaffManager } from "@/components/admin/TableStaffManager";

interface EventTicketOption {
  id: string;
  name: string;
  price: number;
}

interface EventOption {
  id: string;
  name: string;
  tickets: EventTicketOption[];
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
  totalCollected?: number;
  tableTotal?: number;
  remaining?: number;
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

type PriceMode = "total" | "ticket";

function mapEventTickets(raw: unknown[]): EventTicketOption[] {
  return (raw || [])
    .map((tt: any) => {
      if (!tt?.id || tt.isHidden || tt.kind === "TABLE" || tt.isTable) return null;
      if (tt.isActive === false) return null;
      const price = effectiveTicketPriceAt(
        Number(tt.price),
        tt.pricePhases ?? null
      );
      if (!Number.isFinite(price) || price <= 0) return null;
      return {
        id: String(tt.id),
        name: String(tt.name || "Entrada"),
        price,
      };
    })
    .filter((t): t is EventTicketOption => Boolean(t));
}

export function InvitesManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showGenerate, setShowGenerate] = useState(false);
  const [generateEventId, setGenerateEventId] = useState("");
  const [generateTableNumber, setGenerateTableNumber] = useState("");
  const [generateCupos, setGenerateCupos] = useState(8);
  const [priceMode, setPriceMode] = useState<PriceMode>("total");
  const [generateTotalPrice, setGenerateTotalPrice] = useState("");
  const [generateTicketTypeId, setGenerateTicketTypeId] = useState("");
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{
      token: string;
      name: string;
      url: string;
      pricePerSeat: number;
      tableTotal?: number;
      seatNumber: number | null;
      tableNumber?: string;
      splitAmong?: number;
      minPaidToConfirm?: number;
      isPool?: boolean;
    }>
  >([]);

  const loadEvents = useCallback(async (): Promise<EventOption[] | null> => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch("/api/events", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const allEvents: EventOption[] = data.data.map((e: any) => ({
          id: e.id,
          name: e.name,
          tickets: mapEventTickets(e.ticketTypes || []),
        }));
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
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setInvites([]);
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

  const ticketsForGenerate =
    events.find((e) => e.id === generateEventId)?.tickets ?? [];
  const selectedTicket = ticketsForGenerate.find(
    (t) => t.id === generateTicketTypeId
  );

  const unitFromForm = (() => {
    if (priceMode === "ticket") {
      return selectedTicket?.price ?? 0;
    }
    const total = parseFloat(generateTotalPrice.replace(/,/g, "."));
    if (!Number.isFinite(total) || total <= 0 || generateCupos < 1) return 0;
    return Math.round((total / generateCupos) * 100) / 100;
  })();

  const tableTotalPreview = (() => {
    if (priceMode === "ticket") {
      if (!selectedTicket) return 0;
      return Math.round(selectedTicket.price * generateCupos * 100) / 100;
    }
    const total = parseFloat(generateTotalPrice.replace(/,/g, "."));
    return Number.isFinite(total) && total > 0 ? total : 0;
  })();

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

  const cancelInvite = async (
    inviteToken: string,
    isPool: boolean,
    status: string
  ) => {
    try {
      if (status === "PAID") {
        toast.error(
          "No se puede eliminar un link con pagos ya hechos en modo asiento"
        );
        return;
      }

      const ok = window.confirm(
        isPool
          ? "¿Eliminar este link de mesa? Quienes ya pagaron mantienen su boleto; el link deja de funcionar para nuevos pagos."
          : "¿Eliminar este link de asiento?"
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
      if (!res.ok) throw new Error(data.error || "Error al cancelar");

      toast.success(data.message || "Cancelado");

      const invRes = await fetch(
        `/api/admin/events/${selectedEventId}/invites`,
        { credentials: "include" }
      );
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      } else {
        setInvites([]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar");
    }
  };

  const openGenerateForm = (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    setShowGenerate(true);
    setGenerateEventId(eventId);
    setGenerateTableNumber("");
    setGenerateCupos(8);
    setPriceMode("total");
    setGenerateTotalPrice("");
    setGenerateTicketTypeId(ev?.tickets[0]?.id ?? "");
    setGeneratedLinks([]);
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
    const cupos = Math.min(500, Math.max(1, generateCupos));

    let body: Record<string, unknown> = {
      mode: "pool",
      cupos,
      minPaidToConfirm: cupos,
    };

    if (priceMode === "total") {
      const totalPrice = parseFloat(generateTotalPrice.replace(/,/g, "."));
      if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
        toast.error("Indica el total de la mesa (mayor a 0).");
        return;
      }
      body.totalTablePrice = totalPrice;
    } else {
      if (!generateTicketTypeId) {
        toast.error("Elige un boleto del evento.");
        return;
      }
      body.ticketTypeId = generateTicketTypeId;
    }

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${encodeURIComponent(tableKey)}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar invites");
      }
      if (!data.success || !Array.isArray(data.data?.invites)) {
        throw new Error("No se recibieron los links");
      }

      setGeneratedLinks(data.data.invites);
      setSelectedEventId(eventId);
      setShowGenerate(false);
      setGenerateTableNumber("");
      setGenerateTotalPrice("");
      toast.success("Link de mesa guardado. Cópialo y compártelo.");
      const invRes = await fetch(`/api/admin/events/${eventId}/invites`, {
        credentials: "include",
      });
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar");
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

  if (events.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-white/5 border border-white/10 p-6">
        <p className="text-white/70 mb-4">No hay eventos</p>
        <p className="text-white/50 text-sm mb-4">
          Crea un evento con entradas. Luego aquí armas cada mesa con total o
          con un boleto del evento.
        </p>
        <Link href="/admin">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Ir a Eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-2">Links de mesa</h3>
        <p className="text-white/50 text-sm mb-4">
          Una mesa = un link. Eliges total manual o un boleto del evento, más
          cupos. Conforme pagan, baja el saldo.
        </p>

        {!showGenerate ? (
          <Button
            onClick={() =>
              openGenerateForm(selectedEventId || events[0]?.id || "")
            }
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear link de mesa
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
                    setGenerateTicketTypeId(ev?.tickets[0]?.id ?? "");
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Nombre de esta mesa *
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
            </div>

            <div>
              <p className="block text-white/80 text-sm font-medium mb-2">
                Precio *
              </p>
              <div className="flex flex-wrap gap-4 mb-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-white/85">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceMode === "total"}
                    onChange={() => setPriceMode("total")}
                    className="accent-white"
                  />
                  Total de la mesa
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-white/85">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceMode === "ticket"}
                    onChange={() => setPriceMode("ticket")}
                    className="accent-white"
                  />
                  Boleto del evento
                </label>
              </div>

              {priceMode === "total" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={generateTotalPrice}
                  onChange={(e) =>
                    setGenerateTotalPrice(
                      e.target.value.replace(/[^0-9.,]/g, "")
                    )
                  }
                  placeholder="Ej: 8000"
                  required
                  className="w-full max-w-xs px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              ) : (
                <div>
                  <select
                    value={generateTicketTypeId}
                    onChange={(e) => setGenerateTicketTypeId(e.target.value)}
                    required
                    className="w-full max-w-md px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    {ticketsForGenerate.length === 0 ? (
                      <option value="">Sin boletos en este evento</option>
                    ) : (
                      ticketsForGenerate.map((tt) => (
                        <option key={tt.id} value={tt.id}>
                          {tt.name} · ${tt.price.toLocaleString("es-MX")} c/u
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-white/45 text-xs mt-1">
                    Cada cupo cobra el precio de ese boleto. El total de la mesa
                    = precio × cupos.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">
                Cupos (personas) *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={generateCupos}
                onChange={(e) =>
                  setGenerateCupos(
                    Math.min(
                      500,
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  )
                }
                className="w-full max-w-[140px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <p className="text-white/45 text-xs mt-1">
                Total ≈ $
                {tableTotalPreview > 0
                  ? tableTotalPreview.toLocaleString("es-MX")
                  : "—"}
                {" · "}
                {generateCupos} cupos · $
                {unitFromForm > 0
                  ? unitFromForm.toLocaleString("es-MX")
                  : "—"}{" "}
                c/u. Con {generateCupos} pagos se confirma.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-white/55 text-xs leading-relaxed">
                Quien abre el link puede pagar su parte (cupos) o toda la mesa.
                El saldo pendiente baja con cada pago.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={
                  isSubmittingGenerate ||
                  (priceMode === "ticket" && ticketsForGenerate.length === 0)
                }
                className="bg-white text-black hover:bg-white/90"
              >
                {isSubmittingGenerate ? "Creando..." : "Crear y guardar link"}
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
            <p className="text-white/80 font-medium mb-1">
              Guardado. Copia el link:
            </p>
            <div className="space-y-2">
              {generatedLinks.map((link) => (
                <div
                  key={link.token}
                  className="flex flex-wrap items-center gap-2 p-2 rounded bg-white/5"
                >
                  <span className="text-white/80 text-sm">
                    {link.tableNumber ? `Mesa ${link.tableNumber} · ` : ""}
                    {link.tableTotal != null
                      ? `$${link.tableTotal.toLocaleString("es-MX")} total · `
                      : ""}
                    ${link.pricePerSeat?.toLocaleString("es-MX") ?? "—"} / cupo
                    {link.minPaidToConfirm != null
                      ? ` · ${link.minPaidToConfirm} cupos`
                      : ""}{" "}
                    ·
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

      <div>
        <h3 className="text-lg font-bold text-white mb-4">
          Mesas con link (guardadas)
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
          <p className="text-white/70 mb-2">
            Aún no hay links de mesa en este evento
          </p>
          <p className="text-white/50 text-sm">
            Crea uno arriba: nombre, precio (total o boleto) y cupos.
          </p>
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
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Recaudado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Resta
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Por cupo
                </th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold text-sm">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const tableTotal =
                  inv.tableTotal ??
                  (inv.splitAmong
                    ? Math.round(inv.pricePerSeat * inv.splitAmong * 100) /
                      100
                    : null);
                const collected =
                  typeof inv.totalCollected === "number"
                    ? inv.totalCollected
                    : inv.status === "PAID"
                      ? inv.pricePerSeat
                      : 0;
                const remaining =
                  typeof inv.remaining === "number"
                    ? inv.remaining
                    : tableTotal != null
                      ? Math.max(0, tableTotal - collected)
                      : null;

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-3 px-4 text-white/90">
                      <p>{inv.tableNumber}</p>
                      {(inv.ticketTypeName || inv.splitAmong != null) && (
                        <p className="text-[11px] text-white/45 mt-0.5">
                          {[
                            inv.ticketTypeName,
                            inv.splitAmong != null
                              ? `${inv.splitAmong} cupos`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          inv.status === "PAID"
                            ? "bg-green-500/20 text-green-400"
                            : inv.status === "POOL"
                              ? inv.tableConfirmed
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                              : inv.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {inv.status === "POOL" && inv.paidCount != null
                          ? inv.tableConfirmed
                            ? `Confirmada · ${inv.paidCount}/${inv.minPaidToConfirm ?? inv.splitAmong ?? "—"}`
                            : `${inv.paidCount}/${inv.minPaidToConfirm ?? inv.splitAmong ?? "—"} cupos`
                          : inv.status === "PAID"
                            ? "Pagado"
                            : inv.status === "PENDING"
                              ? "Pendiente"
                              : inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {tableTotal != null
                        ? `$${tableTotal.toLocaleString("es-MX")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      ${collected.toLocaleString("es-MX")}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {remaining != null
                        ? `$${remaining.toLocaleString("es-MX")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      ${inv.pricePerSeat.toLocaleString("es-MX")}
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
                            {copiedId === inv.inviteToken
                              ? "Copiado"
                              : "Copiar"}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`${
                            inv.status === "PAID"
                              ? "pointer-events-none opacity-50"
                              : "text-red-400 hover:text-red-300"
                          }`}
                          onClick={() =>
                            cancelInvite(
                              inv.inviteToken,
                              !!inv.isPool,
                              inv.status
                            )
                          }
                          aria-label="Cancelar mesa o link"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="ml-1 text-xs">
                            {inv.isPool ? "Eliminar link" : "Eliminar"}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedEventId && <TableStaffManager eventId={selectedEventId} />}
    </div>
  );
}
