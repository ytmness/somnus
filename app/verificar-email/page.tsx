"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, RefreshCw, Calendar, Shield, Scan, LogIn, User, CheckCircle, Lock } from "lucide-react";

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
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.success && data.data) {
          setUser(data.data.user);
          setUserRole(data.data.user?.role || null);
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error);
      }
    };
    loadSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
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

      const redirectPath = data.user?.role === "ADMIN" ? "/admin"
        : data.user?.role === "VENDEDOR" ? "/vendedor"
        : data.user?.role === "SUPERVISOR" ? "/supervisor"
        : data.user?.role === "CLIENTE" ? "/mis-boletos"
        : "/";

      await new Promise(resolve => setTimeout(resolve, 100));
      router.push(redirectPath);
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
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Header igual que login */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          aria-label="SOMNUS"
        >
          SOMNUS
        </button>

        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Eventos
          </button>
          <button
            onClick={() => router.push("/galeria")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Galería
          </button>
          {userRole === "ADMIN" && (
            <button
              onClick={() => router.push("/admin")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Admin
            </button>
          )}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button
              onClick={() => router.push("/accesos")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
            >
              Accesos
            </button>
          )}
          <button
            onClick={() => router.push("/mis-boletos")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Mis Boletos
          </button>
          <span className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1">
            {user?.name || user?.email || "Login"}
          </span>
        </nav>
      </header>

      {/* Contenido principal - mismo layout que login */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Columna izquierda - Información */}
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Verifica tu
                </h1>
                <div className="mb-6">
                  <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="Somnus" width={280} height={84} className="w-48 md:w-56 h-auto object-contain" />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Ingresa el código de 8 dígitos que enviamos a tu correo para completar el acceso.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Código de 8 Dígitos</h3>
                    <p className="somnus-text-body text-sm">
                      Revisa tu bandeja de entrada y spam para encontrar el código
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Seguridad</h3>
                    <p className="somnus-text-body text-sm">
                      El código expira en 1 hora por tu seguridad
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Verificación Rápida</h3>
                    <p className="somnus-text-body text-sm">
                      Una vez verificado, podrás acceder a todos los eventos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Verifica tu Email
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
                      Verifica tu Email
                    </h1>
                    <p className="somnus-text-body">
                      Ingresa el código de 8 dígitos que enviamos a tu email
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block somnus-title-secondary text-sm mb-2 uppercase">
                        Email
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
                        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-center text-2xl tracking-widest font-mono backdrop-blur-sm"
                        placeholder="00000000"
                        required
                        maxLength={8}
                        pattern="[0-9]{8}"
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
                        "Verificar Email"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <button
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
                      <Link href="/login" className="text-white hover:underline transition-colors font-medium">
                        Iniciar sesión
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
    <Suspense fallback={
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/50 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="somnus-text-body text-xl">Cargando...</p>
        </div>
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  );
}
