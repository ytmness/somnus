"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  artist: string;
  tour: string | null;
  venue: string;
  address: string | null;
  eventDate: string;
  eventTime: string;
  imageUrl: string | null;
  maxCapacity: number;
  isActive: boolean;
  salesStartDate: string;
  salesEndDate: string;
}

interface EditEventModalProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function toDateStr(d: string | Date): string {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalStr(d: string | Date): string {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditEventModal({
  eventId,
  onClose,
  onSuccess,
}: EditEventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    artist: "",
    tour: "",
    venue: "",
    address: "",
    eventDate: "",
    eventTime: "",
    imageUrl: "",
    maxCapacity: 0,
    salesStartDate: "",
    salesEndDate: "",
  });

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Error al cargar evento");
        }
        const e: EventData = json.data;
        setFormData({
          name: e.name,
          description: e.description || "",
          artist: e.artist,
          tour: e.tour || "",
          venue: e.venue,
          address: e.address || "",
          eventDate: toDateStr(e.eventDate),
          eventTime: e.eventTime,
          imageUrl: e.imageUrl || "",
          maxCapacity: e.maxCapacity,
          salesStartDate: toDateTimeLocalStr(e.salesStartDate),
          salesEndDate: toDateTimeLocalStr(e.salesEndDate),
        });
      } catch (err: any) {
        toast.error(err.message || "Error al cargar evento");
        onClose();
      } finally {
        setIsFetching(false);
      }
    };
    void loadEvent();
  }, [eventId, onClose]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "maxCapacity" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!formData.name || !formData.artist || !formData.venue) {
        throw new Error("Completa todos los campos obligatorios");
      }
      if (!formData.eventDate || !formData.eventTime) {
        throw new Error("Especifica la fecha y hora del evento");
      }

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          maxCapacity: formData.maxCapacity,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar evento");
      }
      toast.success("Evento actualizado");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#2a2c30] rounded-xl border border-regia-gold/20 p-8">
          <p className="text-white">Cargando evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2a2c30] rounded-xl border border-regia-gold/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#2a2c30] border-b border-regia-gold/20 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Editar Evento</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Información del Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Nombre del Evento *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Artista *
                </label>
                <input
                  type="text"
                  name="artist"
                  value={formData.artist}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Tour (opcional)
                </label>
                <input
                  type="text"
                  name="tour"
                  value={formData.tour}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Venue *
                </label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Fecha del Evento *
                </label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  name="eventTime"
                  value={formData.eventTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Capacidad Máxima *
                </label>
                <input
                  type="number"
                  name="maxCapacity"
                  value={formData.maxCapacity}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  URL de Imagen
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Inicio de Ventas *
                </label>
                <input
                  type="datetime-local"
                  name="salesStartDate"
                  value={formData.salesStartDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Fin de Ventas *
                </label>
                <input
                  type="datetime-local"
                  name="salesEndDate"
                  value={formData.salesEndDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-regia-gold/20">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-white/30 text-white bg-transparent hover:bg-white/10"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="regia-button-primary"
              disabled={isLoading}
            >
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
