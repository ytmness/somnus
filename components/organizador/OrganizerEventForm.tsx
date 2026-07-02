"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  TicketPricePhasesFields,
  type PricePhaseFormRow,
} from "@/components/admin/TicketPricePhasesFields";

interface TicketType {
  name: string;
  description: string;
  category: "GENERAL" | "PREFERENTE" | "VIP";
  price: number;
  maxQuantity: number;
  isTable: boolean;
  seatsPerTable?: number;
  pricePhases: PricePhaseFormRow[];
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface OrganizerEventFormProps {
  organizations: OrganizationOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function OrganizerEventForm({
  organizations,
  onClose,
  onSuccess,
}: OrganizerEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || "");

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

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: "General",
      description: "Acceso general al evento",
      category: "GENERAL",
      price: 0,
      maxQuantity: 0,
      isTable: false,
      pricePhases: [],
    },
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name, value } = target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "maxCapacity" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleTicketTypeChange = (
    index: number,
    field: keyof TicketType,
    value: unknown
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
        pricePhases: [],
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
    if (!organizationId) {
      toast.error("Selecciona una organización");
      return;
    }
    setIsLoading(true);

    try {
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
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          organizationId,
          maxCapacity: parseInt(formData.maxCapacity.toString()),
          ticketTypes: ticketTypes.map((tt) => ({
            name: tt.name,
            description: tt.description,
            category: tt.category,
            price: tt.price,
            maxQuantity: tt.maxQuantity,
            isTable: false,
            ...(tt.pricePhases.length > 0
              ? {
                  pricePhases: tt.pricePhases.map((p, i) => ({
                    price: p.price,
                    startsAt: new Date(p.startsAt).toISOString(),
                    endsAt: new Date(p.endsAt).toISOString(),
                    label: p.label || undefined,
                    sortOrder: i,
                  })),
                }
              : {}),
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === "STRIPE_REQUIRED" || data.code === "ORG_REQUIRED") {
          toast.error(data.error);
          onClose();
          return;
        }
        throw new Error(data.error || "Error al crear evento");
      }

      toast.success("Evento publicado");
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al crear evento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2a2c30] rounded-xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#2a2c30] border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Crear evento</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Organización *
            </label>
            <select
              name="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none"
              required
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id} className="bg-[#2a2c30]">
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Nombre *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Artista *</label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Venue *</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Fecha *</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Hora *</label>
              <input
                type="time"
                name="eventTime"
                value={formData.eventTime}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Capacidad *</label>
              <input
                type="number"
                name="maxCapacity"
                value={formData.maxCapacity}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Inicio ventas *</label>
              <input
                type="datetime-local"
                name="salesStartDate"
                value={formData.salesStartDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Fin ventas *</label>
              <input
                type="datetime-local"
                name="salesEndDate"
                value={formData.salesEndDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                required
              />
            </div>
            <div className="md:col-span-2">
              <ImageUploadField
                value={formData.imageUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tipos de boleto</h3>
              <Button type="button" onClick={addTicketType} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
            <div className="space-y-4">
              {ticketTypes.map((tt, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={tt.name}
                      onChange={(e) => handleTicketTypeChange(index, "name", e.target.value)}
                      placeholder="Nombre"
                      className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                      required
                    />
                    <select
                      value={tt.category}
                      onChange={(e) =>
                        handleTicketTypeChange(index, "category", e.target.value)
                      }
                      className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                    >
                      <option value="GENERAL">General</option>
                      <option value="PREFERENTE">Preferente</option>
                      <option value="VIP">VIP</option>
                    </select>
                    <input
                      type="number"
                      value={tt.price}
                      onChange={(e) =>
                        handleTicketTypeChange(index, "price", parseFloat(e.target.value) || 0)
                      }
                      placeholder="Precio"
                      className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                      min={0}
                      step={0.01}
                      required
                    />
                    <input
                      type="number"
                      value={tt.maxQuantity}
                      onChange={(e) =>
                        handleTicketTypeChange(
                          index,
                          "maxQuantity",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="Cantidad"
                      className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm"
                      min={1}
                      required
                    />
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(index)}
                        className="text-red-400 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <TicketPricePhasesFields
                    phases={tt.pricePhases}
                    onChange={(next) => handleTicketTypeChange(index, "pricePhases", next)}
                    defaultPriceHint={tt.price}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Publicando..." : "Publicar evento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
