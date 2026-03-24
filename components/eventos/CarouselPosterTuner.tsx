"use client";

import { useState } from "react";
import { SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { useCarouselPosterSettings } from "./carousel-poster-settings";

function Row({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "px",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/80">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-white">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
    </label>
  );
}

export function CarouselPosterTuner() {
  const { settings, setSettings, reset } = useCarouselPosterSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-2 right-2 z-[60] md:bottom-4 md:right-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="liquid-glass flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/90 hover:text-white border border-white/20"
          aria-expanded={false}
          aria-controls="carousel-poster-tuner-panel"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Ajustar posters
        </button>
      ) : (
        <div
          id="carousel-poster-tuner-panel"
          className="liquid-glass w-[min(100vw-2rem,320px)] max-h-[min(70vh,520px)] overflow-y-auto border border-white/20 p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Vista en vivo
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-white/50 mb-3 leading-relaxed">
            Los valores se guardan en este navegador. Usa restablecer para volver
            a los predeterminados del sitio.
          </p>

          <div className="space-y-3">
            <Row
              label="Ancho tarjeta"
              value={settings.slideWidth}
              min={400}
              max={540}
              step={4}
              onChange={(slideWidth) => setSettings({ slideWidth })}
            />
            <Row
              label="Alto tarjeta (móvil)"
              value={settings.slideHeightMobile}
              min={460}
              max={640}
              step={4}
              onChange={(slideHeightMobile) => setSettings({ slideHeightMobile })}
            />
            <Row
              label="Alto tarjeta (escritorio)"
              value={settings.slideHeightDesktop}
              min={560}
              max={800}
              step={4}
              onChange={(slideHeightDesktop) =>
                setSettings({ slideHeightDesktop })
              }
            />
            <Row
              label="Altura mín. zona poster (móvil)"
              value={settings.posterMinHeightSm}
              min={200}
              max={400}
              step={4}
              onChange={(posterMinHeightSm) => setSettings({ posterMinHeightSm })}
            />
            <Row
              label="Altura mín. zona poster (desktop)"
              value={settings.posterMinHeightMd}
              min={280}
              max={520}
              step={4}
              onChange={(posterMinHeightMd) => setSettings({ posterMinHeightMd })}
            />

            <label className="flex flex-col gap-1 text-xs text-white/80">
              <span>Imagen (ajuste)</span>
              <select
                value={settings.imageObjectFit}
                onChange={(e) =>
                  setSettings({
                    imageObjectFit: e.target.value as "cover" | "contain",
                  })
                }
                className="bg-black/40 border border-white/20 rounded-md px-2 py-1.5 text-sm text-white"
              >
                <option value="cover">Rellenar (cover)</option>
                <option value="contain">Ver completo (contain)</option>
              </select>
            </label>

            <Row
              label="Profundidad 3D (coverflow)"
              value={settings.coverflowDepth}
              min={0}
              max={200}
              step={4}
              onChange={(coverflowDepth) => setSettings({ coverflowDepth })}
            />
            <Row
              label="Separación entre tarjetas"
              value={settings.coverflowStretch}
              min={24}
              max={80}
              step={2}
              onChange={(coverflowStretch) => setSettings({ coverflowStretch })}
            />
            <Row
              label="Intensidad efecto"
              value={Math.round(settings.coverflowModifier * 100)}
              min={60}
              max={100}
              step={5}
              suffix="%"
              onChange={(n) =>
                setSettings({ coverflowModifier: n / 100 })
              }
            />
          </div>

          <button
            type="button"
            onClick={() => {
              reset();
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-wider border border-white/25 text-white/80 hover:bg-white/10 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer predeterminados
          </button>
        </div>
      )}
    </div>
  );
}
