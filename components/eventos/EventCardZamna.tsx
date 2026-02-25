"use client";

import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { Concert } from "./types";

interface EventCardZamnaProps {
  concert: Concert & { eventDate?: string };
  isPast: boolean;
  isFeatured?: boolean;
  onSelect: () => void;
}

function getEventStatus(
  concert: Concert & { eventDate?: string }
): string | null {
  if (concert.eventDate && new Date(concert.eventDate) < new Date()) {
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
}: EventCardZamnaProps) {
  const status = getEventStatus(concert);
  const isMystery =
    concert.artist === "Artista por Confirmar" ||
    concert.artist.toLowerCase().includes("por confirmar");

  return (
    <article
      onClick={() => {
        if (!isMystery) onSelect();
      }}
      className={`group relative overflow-hidden rounded-2xl bg-[#1a1a1a] flex flex-col border border-white/15 hover:border-white/25 transition-colors ${
        isPast || isMystery ? "cursor-default opacity-90" : "cursor-pointer"
      }`}
    >
      {/* Top: imagen impactante tipo Zamna */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {isMystery ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-5xl font-bold text-white/60">?</p>
          </div>
        ) : (
          <>
            <Image
              src={concert.image}
              alt={concert.artist}
              fill
              className={`object-cover transition-transform duration-700 ${
                isPast ? "" : "group-hover:scale-105"
              }`}
              sizes="(max-width: 768px) 100vw, 33vw"
              loading="lazy"
              quality={75}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
        {isFeatured && !isPast && (
          <span className="absolute top-4 right-4 bg-[#7B4BB5] text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}
        {status && !isFeatured && (
          <span
            className={`absolute top-4 right-4 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              status === "Past event" || status === "Sold out"
                ? "bg-white/20 text-white"
                : "bg-white/90 text-black"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {/* Bottom: bloque oscuro con detalles tipo Zamna */}
      <div className="flex flex-col flex-1 p-6 bg-[#141414]">
        <span className="text-[10px] uppercase tracking-widest text-white/70 mb-1">
          {concert.venue}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
          {isMystery ? "Coming soon" : concert.artist}
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" />
            {concert.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            {concert.venue}
          </span>
        </div>
        {!isMystery && concert.minPrice > 0 && (
          <p className="text-white font-semibold mb-4">
            From ${concert.minPrice.toLocaleString("en-US")} MXN
          </p>
        )}
        <div className="mt-auto">
          <span
            className={`inline-block w-full text-center font-bold uppercase tracking-wider py-3 px-6 rounded-lg transition-all ${
              isPast || isMystery
                ? "bg-white/20 text-white/60 cursor-default"
                : "bg-black text-white border border-white/20 hover:bg-white hover:text-black"
            }`}
          >
            {isPast ? "Past event" : isMystery ? "Coming soon" : "Get Tickets"}
          </span>
        </div>
      </div>
    </article>
  );
}
