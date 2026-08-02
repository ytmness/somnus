"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Shield, Mail, Lock, Ticket, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-path";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const resetParam = searchParams.get("reset");
  const fromApp =
    searchParams.get("app") === "1" || searchParams.get("client") === "app";
  const authSurface = fromApp ? "app" : "web";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (errorParam === "auth_failed") {
      toast.error("No se pudo completar el inicio de sesión. Intenta de nuevo.");
    } else if (errorParam === "account_inactive") {
      toast.error("Tu cuenta está desactivada. Contacta soporte.");
    }
  }, [errorParam]);

  useEffect(() => {
    if (resetParam === "sent") {
      toast.success("Te enviamos un enlace para restablecer tu contraseña.");
    }
  }, [resetParam]);

  useEffect(() => {
    let cancelled = false;
    async function redirectIfLoggedIn() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled || !data?.user) return;
        const path = resolveAuthRedirectPath(
          data.user.role || "ORGANIZER",
          redirectParam,
          data.user.staffRoles,
          authSurface
        );
        window.location.replace(path);
      } catch {
        // ignore
      }
    }
    void redirectIfLoggedIn();
    return () => {
      cancelled = true;
    };
  }, [redirectParam, authSurface]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, surface: authSurface }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "USER_NOT_FOUND") {
          toast.error(data.error);
          const regQs = new URLSearchParams({ email });
          if (fromApp) regQs.set("app", "1");
          router.push(`/register?${regQs.toString()}`);
          return;
        }
        throw new Error(data.error || "Error al iniciar sesión");
      }

      toast.success("¡Bienvenido de nuevo!");
      const redirectPath =
        redirectParam != null
          ? resolveAuthRedirectPath(
              data.user?.role || "ORGANIZER",
              redirectParam,
              undefined,
              authSurface
            )
          : (data.redirectPath ??
            resolveAuthRedirectPath(
              data.user?.role || "ORGANIZER",
              null,
              undefined,
              authSurface
            ));
      window.location.href = redirectPath;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Ingresa tu correo para restablecer la contraseña");
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el enlace");
      }
      toast.success("Revisa tu correo para restablecer tu contraseña");
      router.replace("/login?reset=sent");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error al enviar el enlace"
      );
    } finally {
      setIsResetting(false);
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
                  Bienvenido a
                </h1>
                <div className="mb-6">
                  <Image
                    src="/assets/SOMNUS LOGO BLANCO.png"
                    alt="SOMNUS"
                    width={280}
                    height={84}
                    className="w-48 md:w-56 h-auto object-contain"
                    priority
                  />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Accede a tu cuenta para gestionar tus boletos, ver tus eventos
                  favoritos y disfrutar de experiencias exclusivas.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Tus boletos
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Accede a todas tus entradas compradas y descárgalas cuando quieras
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Eventos exclusivos
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Descubre y reserva boletos para los mejores eventos en vivo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Seguridad garantizada
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Tus datos están protegidos con los más altos estándares de seguridad
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
                      Iniciar sesión
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Elige cómo quieres acceder a tu cuenta
                    </p>
                  </div>

                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Iniciar sesión
                    </h1>
                    <p className="somnus-text-body">
                      Elige cómo quieres acceder a tu cuenta
                    </p>
                  </div>

                  {emailParam && (
                    <p className="text-green-400/90 text-sm text-center bg-green-500/10 border border-green-500/20 rounded-lg py-2 px-3 mb-6">
                      Inicia sesión con el correo del checkout para ver tus boletos
                    </p>
                  )}

                  <SocialLoginButtons
                    redirectTo={redirectParam}
                    fromApp={fromApp}
                  />

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 somnus-text-body bg-transparent text-white/60">
                        o continúa con correo
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all backdrop-blur-sm"
                          placeholder="tu@correo.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="password"
                          className="block somnus-title-secondary text-sm uppercase"
                        >
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={isResetting}
                          className="text-xs text-white/60 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {isResetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          className="w-full pl-10 pr-12 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all backdrop-blur-sm"
                          placeholder="Mínimo 8 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Iniciando sesión...
                        </span>
                      ) : (
                        "Iniciar sesión"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      ¿Primera vez en Somnus?{" "}
                      <Link
                        href="/register"
                        className="text-white hover:underline transition-colors font-medium"
                      >
                        Crea tu cuenta gratis
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
