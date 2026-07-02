"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, User, Phone, Ticket, Shield, CheckCircle } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [formData, setFormData] = useState({
    name: "",
    email: emailParam,
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);

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
          phone: formData.phone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_EXISTS") {
          toast.error(data.error);
          router.push(`/login?email=${encodeURIComponent(formData.email)}`);
          return;
        }
        throw new Error(data.error || "Error al registrar");
      }

      toast.success("Te enviamos un código de 8 dígitos a tu correo");
      router.push(`/verificar-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al registrar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-12">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <h1 className="somnus-title-secondary text-4xl md:text-5xl mb-4 uppercase">
                  Únete a
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
                  Crea tu cuenta para comprar boletos, guardar tus entradas y no
                  perderte los mejores eventos en vivo.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Sin contraseña
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Solo tu correo y un código de verificación
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Tus boletos
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Accede a Mis Boletos con el mismo correo del checkout
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Cuenta segura
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Verificación por correo para proteger tu cuenta
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Crear cuenta
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Completa tus datos para empezar a comprar boletos
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
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
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Tu nombre"
                          required
                          minLength={2}
                        />
                      </div>
                    </div>

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
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="tu@correo.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block somnus-title-secondary text-sm mb-2 uppercase">
                        Teléfono <span className="text-white/40 normal-case">(opcional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="+52 81 1234 5678"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50"
                    >
                      {isLoading ? "Creando cuenta..." : "Crear cuenta y verificar correo"}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <p className="somnus-text-body text-center text-sm">
                      ¿Ya tienes cuenta?{" "}
                      <Link href="/login" className="text-white hover:underline font-medium">
                        Inicia sesión
                      </Link>
                    </p>
                    <p className="text-center text-xs text-white/40">
                      ¿Quieres publicar eventos? Puedes configurarlo después desde{" "}
                      <Link href="/organizador" className="text-white/60 hover:text-white underline">
                        Publicar eventos
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
