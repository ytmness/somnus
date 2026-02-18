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
  const cardRef = useRef<{ cardToken: () => Promise<{ id: string }> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_CLIP_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      toast.error("Clip no está configurado. Contacta al administrador.");
      setIsLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = CLIP_SDK_URL;
    script.async = true;
    script.onload = async () => {
      try {
        if (!window.ClipSDK || !containerRef.current) return;
        const clip = new window.ClipSDK(apiKey);
        const paymentAmountPesos = amountInPesos;
        const card = clip.element.create("Card", {
          paymentAmount: paymentAmountPesos,
        });
        await card.mount("#clip-card-container");
        cardRef.current = card;
        setSdkReady(true);
      } catch (err: any) {
        console.error("Clip SDK init:", err);
        toast.error("Error al cargar el formulario de pago");
      } finally {
        setIsLoading(false);
      }
    };
    script.onerror = () => {
      toast.error("No se pudo cargar el SDK de Clip");
      setIsLoading(false);
    };
    document.body.appendChild(script);
    return () => {
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
      const token = tokenResult?.id;
      if (!token) throw new Error("No se obtuvo el token de la tarjeta");

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

      toast.success("¡Pago exitoso! Redirigiendo a tus boletos...");
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
        <p>El pago con tarjeta no está disponible. Configura NEXT_PUBLIC_CLIP_API_KEY.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <label className="block text-white/90 text-sm mb-2">Datos de la tarjeta</label>
        <div
          id="clip-card-container"
          ref={containerRef}
          className="min-h-[80px] rounded-lg bg-white/10 p-4 border border-white/20"
        />
        {isLoading && (
          <p className="text-white/60 text-sm mt-2">Cargando formulario...</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!sdkReady || isPaying}
        className="w-full py-4 rounded-lg bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPaying ? "Procesando..." : "Pagar con tarjeta"}
      </button>
    </form>
  );
}
