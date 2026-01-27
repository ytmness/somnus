import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Concert } from "./types";
import { Calendar, MapPin, Clock } from "lucide-react";

interface HeroCarouselProps {
  concerts: Concert[];
  onSelectConcert: (concert: Concert) => void;
}

export function HeroCarousel({ concerts, onSelectConcert }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: "center",
  });
  const [isHovered, setIsHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi || isHovered) return;

    const intervalId = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [emblaApi, isHovered]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {concerts.map((concert) => (
            <div
              key={concert.id}
              className="flex-[0_0_100%] min-w-0 relative"
            >
              <div
                className="relative h-[400px] md:h-[500px] overflow-hidden group cursor-pointer"
                onClick={() => onSelectConcert(concert)}
              >
                <img 
                  src={concert.image} 
                  alt={concert.artist}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                  <div className="max-w-4xl">
                    <p className="text-[#c4a905] text-sm md:text-base font-semibold mb-2 uppercase tracking-wider">
                      Evento Destacado
                    </p>
                    <h2 className="text-white text-4xl md:text-6xl font-bold mb-3">
                      {concert.artist}
                    </h2>
                    <p className="text-[#c4a905] text-xl md:text-2xl mb-6">
                      {concert.tour}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 md:gap-6 mb-6 text-white/90">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm md:text-base">{concert.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm md:text-base">{concert.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <span className="text-sm md:text-base">{concert.venue}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-white/70 text-sm">Desde</p>
                        <p className="text-[#c4a905] text-2xl md:text-3xl font-bold">
                          ${concert.minPrice.toLocaleString()} MXN
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectConcert(concert);
                        }}
                        className="px-6 py-3 bg-[#c4a905] text-[#f9fbf6] rounded-lg font-semibold hover:bg-[#d4b815] transition-colors"
                      >
                        Comprar Boletos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHovered && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#c4a905]/90 text-white flex items-center justify-center shadow-lg hover:bg-[#d4b815] transition-all z-10 backdrop-blur-sm"
            aria-label="Anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#c4a905]/90 text-white flex items-center justify-center shadow-lg hover:bg-[#d4b815] transition-all z-10 backdrop-blur-sm"
            aria-label="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {concerts.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`transition-all ${
              index === selectedIndex
                ? "w-8 h-2 bg-[#c4a905]"
                : "w-2 h-2 bg-white/50 hover:bg-white/80"
            } rounded-full`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>

      {isHovered && (
        <div className="absolute top-6 right-6 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm z-10">
          Pausado
        </div>
      )}
    </div>
  );
}


