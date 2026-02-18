"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TicketType {
  name: string;
  description: string;
  category: "GENERAL" | "PREFERENTE" | "VIP";
  price: number;
  maxQuantity: number;
  isTable: boolean;
  seatsPerTable?: number;
}

interface CreateEventModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventModal({ onClose, onSuccess }: CreateEventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Datos del evento
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

  // Tipos de boletos
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: "General",
      description: "Acceso general al evento",
      category: "GENERAL",
      price: 0,
      maxQuantity: 0,
      isTable: false,
    },
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, value } = target;
    const isCheckbox = target.type === "checkbox";
    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox
        ? (target as HTMLInputElement).checked
        : name === "maxCapacity"
          ? parseInt(value, 10) || 0
          : value,
    }));
  };

  const handleTicketTypeChange = (
    index: number,
    field: keyof TicketType,
    value: any
  ) => {
    setTicketTypes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        category: "GENERAL",
        price: 0,
        maxQuantity: 0,
        isTable: false,
      },
    ]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length === 1) {
      toast.error("Debe haber al menos un tipo de boleto");
      return;
    }
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validaciones básicas
      if (!formData.name || !formData.artist || !formData.venue) {
        throw new Error("Completa todos los campos obligatorios");
      }

      if (!formData.eventDate || !formData.eventTime) {
        throw new Error("Especifica la fecha y hora del evento");
      }

      if (ticketTypes.some((tt) => !tt.name || tt.price <= 0 || tt.maxQuantity <= 0)) {
        throw new Error("Completa todos los tipos de boleto correctamente");
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxCapacity: parseInt(formData.maxCapacity.toString()),
          ticketTypes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear evento");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2a2c30] rounded-xl border border-regia-gold/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#2a2c30] border-b border-regia-gold/20 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Crear Nuevo Evento</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
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
                  placeholder="Ej: Víctor Mendivil en Concierto"
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
                  placeholder="Ej: Víctor Mendivil"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  placeholder="Ej: Gira 2025"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  placeholder="Ej: Arena Monterrey"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  placeholder="Av. Fundidora, Monterrey, NL"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold"
                  placeholder="5000"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  URL de Imagen (opcional)
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                  placeholder="https://..."
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold"
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
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold resize-none"
                  placeholder="Descripción del evento..."
                />
              </div>
            </div>
          </div>

          {/* Tipos de Boleto */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Tipos de Boleto
              </h3>
              <Button
                type="button"
                onClick={addTicketType}
                variant="outline"
                size="sm"
                className="border-regia-gold/50 text-regia-gold hover:bg-regia-gold hover:text-regia-dark"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Tipo
              </Button>
            </div>

            <div className="space-y-4">
              {ticketTypes.map((ticketType, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-regia-gold/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">
                      Tipo de Boleto #{index + 1}
                    </h4>
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

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
                        placeholder="Ej: General A"
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
                            e.target.value as "GENERAL" | "PREFERENTE" | "VIP"
                          )
                        }
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
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                        placeholder="850"
                        required
                        min="0"
                        step="0.01"
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
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                        placeholder="350"
                        required
                        min="1"
                      />
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
                          value={ticketType.seatsPerTable || 4}
                          onChange={(e) =>
                            handleTicketTypeChange(
                              index,
                              "seatsPerTable",
                              parseInt(e.target.value) || 4
                            )
                          }
                          className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white focus:outline-none focus:border-regia-gold text-sm"
                          placeholder="4"
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
                        value={ticketType.description}
                        onChange={(e) =>
                          handleTicketTypeChange(
                            index,
                            "description",
                            e.target.value
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

          {/* Botones */}
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
              {isLoading ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

