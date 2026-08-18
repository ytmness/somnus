"use client";

import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { Concert } from "./types";
import { isEventPastByCalendar } from "@/lib/utils";
import { useCarouselPosterOptional } from "./carousel-poster-settings";
import {
  imageFramingStyle,
  normalizeImageFraming,
} from "@/lib/utils/image-framing";

interface EventCardZamnaProps {
  concert: Concert & { eventDate?: string };
  isPast: boolean;
  isFeatured?: boolean;
  onSelect: () => void;
  /** Carrusel: vidrio líquido + poster a pantalla ancha (cover) */
  carouselGlass?: boolean;
}

function getEventStatus(
  concert: Concert & { eventDate?: string }
): string | null {
  if (concert.eventDate && isEventPastByCalendar(concert.eventDate)) {
    return "Past event";
  }
  const totalAvailable = concert.sections?.reduce(
    (sum, s) => sum + (s.available || 0),
    0
  );
  if (!totalAvailable) return "Sold out";
  if (totalAvailable <= 20) return "Last tickets";
  return null;
}

export function EventCardZamna({
  concert,
  isPast,
  isFeatured = false,
  onSelect,
  carouselGlass = false,
}: EventCardZamnaProps) {
  const posterCtx = useCarouselPosterOptional();
  const status = getEventStatus(concert);
  const isMystery =
    concert.artist === "Artista por Confirmar" ||
    concert.artist.toLowerCase().includes("por confirmar");

  const pastCarouselMatch = carouselGlass && isPast;
  const isInteractive = pastCarouselMatch || (!isPast && !isMystery);
  const framing = normalizeImageFraming({
    posX: concert.imagePosX,
    posY: concert.imagePosY,
    zoom: concert.imageZoom,
  });
  const framingStyle = imageFramingStyle(framing);

  const handleActivate = () => {
    if (!isMystery) onSelect();
  };

  return (
    <article
      role={isInteractive || isMystery ? "button" : undefined}
      tabIndex={isInteractive || isMystery ? 0 : undefined}
      aria-disabled={isMystery || (!pastCarouselMatch && isPast) || undefined}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl flex flex-col h-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7BA3E8]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${
        carouselGlass
          ? "border border-white/12 bg-[#08080c]/88 backdrop-blur-xl hover:border-white/18 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
          : "bg-[#1a1a1a] border border-white/15 hover:border-white/25"
      } ${
        pastCarouselMatch
          ? "cursor-pointer"
          : isPast || isMystery
            ? "cursor-default opacity-90"
            : "cursor-pointer"
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
                  "--evt-pmin-sm": "264px",
                  "--evt-pmin-md": "496px",
                } as React.CSSProperties)
              : undefined
        }
      >
        {isMystery ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-5xl font-bold text-white/60">?</p>
          </div>
        ) : (
          <>
            {/*
              Always use per-event framing + cover. Do not use the global
              carousel poster settings (defaults to contain / “full image”).
            */}
            <Image
              src={concert.image}
              alt={concert.artist}
              fill
              className={`object-cover select-none ${
                isPast || framing.zoom > 1
                  ? ""
                  : "transition-transform duration-700 group-hover:scale-105"
              }`}
              style={framingStyle}
              sizes="(max-width: 768px) 100vw, 33vw"
              loading="lazy"
              quality={75}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
        {isFeatured && !isPast && (
          <span className="absolute top-4 right-4 z-[2] bg-[#7B4BB5] text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}
        {status && !isFeatured && !pastCarouselMatch && (
          <span
            className={`absolute top-4 right-4 z-[2] text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              status === "Past event" || status === "Sold out"
                ? "bg-white/20 text-white"
                : "bg-white/90 text-black"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      <div
        className={
          carouselGlass
            ? "relative z-[2] flex flex-col flex-1 p-5 md:p-6 border-t border-white/10 bg-[#08080c]"
            : "flex flex-col flex-1 p-6 bg-[#141414]"
        }
      >
        <span className="text-[10px] uppercase tracking-widest text-white/70 mb-1">
          {concert.venue}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
          {isMystery ? "Coming soon" : concert.artist}
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" aria-hidden />
            {concert.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            {concert.venue}
          </span>
        </div>
        {!isMystery && concert.minPrice > 0 && (
          <p className="text-white font-semibold mb-4 tabular-nums">
            From ${concert.minPrice.toLocaleString("en-US")} MXN
          </p>
        )}
        <div className="mt-auto">
          <span
            className={`inline-block w-full text-center font-bold uppercase tracking-wider py-3 px-6 rounded-lg transition-colors ${
              isMystery
                ? "bg-white/20 text-white/60 cursor-default"
                : pastCarouselMatch || !isPast
                  ? "bg-black text-white border border-white/20 group-hover:bg-white group-hover:text-black"
                  : "bg-white/20 text-white/60 cursor-default"
            }`}
          >
            {isPast ? "Past event" : isMystery ? "Coming soon" : "Get Tickets"}
          </span>
        </div>
      </div>
    </article>
  );
}
