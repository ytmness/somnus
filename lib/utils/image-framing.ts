import type { CSSProperties } from "react";

/** Shared poster framing (object-position % + CSS scale). */

export type ImageFraming = {
  posX: number;
  posY: number;
  zoom: number;
};

export const DEFAULT_IMAGE_FRAMING: ImageFraming = {
  posX: 50,
  posY: 50,
  zoom: 1,
};

export const IMAGE_ZOOM_MIN = 1;
export const IMAGE_ZOOM_MAX = 2.5;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeImageFraming(
  partial?: Partial<ImageFraming> | null
): ImageFraming {
  return {
    posX: clamp(Number(partial?.posX ?? DEFAULT_IMAGE_FRAMING.posX) || 50, 0, 100),
    posY: clamp(Number(partial?.posY ?? DEFAULT_IMAGE_FRAMING.posY) || 50, 0, 100),
    zoom: clamp(
      Number(partial?.zoom ?? DEFAULT_IMAGE_FRAMING.zoom) || 1,
      IMAGE_ZOOM_MIN,
      IMAGE_ZOOM_MAX
    ),
  };
}

/** Inline styles for an object-cover poster image with pan + zoom. */
export function imageFramingStyle(framing: ImageFraming): CSSProperties {
  const f = normalizeImageFraming(framing);
  return {
    objectPosition: `${f.posX}% ${f.posY}%`,
    transform: `scale(${f.zoom})`,
    transformOrigin: `${f.posX}% ${f.posY}%`,
  };
}
