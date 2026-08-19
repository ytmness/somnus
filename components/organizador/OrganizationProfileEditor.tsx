"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Upload } from "lucide-react";
import { uploadHttpErrorMessage } from "@/lib/storage/upload-image-validation";

export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
}

interface OrganizationProfileEditorProps {
  organization: OrganizationProfile;
  onSaved: () => void;
}

export function OrganizationProfileEditor({
  organization,
  onSaved,
}: OrganizationProfileEditorProps) {
  const [form, setForm] = useState({
    name: organization.name,
    slug: organization.slug,
    description: organization.description ?? "",
    logoUrl: organization.logoUrl ?? "",
    bannerUrl: organization.bannerUrl ?? "",
    websiteUrl: organization.websiteUrl ?? "",
    instagramUrl: organization.instagramUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const uploadImage = async (file: File, field: "logoUrl" | "bannerUrl") => {
    setUploading(field === "logoUrl" ? "logo" : "banner");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("organizationId", organization.id);
      const res = await fetch("/api/upload/org-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(uploadHttpErrorMessage(res.status, json.error));
      }
      setForm((f) => ({ ...f, [field]: json.data.url }));
      toast.success("Imagen subida");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          logoUrl: form.logoUrl || "",
          bannerUrl: form.bannerUrl || "",
          websiteUrl: form.websiteUrl || "",
          instagramUrl: form.instagramUrl || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Perfil actualizado");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Perfil público</h3>
        <Link
          href={`/organizaciones/${form.slug}`}
          target="_blank"
          className="text-xs text-white/60 hover:text-white flex items-center gap-1"
        >
          Ver perfil <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">Logo</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-white/10 overflow-hidden relative flex-shrink-0">
              {form.logoUrl && (
                <Image src={form.logoUrl} alt="" fill className="object-cover" />
              )}
            </div>
            <label className="cursor-pointer text-sm text-white/70 hover:text-white flex items-center gap-1">
              <Upload className="w-4 h-4" />
              {uploading === "logo" ? "Subiendo..." : "Subir"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f, "logoUrl");
                }}
              />
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Banner</label>
          <label className="cursor-pointer text-sm text-white/70 hover:text-white flex items-center gap-1">
            <Upload className="w-4 h-4" />
            {uploading === "banner" ? "Subiendo..." : "Subir banner"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadImage(f, "bannerUrl");
              }}
            />
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">Nombre</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">Slug (URL)</label>
        <input
          value={form.slug}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            }))
          }
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono"
        />
        <p className="text-white/40 text-xs mt-1">/organizaciones/{form.slug}</p>
      </div>

      <div>
        <label className="text-xs text-white/50 block mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">Sitio web</label>
          <input
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            placeholder="https://"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Instagram</label>
          <input
            value={form.instagramUrl}
            onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
            placeholder="https://instagram.com/..."
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
