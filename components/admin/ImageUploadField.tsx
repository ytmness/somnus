"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = "image/jpeg,image/jpg,image/png,image/gif,image/webp";
const MAX_SIZE_MB = 5;

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

export function ImageUploadField({
  value,
  onChange,
  placeholder = "https://ejemplo.com/imagen.jpg o arrastra una imagen",
  className = "",
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Solo se permiten imágenes (JPG, PNG, GIF, WebP)";
    }
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return "Formato no permitido. Usa JPG, PNG, GIF o WebP.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `La imagen no debe superar ${MAX_SIZE_MB} MB`;
    }
    return null;
  };

  const uploadFile = useCallback(
    async (file: File) => {
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload/event-image", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al subir la imagen");
        }

        if (data.data?.url) {
          onChange(data.data.url);
          toast.success("Imagen subida correctamente");
        }
      } catch (e: any) {
        toast.error(e.message || "Error al subir");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/90 mb-2">
        Imagen del evento (opcional)
      </label>

      <div className="space-y-2">
        {/* Campo URL */}
        <div className="flex gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-regia-gold/30 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              title="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Zona drag-and-drop */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors
            ${
              isDragging
                ? "border-regia-gold bg-regia-gold/10"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
            }
            ${isUploading ? "pointer-events-none opacity-70" : ""}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileInput}
            className="hidden"
          />
          {isUploading ? (
            <>
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Subiendo...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-white/50" />
              <p className="text-white/80 text-sm text-center">
                Arrastra una imagen aquí o haz clic para seleccionar
              </p>
              <p className="text-white/50 text-xs">JPG, PNG, GIF o WebP · Máx. {MAX_SIZE_MB} MB</p>
            </>
          )}
        </div>

        {/* Vista previa */}
        {value && (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-white/10 bg-white/5 max-w-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Vista previa"
              className="w-full h-auto object-cover"
              onError={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
