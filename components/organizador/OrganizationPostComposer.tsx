"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Upload } from "lucide-react";

interface OrganizationPostComposerProps {
  organizationId: string;
  onPosted: () => void;
}

export function OrganizationPostComposer({
  organizationId,
  onPosted,
}: OrganizationPostComposerProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notifyFollowers, setNotifyFollowers] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("organizationId", organizationId);
      const res = await fetch("/api/upload/org-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setImageUrl(json.data.url);
      toast.success("Imagen lista");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl || undefined,
          type: isAnnouncement ? "ANNOUNCEMENT" : "POST",
          notifyFollowers: notifyFollowers || isAnnouncement,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Publicación creada");
      setContent("");
      setImageUrl("");
      setNotifyFollowers(false);
      setIsAnnouncement(false);
      onPosted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-white/10 rounded-lg p-4">
      <h3 className="font-medium text-sm">Nueva publicación</h3>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="¿Qué quieres compartir?"
        rows={3}
        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm resize-none placeholder-white/40"
      />

      {imageUrl && (
        <p className="text-xs text-white/50 truncate">Imagen: {imageUrl}</p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="cursor-pointer text-white/70 hover:text-white flex items-center gap-1">
          <Upload className="w-4 h-4" />
          {uploading ? "Subiendo..." : "Imagen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyFollowers}
            onChange={(e) => setNotifyFollowers(e.target.checked)}
            className="rounded"
          />
          Notificar seguidores
        </label>

        <label className="flex items-center gap-2 text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnnouncement}
            onChange={(e) => setIsAnnouncement(e.target.checked)}
            className="rounded"
          />
          <Megaphone className="w-4 h-4" />
          Anuncio
        </label>
      </div>

      <button
        type="submit"
        disabled={posting || !content.trim()}
        className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50"
      >
        {posting ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
