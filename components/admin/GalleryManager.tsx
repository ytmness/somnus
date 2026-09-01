"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
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

async function postGalleryImage(sectionId: string, url: string) {
  const res = await fetch("/api/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      action: "image",
      sectionId,
      url: url.trim(),
    }),
  });
  let data: { success?: boolean; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error("Invalid server response when saving image");
  }
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to add image");
  }
}

function uploadInputId(sectionId: string) {
  return `gallery-upload-${sectionId}`;
}

export function GalleryManager() {
  const [sections, setSections] = useState<GallerySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<Record<string, string>>({});
  const [showUrl, setShowUrl] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const loadFullSections = async () => {
    try {
      const res = await fetch("/api/gallery/full", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.data) {
        setSections(data.data);
      } else {
        setSections([]);
      }
    } catch {
      setSections([]);
      toast.error("Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFullSections();
  }, []);

  const uploadFilesToSection = async (
    sectionId: string,
    files: FileList | File[]
  ) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploadBusy(sectionId);
    let added = 0;
    try {
      for (const file of list) {
        const okType =
          file.type.startsWith("image/") ||
          /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif)$/i.test(
            file.name
          );
        if (!okType) {
          toast.error(`${file.name}: not a recognized image`);
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("file", file);
          const up = await fetch("/api/upload/gallery-image", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          let json: {
            success?: boolean;
            error?: string;
            data?: { url?: string };
          } = {};
          try {
            json = await up.json();
          } catch {
            throw new Error(
              up.ok
                ? "Upload response was not JSON"
                : `Upload failed (${up.status})`
            );
          }
          if (!up.ok || !json.success) {
            throw new Error(json.error || `Upload failed (${up.status})`);
          }
          const url = json.data?.url?.trim();
          if (!url) {
            throw new Error(
              "Server did not return an image URL after upload"
            );
          }
          await postGalleryImage(sectionId, url);
          added += 1;
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : "Upload failed";
          toast.error(`${file.name}: ${msg}`);
        }
      }
      if (added === 0) {
        toast.error("No images were uploaded (check types or permissions)");
      } else {
        toast.success(
          added > 1 ? `${added} photos added` : "Photo added"
        );
        await loadFullSections();
      }
    } finally {
      setUploadBusy(null);
    }
  };

  const triggerFilePicker = (sectionId: string) => {
    document.getElementById(uploadInputId(sectionId))?.click();
  };

  const createSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Enter a section name");
      return;
    }
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "section",
          title: newSectionTitle.trim(),
          sortOrder: Date.now(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNewSectionTitle("");
      loadFullSections();
      toast.success("Section created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create section";
      toast.error(msg);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section and all its images?")) return;
    try {
      const res = await fetch(`/api/gallery/sections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error");
      loadFullSections();
      toast.success("Section deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const addImageFromUrl = async (sectionId: string) => {
    const url = newImageUrl[sectionId]?.trim();
    if (!url) {
      toast.error("Enter an image URL");
      return;
    }
    try {
      await postGalleryImage(sectionId, url);
      setNewImageUrl((p) => ({ ...p, [sectionId]: "" }));
      setShowUrl(null);
      loadFullSections();
      toast.success("Image added");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add image";
      toast.error(msg);
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      const res = await fetch(`/api/gallery/images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error");
      loadFullSections();
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Loading gallery...</p>
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
          placeholder="New section name"
          className="px-4 py-2 rounded-lg bg-white/10 border border-brand-gold/30 text-white placeholder-white/50 w-64 focus:outline-none focus:border-brand-gold"
        />
        <Button
          onClick={createSection}
          className="bg-brand-gold hover:bg-brand-gold/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create section
        </Button>
      </div>

      <p className="text-white/50 text-sm">
        Newest sections appear first on the public gallery. Upload accepts
        common image types (JPG, PNG, WebP, GIF, AVIF, SVG, HEIC, TIFF, etc.)
        up to 15&nbsp;MB per file. You can still paste a public URL.
      </p>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white/5 border border-brand-gold/20 rounded-lg p-6"
          >
            <input
              id={uploadInputId(section.id)}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="sr-only"
              onChange={(e) => {
                const input = e.target;
                // Copiar antes de vaciar: FileList es vivo y .value = "" lo vacía (Chrome, Safari, etc.)
                const picked =
                  input.files && input.files.length > 0
                    ? Array.from(input.files)
                    : [];
                input.value = "";
                if (picked.length > 0) {
                  void uploadFilesToSection(section.id, picked);
                }
              }}
            />

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

            <label
              htmlFor={uploadInputId(section.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(section.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const dropped =
                  e.dataTransfer.files?.length > 0
                    ? Array.from(e.dataTransfer.files)
                    : [];
                if (dropped.length > 0) {
                  void uploadFilesToSection(section.id, dropped);
                }
              }}
              className={`mb-4 block rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
                dragOver === section.id
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-white/25 hover:border-white/40 hover:bg-white/5"
              } ${uploadBusy === section.id ? "opacity-60 pointer-events-none" : ""}`}
            >
              <Upload className="w-10 h-10 text-white/45 mx-auto mb-2" />
              <p className="text-white/85 text-sm font-medium">
                Drop images here or click to upload
              </p>
              <p className="text-white/45 text-xs mt-1">
                Multiple files · image/* · max 15 MB each
              </p>
            </label>

            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  triggerFilePicker(section.id);
                }}
                disabled={uploadBusy === section.id}
                className="border-brand-gold/50 text-brand-gold hover:bg-brand-gold hover:text-brand-dark"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {uploadBusy === section.id ? "Uploading…" : "Choose files"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowUrl((s) => (s === section.id ? null : section.id))
                }
                className="border-white/30 text-white"
              >
                Add by URL
              </Button>
            </div>

            {showUrl === section.id && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  type="url"
                  value={newImageUrl[section.id] ?? ""}
                  onChange={(e) =>
                    setNewImageUrl((p) => ({
                      ...p,
                      [section.id]: e.target.value,
                    }))
                  }
                  placeholder="https://… or /assets/…"
                  className="flex-1 min-w-[200px] px-4 py-2 rounded-lg bg-white/10 border border-brand-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-brand-gold"
                />
                <Button
                  size="sm"
                  onClick={() => addImageFromUrl(section.id)}
                  className="bg-brand-gold hover:bg-brand-gold/90"
                >
                  Add URL
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {section.images?.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-white/10 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="text-white/60 text-center py-8">
          No sections yet. Create one to start adding photos.
        </p>
      )}
    </div>
  );
}
