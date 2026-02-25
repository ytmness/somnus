"use client";

import { useState, useEffect, useRef } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const hasInitialized = useRef(false);

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

  // Forzar posición centrada SOLO al cargar una vez (evita que slidePrev reseteé)
  useEffect(() => {
    if (!swiper || children.length < 2 || hasInitialized.current) return;
    hasInitialized.current = true;
    const centerIndex = children.length + Math.floor(children.length / 2);
    const timer = setTimeout(() => {
      swiper.slideTo(centerIndex, 0);
      swiper.update();
      setActiveIndex(Math.floor(children.length / 2));
    }, 50);
    return () => clearTimeout(timer);
  }, [swiper, children.length]);

  if (!children || children.length === 0) return null;

  // Duplicar slides para que Swiper tenga suficientes en loop (requiere slides >= slidesPerView*2)
  const slidesForLoop = [...children, ...children, ...children];

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Botones de navegación - posicionados en los costados, z-50 para que no los tape nada */}
      {children.length > 1 && swiper && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiper.slidePrev();
            }}
            aria-label="Anterior"
            className="absolute -left-4 md:-left-12 lg:-left-16 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition-colors border border-white/20 pointer-events-auto cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiper.slideNext();
            }}
            aria-label="Siguiente"
            className="absolute -right-4 md:-right-12 lg:-right-16 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition-colors border border-white/20 pointer-events-auto cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
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
          loop={children.length >= 2}
          loopAdditionalSlides={children.length}
          initialSlide={children.length + Math.floor(children.length / 2)}
          speed={500}
          modules={[EffectCoverflow, Pagination, Autoplay]}
          coverflowEffect={{
            rotate: 0,
            stretch: 20,
            depth: 200,
            modifier: 1,
            slideShadows: false,
          }}
          pagination={false}
          onSlideChange={(s) => setActiveIndex(s.realIndex % children.length)}
          autoplay={
            children.length > 1
              ? { delay: 4000, disableOnInteraction: false }
              : false
          }
          className="!overflow-visible events-carousel-swiper"
        >
          {slidesForLoop.map((child, i) => (
            <SwiperSlide key={i} className="!w-auto">
              <div
                className={`!w-[min(92vw,443px)] !h-[496px] md:!w-[443px] md:!h-[650px] flex items-center justify-center [&>article]:w-full [&>article]:h-full`}
              >
                {child}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Paginación custom: 5 bullets según eventos únicos */}
      {children.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => swiper?.slideToLoop(i)}
              aria-label={`Ir a slide ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                activeIndex === i
                  ? "bg-white scale-125"
                  : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
