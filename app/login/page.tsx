"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Shield, Mail, Lock, Ticket } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(data.error || "Demasiados intentos. Espera un minuto.");
        } else if (data.code === "USER_NOT_FOUND") {
          toast.error(data.error);
          router.push(`/register?email=${encodeURIComponent(email)}`);
        } else {
          throw new Error(data.error || "Error al enviar el código");
        }
        return;
      }

      toast.success("Código enviado. Revisa tu correo.");
      router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      {/* Contenido principal */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Columna izquierda - Información */}
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Welcome to
                </h1>
                <div className="mb-6">
                  <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={280} height={84} className="w-48 md:w-56 h-auto object-contain" priority />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Access your account to manage your tickets, view your favorite events and enjoy exclusive experiences.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Manage Your Tickets</h3>
                    <p className="somnus-text-body text-sm">
                      Access all your purchased tickets and download them whenever you want
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Exclusive Events</h3>
                    <p className="somnus-text-body text-sm">
                      Discover and reserve tickets for the best live events
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Guaranteed Security</h3>
                    <p className="somnus-text-body text-sm">
                      Your data is protected with the highest security standards
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario de Login */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  {/* Título móvil */}
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Sign In
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Enter your email and receive an 8-digit code
                    </p>
                  </div>

                  {/* Título desktop */}
                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Sign In
                    </h1>
                    <p className="somnus-text-body">
                      Enter your email and receive an 8-digit code
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    {emailParam && (
                      <p className="text-green-400/90 text-sm text-center bg-green-500/10 border border-green-500/20 rounded-lg py-2 px-3">
                        Inicia sesión con el correo del checkout para ver tus boletos
                      </p>
                    )}
                    <div>
                      <label
                        htmlFor="email"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Email
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
                          placeholder="tu@email.com"
                        />
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
                          Sending code...
                        </span>
                      ) : (
                        "Send Verification Code"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      ¿Primera vez en Somnus?{" "}
                      <Link href="/register" className="text-white hover:underline transition-colors font-medium">
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
    <Suspense fallback={
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
