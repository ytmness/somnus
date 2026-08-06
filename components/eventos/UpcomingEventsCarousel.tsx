"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CarouselPosterSettingsProvider,
  useCarouselLayout,
} from "./carousel-poster-settings";
import { CarouselPosterTuner } from "./CarouselPosterTuner";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

export interface UpcomingEventsCarouselProps {
  children: React.ReactNode[];
  className?: string;
  /** Panel de ajustes del póster (solo hace falta una vez por página) */
  showPosterTuner?: boolean;
}

function UpcomingEventsCarouselInner({
  children,
  className = "",
  showPosterTuner = true,
}: UpcomingEventsCarouselProps) {
  const layout = useCarouselLayout();
  const uniqueCount = children.length;

  /** Bastantes repeticiones del set único: vecinos a ambos lados + loop continuo */
  const loopRepeats =
    uniqueCount <= 1 ? 1 : Math.max(5, Math.ceil(28 / uniqueCount));

  const initialSlideIndex =
    uniqueCount <= 1
      ? 0
      : Math.floor(loopRepeats / 2) * uniqueCount +
        Math.floor(uniqueCount / 2);

  const slideNodes =
    uniqueCount <= 1
      ? children
      : Array.from({ length: loopRepeats }, () => children).flat();

  const loopAdditionalSlides = Math.max(uniqueCount * 3, 16);

  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasInitialized = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!swiper || isHovered || uniqueCount <= 1 || prefersReducedMotion) {
      swiper?.autoplay?.stop();
      return;
    }
    swiper.autoplay?.start();
    return () => {
      swiper.autoplay?.stop();
    };
  }, [swiper, isHovered, uniqueCount, prefersReducedMotion]);

  useEffect(() => {
    if (swiper && isHovered) swiper.autoplay?.stop();
  }, [swiper, isHovered]);

  const coverflowEffect = useMemo(
    () => ({
      rotate: 0,
      stretch: layout.coverflowStretch,
      depth: layout.coverflowDepth,
      modifier: layout.coverflowModifier,
      slideShadows: false,
    }),
    [
      layout.coverflowStretch,
      layout.coverflowDepth,
      layout.coverflowModifier,
    ]
  );

  useEffect(() => {
    hasInitialized.current = false;
  }, [uniqueCount, loopRepeats]);

  useEffect(() => {
    if (!swiper || uniqueCount < 2 || hasInitialized.current) return;
    hasInitialized.current = true;
    const timer = setTimeout(() => {
      swiper.slideTo(initialSlideIndex, 0);
      swiper.update();
      setActiveIndex(Math.floor(uniqueCount / 2));
    }, 50);
    return () => clearTimeout(timer);
  }, [swiper, uniqueCount, initialSlideIndex]);

  if (!children || uniqueCount === 0) return null;

  const stageMinSm = Math.max(layout.slideHeightMobile + 72, 560);
  const stageMinMd = Math.max(layout.slideHeightDesktop + 72, 640);

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showPosterTuner ? <CarouselPosterTuner /> : null}

      {uniqueCount > 1 && swiper && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiper.slidePrev();
            }}
            aria-label="Previous"
            className="somnus-nav-link absolute -left-4 md:-left-12 lg:-left-16 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition-colors border border-white/20 pointer-events-auto cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiper.slideNext();
            }}
            aria-label="Next"
            className="somnus-nav-link absolute -right-4 md:-right-12 lg:-right-16 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition-colors border border-white/20 pointer-events-auto cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 md:w-7 md:h-7" aria-hidden />
          </button>
        </>
      )}

      <div
        className="w-full px-14 md:px-20 lg:px-28 min-h-[var(--carousel-stage-sm)] md:min-h-[var(--carousel-stage-md)]"
        style={
          {
            "--carousel-stage-sm": `${stageMinSm}px`,
            "--carousel-stage-md": `${stageMinMd}px`,
          } as React.CSSProperties
        }
      >
        <Swiper
          onSwiper={setSwiper}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          watchSlidesProgress
          loop={uniqueCount >= 2}
          loopAdditionalSlides={loopAdditionalSlides}
          initialSlide={initialSlideIndex}
          speed={500}
          modules={[EffectCoverflow, Pagination, Autoplay]}
          coverflowEffect={coverflowEffect}
          pagination={false}
          onSlideChange={(s) => setActiveIndex(s.realIndex % uniqueCount)}
          autoplay={
            uniqueCount > 1 && !prefersReducedMotion
              ? { delay: 4000, disableOnInteraction: false }
              : false
          }
          className="!overflow-visible events-carousel-swiper"
        >
          {slideNodes.map((child, i) => (
            <SwiperSlide key={i} className="!w-auto">
              <div
                className="flex items-center justify-center [&>article]:w-full [&>article]:h-full w-[min(92vw,var(--carousel-sw))] h-[var(--carousel-sh)] md:h-[var(--carousel-sh-md)]"
                style={
                  {
                    "--carousel-sw": `${layout.slideWidth}px`,
                    "--carousel-sh": `${layout.slideHeightMobile}px`,
                    "--carousel-sh-md": `${layout.slideHeightDesktop}px`,
                  } as React.CSSProperties
                }
              >
                {child}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {uniqueCount > 1 && (
        <div className="flex justify-center gap-1 mt-6" role="tablist" aria-label="Slides">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              onClick={() => swiper?.slideToLoop(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="somnus-nav-link flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              <span
                className={`block w-2 h-2 rounded-full transition-transform ${
                  activeIndex === i
                    ? "bg-white scale-125"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type StandaloneCarouselProps = UpcomingEventsCarouselProps & {
  /**
   * Si es false, el carrusel debe ir dentro de un `CarouselPosterSettingsProvider`
   * (p. ej. varios carruseles comparten tamaños/coverflow).
   */
  standaloneSettingsProvider?: boolean;
};

export function UpcomingEventsCarousel({
  standaloneSettingsProvider = true,
  ...props
}: StandaloneCarouselProps) {
  const inner = <UpcomingEventsCarouselInner {...props} />;
  if (!standaloneSettingsProvider) return inner;
  return (
    <CarouselPosterSettingsProvider>{inner}</CarouselPosterSettingsProvider>
  );
}
