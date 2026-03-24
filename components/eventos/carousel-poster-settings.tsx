"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "somnus-carousel-poster-v2";

export type CarouselPosterSettings = {
  slideWidth: number;
  slideHeightMobile: number;
  slideHeightDesktop: number;
  posterMinHeightSm: number;
  posterMinHeightMd: number;
  imageObjectFit: "cover" | "contain";
  /** object-position horizontal 0–100 */
  imagePosX: number;
  /** object-position vertical 0–100 */
  imagePosY: number;
  /** Si true: arrastra sobre el póster para mover el encuadre */
  imageDragMode: boolean;
  coverflowDepth: number;
  coverflowStretch: number;
  coverflowModifier: number;
};

export const CAROUSEL_POSTER_DEFAULTS: CarouselPosterSettings = {
  slideWidth: 400,
  slideHeightMobile: 460,
  slideHeightDesktop: 744,
  posterMinHeightSm: 264,
  posterMinHeightMd: 496,
  imageObjectFit: "contain",
  imagePosX: 50,
  imagePosY: 50,
  imageDragMode: false,
  coverflowDepth: 180,
  coverflowStretch: 52,
  coverflowModifier: 0.9,
};

function loadStored(): CarouselPosterSettings {
  if (typeof window === "undefined") return CAROUSEL_POSTER_DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return CAROUSEL_POSTER_DEFAULTS;
    const p = JSON.parse(raw) as Partial<CarouselPosterSettings>;
    return { ...CAROUSEL_POSTER_DEFAULTS, ...p };
  } catch {
    return CAROUSEL_POSTER_DEFAULTS;
  }
}

type Ctx = {
  settings: CarouselPosterSettings;
  setSettings: (u: Partial<CarouselPosterSettings>) => void;
  reset: () => void;
};

const CarouselPosterContext = createContext<Ctx | null>(null);

export function CarouselPosterSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setState] = useState<CarouselPosterSettings>(
    CAROUSEL_POSTER_DEFAULTS
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadStored());
    setHydrated(true);
  }, []);

  const setSettings = useCallback((u: Partial<CarouselPosterSettings>) => {
    setState((prev) => {
      const next = { ...prev, ...u };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(CAROUSEL_POSTER_DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ settings, setSettings, reset }),
    [settings, setSettings, reset]
  );

  if (!hydrated) {
    return (
      <CarouselPosterContext.Provider value={value}>
        {children}
      </CarouselPosterContext.Provider>
    );
  }

  return (
    <CarouselPosterContext.Provider value={value}>
      {children}
    </CarouselPosterContext.Provider>
  );
}

export function useCarouselPosterSettings() {
  const ctx = useContext(CarouselPosterContext);
  if (!ctx) {
    throw new Error(
      "useCarouselPosterSettings debe usarse dentro de CarouselPosterSettingsProvider"
    );
  }
  return ctx;
}

/** Para tarjetas: null si no hay provider (usa estáticos). */
export function useCarouselPosterSettingsOptional(): CarouselPosterSettings | null {
  const ctx = useContext(CarouselPosterContext);
  return ctx?.settings ?? null;
}

/** Settings + setSettings para arrastre en tarjetas; null fuera del provider. */
export function useCarouselPosterOptional(): {
  settings: CarouselPosterSettings;
  setSettings: (u: Partial<CarouselPosterSettings>) => void;
} | null {
  const ctx = useContext(CarouselPosterContext);
  if (!ctx) return null;
  return { settings: ctx.settings, setSettings: ctx.setSettings };
}
