"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isNativeIOS } from "@/lib/native/platform";
import {
  APPLE_PAY_COUNTRY_CODE,
  APPLE_PAY_MERCHANT_ID,
} from "@/lib/native/apple-pay";
import {
  ApplePayResult,
  NativeStripe,
} from "@/lib/native/stripe-plugin";

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

const CREATE_TIMEOUT_MS = 12000;
const PRESENT_TIMEOUT_MS = 90000;

/**
 * Apple Pay nativo vía el plugin Capacitor Stripe (inyectado por la app).
 * El sheet se parchea en scripts/ios-patch-stripe-apple-pay.cjs en Codemagic.
 */
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
  const [status, setStatus] = useState<string | null>(null);

  async function payWithApplePay() {
    setSubmitting(true);
    setError(null);
    setStatus("Abriendo Apple Pay…");

    try {
      if (!isNativeIOS()) {
        throw new Error(
          "Apple Pay nativo solo funciona dentro de la app Somnus."
        );
      }

      const amount = (Math.round(Number(amountInPesos) * 100) / 100).toFixed(2);
      const lineLabel = (eventName || "Somnus").slice(0, 64);

      setStatus("Preparando pago…");
      await NativeStripe.initialize({ publishableKey });

      await withTimeout(
        NativeStripe.createApplePay({
          paymentIntentClientSecret: clientSecret,
          merchantIdentifier: APPLE_PAY_MERCHANT_ID,
          countryCode: APPLE_PAY_COUNTRY_CODE,
          currency: "MXN",
          paymentSummaryItems: [
            { label: lineLabel, amount },
            { label: "Somnus", amount },
          ],
        }),
        CREATE_TIMEOUT_MS,
        "Apple Pay no respondió al preparar el pago. Actualiza la app desde TestFlight o paga con tarjeta."
      );

      setStatus("Confirma el pago en Wallet…");
      const result = await withTimeout(
        NativeStripe.presentApplePay(),
        PRESENT_TIMEOUT_MS,
        "Apple Pay no abrió el Wallet. Cierra la app por completo, instala el último build de TestFlight e inténtalo otra vez."
      );

      const paymentResult = result?.paymentResult;
      if (paymentResult === ApplePayResult.Canceled) {
        setStatus(null);
        setSubmitting(false);
        return;
      }

      if (paymentResult !== ApplePayResult.Completed) {
        throw new Error("No se pudo completar el pago con Apple Pay");
      }

      setStatus("Pago autorizado. Confirmando…");
      await routeAfterNativePayment(saleId, buyerEmail, router);
    } catch (err: unknown) {
      const message = formatApplePayError(err);
      console.error("[NativeApplePayCheckout]", err);
      setError(message);
      setStatus(null);
      toast.error(message);
      setSubmitting(false);
    }
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

      {status ? <p className="text-white/80 text-sm">{status}</p> : null}
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

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function formatApplePayError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "No se pudo completar el pago";

  const lower = raw.toLowerCase();
  if (
    lower.includes("can not use on this device") ||
    lower.includes("cannot use on this device")
  ) {
    return "Apple Pay no pudo usar las tarjetas del Wallet. Prueba con Visa/Mastercard/Amex o paga con tarjeta.";
  }
  if (
    lower.includes("not implemented") ||
    lower.includes("unimplemented") ||
    lower.includes("unavailable")
  ) {
    return "Este build de la app no trae Apple Pay nativo. Actualiza desde TestFlight o paga con tarjeta.";
  }
  if (lower.includes("could not be parsed") || lower.includes("summary")) {
    return "No se pudo armar el cobro de Apple Pay. Paga con tarjeta o actualiza la app.";
  }
  if (lower.includes("no root view controller")) {
    return "No se pudo abrir Apple Pay en esta pantalla. Cierra la app por completo, ábrela de nuevo e intenta otra vez.";
  }
  if (lower.includes("stpapplepaycontext")) {
    return "Apple Pay no está bien configurado (merchant ID). Contacta soporte o paga con tarjeta.";
  }
  return raw;
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
  router.push(`/pago/estado?saleId=${encodeURIComponent(saleId)}`);
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
