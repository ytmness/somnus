"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Event {
  id: string;
  name: string;
  artist: string;
  venue: string;
  eventDate: string;
  isActive: boolean;
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    maxQuantity: number;
    soldQuantity: number;
  }[];
}

export function EventsTable() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      toast.error("Error al cargar eventos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${eventName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Evento eliminado");
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar evento");
    }
  };

  const toggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar");
      }

      toast.success(
        currentStatus ? "Evento desactivado" : "Evento activado"
      );
      loadEvents();
    } catch (error) {
      toast.error("Error al actualizar evento");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando eventos...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70 mb-4">No hay eventos registrados</p>
        <p className="text-white/50 text-sm">
          Crea tu primer evento haciendo clic en "Crear Evento"
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-regia-gold/20">
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Evento
            </th>
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Artista
            </th>
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Venue
            </th>
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Fecha
            </th>
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Boletos
            </th>
            <th className="text-left py-4 px-4 text-white/90 font-semibold">
              Estado
            </th>
            <th className="text-right py-4 px-4 text-white/90 font-semibold">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
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
                </td>
                <td className="py-4 px-4">
                  <p className="text-white/80">{event.artist}</p>
                </td>
                <td className="py-4 px-4">
                  <p className="text-white/80">{event.venue}</p>
                </td>
                <td className="py-4 px-4">
                  <p className="text-white/80">
                    {formatDate(new Date(event.eventDate))}
                  </p>
                </td>
                <td className="py-4 px-4">
                  <p className="text-white/80">
                    {soldTickets} / {totalTickets}
                  </p>
                  <p className="text-xs text-white/60">
                    {((soldTickets / totalTickets) * 100).toFixed(0)}% vendido
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
                    {event.isActive ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-regia-gold hover:text-regia-gold/80"
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
  );
}

