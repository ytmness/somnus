"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";

type Venue = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  isActive: boolean;
  organizer?: { businessName: string };
  _count?: { events: number };
};

interface VenuesManagerProps {
  showOrganizer?: boolean;
}

export function VenuesManager({ showOrganizer = false }: VenuesManagerProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    capacity: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/venues", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setVenues(data.data || []);
    } catch {
      toast.error("Error al cargar venues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address || undefined,
          city: form.city || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success("Venue creado");
      setForm({ name: "", address: "", city: "", capacity: "" });
      setShowForm(false);
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/venues", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Error");
      void load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  if (loading) {
    return <p className="text-white/60">Cargando venues...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Recintos (Venues)
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo venue
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="liquid-glass p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            placeholder="Nombre del recinto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          />
          <input
            placeholder="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          />
          <input
            placeholder="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white md:col-span-2"
          />
          <input
            type="number"
            placeholder="Capacidad"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          />
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500"
          >
            Guardar
          </button>
        </form>
      )}

      {venues.length === 0 ? (
        <p className="text-white/50">No hay venues registrados.</p>
      ) : (
        <div className="overflow-x-auto liquid-glass p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="text-left py-2">Nombre</th>
                {showOrganizer && <th className="text-left py-2">Organizador</th>}
                <th className="text-left py-2">Ciudad</th>
                <th className="text-left py-2">Eventos</th>
                <th className="text-left py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id} className="border-b border-white/5 text-white/90">
                  <td className="py-3">
                    <div>{v.name}</div>
                    {v.address && (
                      <div className="text-white/50 text-xs">{v.address}</div>
                    )}
                  </td>
                  {showOrganizer && (
                    <td>{v.organizer?.businessName || "—"}</td>
                  )}
                  <td>{v.city || "—"}</td>
                  <td>{v._count?.events ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleActive(v.id, v.isActive)}
                      className={v.isActive ? "text-green-400" : "text-red-400"}
                    >
                      {v.isActive ? "Activo" : "Inactivo"}
                    </button>
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
