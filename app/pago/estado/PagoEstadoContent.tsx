"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PagoEstadoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleId = searchParams.get("saleId");
  const [status, setStatus] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) {
      setError("No se encontró la venta");
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sales/${saleId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Venta no encontrada");
          return;
        }

        const saleStatus = data.data?.status;
        setStatus(saleStatus);
        setBuyerEmail(data.data?.buyerEmail || null);

        if (saleStatus === "COMPLETED") {
          const email = data.data?.buyerEmail || "";
          router.push(
            email
              ? `/pago-exitoso?email=${encodeURIComponent(email)}&saleId=${encodeURIComponent(saleId)}`
              : `/pago-exitoso?saleId=${encodeURIComponent(saleId)}`
          );
          return;
        }

        if (saleStatus === "CANCELLED" || saleStatus === "REFUNDED") {
          setError("El pago no se completó");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          timeoutId = setTimeout(poll, 3000);
        }
      } catch {
        setError("Error al verificar el estado del pago");
      }
    };

    void poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [saleId, router]);

  if (error) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">{error}</h1>
          <Link href="/" className="text-white/70 hover:text-white underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Verificando pago...</h1>
        <p className="text-white/60 text-sm">
          {status === "PENDING"
            ? "Estamos confirmando tu pago. Esto puede tomar unos segundos."
            : "Procesando..."}
        </p>
        {buyerEmail && <p className="text-white/40 text-xs mt-4">{buyerEmail}</p>}
      </div>
    </div>
  );
}
