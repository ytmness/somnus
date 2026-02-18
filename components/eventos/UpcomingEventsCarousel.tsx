"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface UpcomingEventsCarouselProps {
  children: React.ReactNode[];
  className?: string;
}

export function UpcomingEventsCarousel({
  children,
  className = "",
}: UpcomingEventsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    containScroll: "trimSnaps",
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Auto-play: va cambiando solo cada 4 segundos (pausa al hacer hover)
  useEffect(() => {
    if (!emblaApi || isHovered || children.length <= 1) return;
    const interval = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [emblaApi, isHovered, children.length]);

  if (!children || children.length === 0) return null;

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden px-2" ref={emblaRef}>
        <div className="flex touch-pan-y" style={{ marginLeft: "-0.5rem" }}>
          {children.map((child, index) => {
            const isActive = index === selectedIndex;
            return (
              <div
                key={index}
                className="flex-[0_0_80%] min-w-0 shrink-0 px-2 md:flex-[0_0_44%] lg:flex-[0_0_40%]"
                style={{
                  marginRight: "-2.5rem",
                  zIndex: isActive ? 10 : 1,
                }}
              >
                <div
                  className={`transition-transform duration-500 ease-out ${
                    isActive ? "scale-[1.02]" : "scale-95 opacity-90"
                  }`}
                >
                  {child}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicador "Pausado" al hacer hover (estilo Bresh) */}
      {isHovered && children.length > 1 && (
        <div className="absolute top-2 right-4 md:top-4 md:right-8 bg-black/60 text-white text-xs uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
          Paused
        </div>
      )}

      {/* Pagination dots - estilo Bresh */}
      <div className="flex justify-center gap-2 mt-8">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? "bg-white scale-125"
                : "bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Flechas opcionales - visible en hover en desktop */}
      {children.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center opacity-0 md:group-hover:opacity-100 md:opacity-60 transition-opacity z-10"
            aria-label="Previous"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center opacity-0 md:group-hover:opacity-100 md:opacity-60 transition-opacity z-10"
            aria-label="Next"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
