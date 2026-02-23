"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Plus } from "lucide-react";
import { toast } from "sonner";

const TOTAL_TABLES = 162;
const MAX_SLOTS = 100; // Límite al generar el link grupal (lo estableces tú)

interface EventOption {
  id: string;
  name: string;
  hasTables: boolean;
}

interface InviteRow {
  id: string;
  tableNumber: number;
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
  maxSlots?: number;
  paidCount?: number;
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
  const [generateTotalPrice, setGenerateTotalPrice] = useState("");
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{ token: string; name: string; url: string; pricePerSeat: number; seatNumber: number | null; maxSlots?: number; isPool?: boolean }>
  >([]);
  const [usePoolMode, setUsePoolMode] = useState(true); // Money pool: un link para toda la mesa

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/events", { credentials: "include" });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const allEvents = data.data.map((e: any) => ({
            id: e.id,
            name: e.name,
            hasTables: !!e.ticketTypes?.some((tt: any) => tt.isTable === true),
          }));
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
    const tableNum = parseInt(generateTableNumber, 10);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > TOTAL_TABLES) {
      toast.error(`Mesa debe ser entre 1 y ${TOTAL_TABLES}`);
      return;
    }
    const slots = Math.min(MAX_SLOTS, Math.max(1, generateSlots));
    const totalPrice = parseFloat(generateTotalPrice.replace(/,/g, "."));
    if (isNaN(totalPrice) || totalPrice <= 0) {
      toast.error("Precio total de la mesa debe ser mayor que 0");
      return;
    }

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const body: Record<string, unknown> = usePoolMode
        ? { slots, totalTablePrice: totalPrice, mode: "pool" }
        : { slots, totalTablePrice: totalPrice };
      const res = await fetch(
        `/api/events/${eventId}/tables/${tableNum}/invites`,
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
        <h3 className="text-lg font-bold text-white mb-4">
          Generar links de pago
        </h3>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePoolMode}
              onChange={(e) => setUsePoolMode(e.target.checked)}
              className="rounded border-white/30 bg-white/10 text-white focus:ring-white/30"
            />
            <span className="text-white/80 text-sm font-medium">
              Modo money pool
            </span>
          </label>
          <span className="text-white/50 text-xs">
            {usePoolMode
              ? "Un solo link para toda la mesa. Cada persona ingresa su nombre al pagar."
              : "Un link por asiento (cada uno con su link individual)."}
          </span>
        </div>
        <p className="text-white/60 text-sm mb-4">
          {usePoolMode
            ? "Un link compartido para toda la mesa. Compártelo en el grupo de WhatsApp y cada quien paga su parte ingresando nombre, email y teléfono al pagar. Los pagos se registran automáticamente."
            : `Evento, mesa, precio total y cuántas personas (1–${MAX_SLOTS}). Cada uno recibe su link individual.`}
        </p>
        {!showGenerate ? (
          <Button
            onClick={() => {
              setShowGenerate(true);
              setGenerateEventId(eventsWithTables.length > 0 ? eventsWithTables[0].id : selectedEventId);
              setGenerateTableNumber("");
              setGenerateSlots(5);
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
                  onChange={(e) => setGenerateEventId(e.target.value)}
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
                  Número de mesa (1–{TOTAL_TABLES}) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={TOTAL_TABLES}
                  value={generateTableNumber}
                  onChange={(e) => setGenerateTableNumber(e.target.value)}
                  placeholder="Ej: 42"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

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
                <p className="text-white/50 text-xs mt-1">
                  Se dividirá entre el número de personas.
                </p>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Cuántas personas pueden pagar (1–{MAX_SLOTS}) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_SLOTS}
                  value={generateSlots}
                  onChange={(e) =>
                    setGenerateSlots(
                      Math.min(MAX_SLOTS, Math.max(1, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="w-full max-w-[120px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <p className="text-white/50 text-xs mt-1">
                  {usePoolMode
                    ? "Máximo de pagos permitidos en este link."
                    : "Cada uno recibe un link; ingresan nombre, email y teléfono al pagar."}
                </p>
              </div>
            </div>

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
                      ? `Mesa compartida (hasta ${link.maxSlots} pagos) ·`
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
                    Mesa {inv.tableNumber}
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
                      {inv.status === "POOL" && inv.paidCount != null && inv.maxSlots != null
                        ? `${inv.paidCount}/${inv.maxSlots} pagados`
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
