"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Ticket, LogIn } from "lucide-react";

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full">
        <div className="somnus-card p-8 sm:p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 uppercase tracking-wider">
            ¡Gracias por tu compra!
          </h1>
          <p className="text-white/80 text-lg mb-6">
            Tus boletos han sido generados correctamente.
          </p>

          <div className="rounded-lg bg-white/5 border border-white/10 p-6 mb-8 text-left">
            <p className="text-white/90 text-sm mb-4">
              Para ver y descargar tus boletos, inicia sesión con el correo que utilizaste en el checkout:
            </p>
            {email ? (
              <p className="text-white font-medium break-all mb-4">
                {email}
              </p>
            ) : (
              <p className="text-white/70 text-sm mb-4">
                Usa el mismo correo electrónico con el que realizaste el pago.
              </p>
            )}
            <Link
              href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Iniciar sesión
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Volver al inicio
            </Link>
            <span className="hidden sm:inline text-white/30">·</span>
            <Link
              href="/mis-boletos"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              <Ticket className="w-4 h-4" />
              Mis boletos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PagoExitosoContent />
    </Suspense>
  );
}
