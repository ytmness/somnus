"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { formatEventCalendarDate } from "@/lib/utils";
import { EditEventModal } from "./EditEventModal";

interface Event {
  id: string;
  name: string;
  artist: string;
  venue: string;
  eventDate: string;
  isActive: boolean;
  isFeatured: boolean;
  organizer?: { id: string; businessName: string } | null;
  organization?: { id: string; name: string } | null;
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    maxQuantity: number;
    soldQuantity: number;
    isTable?: boolean;
  }[];
}

interface EventsTableProps {
  initialOrganizerFilter?: string;
}

export function EventsTable({ initialOrganizerFilter = "all" }: EventsTableProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [organizerFilter, setOrganizerFilter] = useState<string>(initialOrganizerFilter);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    setOrganizerFilter(initialOrganizerFilter);
  }, [initialOrganizerFilter]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events", { credentials: "include" });
      const data = await response.json();
      if (data.success) setEvents(data.data);
    } catch {
      toast.error("Error al cargar eventos");
    } finally {
      setIsLoading(false);
    }
  };

  const organizerOptions = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => {
      if (e.organizer) map.set(e.organizer.id, e.organizer.businessName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (organizerFilter === "all") return events;
    if (organizerFilter === "platform") {
      return events.filter((e) => !e.organizer);
    }
    return events.filter((e) => e.organizer?.id === organizerFilter);
  }, [events, organizerFilter]);

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${eventName}"?`)) return;
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Evento eliminado");
      loadEvents();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar evento");
    }
  };

  const patchEvent = async (eventId: string, body: Record<string, boolean>) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Error al actualizar");
  };

  const toggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      await patchEvent(eventId, { isActive: !currentStatus });
      toast.success(currentStatus ? "Evento despublicado" : "Evento publicado");
      loadEvents();
    } catch {
      toast.error("Error al actualizar evento");
    }
  };

  const toggleFeatured = async (eventId: string, current: boolean) => {
    try {
      await patchEvent(eventId, { isFeatured: !current });
      toast.success(current ? "Quitado del hero" : "Destacado en hero");
      loadEvents();
    } catch {
      toast.error("Error al actualizar destacado");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-white/70 text-sm">Filtrar por organizador:</label>
        <select
          value={organizerFilter}
          onChange={(e) => setOrganizerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
        >
          <option value="all" className="bg-[#2a2c30]">Todos</option>
          <option value="platform" className="bg-[#2a2c30]">Plataforma (sin organizador)</option>
          {organizerOptions.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#2a2c30]">
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70">No hay eventos con este filtro</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-regia-gold/20">
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Evento</th>
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Organizador</th>
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Fecha</th>
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Boletos</th>
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Estado</th>
                <th className="text-left py-4 px-4 text-white/90 font-semibold">Hero</th>
                <th className="text-right py-4 px-4 text-white/90 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => {
                const totalTickets = event.ticketTypes.reduce(
                  (sum, tt) => sum + tt.maxQuantity,
                  0
                );
                const soldTickets = event.ticketTypes.reduce(
                  (sum, tt) => sum + tt.soldQuantity,
                  0
                );

                return (
                  <tr
                    key={event.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="text-white font-medium">{event.name}</p>
                      <p className="text-white/50 text-xs">{event.venue}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white/80 text-sm">
                        {event.organization?.name || event.organizer?.businessName || "Plataforma"}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white/80">
                        {formatEventCalendarDate(event.eventDate)}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white/80">
                        {soldTickets} / {totalTickets}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleActive(event.id, event.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {event.isActive ? "Publicado" : "Borrador"}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleFeatured(event.id, event.isFeatured)}
                        className={`p-2 rounded ${
                          event.isFeatured
                            ? "text-yellow-400"
                            : "text-white/30 hover:text-white/60"
                        }`}
                        title={event.isFeatured ? "Quitar del hero" : "Destacar en hero"}
                      >
                        <Star className={`w-4 h-4 ${event.isFeatured ? "fill-current" : ""}`} />
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/eventos/${event.id}/boletos`}>
                          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-regia-gold hover:text-regia-gold/80"
                          onClick={() => setEditingEventId(event.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(event.id, event.name)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {editingEventId && (
        <EditEventModal
          eventId={editingEventId}
          onClose={() => setEditingEventId(null)}
          onSuccess={() => {
            setEditingEventId(null);
            loadEvents();
          }}
        />
      )}
    </div>
  );
}
