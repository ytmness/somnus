"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";

interface StripeCheckoutFormProps {
  saleId: string;
  amountInPesos: number;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  eventName: string;
}

function CheckoutInner({
  saleId,
  buyerName,
  buyerEmail,
  amountInPesos,
  eventName,
}: {
  saleId: string;
  buyerName: string;
  buyerEmail: string;
  amountInPesos: number;
  eventName: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const returnUrl = `${window.location.origin}/pago/estado?saleId=${encodeURIComponent(saleId)}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: buyerName,
            email: buyerEmail,
          },
        },
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "No fue posible confirmar el pago");
      setSubmitting(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      toast.success("¡Pago exitoso! Redirigiendo...");
      router.push(
        `/pago-exitoso?email=${encodeURIComponent(buyerEmail)}&saleId=${encodeURIComponent(saleId)}`
      );
    } else {
      router.push(returnUrl);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-lg bg-white/5 border border-white/20 p-4">
        <p className="text-white/90 text-sm mb-2">{eventName}</p>
        <p className="text-2xl font-bold text-white">
          ${amountInPesos.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
        </p>
      </div>

      <div>
        <label className="block text-white/90 text-sm mb-2">Datos del comprador</label>
        <p className="text-white/70 text-sm">{buyerName}</p>
        <p className="text-white/70 text-sm">{buyerEmail}</p>
      </div>

      <div>
        <label className="block text-white/90 text-sm mb-2">Método de pago</label>
        <PaymentElement
          options={{
            defaultValues: {
              billingDetails: {
                name: buyerName,
                email: buyerEmail,
              },
            },
          }}
        />
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 rounded-lg bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Procesando..." : "Pagar"}
      </button>
    </form>
  );
}

export function StripeCheckoutForm(props: StripeCheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(
      publishableKey,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    );
  }, [publishableKey, stripeAccountId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const configRes = await fetch("/api/payments/stripe/public-config");
        const config = await configRes.json();
        if (!configRes.ok || !config.stripeEnabled || !config.publishableKey) {
          throw new Error("Stripe no está configurado en el servidor");
        }

        const res = await fetch("/api/payments/stripe/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saleId: props.saleId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudo iniciar el pago");
        }
        if (!cancelled) {
          setPublishableKey(config.publishableKey);
          setClientSecret(data.clientSecret);
          setStripeAccountId(data.stripeAccountId || null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cargar el pago";
        if (!cancelled) setLoadError(msg);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [props.saleId]);

  if (loadError) {
    return (
      <div className="p-6 text-center text-red-400">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="p-6 text-center text-white/70">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
        <p>Preparando pago seguro...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: { theme: "night" as const },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutInner
        saleId={props.saleId}
        buyerName={props.buyerName}
        buyerEmail={props.buyerEmail}
        amountInPesos={props.amountInPesos}
        eventName={props.eventName}
      />
    </Elements>
  );
}
