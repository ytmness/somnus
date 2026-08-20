"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { X, ChevronLeft, ChevronRight, ImageIcon, Plus } from "lucide-react";

/** Miniaturas visibles en la fila; la 6ª celda muestra +N si hay más */
const PREVIEW_THUMB_COUNT = 5;

type GallerySection = { id: string; title: string; images: string[] };

function GaleriaContent() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [sections, setSections] = useState<GallerySection[] | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: GallerySection[];
      try {
        const res = await fetch("/api/gallery", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.data)) {
          next = data.data.map(
            (s: { id: string; title: string; images: string[] }) => ({
              id: s.id,
              title: s.title,
              images: s.images || [],
            })
          );
        } else {
          next = [];
        }
      } catch {
        if (cancelled) return;
        next = [];
      }
      if (cancelled) return;
      setSections(next);
      const param =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("section")
          : null;
      const initial =
        param && next.some((s) => s.id === param) ? param : next[0]?.id ?? null;
      setActiveSection(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sections?.length) return;
    if (sectionParam && sections.some((s) => s.id === sectionParam)) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam, sections]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxSection, setLightboxSection] = useState<string | null>(null);

  const currentImages =
    sections?.find((s) => s.id === activeSection)?.images ?? [];

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
      ? sections?.find((s) => s.id === lightboxSection)?.images ?? []
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
    if (lightboxIndex === null || lightboxSection === null || !sections) return;
    const imgs =
      sections.find((s) => s.id === lightboxSection)?.images ?? [];
    setLightboxIndex((lightboxIndex - 1 + imgs.length) % imgs.length);
  }, [lightboxIndex, lightboxSection, sections]);

  const goNext = useCallback(() => {
    if (lightboxIndex === null || lightboxSection === null || !sections) return;
    const imgs =
      sections.find((s) => s.id === lightboxSection)?.images ?? [];
    setLightboxIndex((lightboxIndex + 1) % imgs.length);
  }, [lightboxIndex, lightboxSection, sections]);

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
      ? sections?.find((s) => s.id === lightboxSection)?.images[lightboxIndex]
      : null;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <main className="pt-24 sm:pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <h1 className="somnus-title-secondary text-center text-4xl md:text-5xl mb-3 uppercase tracking-wider">
          Gallery
        </h1>
        <p className="somnus-text-body text-center mb-4 max-w-xl mx-auto text-white/60">
          Newest editions first. Tap a row to scroll to its photos — each row
          shows a horizontal strip of previews (and +N if there are more).
        </p>
        <p className="text-center text-white/40 text-xs uppercase tracking-[0.25em] mb-12 min-h-[1.25em]">
          {sections ? (
            sections.map((s) => s.title).join(" · ")
          ) : (
            <span
              className="inline-block h-4 w-56 mx-auto rounded bg-white/10 animate-pulse"
              aria-hidden
            />
          )}
        </p>

        {/* Vertical list: newest → oldest, one full-width row each */}
        <section
          className="mb-16 max-w-3xl mx-auto flex flex-col gap-5"
          aria-label="Gallery editions"
        >
          <h2 className="sr-only">Editions</h2>
          {sections === null
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-full rounded-2xl liquid-glass ring-1 ring-white/10 flex flex-col sm:flex-row sm:min-h-[200px] overflow-hidden animate-pulse"
                >
                  <div className="w-full sm:w-[44%] min-h-[140px] sm:min-h-[200px] bg-white/[0.06]" />
                  <div className="flex-1 p-6 space-y-3 border-t sm:border-t-0 sm:border-l border-white/10">
                    <div className="h-7 bg-white/10 rounded-md w-3/4 max-w-xs" />
                    <div className="h-4 bg-white/10 rounded-md w-24" />
                  </div>
                </div>
              ))
            : sections.length === 0 ? (
                <div className="liquid-glass rounded-2xl ring-1 ring-white/10 py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
                  <ImageIcon className="w-12 h-12 text-white/30" aria-hidden />
                  <p className="somnus-text-body text-white/60">
                    La galería está vacía por ahora.
                  </p>
                </div>
              )
            : sections.map((section) => {
                const isActive = activeSection === section.id;
                const count = section.images.length;
                const thumbs = section.images.slice(0, PREVIEW_THUMB_COUNT);
                const moreCount = count - PREVIEW_THUMB_COUNT;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      handleSectionChange(section.id, { scroll: true })
                    }
                    className={`text-left w-full rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] liquid-glass group flex flex-col sm:flex-row sm:min-h-[200px] ${
                      isActive
                        ? "ring-2 ring-white/50 shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)]"
                        : "ring-1 ring-white/10 hover:ring-white/25 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="relative w-full sm:w-[44%] min-h-[132px] sm:min-h-0 sm:min-h-[200px] bg-white/5 shrink-0 flex items-stretch">
                      {count === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-white/[0.06] m-3 rounded-xl">
                          <ImageIcon
                            className="w-12 h-12 text-white/25"
                            aria-hidden
                          />
                          <span className="text-white/35 text-xs uppercase tracking-wider">
                            Preview
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto p-3 sm:p-4 w-full items-center [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                          {thumbs.map((src, idx) => {
                            const loadKey = `preview:${section.id}:${idx}:${src}`;
                            return (
                              <div
                                key={loadKey}
                                className="relative shrink-0 w-[72px] h-[96px] sm:w-20 sm:h-[110px] rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10"
                              >
                                {!loadedImages[loadKey] && (
                                  <div className="absolute inset-0 bg-white/5 animate-pulse z-[1]" />
                                )}
                                <Image
                                  src={src}
                                  alt=""
                                  fill
                                  sizes="80px"
                                  className={`object-cover transition-opacity duration-500 group-hover:scale-[1.03] ${
                                    loadedImages[loadKey]
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                  loading="lazy"
                                  quality={70}
                                  onLoad={() =>
                                    setLoadedImages((p) => ({
                                      ...p,
                                      [loadKey]: true,
                                    }))
                                  }
                                />
                              </div>
                            );
                          })}
                          {moreCount > 0 && (
                            <div
                              className="shrink-0 w-[72px] h-[96px] sm:w-20 sm:h-[110px] rounded-lg overflow-hidden bg-white/[0.08] ring-1 ring-white/15 flex flex-col items-center justify-center gap-0.5 text-white/90"
                              aria-label={`${moreCount} more photos`}
                            >
                              <Plus
                                className="w-6 h-6 sm:w-7 sm:h-7"
                                strokeWidth={2.5}
                                aria-hidden
                              />
                              <span className="text-sm font-semibold tabular-nums leading-none">
                                +{moreCount}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-5 sm:p-6 border-t sm:border-t-0 sm:border-l border-white/10">
                      <p className="text-white font-semibold text-xl sm:text-2xl tracking-tight">
                        {section.title}
                      </p>
                      <p className="text-white/65 text-sm mt-2">
                        {count === 0
                          ? "No photos yet"
                          : `${count} photo${count === 1 ? "" : "s"}`}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                          {isActive ? "Showing" : "View photos"}
                        </span>
                        <span className="text-white/50 text-sm group-hover:text-white/90 transition-colors">
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
        </section>

        <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-white/10 pb-4">
          <h2 className="somnus-title-secondary text-xl sm:text-2xl uppercase tracking-wider text-white/90">
            Photos
          </h2>
          <p className="text-white/50 text-sm min-h-[1.25rem]">
            {sections && activeSection
              ? sections.find((s) => s.id === activeSection)?.title ?? ""
              : ""}
          </p>
        </div>

        {/* 3-column grid — first 3 eager, rest lazy */}
        {sections === null ? (
          <div className="scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-lg bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : currentImages.length === 0 ? (
          <div
            id="gallery-photos"
            className="scroll-mt-28 max-w-5xl mx-auto"
          >
            <div className="liquid-glass rounded-2xl ring-1 ring-white/10 py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
              <ImageIcon
                className="w-12 h-12 text-white/30"
                aria-hidden
              />
              <p className="somnus-text-body text-white/60">
                No photos in this edition yet
              </p>
            </div>
          </div>
        ) : (
          <div
            id="gallery-photos"
            className="scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto"
          >
            {activeSection &&
              currentImages.map((src, index) => (
                <button
                  key={`${activeSection}-${index}`}
                  type="button"
                  onClick={() => openLightbox(activeSection, index)}
                  className="relative aspect-[4/5] overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                >
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
        )}
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
