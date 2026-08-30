"use client";

import { isNativeAndroid } from "@/lib/native/platform";

interface NativeGooglePayCheckoutProps {
  /** Reservado para el futuro Payment Sheet de Capacitor Stripe. */
  saleId?: string;
  amountInPesos?: number;
  onUseCard?: () => void;
}

/**
 * Stub de Google Pay nativo (Android / Capacitor).
 *
 * En web, Google Pay ya puede aparecer automáticamente vía Stripe Payment Element
 * cuando el dominio está verificado en el Dashboard de Stripe.
 * El sheet nativo de Capacitor se cableará cuando exista `@capacitor/android`
 * y el plugin Stripe lo soporte de forma estable — por ahora no-op fuera de Android
 * y mensaje "próximamente" en Android nativo.
 */
export function NativeGooglePayCheckout({
  onUseCard,
}: NativeGooglePayCheckoutProps) {
  if (typeof window === "undefined") return null;
  if (!isNativeAndroid()) return null;

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
      <p className="text-white/80 text-sm">
        Google Pay nativo estará disponible pronto. Mientras tanto usa tarjeta o
        Google Pay en el formulario web (Payment Element).
      </p>
      {onUseCard ? (
        <button
          type="button"
          onClick={onUseCard}
          className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors"
        >
          Pagar con tarjeta
        </button>
      ) : (
        <p className="text-white/50 text-xs text-center">Coming soon</p>
      )}
    </div>
  );
}
