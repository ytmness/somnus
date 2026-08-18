"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StripeCheckoutForm } from "@/components/payments/StripeCheckoutForm";

interface BalanceSummary {
  paid: boolean;
  saleId?: string;
  buyerName: string;
  buyerEmail?: string;
  balanceDueCents: number;
  balanceDuePesos?: number;
  balancePaidAt?: string;
  depositPaid?: number;
  event: {
    name: string;
    artist: string;
    eventDate: string;
  };
}

export default function PagarSaldoPage() {
  const params = useParams();
  const token = params.token as string;
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intentRequested = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sales/balance/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Enlace no válido");
        setSummary(json.data);
        if (json.data?.saleId) setSaleId(json.data.saleId);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setIsLoading(false);
      }
    };
    if (token) void load();
  }, [token]);

  useEffect(() => {
    if (!summary || summary.paid || intentRequested.current) return;
    intentRequested.current = true;

    fetch(`/api/sales/balance/${token}`, { method: "POST" })
      .then((r) => r.json())
      .then((json) => {
        if (json.clientSecret) {
          setClientSecret(json.clientSecret);
          if (json.saleId) setSaleId(json.saleId);
        } else if (json.error) {
          setError(json.error);
        }
      })
      .catch(() => setError("No se pudo iniciar el pago"));
  }, [summary, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Cargando…</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error || "Enlace no válido"}
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

  if (summary.paid) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="somnus-card max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Saldo pagado</h1>
          <p className="text-white/70 mb-4">
            El saldo de tu reserva para {summary.event.name} ya fue liquidado.
          </p>
          <Link
            href="/mis-boletos"
            className="inline-block px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
          >
            Ver mis boletos
          </Link>
        </div>
      </div>
    );
  }

  const amountPesos =
    summary.balanceDuePesos ?? summary.balanceDueCents / 100;

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
          <span className="text-white/60 text-sm">Pago de saldo</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-wider">
          Completar saldo
        </h1>
        <p className="text-white/60 mb-2">{summary.event.name}</p>
        <p className="text-white/50 text-sm mb-8">
          Hola {summary.buyerName}, liquida el saldo restante de tu reserva.
        </p>

        <div className="somnus-card p-6 sm:p-8">
          {clientSecret && saleId && summary.buyerEmail ? (
            <StripeCheckoutForm
              saleId={saleId}
              amountInPesos={amountPesos}
              buyerEmail={summary.buyerEmail}
              buyerName={summary.buyerName}
              eventName={summary.event.name}
              createIntentUrl={`/api/sales/balance/${token}`}
              createIntentMethod="POST"
            />
          ) : (
            <div className="p-6 text-center text-white/70">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p>Preparando pago…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
