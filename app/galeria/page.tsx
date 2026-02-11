"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SomnusHeader } from "@/components/SomnusHeader";
import { gallerySections } from "@/lib/gallery-images";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function GaleriaPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("panorama");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxSection, setLightboxSection] = useState<string | null>(null);

  const currentImages =
    gallerySections.find((s) => s.id === activeSection)?.images ?? [];
  const lightboxImages =
    lightboxSection != null
      ? gallerySections.find((s) => s.id === lightboxSection)?.images ?? []
      : [];

  const openLightbox = useCallback((sectionId: string, index: number) => {
    setLightboxSection(sectionId);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setLightboxSection(null);
  }, []);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null || lightboxSection === null) return;
    const imgs =
      gallerySections.find((s) => s.id === lightboxSection)?.images ?? [];
    setLightboxIndex((lightboxIndex - 1 + imgs.length) % imgs.length);
  }, [lightboxIndex, lightboxSection]);

  const goNext = useCallback(() => {
    if (lightboxIndex === null || lightboxSection === null) return;
    const imgs =
      gallerySections.find((s) => s.id === lightboxSection)?.images ?? [];
    setLightboxIndex((lightboxIndex + 1) % imgs.length);
  }, [lightboxIndex, lightboxSection]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  const currentSrc =
    lightboxIndex != null && lightboxSection != null
      ? gallerySections
          .find((s) => s.id === lightboxSection)
          ?.images[lightboxIndex]
      : null;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SomnusHeader showNav />

      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <h1 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-2 uppercase tracking-wider">
          Galería
        </h1>
        <p className="somnus-text-body text-center mb-10 max-w-xl mx-auto">
          Fotos de Panorama, Somnus 1 y Somnus 2
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {gallerySections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium uppercase tracking-wider transition-all ${
                activeSection === section.id
                  ? "bg-white/20 text-white border border-white/40"
                  : "bg-white/5 text-white/70 border border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-7xl mx-auto">
          {currentImages.map((src, index) => (
            <button
              key={`${activeSection}-${index}`}
              type="button"
              onClick={() => openLightbox(activeSection, index)}
              className="relative aspect-square rounded-lg overflow-hidden somnus-card border border-white/10 hover:border-white/30 hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <Image
                src={src}
                alt={`Foto ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      {currentSrc && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentSrc}
              alt={`Foto ${lightboxIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded"
              unoptimized
              priority
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {lightboxImages.length}
          </p>
        </div>
      )}
    </div>
  );
}
