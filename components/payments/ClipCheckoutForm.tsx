"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CLIP_SDK_URL = "https://sdk.clip.mx/js/clip-sdk.js";

interface ClipCheckoutFormProps {
  saleId: string;
  amountInPesos: number;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  eventName: string;
}

export function ClipCheckoutForm({
  saleId,
  amountInPesos,
  buyerEmail,
  buyerName,
  buyerPhone,
  eventName,
}: ClipCheckoutFormProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<{
    cardToken: () => Promise<{ id: string }>;
    unmount?: () => void;
  } | null>(null);
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_CLIP_API_KEY;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!apiKey) {
      toast.error("Clip is not configured. Contact the administrator.");
      setIsLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = CLIP_SDK_URL;
    script.async = true;
    script.onload = async () => {
      try {
        if (!window.ClipSDK) return;
        // Esperar a que el contenedor exista en el DOM (evita appendChild null)
        const waitForContainer = (ms = 2000): Promise<HTMLElement | null> => {
          return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
              const el = document.getElementById("clip-card-container");
              if (el) return resolve(el);
              if (Date.now() - start > ms) return resolve(null);
              setTimeout(check, 50);
            };
            setTimeout(check, 0);
          });
        };
        const container = await waitForContainer();
        if (!mountedRef.current) return;
        if (!container) {
          toast.error("Error loading form. Please reload the page.");
          return;
        }
        const clip = new window.ClipSDK(apiKey);
        const paymentAmountPesos = amountInPesos;
        const card = clip.element.create("Card", {
          paymentAmount: paymentAmountPesos,
        });
        // Clip usa getElementById(id) internamente; pasar "#id" devuelve null -> appendChild truena
        const el = document.getElementById("clip-card-container");
        if (el) el.innerHTML = "";
        card.mount("clip-card-container");
        cardRef.current = card;
        setSdkReady(true);
      } catch (err: any) {
        console.error("Clip SDK init:", err);
        toast.error("Error loading payment form");
      } finally {
        setIsLoading(false);
      }
    };
    script.onerror = () => {
      toast.error("Could not load Clip SDK");
      setIsLoading(false);
    };
    document.body.appendChild(script);
    return () => {
      try {
        cardRef.current?.unmount?.();
      } catch {
        /* ignore */
      }
      cardRef.current = null;
      if (script.parentNode) document.body.removeChild(script);
    };
  }, [apiKey, amountInPesos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !sdkReady || !cardRef.current) return;

    setIsPaying(true);
    try {
      const tokenResult = await cardRef.current.cardToken();
      // Clip SDK puede devolver { id } o { token } según versión
      const token = tokenResult?.id ?? (tokenResult as { token?: string })?.token;
      if (!token || typeof token !== "string") {
        throw new Error("Could not get card token. Try again.");
      }

      const res = await fetch("/api/payments/clip/create-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId,
          token,
          customer: {
            email: buyerEmail,
            phone: buyerPhone || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el pago");
      }

      toast.success("Payment successful! Redirecting to your tickets...");
      router.push("/mis-boletos");
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el pago");
    } finally {
      setIsPaying(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="p-6 text-center text-white/80">
        <p>Card payment is not available. Configure NEXT_PUBLIC_CLIP_API_KEY.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-white/5 border border-white/20 p-4">
        <p className="text-white/90 text-sm mb-2">{eventName}</p>
        <p className="text-2xl font-bold text-white">
          ${amountInPesos.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN
        </p>
      </div>

      <div>
        <label className="block text-white/90 text-sm mb-2">Buyer info</label>
        <p className="text-white/70 text-sm">{buyerName}</p>
        <p className="text-white/70 text-sm">{buyerEmail}</p>
      </div>

      <div>
        <label className="block text-white/90 text-sm mb-2">Card details</label>
        <div
          id="clip-card-container"
          ref={containerRef}
          className="min-h-[80px] rounded-lg bg-white/10 p-4 border border-white/20"
        />
        {isLoading && (
          <p className="text-white/60 text-sm mt-2">Loading form...</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!sdkReady || isPaying}
        className="w-full py-4 rounded-lg bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPaying ? "Processing..." : "Pay with card"}
      </button>
    </form>
  );
}
