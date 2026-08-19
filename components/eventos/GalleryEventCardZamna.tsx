"use client";

import Image from "next/image";
import { useRef } from "react";
import { Calendar, MapPin } from "lucide-react";
import type { GalleryEvent } from "@/lib/gallery-events";
import { useCarouselPosterOptional } from "./carousel-poster-settings";
import { CarouselPosterImage } from "./CarouselPosterImage";

interface GalleryEventCardZamnaProps {
  event: GalleryEvent;
  onSelect: () => void;
  carouselGlass?: boolean;
}

export function GalleryEventCardZamna({
  event,
  onSelect,
  carouselGlass = false,
}: GalleryEventCardZamnaProps) {
  const posterCtx = useCarouselPosterOptional();
  const skipOpenAfterDrag = useRef(false);

  const handleActivate = () => {
    if (skipOpenAfterDrag.current) {
      skipOpenAfterDrag.current = false;
      return;
    }
    onSelect();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl flex flex-col h-full cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7BA3E8]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${
        carouselGlass
          ? "border border-white/12 bg-[#08080c]/88 backdrop-blur-xl hover:border-white/18 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
          : "bg-[#1a1a1a] border border-white/15 hover:border-white/25"
      }`}
    >
      <div
        className={
          carouselGlass
            ? "relative flex-1 overflow-hidden bg-[#08080c] min-h-[var(--evt-pmin-sm)] md:min-h-[var(--evt-pmin-md)]"
            : "relative aspect-[4/3] overflow-hidden"
        }
        style={
          carouselGlass && posterCtx
            ? ({
                "--evt-pmin-sm": `${posterCtx.settings.posterMinHeightSm}px`,
                "--evt-pmin-md": `${posterCtx.settings.posterMinHeightMd}px`,
              } as React.CSSProperties)
            : carouselGlass
              ? ({
                  "--evt-pmin-sm": "400px",
                  "--evt-pmin-md": "496px",
                } as React.CSSProperties)
              : undefined
        }
      >
        {carouselGlass && posterCtx ? (
          <>
            <CarouselPosterImage
              src={event.image}
              alt={event.artist}
              sizes="(max-width: 768px) 100vw, 33vw"
              quality={75}
              disableHoverScale={posterCtx.settings.imageDragMode}
              settings={posterCtx.settings}
              setSettings={posterCtx.setSettings}
              onDragEndRef={skipOpenAfterDrag}
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <>
            <Image
              src={event.image}
              alt={event.artist}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
              sizes="(max-width: 768px) 100vw, 33vw"
              loading="lazy"
              quality={75}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
      </div>

      <div
        className={
          carouselGlass
            ? "relative z-[2] shrink-0 flex flex-col p-4 md:p-6 border-t border-white/10 bg-[#08080c]"
            : "flex flex-col flex-1 p-6 bg-[#141414]"
        }
      >
        <span className="text-[10px] uppercase tracking-widest text-white/70 mb-1 line-clamp-1">
          {event.venue}
        </span>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 md:mb-3 line-clamp-2">
          {event.artist}
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80 mb-3 md:mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" aria-hidden />
            {event.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            {event.venue}
          </span>
        </div>
        <div>
          <span className="inline-block w-full text-center font-bold uppercase tracking-wider py-2.5 md:py-3 px-5 md:px-6 rounded-lg bg-black text-white border border-white/20 group-hover:bg-white group-hover:text-black transition-colors text-sm md:text-base">
            View gallery
          </span>
        </div>
      </div>
    </article>
  );
}
