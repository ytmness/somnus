"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Music, Users, User, LogIn, Shield, Scan, Mail, Lock, Ticket } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
        throw new Error(data.error || "Error al enviar código de verificación");
      }

      toast.success("¡Código de verificación enviado! Revisa tu email");
      
      // Redirigir a la página de verificación
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
      {/* Header estilo SOMNUS */}
      <header className="somnus-header">
        {/* Versión móvil */}
        <div className="w-full flex lg:hidden items-center justify-between">
          <button type="button" className="somnus-logo flex items-center cursor-pointer" onClick={() => router.push("/")} aria-label="SOMNUS - Inicio" style={{ animation: 'none' }}>
            <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={400} height={120} className="h-24 w-auto object-contain" priority />
          </button>
          <button
            onClick={() => router.push("/")}
            className="somnus-header-item hover:opacity-70 transition-opacity"
          >
            <LogIn className="w-5 h-5" />
          </button>
        </div>

        {/* Versión desktop */}
        <div className="w-full hidden lg:flex items-center justify-between">
          <button type="button" className="somnus-logo flex items-center cursor-pointer" onClick={() => router.push("/")} aria-label="SOMNUS - Inicio" style={{ animation: 'none' }}>
            <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={400} height={120} className="h-24 w-auto object-contain" priority />
          </button>
          
          <div className="flex items-center gap-6">
            {userRole === "ADMIN" && (
              <button
                onClick={() => router.push("/admin")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Admin
              </button>
            )}
            {(userRole === "ACCESOS" || userRole === "ADMIN") && (
              <button
                onClick={() => router.push("/accesos")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Accesos
              </button>
            )}
            {user ? (
              <button
                onClick={() => router.push("/login")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                {user.name || user.email}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="somnus-header-item hover:opacity-70 transition-opacity"
              >
                Login
              </button>
            )}
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
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Bienvenido a
                </h1>
                <div className="mb-6">
                  <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={640} height={192} className="w-[32rem] md:w-[40rem] h-auto object-contain" priority />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Accede a tu cuenta para gestionar tus boletos, ver tus eventos favoritos y disfrutar de experiencias exclusivas.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Gestiona tus Boletos</h3>
                    <p className="somnus-text-body text-sm">
                      Accede a todos tus boletos comprados y descárgalos cuando quieras
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Eventos Exclusivos</h3>
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
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Seguridad Garantizada</h3>
                    <p className="somnus-text-body text-sm">
                      Tus datos están protegidos con los más altos estándares de seguridad
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
                      Iniciar Sesión
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Ingresa tu email y recibe un código de 6 dígitos
                    </p>
                  </div>

                  {/* Título desktop */}
                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Iniciar Sesión
                    </h1>
                    <p className="somnus-text-body">
                      Ingresa tu email y recibe un código de verificación
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
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
                          Enviando código...
                        </span>
                      ) : (
                        "Enviar Código de Verificación"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      ¿No tienes cuenta?{" "}
                      <Link href="/register" className="text-white hover:underline transition-colors font-medium">
                        Regístrate aquí
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


