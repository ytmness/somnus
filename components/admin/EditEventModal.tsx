"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface TicketTypeData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  maxQuantity: number;
  soldQuantity: number;
  isTable: boolean;
  seatsPerTable: number | null;
}

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
  ticketTypes?: TicketTypeData[];
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
  const [ticketTypes, setTicketTypes] = useState<TicketTypeData[]>([]);

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
        setTicketTypes(
          (e.ticketTypes || []).map((tt) => ({
            id: tt.id,
            name: tt.name,
            description: tt.description || null,
            category: tt.category,
            price: typeof tt.price === "number" ? tt.price : Number(tt.price),
            maxQuantity: tt.maxQuantity,
            soldQuantity: tt.soldQuantity ?? 0,
            isTable: tt.isTable ?? false,
            seatsPerTable: tt.seatsPerTable ?? null,
          }))
        );
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

  const handleTicketTypeChange = (
    index: number,
    field: keyof TicketTypeData,
    value: string | number | boolean | null
  ) => {
    setTicketTypes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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
      if (
        ticketTypes.some(
          (tt) => !tt.name || tt.price <= 0 || tt.maxQuantity < 0
        )
      ) {
        throw new Error("Revisa los tipos de boleto: nombre, precio y cantidad");
      }
      ticketTypes.forEach((tt) => {
        if (tt.maxQuantity < tt.soldQuantity) {
          throw new Error(
            `"${tt.name}": la cantidad no puede ser menor que los vendidos (${tt.soldQuantity})`
          );
        }
      });

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          maxCapacity: formData.maxCapacity,
          ticketTypes: ticketTypes.map((tt) => ({
            id: tt.id,
            name: tt.name,
            description: tt.description || undefined,
            category: tt.category,
            price: tt.price,
            maxQuantity: tt.maxQuantity,
            isTable: tt.isTable,
            seatsPerTable: tt.seatsPerTable ?? undefined,
          })),
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

          {/* Tipos de Boleto */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Tipos de Boleto
            </h3>
            <div className="space-y-4">
              {ticketTypes.map((ticketType, index) => (
                <div
                  key={ticketType.id}
                  className="bg-white/5 border border-regia-gold/20 rounded-lg p-4"
                >
                  <h4 className="text-white font-medium mb-4">
                    {ticketType.name}
                    {ticketType.soldQuantity > 0 && (
                      <span className="text-white/60 text-sm ml-2">
                        ({ticketType.soldQuantity} vendidos)
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={ticketType.name}
                        onChange={(e) =>
                          handleTicketTypeChange(index, "name", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Categoría *
                      </label>
                      <select
                        value={ticketType.category}
                        onChange={(e) =>
                          handleTicketTypeChange(
                            index,
                            "category",
                            e.target.value
                          )}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                        required
                      >
                        <option value="GENERAL">General</option>
                        <option value="PREFERENTE">Preferente</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Precio (MXN) *
                      </label>
                      <input
                        type="number"
                        value={ticketType.price}
                        onChange={(e) =>
                          handleTicketTypeChange(
                            index,
                            "price",
                            parseFloat(e.target.value) || 0
                          )}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Cantidad Máxima *
                      </label>
                      <input
                        type="number"
                        value={ticketType.maxQuantity}
                        onChange={(e) =>
                          handleTicketTypeChange(
                            index,
                            "maxQuantity",
                            parseInt(e.target.value) || 0
                          )}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                        min={ticketType.soldQuantity}
                        required
                      />
                      {ticketType.soldQuantity > 0 && (
                        <p className="text-xs text-white/60 mt-1">
                          Mínimo: {ticketType.soldQuantity} (vendidos)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-white/90 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticketType.isTable}
                          onChange={(e) =>
                            handleTicketTypeChange(
                              index,
                              "isTable",
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 rounded border-regia-gold/30 bg-white/10 text-regia-gold focus:ring-regia-gold"
                        />
                        ¿Es Mesa VIP?
                      </label>
                      {ticketType.isTable && (
                        <input
                          type="number"
                          value={ticketType.seatsPerTable ?? 4}
                          onChange={(e) =>
                            handleTicketTypeChange(
                              index,
                              "seatsPerTable",
                              parseInt(e.target.value) || 4
                            )
                          }
                          className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                          min="2"
                        />
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={ticketType.description || ""}
                        onChange={(e) =>
                          handleTicketTypeChange(
                            index,
                            "description",
                            e.target.value || null
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold text-sm"
                        placeholder="Ej: De pie, cerca del escenario"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
