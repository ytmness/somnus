"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Enlace inválido");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(data.message || "Contraseña actualizada");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main">
      <SiteHeader eventsHref="/" />
      <div className="min-h-screen flex items-center justify-center px-4 pt-24">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md liquid-glass p-8 rounded-2xl space-y-4"
        >
          <h1 className="somnus-title-secondary text-2xl uppercase text-white">
            Nueva contraseña
          </h1>
          {!token && (
            <p className="text-red-300 text-sm">
              Falta el token. Solicita un nuevo enlace desde{" "}
              <Link href="/login" className="underline">
                iniciar sesión
              </Link>
              .
            </p>
          )}
          <label className="block text-white/80 text-sm">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
              required
              minLength={8}
            />
          </label>
          <label className="block text-white/80 text-sm">
            Confirmar
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
              required
              minLength={8}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !token}
            className="somnus-btn w-full py-3 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center text-white">
          Cargando...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
