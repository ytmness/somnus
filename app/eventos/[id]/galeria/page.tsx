"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

export default function EventGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventName, setEventName] = useState("");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/gallery`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.data) {
          setEventName(json.data.event?.name || "");
          setImages(json.data.images || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") {
        setLightbox((i) =>
          i === null ? null : (i - 1 + images.length) % images.length
        );
      }
      if (e.key === "ArrowRight") {
        setLightbox((i) => (i === null ? null : (i + 1) % images.length));
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, images.length, closeLightbox]);

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <button
          type="button"
          onClick={() => router.push(`/eventos/${eventId}`)}
          className="somnus-nav-link inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to event
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Gallery</h1>
        {eventName && (
          <p className="text-white/60 text-sm mb-8">
            <Link
              href={`/eventos/${eventId}`}
              className="hover:text-white underline-offset-2 hover:underline"
            >
              {eventName}
            </Link>
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-white/50 space-y-3">
            <ImageIcon className="w-12 h-12 mx-auto opacity-40" />
            <p>No photos yet for this event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(idx)}
                className="relative aspect-square rounded-lg overflow-hidden bg-white/5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <Image
                  src={img.url}
                  alt={img.alt || eventName || "Event photo"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 sm:left-6 p-2 text-white/80 hover:text-white"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(
                    (lightbox - 1 + images.length) % images.length
                  );
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                className="absolute right-2 sm:right-6 p-2 text-white/80 hover:text-white"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % images.length);
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          <div
            className="relative w-full max-w-4xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightbox].url}
              alt={images[lightbox].alt || eventName || "Event photo"}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
