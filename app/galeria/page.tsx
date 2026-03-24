"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { SomnusHeader } from "@/components/SomnusHeader";
import { gallerySections as staticSections } from "@/lib/gallery-images";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

type GallerySection = { id: string; title: string; images: string[] };

function GaleriaContent() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [sections, setSections] = useState<GallerySection[]>(staticSections);
  const [activeSection, setActiveSection] = useState(staticSections[0]?.id ?? "panorama");
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const res = await fetch("/api/gallery");
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setSections(
            data.data.map((s: { id: string; title: string; images: string[] }) => ({
              id: s.id,
              title: s.title,
              images: s.images || [],
            }))
          );
          setActiveSection((prev) => {
            const exists = data.data.some((s: { id: string }) => s.id === prev);
            return exists ? prev : data.data[0]?.id ?? prev;
          });
        }
      } catch {
        // Fall back to staticSections
      }
    };
    loadGallery();
  }, []);

  useEffect(() => {
    if (sectionParam && sections.some((s) => s.id === sectionParam)) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam, sections]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxSection, setLightboxSection] = useState<string | null>(null);

  const currentImages =
    sections.find((s) => s.id === activeSection)?.images ?? [];

  const scrollToPhotoGrid = useCallback(() => {
    requestAnimationFrame(() => {
      document
        .getElementById("gallery-photos")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleSectionChange = useCallback(
    (sectionId: string, options?: { scroll?: boolean }) => {
      setActiveSection(sectionId);
      setLightboxIndex(null);
      setLightboxSection(null);
      if (options?.scroll) scrollToPhotoGrid();
    },
    [scrollToPhotoGrid]
  );

  const handleImageLoad = useCallback((src: string) => {
    setLoadedImages((prev) => ({ ...prev, [src]: true }));
  }, []);
  const lightboxImages =
    lightboxSection != null
      ? sections.find((s) => s.id === lightboxSection)?.images ?? []
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
      sections.find((s) => s.id === lightboxSection)?.images ?? [];
    setLightboxIndex((lightboxIndex - 1 + imgs.length) % imgs.length);
  }, [lightboxIndex, lightboxSection]);

  const goNext = useCallback(() => {
    if (lightboxIndex === null || lightboxSection === null) return;
    const imgs =
      sections.find((s) => s.id === lightboxSection)?.images ?? [];
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
      ? sections.find((s) => s.id === lightboxSection)?.images[lightboxIndex]
      : null;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SomnusHeader showNav />

      <main className="pt-24 sm:pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <h1 className="somnus-title-secondary text-center text-4xl md:text-5xl mb-3 uppercase tracking-wider">
          Gallery
        </h1>
        <p className="somnus-text-body text-center mb-4 max-w-xl mx-auto text-white/60">
          Pick a set to open its photo grid. Each card is a preview of that
          edition.
        </p>
        <p className="text-center text-white/40 text-xs uppercase tracking-[0.25em] mb-12">
          {sections.map((s) => s.title).join(" · ")}
        </p>

        {/* Repository-style preview cards (one per section) */}
        <section
          className="mb-16 max-w-5xl mx-auto"
          aria-label="Gallery editions"
        >
          <h2 className="sr-only">Editions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {sections.map((section) => {
              const cover = section.images[0];
              const isActive = activeSection === section.id;
              const count = section.images.length;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionChange(section.id, { scroll: true })}
                  className={`text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] liquid-glass group ${
                    isActive
                      ? "ring-2 ring-white/50 shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)]"
                      : "ring-1 ring-white/10 hover:ring-white/25 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="relative aspect-[16/10] bg-white/5">
                    {cover ? (
                      <>
                        {!loadedImages[`preview:${cover}`] && (
                          <div className="absolute inset-0 bg-white/5 animate-pulse" />
                        )}
                        <Image
                          src={cover}
                          alt={`${section.title} cover preview`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                          className={`object-cover transition-all duration-500 group-hover:scale-[1.03] ${
                            loadedImages[`preview:${cover}`]
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                          loading="lazy"
                          quality={75}
                          onLoad={() =>
                            setLoadedImages((p) => ({
                              ...p,
                              [`preview:${cover}`]: true,
                            }))
                          }
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06]">
                        <ImageIcon
                          className="w-14 h-14 text-white/25"
                          aria-hidden
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      <p className="text-white font-semibold text-lg sm:text-xl tracking-tight drop-shadow-md">
                        {section.title}
                      </p>
                      <p className="text-white/70 text-sm mt-1">
                        {count === 0
                          ? "No photos yet"
                          : `${count} photo${count === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-3 sm:px-5 flex items-center justify-between border-t border-white/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                      {isActive ? "Showing" : "View set"}
                    </span>
                    <span className="text-white/50 text-xs group-hover:text-white/80 transition-colors">
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-white/10 pb-4">
          <h2 className="somnus-title-secondary text-xl sm:text-2xl uppercase tracking-wider text-white/90">
            Photos
          </h2>
          <p className="text-white/50 text-sm">
            {sections.find((s) => s.id === activeSection)?.title ?? ""}
          </p>
        </div>

        {/* 3-column grid — first 3 eager, rest lazy */}
        <div
          id="gallery-photos"
          className="scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto"
        >
          {currentImages.map((src, index) => (
            <button
              key={`${activeSection}-${index}`}
              type="button"
              onClick={() => openLightbox(activeSection, index)}
              className="relative aspect-[4/5] overflow-hidden group focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              {/* Skeleton while loading */}
              {!loadedImages[src] && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              )}
              <Image
                src={src}
                alt={`${sections.find((s) => s.id === activeSection)?.title ?? "Photo"} - ${index + 1}`}
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
          aria-label="Expanded image"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
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
            aria-label="Previous"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentSrc}
              alt={`Photo ${lightboxIndex + 1}`}
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
            aria-label="Next"
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
      <p className="text-white/70">Loading gallery...</p>
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
