"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRScanner } from "@/components/accesos/QRScanner";
import { ScanStats } from "@/components/accesos/ScanStats";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Loader2, Shield, ScanLine } from "lucide-react";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  staffRoles?: string[];
}

type AssignedEvent = {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
};

export default function AccesosPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      const data = await response.json();

      if (!data.user) {
        router.push("/login?redirect=/accesos");
        return;
      }

      const hasAccess =
        data.user.role === "ACCESOS" ||
        data.user.role === "ADMIN" ||
        data.user.staffRoles?.includes("ACCESOS");

      if (!hasAccess) {
        setError("No tienes permisos para acceder a esta página");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      setUser(data.user);

      const assignRes = await fetch("/api/staff/my-assignments", {
        credentials: "include",
      });
      const assignData = await assignRes.json();
      if (assignRes.ok && assignData.data?.events?.length) {
        setEvents(assignData.data.events);
        setSelectedEventId(assignData.data.events[0].id);
      }
    } catch (err) {
      console.error("Error al verificar autenticación:", err);
      setError("Error al verificar permisos");
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center px-4">
        <div className="text-center text-white/70">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-white/50" />
          <p className="text-sm uppercase tracking-wider">Verificando permisos…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center px-4">
        <div className="liquid-glass max-w-md w-full p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-400/80" aria-hidden />
          <h1 className="text-xl font-semibold text-white mb-2">Acceso denegado</h1>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <SiteHeader eventsHref="/" />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-24 sm:pt-28 pb-12 somnus-safe-bottom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-white/15 bg-white/[0.04] mb-4">
            <ScanLine className="w-6 h-6 text-[#7BA3E8]" aria-hidden />
          </div>
          <h1 className="somnus-display text-2xl sm:text-3xl mb-2">Control de accesos</h1>
          <p className="text-white/55 text-sm">
            Hola, <span className="text-white/90 font-medium">{user?.name}</span>
          </p>
        </div>

        <div className="space-y-6">
          {events.length > 0 && (
            <div className="liquid-glass p-4 sm:p-5">
              <label
                htmlFor="accesos-event-select"
                className="block text-[11px] uppercase tracking-wider text-white/45 mb-2"
              >
                Evento activo
              </label>
              <select
                id="accesos-event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="somnus-input !py-2.5 text-sm"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#0A0A0A]">
                    {ev.name} — {new Date(ev.eventDate).toLocaleDateString("es-MX")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ScanStats />

          <QRScanner eventId={selectedEventId || undefined} />

          <div className="liquid-glass p-5 sm:p-6">
            <h3 className="text-[11px] uppercase tracking-wider text-white/45 mb-3">
              Instrucciones
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-white/35 shrink-0">1.</span>
                Selecciona el evento si tienes varios asignados
              </li>
              <li className="flex gap-2">
                <span className="text-white/35 shrink-0">2.</span>
                Apunta la cámara al código QR del boleto
              </li>
              <li className="flex gap-2">
                <span className="text-white/35 shrink-0">3.</span>
                <span>
                  <span className="text-emerald-400/90">Verde</span> = acceso concedido ·{" "}
                  <span className="text-red-400/90">Rojo</span> = denegado
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
