"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, ExternalLink, Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TOTAL_TABLES = 162;

interface EventOption {
  id: string;
  name: string;
  hasTables: boolean;
}

interface InviteRow {
  id: string;
  tableNumber: number;
  seatNumber: number;
  invitedName: string;
  invitedEmail: string | null;
  status: string;
  pricePerSeat: number;
  url: string;
  inviteToken: string;
  expiresAt: string | null;
  createdAt: string;
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
  const [generateInvites, setGenerateInvites] = useState<
    Array<{ name: string; email: string; phone: string }>
  >([{ name: "", email: "", phone: "" }]);
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{ token: string; name: string; url: string; pricePerSeat: number; seatNumber: number }>
  >([]);

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

  const addGenerateInvite = () => {
    setGenerateInvites((p) => [...p, { name: "", email: "", phone: "" }]);
  };

  const removeGenerateInvite = (index: number) => {
    if (generateInvites.length <= 1) return;
    setGenerateInvites((p) => p.filter((_, i) => i !== index));
  };

  const updateGenerateInvite = (
    index: number,
    field: "name" | "email" | "phone",
    value: string
  ) => {
    setGenerateInvites((p) =>
      p.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv))
    );
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
    const validInvites = generateInvites.filter((inv) => inv.name.trim());
    if (validInvites.length === 0) {
      toast.error("Agrega al menos un invitado con nombre");
      return;
    }

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${tableNum}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invites: validInvites.map((inv) => ({
              name: inv.name.trim(),
              email: inv.email.trim() || undefined,
              phone: inv.phone.trim() || undefined,
            })),
          }),
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
        setGenerateInvites([{ name: "", email: "", phone: "" }]);
        setGenerateTableNumber("");
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
            &quot;Mesa&quot; / VIP. Mientras tanto puedes abrir el mapa de
            mesas del evento que elijas abajo (si luego le agregas mesas, funcionará).
          </p>
        </div>
      )}

      {/* Ir a mesas - siempre visible cuando hay eventos */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Ir a mesas y generar invites
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Abre el mapa de mesas del evento, elige una mesa disponible y usa
          &quot;Invitar grupo&quot; para generar links. O genera links desde aquí abajo.
        </p>
        <div className="flex flex-wrap items-center gap-4">
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
          <Link href={`/eventos/${selectedEventId}/mesas`} target="_blank">
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ir a mapa de mesas
            </Button>
          </Link>
        </div>
      </div>

      {/* Generar nuevos invites */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Generar nuevos invites (desde aquí)
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Elige evento, número de mesa e invitados. Cada uno recibirá un link
          para pagar su asiento. Solo funciona para eventos que tengan mesas VIP configuradas.
        </p>
        {!showGenerate ? (
          <Button
            onClick={() => {
              setShowGenerate(true);
              setGenerateEventId(eventsWithTables.length > 0 ? eventsWithTables[0].id : selectedEventId);
              setGenerateTableNumber("");
              setGenerateInvites([{ name: "", email: "", phone: "" }]);
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/80 text-sm font-medium">
                  Invitados (nombre, email, teléfono)
                </label>
                <button
                  type="button"
                  onClick={addGenerateInvite}
                  className="text-white/70 hover:text-white text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
              <div className="space-y-3">
                {generateInvites.map((inv, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap gap-2 items-start p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={inv.name}
                      onChange={(e) =>
                        updateGenerateInvite(i, "name", e.target.value)
                      }
                      className="flex-1 min-w-[120px] px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={inv.email}
                      onChange={(e) =>
                        updateGenerateInvite(i, "email", e.target.value)
                      }
                      className="flex-1 min-w-[120px] px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={inv.phone}
                      onChange={(e) =>
                        updateGenerateInvite(i, "phone", e.target.value)
                      }
                      className="flex-1 min-w-[100px] px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeGenerateInvite(i)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Quitar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
            <p className="text-white/80 font-medium mb-3">Links generados:</p>
            <div className="space-y-2">
              {generatedLinks.map((link, i) => (
                <div
                  key={link.token}
                  className="flex flex-wrap items-center gap-2 p-2 rounded bg-white/5"
                >
                  <span className="text-white/80 text-sm">
                    {link.name || `Invitado ${i + 1}`} (Mesa, asiento {link.seatNumber}) ·
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
          <Link href={`/eventos/${selectedEventId}/mesas`} target="_blank">
            <Button className="bg-white/20 text-white hover:bg-white/30">
              <Users className="w-4 h-4 mr-2" />
              Generar invites desde el mapa
            </Button>
          </Link>
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
                  <td className="py-3 px-4 text-white/80">{inv.seatNumber}</td>
                  <td className="py-3 px-4">
                    <p className="text-white/90 font-medium">{inv.invitedName}</p>
                    {inv.invitedEmail && (
                      <p className="text-xs text-white/60">{inv.invitedEmail}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        inv.status === "PAID"
                          ? "bg-green-500/20 text-green-400"
                          : inv.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-400"
                          : inv.status === "EXPIRED"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {inv.status === "PAID"
                        ? "Pagado"
                        : inv.status === "PENDING"
                        ? "Pendiente"
                        : inv.status === "EXPIRED"
                        ? "Expirado"
                        : inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/80">
                    ${inv.pricePerSeat.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white"
                      onClick={() => copyLink(inv.url, inv.id)}
                    >
                      {copiedId === inv.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="ml-1 text-xs">
                        {copiedId === inv.id ? "Copiado" : "Copiar"}
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
