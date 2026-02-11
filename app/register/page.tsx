"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, User, ArrowLeft, Calendar, Music, Shield, Scan, LogIn, Ticket, CheckCircle } from "lucide-react";
import { SomnusHeader } from "@/components/SomnusHeader";

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
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Header estilo SOMNUS */}
      <SomnusHeader user={user} userRole={userRole} showNav={true} />

      {/* Contenido principal */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Columna izquierda - Información */}
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Únete a
                </h1>
                <div className="mb-6">
                  <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={320} height={96} className="w-64 md:w-80 h-auto object-contain" priority />
                </div>
                <p className="somnus-text-body text-lg mb-8">
                  Crea tu cuenta y accede a eventos exclusivos, gestiona tus boletos y disfruta de experiencias únicas.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Registro Rápido</h3>
                    <p className="somnus-text-body text-sm">
                      Solo necesitas tu nombre y email para comenzar
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Acceso a Eventos</h3>
                    <p className="somnus-text-body text-sm">
                      Reserva boletos para los mejores eventos en vivo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">Cuenta Segura</h3>
                    <p className="somnus-text-body text-sm">
                      Verificación por email para proteger tu cuenta
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Formulario de Registro */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  {/* Título móvil */}
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Crear Cuenta
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Ingresa tus datos y recibe un código de verificación
                    </p>
                  </div>

                  {/* Título desktop */}
                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Crear Cuenta
                    </h1>
                    <p className="somnus-text-body">
                      Ingresa tus datos y recibe un código de verificación
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nombre */}
                    <div>
                      <label className="block somnus-title-secondary text-sm mb-2 uppercase">
                        Nombre completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all backdrop-blur-sm"
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
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
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all backdrop-blur-sm"
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Botón Submit */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Registrando...
                        </span>
                      ) : (
                        "Crear Cuenta"
                      )}
                    </button>
                  </form>

                  {/* Link a Login */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      ¿Ya tienes cuenta?{" "}
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


