"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { events: number };
}

interface OrganizationsManagerProps {
  organizations: Organization[];
  onRefresh: () => void;
}

export function OrganizationsManager({
  organizations,
  onRefresh,
}: OrganizationsManagerProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Organización creada");
      setName("");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Nombre actualizado");
      setEditingId(null);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <section className="somnus-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">Mis organizaciones</h2>
      <p className="text-white/60 text-sm">
        Crea marcas o nombres bajo los que publicarás eventos. Todas comparten tu cuenta de Stripe.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la organización"
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear
        </button>
      </form>

      {organizations.length === 0 ? (
        <p className="text-white/50 text-sm py-4">
          Aún no tienes organizaciones. Crea una para poder publicar eventos.
        </p>
      ) : (
        <div className="space-y-2">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="flex items-center justify-between gap-3 border border-white/10 rounded-lg p-4"
            >
              {editingId === org.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(org.id)}
                    className="text-green-400 hover:text-green-300"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-white/50 text-xs">
                      {org._count?.events ?? 0} evento(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(org.id);
                      setEditName(org.name);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
