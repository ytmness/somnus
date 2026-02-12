"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { SomnusHeader } from "@/components/SomnusHeader";
import { gallerySections } from "@/lib/gallery-images";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

function GaleriaContent() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [activeSection, setActiveSection] = useState("panorama");
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (["panorama", "somnus-1", "somnus-2"].includes(sectionParam || "")) {
      setActiveSection(sectionParam!);
    }
  }, [sectionParam]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxSection, setLightboxSection] = useState<string | null>(null);

  const currentImages =
    gallerySections.find((s) => s.id === activeSection)?.images ?? [];

  const handleSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setLightboxIndex(null);
    setLightboxSection(null);
  }, []);

  const handleImageLoad = useCallback((src: string) => {
    setLoadedImages((prev) => ({ ...prev, [src]: true }));
  }, []);
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

      <main className="pt-24 sm:pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <h1 className="somnus-title-secondary text-center text-4xl md:text-5xl mb-3 uppercase tracking-wider">
          Galería
        </h1>
        <p className="somnus-text-body text-center mb-16 max-w-xl mx-auto text-white/60">
          Panorama · Somnus 1 · Somnus 2
        </p>

        {/* Selector de evento */}
        <nav className="relative flex justify-center gap-8 sm:gap-12 mb-16 max-w-lg mx-auto" aria-label="Secciones">
          {gallerySections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={`relative pb-2 text-sm font-medium uppercase tracking-[0.2em] transition-colors ${
                activeSection === section.id
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {section.title}
              {activeSection === section.id && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
              )}
            </button>
          ))}
        </nav>

        {/* Grid 3 columnas - primeras 3 eager, resto lazy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {currentImages.map((src, index) => (
            <button
              key={`${activeSection}-${index}`}
              type="button"
              onClick={() => openLightbox(activeSection, index)}
              className="relative aspect-[4/5] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              {/* Skeleton mientras carga */}
              {!loadedImages[src] && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              )}
              <Image
                src={src}
                alt={`${gallerySections.find((s) => s.id === activeSection)?.title} - Foto ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                className={`object-cover transition-opacity duration-500 ${
                  loadedImages[src] ? "opacity-100" : "opacity-0"
                } group-hover:scale-105`}
                loading={index < 3 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "low"}
                quality={72}
                onLoad={() => handleImageLoad(src)}
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
              width={1400}
              height={933}
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
              priority
              quality={90}
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

function GaleriaFallback() {
  return (
    <div className="min-h-screen somnus-bg-main flex items-center justify-center">
      <p className="text-white/70">Cargando galería...</p>
    </div>
  );
}

export default function GaleriaPage() {
  return (
    <Suspense fallback={<GaleriaFallback />}>
      <GaleriaContent />
    </Suspense>
  );
}
