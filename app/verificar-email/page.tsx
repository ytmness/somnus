"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle, Lock } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { resolvePostAuthRedirect } from "@/lib/auth/registration";

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const fromApp =
    searchParams.get("app") === "1" || searchParams.get("client") === "app";

  const [formData, setFormData] = useState({
    email: email,
    code: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al verificar el código");
      }

      toast.success("¡Correo verificado!");

      const redirectPath = resolvePostAuthRedirect(
        data.user?.role || "ORGANIZER",
        data.user?.staffRoles,
        fromApp ? "app" : "web"
      );

      window.location.href = redirectPath;
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error al verificar el código"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.email) {
      toast.error("Ingresa tu correo");
      return;
    }
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar el código");
      }

      toast.success("Código reenviado. Revisa tu correo.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error al reenviar el código"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Verifica tu
                </h1>
                <div className="mb-6">
                  <Image
                    src="/assets/SOMNUS LOGO BLANCO.png"
                    alt="Somnus"
                    width={280}
                    height={84}
                    className="w-48 md:w-56 h-auto object-contain"
                  />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Ingresa el código de 8 dígitos que enviamos a tu correo para
                  completar el acceso.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Código de 8 dígitos
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Revisa tu bandeja de entrada y la carpeta de spam
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Seguridad
                    </h3>
                    <p className="somnus-text-body text-sm">
                      El código expira en 10 minutos por tu seguridad
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Verificación rápida
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Una vez verificado, podrás comprar boletos y usar tu cuenta
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Verifica tu correo
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Ingresa el código de 8 dígitos que enviamos a tu email
                    </p>
                  </div>

                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Verifica tu correo
                    </h1>
                    <p className="somnus-text-body">
                      Ingresa el código de 8 dígitos que enviamos a tu email
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block somnus-title-secondary text-sm mb-2 uppercase">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all backdrop-blur-sm disabled:opacity-50"
                          placeholder="tu@email.com"
                          required
                          disabled={!!email}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block somnus-title-secondary text-sm mb-2 uppercase">
                        Código de verificación
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
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-center text-2xl tracking-widest font-mono backdrop-blur-sm"
                        placeholder="00000000"
                        required
                        maxLength={8}
                        pattern="[0-9]{8}"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                      <p className="somnus-text-body text-sm mt-2 text-center">
                        Ingresa el código de 8 dígitos
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || formData.code.length !== 8}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Verificando...
                        </span>
                      ) : (
                        "Verificar correo"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResending || !formData.email}
                      className="text-white hover:text-white/80 font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
                      />
                      {isResending ? "Reenviando..." : "Reenviar código"}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      ¿Volver al login?{" "}
                      <Link
                        href="/login"
                        className="text-white hover:underline transition-colors font-medium"
                      >
                        Inicia sesión
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/50 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="somnus-text-body text-xl">Cargando...</p>
          </div>
        </div>
      }
    >
      <VerificarEmailContent />
    </Suspense>
  );
}
