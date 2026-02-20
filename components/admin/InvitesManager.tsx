"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/events", { credentials: "include" });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const withTables = data.data.filter((e: any) =>
            e.ticketTypes?.some((tt: any) => tt.isTable)
          );
          setEvents(withTables);
          if (withTables.length > 0 && !selectedEventId) {
            setSelectedEventId(withTables[0].id);
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

  if (isLoadingEvents) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando eventos...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70 mb-4">No hay eventos con mesas VIP</p>
        <p className="text-white/50 text-sm">
          Los invites de mesas solo aplican a eventos que tengan mesas
          configuradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-white/80 text-sm font-medium">
          Evento:
        </label>
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
        <Link href={`/eventos/${selectedEventId}/mesas`} target="_blank">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ir a mesas y generar invites
          </Button>
        </Link>
      </div>

      <p className="text-white/60 text-sm">
        Desde el mapa de mesas puedes elegir una mesa disponible y usar
        &quot;Invitar grupo&quot; para generar links. Aquí ves todos los links
        creados y puedes copiarlos.
      </p>

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
