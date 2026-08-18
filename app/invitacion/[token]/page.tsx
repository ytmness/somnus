"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { resolvePostAuthRedirect } from "@/lib/auth/registration";

const ROLE_LABELS: Record<string, string> = {
  VENDEDOR: "Vendedor",
  SUPERVISOR: "Supervisor",
  ACCESOS: "Accesos",
  VENUE_MANAGER: "Gestor de venue",
  MESA_HOST: "Anfitrión de mesa",
};

export default function InvitacionPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [invite, setInvite] = useState<{
    email: string;
    role: string;
    scope: string;
    expired: boolean;
    acceptedAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [session, setSession] = useState<{ email: string; role: string; staffRoles?: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [inviteRes, sessionRes] = await Promise.all([
          fetch(`/api/staff/invites/${params.token}`),
          fetch("/api/auth/session", { credentials: "include" }),
        ]);
        const inviteData = await inviteRes.json();
        const sessionData = await sessionRes.json();

        if (inviteRes.ok) setInvite(inviteData.data);
        if (sessionData.user) setSession(sessionData.user);
      } catch {
        toast.error("Error al cargar invitación");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/staff/invites/${params.token}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aceptar");

      toast.success("¡Invitación aceptada!");
      const redirect = resolvePostAuthRedirect(
        session?.role || "CLIENTE",
        data.staffRoles
      );
      router.push(redirect || "/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        Cargando...
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <SiteHeader />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Invitación no encontrada</h1>
          <Link href="/" className="text-violet-400 hover:underline">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SiteHeader />
      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-bold mb-2">Invitación al equipo</h1>
          <p className="text-white/70 mb-6">
            Te invitaron como{" "}
            <strong>{ROLE_LABELS[invite.role] || invite.role}</strong> con alcance{" "}
            <strong>{invite.scope}</strong>.
          </p>

          {invite.acceptedAt ? (
            <p className="text-green-400">Esta invitación ya fue aceptada.</p>
          ) : invite.expired ? (
            <p className="text-red-400">Esta invitación expiró.</p>
          ) : !session ? (
            <div className="space-y-4">
              <p className="text-white/70 text-sm">
                Inicia sesión con <strong>{invite.email}</strong> para aceptar.
              </p>
              <Link
                href={`/login?email=${encodeURIComponent(invite.email)}&redirect=/invitacion/${params.token}`}
                className="block w-full text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium"
              >
                Iniciar sesión
              </Link>
            </div>
          ) : session.email.toLowerCase() !== invite.email.toLowerCase() ? (
            <p className="text-amber-400 text-sm">
              Sesión activa como {session.email}. Cierra sesión e inicia con{" "}
              {invite.email}.
            </p>
          ) : (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium disabled:opacity-50"
            >
              {accepting ? "Aceptando..." : "Aceptar invitación"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
