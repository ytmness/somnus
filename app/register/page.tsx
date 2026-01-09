"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, User, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
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
    <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Botón volver */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#c4a905]/30 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Crear Cuenta
            </h1>
            <p className="text-white/70">
              Ingresa tus datos y recibe un código de 6 dígitos en tu email
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#c4a905] transition-colors"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/90 font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#c4a905] transition-colors"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>


            {/* Botón Submit */}
            <Button
              type="submit"
              className="w-full bg-[#c4a905] text-white hover:bg-[#d4b815] h-12 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Crear Cuenta"}
            </Button>
          </form>

          {/* Link a Login */}
          <div className="mt-6 text-center">
            <p className="text-white/70">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="text-[#c4a905] hover:text-[#d4b815] font-medium transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

