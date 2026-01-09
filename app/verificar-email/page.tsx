"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";

function VerificarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [formData, setFormData] = useState({
    email: email,
    code: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Usar el endpoint de OTP de Supabase
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          token: formData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al verificar código OTP");
      }

      toast.success("¡Código verificado exitosamente!");

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/verificar-email/page.tsx:43',message:'Before redirect',data:{userRole:data.user?.role,hasSession:!!data.session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Redirigir según el rol
      const redirectPath = data.user?.role === "ADMIN" ? "/admin" 
        : data.user?.role === "VENDEDOR" ? "/vendedor"
        : data.user?.role === "SUPERVISOR" ? "/supervisor"
        : data.user?.role === "CLIENTE" ? "/mis-boletos"
        : "/";

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/verificar-email/page.tsx:52',message:'Redirecting',data:{redirectPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Esperar un momento para que las cookies se establezcan antes de redirigir
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.push(redirectPath);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a40da1d-54df-4a70-9c53-c9c9e8cfa786',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/verificar-email/page.tsx:58',message:'After router.push, before refresh',data:{redirectPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.email) {
      toast.error("Por favor ingresa tu email");
      return;
    }

    setIsResending(true);
    try {
      // Usar el endpoint de OTP para reenviar código
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar código");
      }

      toast.success("Código reenviado. Revisa tu email.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Botón volver */}
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al registro
        </Link>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#c4a905]/30 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[#c4a905]/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-[#c4a905]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Verifica tu Email
            </h1>
            <p className="text-white/70">
              Ingresa el código de 6 dígitos que enviamos a tu email.
              <br />
              <span className="text-sm text-white/50">
                (En desarrollo, revisa Supabase Dashboard &gt; Authentication &gt; Logs)
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#c4a905] transition-colors"
                placeholder="tu@email.com"
                required
                disabled={!!email} // Deshabilitar si viene del query string
              />
            </div>

            {/* Código */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Código de Verificación
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.replace(/\D/g, "").slice(0, 8),
                  })
                }
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#c4a905] transition-colors text-center text-2xl tracking-widest font-mono"
                placeholder="00000000"
                required
                maxLength={8}
                pattern="[0-9]{8}"
              />
              <p className="text-white/60 text-sm mt-2 text-center">
                Ingresa el código de 8 dígitos
              </p>
            </div>

            {/* Botón Submit */}
            <Button
              type="submit"
              className="w-full bg-[#c4a905] text-white hover:bg-[#d4b815] h-12 text-lg font-semibold"
              disabled={isLoading || formData.code.length !== 8}
            >
              {isLoading ? "Verificando..." : "Verificar Email"}
            </Button>
          </form>

          {/* Reenviar código */}
          <div className="mt-6 text-center">
            <button
              onClick={handleResendCode}
              disabled={isResending || !formData.email}
              className="text-[#c4a905] hover:text-[#d4b815] font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
              />
              {isResending ? "Reenviando..." : "Reenviar código"}
            </button>
          </div>

          {/* Nota sobre consola */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm text-center">
              💡 <strong>Nota:</strong> En desarrollo, el código aparece en{" "}
              <strong>Supabase Dashboard &gt; Authentication &gt; Logs</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] via-[#49484e] to-[#2a2c30] flex items-center justify-center p-4">
        <div className="text-white">Cargando...</div>
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  );
}

