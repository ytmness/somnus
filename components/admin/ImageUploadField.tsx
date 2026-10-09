"use client";

import { useState, useRef, useCallback } from "react";
import { Pencil, Upload, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_IMAGE_FRAMING,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  clamp,
  imageFramingStyle,
  type ImageFraming,
} from "@/lib/utils/image-framing";
import { uploadHttpErrorMessage } from "@/lib/storage/upload-image-validation";

const ACCEPTED_TYPES =
  "image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif";
const MAX_SIZE_MB = 5;

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Poster pan/zoom; only used when variant="flyer". */
  framing?: ImageFraming;
  onFramingChange?: (framing: ImageFraming) => void;
  placeholder?: string;
  className?: string;
  /** "flyer" fills the available space with a large preview — used by the event creator's left panel. */
  variant?: "default" | "flyer";
}

export function ImageUploadField({
  value,
  onChange,
  framing = DEFAULT_IMAGE_FRAMING,
  onFramingChange,
  placeholder = "https://example.com/image.jpg or drop a file",
  className = "",
  variant = "default",
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPreviewRef = useRef<{ x: number; y: number } | null>(null);
  const pan = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 50,
    origY: 50,
    pointerId: -1,
  });

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Only images are allowed (JPG, PNG, GIF, WebP)";
    }
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      return "Unsupported format. Use JPG, PNG, GIF, or WebP.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Image must be under ${MAX_SIZE_MB} MB`;
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
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(uploadHttpErrorMessage(res.status, data.error));
        }

        if (data.data?.url) {
          onChange(data.data.url);
          onFramingChange?.(DEFAULT_IMAGE_FRAMING);
          toast.success("Image uploaded");
        } else {
          throw new Error("Upload failed — no URL returned");
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, onFramingChange]
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
      const input = e.target;
      const file = input.files?.[0];
      input.value = "";
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleClear = useCallback(() => {
    onChange("");
    onFramingChange?.(DEFAULT_IMAGE_FRAMING);
  }, [onChange, onFramingChange]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!value || !onFramingChange) return;
      e.preventDefault();
      e.stopPropagation();
      lastPreviewRef.current = null;
      setDragPreview(null);
      pan.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: framing.posX,
        origY: framing.posY,
        pointerId: e.pointerId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value, onFramingChange, framing.posX, framing.posY]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pan.current.active || e.pointerId !== pan.current.pointerId) return;
    const dx = e.clientX - pan.current.startX;
    const dy = e.clientY - pan.current.startY;
    const sens = 0.28;
    const nx = clamp(pan.current.origX - dx * sens, 0, 100);
    const ny = clamp(pan.current.origY - dy * sens, 0, 100);
    const next = { x: nx, y: ny };
    lastPreviewRef.current = next;
    setDragPreview(next);
  }, []);

  const endPan = useCallback(
    (e: React.PointerEvent) => {
      if (!pan.current.active || e.pointerId !== pan.current.pointerId) return;
      pan.current.active = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = lastPreviewRef.current;
      lastPreviewRef.current = null;
      if (p && onFramingChange) {
        onFramingChange({ ...framing, posX: p.x, posY: p.y });
      }
      setDragPreview(null);
    },
    [framing, onFramingChange]
  );

  const liveFraming: ImageFraming = dragPreview
    ? { ...framing, posX: dragPreview.x, posY: dragPreview.y }
    : framing;

  if (variant === "flyer") {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!value && !isUploading) inputRef.current?.click();
        }}
        className={`group relative w-full h-full min-h-0 rounded-2xl border transition-colors overflow-hidden ${
          value ? "cursor-grab active:cursor-grabbing border-white/15" : "cursor-pointer"
        } ${
          isDragging
            ? "border-[#5B8DEF] bg-[#5B8DEF]/10"
            : value
              ? "bg-black"
              : "border-white/20 hover:border-white/35 bg-white/[0.02]"
        } ${isUploading ? "pointer-events-none opacity-70" : ""} ${className}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileInput}
          className="hidden"
        />

        {value ? (
          <>
            <div
              className="absolute inset-0 touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPan}
              onPointerCancel={endPan}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Flyer preview"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={imageFramingStyle(liveFraming)}
                draggable={false}
                onError={() => {}}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white/80 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100"
              aria-label="Quitar flyer"
              title="Quitar flyer"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black shadow-sm"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </button>

            <div
              className="absolute bottom-3 left-3 right-24 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ZoomIn className="w-3.5 h-3.5 text-white/70 shrink-0" aria-hidden />
              <label className="sr-only" htmlFor="flyer-zoom">
                Zoom
              </label>
              <input
                id="flyer-zoom"
                type="range"
                min={IMAGE_ZOOM_MIN}
                max={IMAGE_ZOOM_MAX}
                step={0.05}
                value={framing.zoom}
                onChange={(e) =>
                  onFramingChange?.({
                    ...framing,
                    zoom: Number(e.target.value),
                  })
                }
                className="w-full accent-white h-1.5 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {isUploading ? (
              <>
                <div
                  className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden
                />
                <p className="text-white/70 text-sm">Uploading…</p>
              </>
            ) : (
              <>
                <Upload className="w-9 h-9 text-white/40" aria-hidden />
                <p className="text-white/70 text-sm">Agrega el flyer</p>
                <p className="text-white/40 text-xs">
                  JPG, PNG, GIF or WebP · Max {MAX_SIZE_MB} MB
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/90 mb-2">
        Event image (optional)
      </label>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="somnus-input flex-1 !py-2.5"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="somnus-nav-link px-3 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white"
              title="Clear"
              aria-label="Clear image"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${
              isDragging
                ? "border-[#5B8DEF] bg-[#5B8DEF]/10"
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
              <div
                className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden
              />
              <p className="text-white/70 text-sm">Uploading…</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-white/50" aria-hidden />
              <p className="text-white/80 text-sm text-center">
                Drop an image here or click to browse
              </p>
              <p className="text-white/50 text-xs">
                JPG, PNG, GIF or WebP · Max {MAX_SIZE_MB} MB
              </p>
            </>
          )}
        </div>

        {value && (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-white/10 bg-white/5 max-w-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-auto object-cover"
              onError={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
