"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

interface UpcomingEventsCarouselProps {
  children: React.ReactNode[];
  className?: string;
  /** Título a la izquierda (ej: "Cerca de ti") */
  title?: string;
  /** CTA a la derecha (ej: "Ver eventos →") */
  ctaLabel?: string;
  ctaHref?: string;
}

// Parámetros del coverflow
const COVERFLOW = {
  perspective: 1200,
  centerScale: 1.18,
  centerZ: 0,
  side1Scale: 0.95,
  side1Z: -80,
  side1RotateY: 10,
  side2Scale: 0.88,
  side2Z: -140,
  side2RotateY: 14,
  sideOpacity: 0.82,
  mobileCenterScale: 1.12,
  mobileSideScale: 0.9,
  mobileRotateY: 6,
} as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function UpcomingEventsCarousel({
  children,
  className = "",
  title,
  ctaLabel,
  ctaHref = "/#eventos",
}: UpcomingEventsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    skipSnaps: false,
    dragFree: false,
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number>(0);
  const isMobile = useIsMobile();

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

  // Actualizar scrollProgress para transición suave durante drag
  useEffect(() => {
    if (!emblaApi) return;
    const updateProgress = () => {
      rafRef.current = requestAnimationFrame(() => {
        setScrollProgress(emblaApi.scrollProgress());
      });
    };
    emblaApi.on("scroll", updateProgress);
    updateProgress();
    return () => {
      emblaApi.off("scroll", updateProgress);
      cancelAnimationFrame(rafRef.current);
    };
  }, [emblaApi]);

  // Auto-play: pausa al hacer hover
  useEffect(() => {
    if (!emblaApi || isHovered || children.length <= 1) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [emblaApi, isHovered, children.length]);

  if (!children || children.length === 0) return null;

  const count = children.length;
  const snapList = emblaApi?.scrollSnapList() ?? [];
  const totalRange =
    snapList.length > 1 ? snapList[snapList.length - 1] - snapList[0] : 0;
  const slideWidth =
    count > 1 && snapList.length > 1
      ? totalRange / (snapList.length - 1)
      : 300;
  const currentScroll =
    totalRange > 0
      ? scrollProgress * totalRange + (snapList[0] ?? 0)
      : selectedIndex * slideWidth;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  return (
    <div
      className={`relative w-full group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Event carousel"
    >
      {/* Header: título izquierda + CTA derecha (si se pasan props) */}
      {(title || ctaLabel) && (
        <div className="flex items-center justify-between mb-6 px-2">
          {title && (
            <h2 className="somnus-title-secondary text-xl md:text-2xl uppercase tracking-wider">
              {title}
            </h2>
          )}
          {ctaLabel && (
            <a
              href={ctaHref}
              className="somnus-text-body text-sm md:text-base font-medium hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              {ctaLabel}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Stage con padding lateral para ver cards parcialmente cortadas */}
      <div className="overflow-hidden pl-14 pr-14 md:pl-20 md:pr-20">
        <div
          className="overflow-hidden"
          ref={emblaRef}
          style={{ perspective: COVERFLOW.perspective }}
        >
          <div
            className="flex"
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            {children.map((child, index) => {
              let distance: number;
              if (snapList.length > 0 && slideWidth > 0) {
                const slideCenter = snapList[index] ?? index * slideWidth;
                distance = (slideCenter - currentScroll) / slideWidth;
              } else {
                distance = index - selectedIndex;
              }
              if (count > 2 && Math.abs(distance) > count / 2) {
                distance -= distance > 0 ? count : -count;
              }

              const absDist = Math.abs(distance);
              const sign = distance < 0 ? -1 : 1;
              const isCenter = absDist < 0.5;

              let scale: number;
              let translateZ: number;
              let rotateY: number;
              let opacity: number;
              let zIndex: number;

              const rotY = isMobile ? COVERFLOW.mobileRotateY : COVERFLOW.side1RotateY;
              const rotY2 = isMobile ? COVERFLOW.mobileRotateY : COVERFLOW.side2RotateY;
              const centerScl = isMobile ? COVERFLOW.mobileCenterScale : COVERFLOW.centerScale;
              const side1Scl = isMobile ? COVERFLOW.mobileSideScale : COVERFLOW.side1Scale;
              const side2Scl = isMobile ? COVERFLOW.mobileSideScale : COVERFLOW.side2Scale;

              if (isCenter) {
                scale = centerScl;
                translateZ = COVERFLOW.centerZ;
                rotateY = 0;
                opacity = 1;
                zIndex = 10;
              } else if (absDist <= 1.5) {
                const t = (absDist - 0.5) / 1;
                scale = lerp(centerScl, side1Scl, t);
                translateZ = lerp(COVERFLOW.centerZ, COVERFLOW.side1Z, t);
                rotateY = sign * lerp(0, rotY, t);
                opacity = lerp(1, COVERFLOW.sideOpacity, t);
                zIndex = 5;
              } else {
                const t = Math.min((absDist - 1.5) / 1, 1);
                scale = lerp(side1Scl, side2Scl, t);
                translateZ = lerp(COVERFLOW.side1Z, COVERFLOW.side2Z, t);
                rotateY = sign * lerp(rotY, rotY2, t);
                opacity = COVERFLOW.sideOpacity;
                zIndex = 1;
              }

              return (
                <div
                  key={index}
                  className="flex-[0_0_85%] min-w-0 shrink-0 pl-3 pr-3 md:flex-[0_0_42%] md:pl-4 md:pr-4 lg:flex-[0_0_36%] lg:pl-5 lg:pr-5"
                  style={{
                    zIndex,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="transition-transform duration-300 ease-out will-change-transform"
                    style={{
                      transform: `perspective(${COVERFLOW.perspective}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      transformStyle: "preserve-3d",
                      boxShadow: isCenter
                        ? "0 20px 40px -12px rgba(0,0,0,0.5)"
                        : "0 8px 24px -8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {child}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Indicador Pausado */}
      {isHovered && children.length > 1 && (
        <div className="absolute top-2 right-4 md:top-4 md:right-8 bg-black/60 text-white text-xs uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
          Paused
        </div>
      )}

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Carousel navigation">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            role="tab"
            aria-selected={index === selectedIndex}
            aria-label={`Go to slide ${index + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
              index === selectedIndex
                ? "bg-white scale-125"
                : "bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* Flechas - teclado + aria */}
      {children.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            onKeyDown={(e) => e.key === "Enter" && scrollPrev()}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-all z-10 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="Previous slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
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
            onKeyDown={(e) => e.key === "Enter" && scrollNext()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-all z-10 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="Next slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
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
