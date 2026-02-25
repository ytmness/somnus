"use client";

import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

interface UpcomingEventsCarouselProps {
  children: React.ReactNode[];
  className?: string;
}

export function UpcomingEventsCarousel({
  children,
  className = "",
}: UpcomingEventsCarouselProps) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!swiper || isHovered || children.length <= 1) return;
    swiper.autoplay?.start();
    return () => {
      swiper.autoplay?.stop();
    };
  }, [swiper, isHovered, children.length]);

  useEffect(() => {
    if (swiper && isHovered) swiper.autoplay?.stop();
  }, [swiper, isHovered]);

  // Forzar posición centrada al cargar (evita desplazamiento a la izquierda en refresh)
  useEffect(() => {
    if (!swiper || children.length < 2) return;
    const centerIndex = Math.floor(children.length / 2);
    const fixPosition = () => {
      swiper.slideTo(centerIndex, 0);
      swiper.update();
    };
    const timer = setTimeout(fixPosition, 50);
    return () => clearTimeout(timer);
  }, [swiper, children.length]);

  if (!children || children.length === 0) return null;

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Botones de navegación - posicionados en los costados */}
      {children.length > 1 && swiper && (
        <>
          <button
            type="button"
            onClick={() => swiper.slidePrev()}
            aria-label="Anterior"
            className="absolute -left-2 md:-left-6 lg:-left-8 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors border border-white/15"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            type="button"
            onClick={() => swiper.slideNext()}
            aria-label="Siguiente"
            className="absolute -right-2 md:-right-6 lg:-right-8 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors border border-white/15"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Stage: padding horizontal para que el coverflow 3D no se corte; SIN overflow-hidden aquí */}
      <div className="w-full h-[600px] md:h-[700px] px-14 md:px-20 lg:px-28">
        <Swiper
          onSwiper={setSwiper}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          watchSlidesProgress
          loop={children.length >= 3}
          loopAdditionalSlides={Math.max(5, children.length)}
          initialSlide={Math.floor(children.length / 2)}
          speed={500}
          observer
          observeParents
          modules={[EffectCoverflow, Pagination, Autoplay]}
          coverflowEffect={{
            rotate: 0,
            stretch: 20,
            depth: 200,
            modifier: 1,
            slideShadows: false,
          }}
          pagination={{ clickable: true }}
          autoplay={
            children.length > 1
              ? { delay: 4000, disableOnInteraction: false }
              : false
          }
          className="!overflow-visible events-carousel-swiper"
        >
          {children.map((child, index) => (
            <SwiperSlide key={index} className="!w-auto">
              <div
                className={`!w-[min(92vw,443px)] !h-[496px] md:!w-[443px] md:!h-[650px] flex items-center justify-center [&>article]:w-full [&>article]:h-full`}
              >
                {child}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </div>
  );
}
