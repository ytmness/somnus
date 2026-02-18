"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface GallerySection {
  id: string;
  title: string;
  sortOrder: number;
  images: GalleryImage[];
}

export function GalleryManager() {
  const [sections, setSections] = useState<GallerySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingImage, setAddingImage] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  const loadFullSections = async () => {
    try {
      const res = await fetch("/api/gallery/full");
      const data = await res.json();
      if (data.success && data.data) {
        setSections(data.data);
      } else {
        setSections([]);
      }
    } catch {
      setSections([]);
      toast.error("Error al cargar galería");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFullSections();
  }, []);

  const createSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Escribe el nombre de la sección");
      return;
    }
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "section",
          title: newSectionTitle.trim(),
          sortOrder: sections.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNewSectionTitle("");
      loadFullSections();
      toast.success("Sección creada");
    } catch (e: any) {
      toast.error(e.message || "Error al crear sección");
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm("¿Eliminar esta sección y todas sus imágenes?")) return;
    try {
      const res = await fetch(`/api/gallery/sections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error");
      loadFullSections();
      toast.success("Sección eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const addImage = async (sectionId: string) => {
    if (!newImageUrl.trim()) {
      toast.error("Ingresa la URL de la imagen");
      return;
    }
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "image",
          sectionId,
          url: newImageUrl.trim(),
          sortOrder: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNewImageUrl("");
      setAddingImage(null);
      loadFullSections();
      toast.success("Imagen agregada");
    } catch (e: any) {
      toast.error(e.message || "Error al agregar imagen");
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    try {
      const res = await fetch(`/api/gallery/images/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error");
      loadFullSections();
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando galería...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder="Nombre de nueva sección"
          className="px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 w-64 focus:outline-none focus:border-regia-gold"
        />
        <Button
          onClick={createSection}
          className="bg-regia-gold hover:bg-regia-gold/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear sección
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white/5 border border-regia-gold/20 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => deleteSection(section.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
              {section.images?.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-white/10 group"
                >
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deleteImage(img.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>

            {addingImage === section.id ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="URL de la imagen (ej: /assets/foto.jpg)"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
                />
                <Button
                  size="sm"
                  onClick={() => addImage(section.id)}
                  className="bg-regia-gold hover:bg-regia-gold/90"
                >
                  Agregar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingImage(null);
                    setNewImageUrl("");
                  }}
                  className="border-white/30 text-white"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingImage(section.id)}
                className="border-regia-gold/50 text-regia-gold hover:bg-regia-gold hover:text-regia-dark"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Agregar imagen
              </Button>
            )}
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="text-white/60 text-center py-8">
          No hay secciones. Crea una para empezar a agregar fotos.
        </p>
      )}
    </div>
  );
}
