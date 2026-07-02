"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CommissionRule {
  id: string;
  scope: "GLOBAL" | "ORGANIZER" | "EVENT";
  commissionType: "PERCENTAGE" | "FIXED" | "PERCENTAGE_PLUS_FIXED";
  commissionPercentage: string | null;
  commissionFixedAmount: string | null;
  isActive: boolean;
  organizer?: { id: string; businessName: string } | null;
  event?: { id: string; name: string } | null;
}

interface OrganizerOption {
  id: string;
  businessName: string;
}

interface EventOption {
  id: string;
  name: string;
}

export function CommissionsManager() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    scope: "GLOBAL" as "GLOBAL" | "ORGANIZER" | "EVENT",
    organizerId: "",
    eventId: "",
    commissionType: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "PERCENTAGE_PLUS_FIXED",
    commissionPercentage: "10",
    commissionFixedAmount: "0",
  });

  const load = async () => {
    try {
      const res = await fetch("/api/admin/commissions");
      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
        setOrganizers(data.organizers || []);
        setEvents(data.events || []);
      }
    } catch {
      toast.error("Error al cargar comisiones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: form.scope,
          organizerId: form.scope === "ORGANIZER" ? form.organizerId : undefined,
          eventId: form.scope === "EVENT" ? form.eventId : undefined,
          commissionType: form.commissionType,
          commissionPercentage: parseFloat(form.commissionPercentage) || 0,
          commissionFixedAmount: parseFloat(form.commissionFixedAmount) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Comisión creada");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      void load();
    } catch {
      toast.error("Error al actualizar comisión");
    }
  };

  if (loading) {
    return <p className="text-white/60">Cargando comisiones...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Reglas de comisión</h2>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-white/50 text-sm">No hay reglas configuradas.</p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 rounded-lg p-4"
              >
                <div>
                  <p className="text-white font-medium">
                    {rule.scope}
                    {rule.organizer ? ` — ${rule.organizer.businessName}` : ""}
                    {rule.event ? ` — ${rule.event.name}` : ""}
                  </p>
                  <p className="text-white/50 text-sm">
                    {rule.commissionType}
                    {rule.commissionPercentage ? ` ${rule.commissionPercentage}%` : ""}
                    {rule.commissionFixedAmount
                      ? ` + $${rule.commissionFixedAmount}`
                      : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(rule.id, rule.isActive)}
                >
                  {rule.isActive ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Nueva regla</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-white/70 text-sm">Alcance</span>
            <select
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
              value={form.scope}
              onChange={(e) =>
                setForm({ ...form, scope: e.target.value as typeof form.scope })
              }
            >
              <option value="GLOBAL">Global</option>
              <option value="ORGANIZER">Por organizador</option>
              <option value="EVENT">Por evento</option>
            </select>
          </label>
          {form.scope === "ORGANIZER" && (
            <label className="space-y-1">
              <span className="text-white/70 text-sm">Organizador</span>
              <select
                className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                value={form.organizerId}
                onChange={(e) => setForm({ ...form, organizerId: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {organizers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.businessName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.scope === "EVENT" && (
            <label className="space-y-1">
              <span className="text-white/70 text-sm">Evento</span>
              <select
                className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-white/70 text-sm">Tipo</span>
            <select
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
              value={form.commissionType}
              onChange={(e) =>
                setForm({
                  ...form,
                  commissionType: e.target.value as typeof form.commissionType,
                })
              }
            >
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED">Fijo</option>
              <option value="PERCENTAGE_PLUS_FIXED">Porcentaje + fijo</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-white/70 text-sm">Porcentaje (%)</span>
            <input
              type="number"
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
              value={form.commissionPercentage}
              onChange={(e) =>
                setForm({ ...form, commissionPercentage: e.target.value })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-white/70 text-sm">Monto fijo (MXN)</span>
            <input
              type="number"
              className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
              value={form.commissionFixedAmount}
              onChange={(e) =>
                setForm({ ...form, commissionFixedAmount: e.target.value })
              }
            />
          </label>
        </div>
        <Button onClick={handleCreate}>Crear regla</Button>
      </div>
    </div>
  );
}
