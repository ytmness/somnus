"use client";

import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import type { GalleryEvent } from "@/lib/gallery-events";

interface GalleryEventCardZamnaProps {
  event: GalleryEvent;
  onSelect: () => void;
}

export function GalleryEventCardZamna({ event, onSelect }: GalleryEventCardZamnaProps) {
  return (
    <article
      onClick={onSelect}
      className="group relative overflow-hidden rounded-2xl bg-[#1a1a1a] flex flex-col cursor-pointer border border-white/15 hover:border-white/25 transition-colors"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={event.image}
          alt={event.artist}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
          quality={75}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col flex-1 p-6 bg-[#141414]">
        <span className="text-[10px] uppercase tracking-widest text-white/70 mb-1">
          {event.venue}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
          {event.artist}
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" />
            {event.date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            {event.venue}
          </span>
        </div>
        <div className="mt-auto">
          <span className="inline-block w-full text-center font-bold uppercase tracking-wider py-3 px-6 rounded-lg bg-black text-white border border-white/20 hover:bg-white hover:text-black transition-all">
            View gallery
          </span>
        </div>
      </div>
    </article>
  );
}
