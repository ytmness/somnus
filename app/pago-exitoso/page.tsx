"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function PagoExitosoPage() {
  const params = useSearchParams();
  const email = params.get("email");

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <header className="border-b border-white/10 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-white/80 hover:text-white text-sm font-medium uppercase tracking-wider flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            SOMNUS
          </Link>
          <span className="text-white/60 text-sm">Pago confirmado</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="somnus-card p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {email ? `Comprobante para: ${email}` : "Tu pago fue procesado correctamente."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/mis-boletos"
              className="flex-1 py-4 rounded-xl bg-[#5B8DEF] text-white font-bold text-center hover:bg-[#7BA3E8] transition-colors"
            >
              Ver mis boletos
            </Link>
            <Link
              href="/"
              className="flex-1 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-center hover:bg-white/15 transition-colors"
            >
              Volver a eventos
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
