"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useRef, useState } from "react";
import type { CarouselPosterSettings } from "./carousel-poster-settings";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Props = {
  src: ImageProps["src"];
  alt: string;
  sizes: string;
  quality?: number;
  /** Desactiva hover scale (p. ej. modo arrastre) */
  disableHoverScale?: boolean;
  settings: CarouselPosterSettings;
  setSettings: (u: Partial<CarouselPosterSettings>) => void;
  /** Devuelve true si hubo arrastre (evitar abrir evento al soltar) */
  onDragEndRef: React.MutableRefObject<boolean>;
};

/**
 * Imagen del póster en carrusel: object-position + arrastre opcional.
 */
export function CarouselPosterImage({
  src,
  alt,
  sizes,
  quality = 75,
  disableHoverScale = false,
  settings,
  setSettings,
  onDragEndRef,
}: Props) {
  /** Durante arrastre: vista local; evita setSettings en cada pointermove (rompía Swiper). */
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(
    null
  );
  const lastPreviewRef = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 50,
    origY: 50,
    pointerId: -1,
  });

  const fitClass =
    settings.imageObjectFit === "contain"
      ? "object-contain"
      : "object-cover";

  const objectPosition = dragPreview
    ? `${dragPreview.x}% ${dragPreview.y}%`
    : `${settings.imagePosX}% ${settings.imagePosY}%`;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!settings.imageDragMode) return;
      e.preventDefault();
      onDragEndRef.current = false;
      lastPreviewRef.current = null;
      setDragPreview(null);
      drag.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: settings.imagePosX,
        origY: settings.imagePosY,
        pointerId: e.pointerId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [settings.imageDragMode, settings.imagePosX, settings.imagePosY, onDragEndRef]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active || e.pointerId !== drag.current.pointerId) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      const sens = 0.22;
      const nx = clamp(drag.current.origX - dx * sens, 0, 100);
      const ny = clamp(drag.current.origY - dy * sens, 0, 100);
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) onDragEndRef.current = true;
      const next = { x: nx, y: ny };
      lastPreviewRef.current = next;
      setDragPreview(next);
    },
    [onDragEndRef]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active || e.pointerId !== drag.current.pointerId) return;
      drag.current.active = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = lastPreviewRef.current;
      lastPreviewRef.current = null;
      if (p) setSettings({ imagePosX: p.x, imagePosY: p.y });
      setDragPreview(null);
    },
    [setSettings]
  );

  const wrapperClass = settings.imageDragMode
    ? "absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    : "absolute inset-0";

  return (
    <div
      className={wrapperClass}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`${fitClass} select-none ${
          disableHoverScale ? "" : "transition-transform duration-700 group-hover:scale-105"
        }`}
        style={{ objectPosition }}
        sizes={sizes}
        loading="lazy"
        quality={quality}
        draggable={false}
      />
    </div>
  );
}
