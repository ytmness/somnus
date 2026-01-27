"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, Calendar, Music, Shield, Scan, LogIn, User, CheckCircle, Lock } from "lucide-react";

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

  // Cargar sesión del usuario
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
    <div className="min-h-screen regia-bg-main overflow-x-hidden">
      {/* Header flotante con logos y navegación integrada */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6">
        {/* Versión móvil - Logos simplificados */}
        <div className="w-full flex lg:hidden items-center justify-between">
          <Image
            src="/assets/logo-grupo-regia.png"
            alt="Grupo Regia"
            width={80}
            height={48}
            className="opacity-90 cursor-pointer"
            onClick={() => router.push("/")}
          />
          <button
            onClick={() => router.push("/")}
            className="text-regia-gold-old hover:text-regia-gold-bright transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Versión desktop - Navegación completa */}
        <div className="w-full hidden lg:flex items-center justify-between">
          {/* Logo GRUPO REGIA */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={110}
              height={65}
              className="opacity-90 cursor-pointer"
              onClick={() => router.push("/")}
            />
          </div>

          {/* Eventos */}
          <button
            onClick={() => router.push("/#eventos")}
            className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
          >
            <Calendar className="w-4 h-4" />
            <span>Eventos</span>
          </button>

          {/* Mis Boletos */}
          <button
            onClick={() => router.push("/mis-boletos")}
            className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
          >
            <Music className="w-4 h-4" />
            <span>Mis Boletos</span>
          </button>

          {/* Admin - solo si tiene rol */}
          {userRole === "ADMIN" && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}

          {/* Accesos - solo si tiene rol */}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button
              onClick={() => router.push("/accesos")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Scan className="w-4 h-4" />
              <span>Accesos</span>
            </button>
          )}

          {/* Login / User */}
          {user ? (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <User className="w-4 h-4" />
              <span>{user.name || user.email}</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Logo RICO O MUERTO */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/rico-muerto-logo.png"
              alt="Rico o Muerto"
              width={100}
              height={50}
              className="opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Columna izquierda - Información */}
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="regia-title-main text-4xl md:text-5xl mb-4">
                  Verifica tu
                </h1>
                <h2 className="regia-title-secondary text-3xl md:text-4xl mb-6">
                  Email
                </h2>
                <p className="regia-text-body text-lg mb-8">
                  Ingresa el código de verificación que enviamos a tu correo electrónico para completar tu registro.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Código de 8 Dígitos</h3>
                    <p className="regia-text-body text-sm">
                      Revisa tu bandeja de entrada y spam para encontrar el código
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Seguridad</h3>
                    <p className="regia-text-body text-sm">
                      El código expira en unos minutos por tu seguridad
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Verificación Rápida</h3>
                    <p className="regia-text-body text-sm">
                      Una vez verificado, podrás acceder a todos los eventos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="regia-ticket-card p-6 sm:p-8 lg:p-10">
                  {/* Título móvil */}
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="regia-title-main text-3xl mb-2">
                      Verifica tu Email
                    </h1>
                    <p className="regia-text-body text-sm">
                      Ingresa el código de 8 dígitos que enviamos a tu email
                    </p>
                  </div>

                  {/* Título desktop */}
                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-regia-black" />
                    </div>
                    <h1 className="regia-title-main text-3xl mb-2">
                      Verifica tu Email
                    </h1>
                    <p className="regia-text-body">
                      Ingresa el código de 8 dígitos que enviamos a tu email
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email */}
                    <div>
                      <label className="block regia-title-secondary text-sm mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-regia-gold-old" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-lg regia-bg-main border border-regia-gold-old/30 regia-text-body placeholder-regia-cream/50 focus:outline-none focus:ring-2 focus:ring-regia-gold-bright focus:border-regia-gold-bright transition-all disabled:opacity-50"
                          placeholder="tu@email.com"
                          required
                          disabled={!!email}
                        />
                      </div>
                    </div>

                    {/* Código */}
                    <div>
                      <label className="block regia-title-secondary text-sm mb-2">
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
                        className="w-full px-4 py-3 rounded-lg regia-bg-main border border-regia-gold-old/30 regia-text-body placeholder-regia-cream/50 focus:outline-none focus:ring-2 focus:ring-regia-gold-bright focus:border-regia-gold-bright transition-all text-center text-2xl tracking-widest font-mono"
                        placeholder="00000000"
                        required
                        maxLength={8}
                        pattern="[0-9]{8}"
                      />
                      <p className="regia-text-body text-sm mt-2 text-center">
                        Ingresa el código de 8 dígitos
                      </p>
                    </div>

                    {/* Botón Submit */}
                    <Button
                      type="submit"
                      disabled={isLoading || formData.code.length !== 8}
                      className="w-full regia-btn-primary text-base py-6"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-regia-black border-t-transparent rounded-full animate-spin" />
                          Verificando...
                        </span>
                      ) : (
                        "Verificar Email"
                      )}
                    </Button>
                  </form>

                  {/* Reenviar código */}
                  <div className="mt-6 pt-6 border-t border-regia-gold-old/20 text-center">
                    <button
                      onClick={handleResendCode}
                      disabled={isResending || !formData.email}
                      className="text-regia-gold-bright hover:text-regia-gold-old font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen regia-bg-main flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-regia-gold-bright border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="regia-text-body text-xl">Cargando...</p>
        </div>
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  );
}

