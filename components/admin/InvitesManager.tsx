"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Plus } from "lucide-react";
import { toast } from "sonner";

const MAX_TRADITIONAL_SLOTS = 500;
const DEFAULT_MIN_CONFIRM = 20;

interface EventOption {
  id: string;
  name: string;
  hasTables: boolean;
  /** Asientos del tipo boleto "mesa" del evento → valor inicial al generar link compartido */
  defaultSeatsForPool: number;
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
  const [generateSplitAmong, setGenerateSplitAmong] = useState(4);
  const [generateMinConfirm, setGenerateMinConfirm] = useState(DEFAULT_MIN_CONFIRM);
  const [generateTotalPrice, setGenerateTotalPrice] = useState("");
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{
      token: string;
      name: string;
      url: string;
      pricePerSeat: number;
      seatNumber: number | null;
      maxSlots?: number | null;
      splitAmong?: number;
      minPaidToConfirm?: number;
      isPool?: boolean;
    }>
  >([]);
  const [usePoolMode, setUsePoolMode] = useState(true); // Money pool: un link para toda la mesa

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/events", { credentials: "include" });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const allEvents: EventOption[] = data.data.map((e: any) => {
            const tableTt = e.ticketTypes?.find((tt: any) => tt.isTable === true);
            const raw = tableTt?.seatsPerTable;
            const seats =
              typeof raw === "number" && raw >= 1 ? Math.min(10000, Math.floor(raw)) : 4;
            return {
              id: e.id,
              name: e.name,
              hasTables: !!tableTt,
              defaultSeatsForPool: seats,
            };
          });
          setEvents(allEvents);
          if (allEvents.length > 0 && !selectedEventId) {
            setSelectedEventId(allEvents[0].id);
          }
        }
      } catch {
        toast.error("Error al cargar eventos");
      } finally {
        setIsLoadingEvents(false);
      }
    };
    loadEvents();
  }, []);

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
    const tableSegment = encodeURIComponent(tableKey);
    const slots = Math.min(MAX_TRADITIONAL_SLOTS, Math.max(1, generateSlots));
    const totalPrice = parseFloat(generateTotalPrice.replace(/,/g, "."));
    if (isNaN(totalPrice) || totalPrice <= 0) {
      toast.error("Precio total de la mesa debe ser mayor que 0");
      return;
    }

    if (usePoolMode) {
      const splitAmong = Math.floor(Number(generateSplitAmong));
      const minC = Math.floor(Number(generateMinConfirm));
      if (!Number.isFinite(splitAmong) || splitAmong < 1 || splitAmong > 10000) {
        toast.error('"Dividir precio entre" debe ser un número entre 1 y 10000.');
        return;
      }
      if (!Number.isFinite(minC) || minC < 1 || minC > 10000) {
        toast.error('"Pagos para confirmar" debe ser entre 1 y 10000.');
        return;
      }
    }

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const body: Record<string, unknown> = usePoolMode
        ? {
            totalTablePrice: totalPrice,
            mode: "pool",
            splitAmong: Math.floor(Number(generateSplitAmong)),
            minPaidToConfirm: Math.floor(Number(generateMinConfirm)),
          }
        : { slots, totalTablePrice: totalPrice };
      const res = await fetch(
        `/api/events/${eventId}/tables/${tableSegment}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar invites");
      }

      if (data.success && data.data?.invites) {
        setGeneratedLinks(data.data.invites);
        setSelectedEventId(eventId);
        setShowGenerate(false);
        setGenerateTableNumber("");
        setGenerateTotalPrice("");
        toast.success("Links generados. Cópialos y compártelos.");
        // Refrescar lista de invites
        const invRes = await fetch(`/api/admin/events/${eventId}/invites`, {
          credentials: "include",
        });
        const invData = await invRes.json();
        if (invData.success && invData.data?.invites) {
          setInvites(invData.data.invites);
        }
      } else {
        throw new Error("No se recibieron los links");
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
                if (ev?.hasTables) {
                  if (v) setGenerateSplitAmong(ev.defaultSeatsForPool);
                  else
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
            onClick={() => {
              const pick =
                eventsWithTables.find((e) => e.id === selectedEventId) ||
                eventsWithTables[0];
              const eid = pick?.id || selectedEventId;
              setShowGenerate(true);
              setGenerateEventId(eid);
              setGenerateTableNumber("");
              setGenerateSlots(Math.min(MAX_TRADITIONAL_SLOTS, Math.max(1, pick?.defaultSeatsForPool ?? 5)));
              setGenerateSplitAmong(pick?.defaultSeatsForPool ?? 4);
              setGenerateMinConfirm(DEFAULT_MIN_CONFIRM);
              setGenerateTotalPrice("");
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
                    if (ev?.hasTables) {
                      setGenerateSplitAmong(ev.defaultSeatsForPool);
                      if (!usePoolMode) {
                        setGenerateSlots(
                          Math.min(
                            MAX_TRADITIONAL_SLOTS,
                            Math.max(1, ev.defaultSeatsForPool)
                          )
                        );
                      }
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
                  Nombre o número de mesa *
                </label>
                <input
                  type="text"
                  value={generateTableNumber}
                  onChange={(e) => setGenerateTableNumber(e.target.value)}
                  placeholder="Ej: 42, Terraza A, VIP Norte…"
                  required
                  maxLength={120}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            {usePoolMode ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-4">
                <p className="text-white/55 text-xs leading-relaxed">
                  <strong className="text-white/75">Cómo se calcula cada pago:</strong> precio total de la mesa ÷ número de
                  partes. Ese número suele coincidir con los asientos por mesa del evento (ahora{" "}
                  <strong className="text-white/90">{seatsDefaultForEventId(generateEventId)}</strong>), pero puedes
                  cambiarlo si esta mesa es más grande. El link puede recibir más pagos de los que indiques aquí; no hay
                  tope.
                </p>
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
                    className="w-full max-w-xs px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-1">
                      Partes para dividir el precio *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={generateSplitAmong}
                      onChange={(e) =>
                        setGenerateSplitAmong(
                          Math.min(10000, Math.max(1, parseInt(e.target.value, 10) || 1))
                        )
                      }
                      className="w-full max-w-[140px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <button
                      type="button"
                      className="mt-2 text-xs text-[#7BA3E8] hover:underline"
                      onClick={() =>
                        setGenerateSplitAmong(seatsDefaultForEventId(generateEventId))
                      }
                    >
                      Usar asientos del evento ({seatsDefaultForEventId(generateEventId)})
                    </button>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-1">
                      Pagos para marcar mesa confirmada *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={generateMinConfirm}
                      onChange={(e) =>
                        setGenerateMinConfirm(
                          Math.min(10000, Math.max(1, parseInt(e.target.value, 10) || 1))
                        )
                      }
                      className="w-full max-w-[140px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <p className="text-white/45 text-xs mt-1">En la tabla verás &quot;confirmada&quot; al llegar aquí.</p>
                  </div>
                </div>
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
                      ? `Mesa compartida (precio ÷ ${link.splitAmong ?? "—"}${
                          link.minPaidToConfirm != null
                            ? ` · confirmar con ${link.minPaidToConfirm} pagos`
                            : ""
                        }) ·`
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
                    {inv.tableNumber}
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
                          ? `${inv.paidCount}/${inv.minPaidToConfirm} para confirmar`
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
                  <td className="py-3 px-4 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
