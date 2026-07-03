"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TableStaff = {
  id: string;
  tableNumber: string | null;
  user: { email: string; name: string };
};

interface TableStaffManagerProps {
  eventId: string;
}

export function TableStaffManager({ eventId }: TableStaffManagerProps) {
  const [staff, setStaff] = useState<TableStaff[]>([]);
  const [email, setEmail] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/table-staff`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setStaff(data.data || []);
    } catch {
      toast.error("Error al cargar anfitriones");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !tableNumber.trim()) return;
    try {
      const res = await fetch(`/api/events/${eventId}/table-staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tableNumber: tableNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success("Anfitrión asignado");
      setEmail("");
      setTableNumber("");
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleRemove = async (membershipId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/table-staff?membershipId=${membershipId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Error");
      void load();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  if (loading) return <p className="text-white/60 text-sm">Cargando anfitriones...</p>;

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
      <h4 className="text-white font-medium">Anfitriones de mesa (MESA_HOST)</h4>
      <form onSubmit={handleAssign} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          placeholder="Email del anfitrión"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
        />
        <input
          required
          placeholder="Nº mesa"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          className="w-28 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium"
        >
          Asignar
        </button>
      </form>
      {staff.length > 0 && (
        <ul className="space-y-2 text-sm">
          {staff.map((s) => (
            <li
              key={s.id}
              className="flex justify-between items-center text-white/80 py-1"
            >
              <span>
                Mesa {s.tableNumber} — {s.user.name} ({s.user.email})
              </span>
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-red-400 text-xs"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
