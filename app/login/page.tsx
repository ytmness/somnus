"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
    <div className="min-h-screen regia-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="regia-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Grupo Regia
            </h1>
            <p className="text-white/70">Ingresa tu email y recibe un código de 6 dígitos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-regia-gold"
                placeholder="tu@email.com"
              />
            </div>


            <Button
              type="submit"
              disabled={isLoading}
              className="w-full regia-button-primary"
            >
              {isLoading ? "Enviando código..." : "Enviar Código"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-white/60 text-sm">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-regia-gold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

