"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus } from "lucide-react";

const ROLES = [
  "VENDEDOR",
  "SUPERVISOR",
  "ACCESOS",
  "VENUE_MANAGER",
  "MESA_HOST",
] as const;

const SCOPES = [
  "PLATFORM",
  "ORGANIZER",
  "ORGANIZATION",
  "VENUE",
  "EVENT",
  "TABLE",
] as const;

const ROLE_LABELS: Record<string, string> = {
  VENDEDOR: "Vendedor",
  SUPERVISOR: "Supervisor",
  ACCESOS: "Accesos",
  VENUE_MANAGER: "Gestor venue",
  MESA_HOST: "Anfitrión mesa",
};

type Membership = {
  id: string;
  role: string;
  scope: string;
  tableNumber: string | null;
  isActive: boolean;
  user: { email: string; name: string; role: string };
  event?: { name: string } | null;
  venue?: { name: string } | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  scope: string;
  token: string;
  expiresAt: string;
};

interface StaffManagerProps {
  mode: "admin" | "organizer";
}

export function StaffManager({ mode }: StaffManagerProps) {
  const apiBase = mode === "admin" ? "/api/admin/staff" : "/api/organizers/staff";
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "ACCESOS" as (typeof ROLES)[number],
    scope: (mode === "admin" ? "PLATFORM" : "ORGANIZER") as (typeof SCOPES)[number],
    tableNumber: "",
    eventId: "",
    venueId: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setMemberships(data.data || []);
        setPendingInvites(data.pendingInvites || []);
      }
    } catch {
      toast.error("Error al cargar equipo");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
          scope: form.scope,
          eventId: form.eventId || undefined,
          venueId: form.venueId || undefined,
          tableNumber: form.tableNumber || undefined,
          inviteOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      const url = `${window.location.origin}${data.inviteUrl}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Invitación creada. Enlace copiado al portapapeles.");
      setForm((f) => ({ ...f, email: "", tableNumber: "", eventId: "", venueId: "" }));
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(apiBase, {
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

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    try {
      const res = await fetch(`${apiBase}?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error");
      toast.success("Eliminado");
      void load();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const scopeOptions =
    mode === "admin"
      ? SCOPES
      : SCOPES.filter((s) => s !== "PLATFORM");

  if (loading) {
    return <p className="text-white/60">Cargando equipo...</p>;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleInvite} className="liquid-glass p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invitar al equipo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          />
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as (typeof ROLES)[number] })
            }
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="bg-gray-900">
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={form.scope}
            onChange={(e) =>
              setForm({ ...form, scope: e.target.value as (typeof SCOPES)[number] })
            }
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          >
            {scopeOptions.map((s) => (
              <option key={s} value={s} className="bg-gray-900">
                {s}
              </option>
            ))}
          </select>
          {form.scope === "TABLE" && (
            <input
              placeholder="Número de mesa"
              value={form.tableNumber}
              onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
          )}
          {(form.scope === "EVENT" || form.scope === "TABLE") && (
            <input
              placeholder="ID evento (opcional)"
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
          )}
          {form.scope === "VENUE" && (
            <input
              placeholder="ID venue (opcional)"
              value={form.venueId}
              onChange={(e) => setForm({ ...form, venueId: e.target.value })}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 rounded-xl bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Crear invitación"}
        </button>
      </form>

      {pendingInvites.length > 0 && (
        <div className="liquid-glass p-6">
          <h3 className="text-white font-semibold mb-4">Invitaciones pendientes</h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between text-sm text-white/80 py-2 border-b border-white/10"
              >
                <span>
                  {inv.email} — {ROLE_LABELS[inv.role]} ({inv.scope})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/invitacion/${inv.token}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Enlace copiado");
                  }}
                  className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copiar link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="liquid-glass p-6 overflow-x-auto">
        <h3 className="text-white font-semibold mb-4">Miembros del equipo</h3>
        {memberships.length === 0 ? (
          <p className="text-white/50">Sin asignaciones aún.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="text-left py-2">Usuario</th>
                <th className="text-left py-2">Rol</th>
                <th className="text-left py-2">Alcance</th>
                <th className="text-left py-2">Detalle</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-right py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id} className="border-b border-white/5 text-white/90">
                  <td className="py-3">
                    <div>{m.user.name}</div>
                    <div className="text-white/50 text-xs">{m.user.email}</div>
                  </td>
                  <td>{ROLE_LABELS[m.role] || m.role}</td>
                  <td>{m.scope}</td>
                  <td className="text-white/60 text-xs">
                    {m.event?.name || m.venue?.name || m.tableNumber || "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleActive(m.id, m.isActive)}
                      className={
                        m.isActive ? "text-green-400" : "text-red-400"
                      }
                    >
                      {m.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
