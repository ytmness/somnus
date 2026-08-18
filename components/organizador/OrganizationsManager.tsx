"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { OrganizationProfileEditor } from "./OrganizationProfileEditor";
import { OrganizationPostComposer } from "./OrganizationPostComposer";

interface Organization {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        Crea marcas con perfil público, publicaciones y mensajes con tus seguidores.
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
        <div className="space-y-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="border border-white/10 rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 p-4">
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
                        {org.slug && ` · /organizaciones/${org.slug}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expandedId === org.id ? null : org.id)
                        }
                        className="text-white/60 hover:text-white"
                      >
                        {expandedId === org.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {expandedId === org.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                  <OrganizationProfileEditor
                    organization={{
                      id: org.id,
                      name: org.name,
                      slug: org.slug ?? org.id,
                      description: org.description,
                      logoUrl: org.logoUrl ?? null,
                      bannerUrl: org.bannerUrl ?? null,
                      websiteUrl: org.websiteUrl ?? null,
                      instagramUrl: org.instagramUrl ?? null,
                    }}
                    onSaved={onRefresh}
                  />
                  <OrganizationPostComposer
                    organizationId={org.id}
                    onPosted={onRefresh}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
