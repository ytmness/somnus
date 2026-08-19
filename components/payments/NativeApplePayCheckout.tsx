"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApplePayEventsEnum } from "@capacitor-community/stripe";
import {
  APPLE_PAY_COUNTRY_CODE,
  APPLE_PAY_MERCHANT_ID,
} from "@/lib/native/apple-pay";

interface NativeApplePayCheckoutProps {
  saleId: string;
  amountInPesos: number;
  buyerEmail: string;
  buyerName: string;
  eventName: string;
  publishableKey: string;
  clientSecret: string;
  onUseCard: () => void;
}

export function NativeApplePayCheckout({
  saleId,
  amountInPesos,
  buyerEmail,
  buyerName,
  eventName,
  publishableKey,
  clientSecret,
  onUseCard,
}: NativeApplePayCheckoutProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applePayReady, setApplePayReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function probeApplePay() {
      try {
        const { Stripe } = await import("@capacitor-community/stripe");
        await Stripe.initialize({ publishableKey });
        await Stripe.isApplePayAvailable();
        if (!cancelled) setApplePayReady(true);
      } catch {
        if (!cancelled) setApplePayReady(false);
      }
    }

    void probeApplePay();
    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  async function payWithApplePay() {
    setSubmitting(true);
    setError(null);

    try {
      const { Stripe } = await import("@capacitor-community/stripe");

      await Stripe.initialize({ publishableKey });
      await Stripe.isApplePayAvailable();
      await Stripe.createApplePay({
        paymentIntentClientSecret: clientSecret,
        merchantIdentifier: APPLE_PAY_MERCHANT_ID,
        countryCode: APPLE_PAY_COUNTRY_CODE,
        currency: "MXN",
        paymentSummaryItems: [
          {
            label: eventName || "Somnus",
            amount: amountInPesos,
          },
        ],
      });

      const { paymentResult } = await Stripe.presentApplePay();

      if (paymentResult === ApplePayEventsEnum.Canceled) {
        setSubmitting(false);
        return;
      }

      if (paymentResult === ApplePayEventsEnum.Failed) {
        throw new Error("No se pudo completar el pago con Apple Pay");
      }

      if (paymentResult !== ApplePayEventsEnum.Completed) {
        throw new Error("No se pudo completar el pago con Apple Pay");
      }

      await routeAfterNativePayment(saleId, buyerEmail, router);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo completar el pago";
      setError(message);
      setSubmitting(false);
    }
  }

  if (applePayReady === null) {
    return (
      <div className="p-6 text-center text-white/70">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
        <p>Comprobando Apple Pay…</p>
      </div>
    );
  }

  if (applePayReady === false) {
    return (
      <div className="space-y-4">
        <p className="text-amber-300/90 text-sm">
          Apple Pay no está disponible en este dispositivo. Usa tarjeta para
          continuar.
        </p>
        <button
          type="button"
          onClick={onUseCard}
          className="w-full py-4 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors"
        >
          Pagar con tarjeta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white/5 border border-white/20 p-4">
        <p className="text-white/90 text-sm mb-2">{eventName}</p>
        <p className="text-2xl font-bold text-white">
          $
          {amountInPesos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
          MXN
        </p>
      </div>

      <div>
        <p className="text-white/90 text-sm mb-1">Datos del comprador</p>
        <p className="text-white/70 text-sm">{buyerName}</p>
        <p className="text-white/70 text-sm">{buyerEmail}</p>
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <button
        type="button"
        onClick={() => void payWithApplePay()}
        disabled={submitting}
        className="w-full min-h-12 py-4 bg-white text-black font-semibold tracking-wide hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
      >
        <AppleMark />
        {submitting ? "Procesando…" : "Pagar con Apple Pay"}
      </button>

      <button
        type="button"
        onClick={onUseCard}
        disabled={submitting}
        className="w-full text-sm text-white/60 hover:text-white underline-offset-4 hover:underline disabled:opacity-50"
      >
        Pagar con tarjeta
      </button>
    </div>
  );
}

async function routeAfterNativePayment(
  saleId: string,
  buyerEmail: string,
  router: ReturnType<typeof useRouter>
) {
  const res = await fetch(`/api/sales/${saleId}`, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  const sale = data?.data;

  if (
    sale?.approvalStatus === "PENDING" &&
    sale?.providerStatus === "requires_capture"
  ) {
    toast.success("Pago autorizado. Esperando aprobación del organizador.");
    router.push(`/checkout/${saleId}?authorized=1`);
    return;
  }

  if (sale?.status === "COMPLETED") {
    toast.success("¡Pago exitoso! Redirigiendo...");
    router.push(
      `/pago-exitoso?email=${encodeURIComponent(buyerEmail)}&saleId=${encodeURIComponent(saleId)}`
    );
    return;
  }

  toast.success("Pago enviado. Confirmando…");
  router.push(
    `/pago/estado?saleId=${encodeURIComponent(saleId)}`
  );
}

function AppleMark() {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 17"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.43 8.76c.02 2.18 1.91 2.91 1.93 2.92-.02.05-.3 1.04-.99 2.06-.6.88-1.22 1.76-2.2 1.78-.96.02-1.27-.57-2.37-.57-1.1 0-1.44.55-2.35.59-.94.04-1.66-1.01-2.27-1.89-1.24-1.8-2.19-5.08-.91-7.3.63-1.1 1.77-1.8 3-1.82.94-.02 1.82.63 2.37.63.55 0 1.59-.78 2.68-.67.46.02 1.74.18 2.57 1.39-.07.04-1.54.9-1.52 2.88ZM9.6 3.3c.51-.62.85-1.48.76-2.34-.73.03-1.62.49-2.14 1.1-.47.55-.88 1.43-.77 2.27.82.06 1.65-.42 2.15-1.03Z" />
    </svg>
  );
}
