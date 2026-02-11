import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Concert } from "./types";
import { ConcertCard } from "./ConcertCard";

interface ConcertCarouselProps {
  concerts: Concert[];
  onSelectConcert: (concert: Concert) => void;
}

export function ConcertCarousel({ concerts, onSelectConcert }: ConcertCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: "start",
    skipSnaps: false,
  });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!emblaApi || isHovered) return;

    const intervalId = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [emblaApi, isHovered]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {concerts.map((concert) => (
            <div
              key={concert.id}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-3 pr-3"
            >
              <ConcertCard
                concert={concert}
                onSelectConcert={onSelectConcert}
              />
            </div>
          ))}
        </div>
      </div>

      {isHovered && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#c4a905] text-white flex items-center justify-center shadow-lg hover:bg-[#d4b815] transition-all z-10"
            aria-label="Anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <button
            onClick={scrollNext}
            className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#c4a905] text-white flex items-center justify-center shadow-lg hover:bg-[#d4b815] transition-all z-10"
            aria-label="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {isHovered && (
        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
          Pausado
        </div>
      )}
    </div>
  );
}


