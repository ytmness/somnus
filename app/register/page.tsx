"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, User, ArrowLeft, Calendar, Music, Shield, Scan, LogIn, Ticket, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: "CLIENTE", // Siempre CLIENTE para registros públicos
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[REGISTER] Error del servidor:", data);
        const errorMessage = data.error || data.details || "Error al registrar";
        throw new Error(errorMessage);
      }

      toast.success("¡Código de verificación enviado! Revisa tu email");
      
      // Redirigir a la página de verificación
      router.push(`/verificar-email?email=${encodeURIComponent(formData.email)}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
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
            alt="Somnus"
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
          {/* Logo Somnus */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Somnus"
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

          {/* Logo Somnus */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/rico-muerto-logo.png"
              alt="Somnus"
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
                  Únete a
                </h1>
                <h2 className="regia-title-secondary text-3xl md:text-4xl mb-6">
                  Somnus
                </h2>
                <p className="regia-text-body text-lg mb-8">
                  Crea tu cuenta y accede a eventos exclusivos, gestiona tus boletos y disfruta de experiencias únicas.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Registro Rápido</h3>
                    <p className="regia-text-body text-sm">
                      Solo necesitas tu nombre y email para comenzar
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Acceso a Eventos</h3>
                    <p className="regia-text-body text-sm">
                      Reserva boletos para los mejores eventos en vivo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 regia-gold-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-regia-black" />
                  </div>
                  <div>
                    <h3 className="regia-title-secondary text-lg mb-2">Cuenta Segura</h3>
                    <p className="regia-text-body text-sm">
                      Verificación por email para proteger tu cuenta
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario de Registro */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="regia-ticket-card p-6 sm:p-8 lg:p-10">
                  {/* Título móvil */}
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="regia-title-main text-3xl mb-2">
                      Crear Cuenta
                    </h1>
                    <p className="regia-text-body text-sm">
                      Ingresa tus datos y recibe un código de verificación
                    </p>
                  </div>

                  {/* Título desktop */}
                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-regia-black" />
                    </div>
                    <h1 className="regia-title-main text-3xl mb-2">
                      Crear Cuenta
                    </h1>
                    <p className="regia-text-body">
                      Ingresa tus datos y recibe un código de verificación
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nombre */}
                    <div>
                      <label className="block regia-title-secondary text-sm mb-2">
                        Nombre completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-regia-gold-old" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-lg regia-bg-main border border-regia-gold-old/30 regia-text-body placeholder-regia-cream/50 focus:outline-none focus:ring-2 focus:ring-regia-gold-bright focus:border-regia-gold-bright transition-all"
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                    </div>

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
                          className="w-full pl-10 pr-4 py-3 rounded-lg regia-bg-main border border-regia-gold-old/30 regia-text-body placeholder-regia-cream/50 focus:outline-none focus:ring-2 focus:ring-regia-gold-bright focus:border-regia-gold-bright transition-all"
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Botón Submit */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full regia-btn-primary text-base py-6"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-regia-black border-t-transparent rounded-full animate-spin" />
                          Registrando...
                        </span>
                      ) : (
                        "Crear Cuenta"
                      )}
                    </Button>
                  </form>

                  {/* Link a Login */}
                  <div className="mt-6 pt-6 border-t border-regia-gold-old/20">
                    <p className="regia-text-body text-center text-sm">
                      ¿Ya tienes cuenta?{" "}
                      <Link
                        href="/login"
                        className="text-regia-gold-bright hover:text-regia-gold-old hover:underline transition-colors font-medium"
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


