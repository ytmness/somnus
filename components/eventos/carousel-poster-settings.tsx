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
  imagePosX: number;
  imagePosY: number;
  imageDragMode: boolean;
  coverflowDepth: number;
  coverflowStretch: number;
  coverflowModifier: number;
};

/** Solo lo que usa Swiper / tamaños: cambios aquí no deben mezclarse con encuadre en cada frame */
export type CarouselLayoutSettings = Pick<
  CarouselPosterSettings,
  | "slideWidth"
  | "slideHeightMobile"
  | "slideHeightDesktop"
  | "posterMinHeightSm"
  | "posterMinHeightMd"
  | "coverflowDepth"
  | "coverflowStretch"
  | "coverflowModifier"
>;

export type CarouselFramingSettings = Pick<
  CarouselPosterSettings,
  "imageObjectFit" | "imagePosX" | "imagePosY" | "imageDragMode"
>;

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

function toLayout(s: CarouselPosterSettings): CarouselLayoutSettings {
  return {
    slideWidth: s.slideWidth,
    slideHeightMobile: s.slideHeightMobile,
    slideHeightDesktop: s.slideHeightDesktop,
    posterMinHeightSm: s.posterMinHeightSm,
    posterMinHeightMd: s.posterMinHeightMd,
    coverflowDepth: s.coverflowDepth,
    coverflowStretch: s.coverflowStretch,
    coverflowModifier: s.coverflowModifier,
  };
}

function toFraming(s: CarouselPosterSettings): CarouselFramingSettings {
  return {
    imageObjectFit: s.imageObjectFit,
    imagePosX: s.imagePosX,
    imagePosY: s.imagePosY,
    imageDragMode: s.imageDragMode,
  };
}

function mergeFull(
  layout: CarouselLayoutSettings,
  framing: CarouselFramingSettings
): CarouselPosterSettings {
  return { ...layout, ...framing };
}

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

const LayoutContext = createContext<CarouselLayoutSettings | null>(null);
const FramingContext = createContext<CarouselFramingSettings | null>(null);

type DispatchCtx = {
  setSettings: (u: Partial<CarouselPosterSettings>) => void;
  reset: () => void;
};

const PosterDispatchContext = createContext<DispatchCtx | null>(null);

const LAYOUT_KEYS: (keyof CarouselLayoutSettings)[] = [
  "slideWidth",
  "slideHeightMobile",
  "slideHeightDesktop",
  "posterMinHeightSm",
  "posterMinHeightMd",
  "coverflowDepth",
  "coverflowStretch",
  "coverflowModifier",
];

const FRAMING_KEYS: (keyof CarouselFramingSettings)[] = [
  "imageObjectFit",
  "imagePosX",
  "imagePosY",
  "imageDragMode",
];

function pickLayoutPatch(
  u: Partial<CarouselPosterSettings>
): Partial<CarouselLayoutSettings> {
  const out: Partial<CarouselLayoutSettings> = {};
  for (const k of LAYOUT_KEYS) {
    if (k in u && u[k] !== undefined) {
      (out as Record<string, unknown>)[k] = u[k];
    }
  }
  return out;
}

function pickFramingPatch(
  u: Partial<CarouselPosterSettings>
): Partial<CarouselFramingSettings> {
  const out: Partial<CarouselFramingSettings> = {};
  for (const k of FRAMING_KEYS) {
    if (k in u && u[k] !== undefined) {
      (out as Record<string, unknown>)[k] = u[k];
    }
  }
  return out;
}

export function CarouselPosterSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [layout, setLayout] = useState<CarouselLayoutSettings>(() =>
    toLayout(CAROUSEL_POSTER_DEFAULTS)
  );
  const [framing, setFraming] = useState<CarouselFramingSettings>(() =>
    toFraming(CAROUSEL_POSTER_DEFAULTS)
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const full = loadStored();
    setLayout(toLayout(full));
    setFraming(toFraming(full));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(mergeFull(layout, framing))
      );
    } catch {
      /* ignore */
    }
  }, [layout, framing, hydrated]);

  const setSettings = useCallback((u: Partial<CarouselPosterSettings>) => {
    const lp = pickLayoutPatch(u);
    const fp = pickFramingPatch(u);
    if (Object.keys(lp).length > 0) {
      setLayout((prev) => ({ ...prev, ...lp }));
    }
    if (Object.keys(fp).length > 0) {
      setFraming((prev) => ({ ...prev, ...fp }));
    }
  }, []);

  const reset = useCallback(() => {
    setLayout(toLayout(CAROUSEL_POSTER_DEFAULTS));
    setFraming(toFraming(CAROUSEL_POSTER_DEFAULTS));
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const dispatchValue = useMemo(
    () => ({ setSettings, reset }),
    [setSettings, reset]
  );

  return (
    <LayoutContext.Provider value={layout}>
      <FramingContext.Provider value={framing}>
        <PosterDispatchContext.Provider value={dispatchValue}>
          {children}
        </PosterDispatchContext.Provider>
      </FramingContext.Provider>
    </LayoutContext.Provider>
  );
}

/** Swiper y contenedor: no se re-renderiza al mover solo el encuadre de la imagen */
export function useCarouselLayout(): CarouselLayoutSettings {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error(
      "useCarouselLayout debe usarse dentro de CarouselPosterSettingsProvider"
    );
  }
  return ctx;
}

export function useCarouselFraming(): CarouselFramingSettings {
  const ctx = useContext(FramingContext);
  if (!ctx) {
    throw new Error(
      "useCarouselFraming debe usarse dentro de CarouselPosterSettingsProvider"
    );
  }
  return ctx;
}

export function usePosterDispatch(): DispatchCtx {
  const ctx = useContext(PosterDispatchContext);
  if (!ctx) {
    throw new Error(
      "usePosterDispatch debe usarse dentro de CarouselPosterSettingsProvider"
    );
  }
  return ctx;
}

/** Panel de ajustes: vista combinada */
export function useCarouselPosterSettings() {
  const layout = useCarouselLayout();
  const framing = useCarouselFraming();
  const { setSettings, reset } = usePosterDispatch();
  const settings = useMemo(
    () => mergeFull(layout, framing),
    [layout, framing]
  );
  return { settings, setSettings, reset };
}

export function useCarouselPosterSettingsOptional(): CarouselPosterSettings | null {
  const layout = useContext(LayoutContext);
  const framing = useContext(FramingContext);
  if (!layout || !framing) return null;
  return mergeFull(layout, framing);
}

export function useCarouselPosterOptional(): {
  settings: CarouselPosterSettings;
  setSettings: (u: Partial<CarouselPosterSettings>) => void;
} | null {
  const layout = useContext(LayoutContext);
  const framing = useContext(FramingContext);
  const dispatch = useContext(PosterDispatchContext);
  if (!layout || !framing || !dispatch) return null;
  return {
    settings: mergeFull(layout, framing),
    setSettings: dispatch.setSettings,
  };
}
