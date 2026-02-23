"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ClipCheckoutForm } from "@/components/payments/ClipCheckoutForm";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.saleId as string;
  const [sale, setSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSale = async () => {
      try {
        const res = await fetch(`/api/sales/${saleId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Venta no encontrada");
          return;
        }

        if (data.data?.status === "COMPLETED") {
          const buyerEmail = data.data?.buyerEmail || "";
          router.push(buyerEmail ? `/pago-exitoso?email=${encodeURIComponent(buyerEmail)}` : "/pago-exitoso");
          return;
        }

        setSale(data.data);
      } catch {
        setError("Error al cargar la venta");
      } finally {
        setIsLoading(false);
      }
    };

    loadSale();
  }, [saleId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Cargando checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error || "Venta no encontrada"}
          </h1>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const totalPesos = Number(sale.total);
  const eventName = sale.event?.name || "Evento Somnus";

  return (
    <div className="min-h-screen somnus-bg-main">
      <header className="border-b border-white/10 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-white/80 hover:text-white text-sm font-medium uppercase tracking-wider"
          >
            ← SOMNUS
          </Link>
          <span className="text-white/60 text-sm">Pago seguro con Clip</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-wider">
          Completar pago
        </h1>
        <p className="text-white/60 mb-8">
          Ingresa los datos de tu tarjeta para finalizar la compra
        </p>

        <div className="somnus-card p-6 sm:p-8">
          <ClipCheckoutForm
            saleId={saleId}
            amountInPesos={totalPesos}
            buyerEmail={sale.buyerEmail}
            buyerName={sale.buyerName}
            buyerPhone={sale.buyerPhone || undefined}
            eventName={eventName}
          />
        </div>

        <p className="text-white/50 text-xs text-center mt-6">
          Tu información está protegida. Somnus utiliza Clip para procesar pagos de forma segura.
        </p>
      </main>
    </div>
  );
}
