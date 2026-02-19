"use client";

import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

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

  if (!children || children.length === 0) return null;

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stage: padding horizontal para que el coverflow 3D no se corte; SIN overflow-hidden aquí */}
      <div className="w-full h-[600px] md:h-[700px] px-6 md:px-12">
        <Swiper
          onSwiper={setSwiper}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          watchSlidesProgress
          loop={children.length >= 3}
          speed={500}
          modules={[EffectCoverflow, Pagination, Autoplay]}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
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
                className={`!w-[92vw] !h-[496px] md:!w-[443px] md:!h-[650px] flex items-center justify-center [&>article]:w-full [&>article]:h-full`}
              >
                {child}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Indicador "Pausado" al hacer hover (estilo Bresh) */}
      {isHovered && children.length > 1 && (
        <div className="absolute top-2 right-4 md:top-4 md:right-8 bg-black/60 text-white text-xs uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
          Paused
        </div>
      )}

    </div>
  );
}
