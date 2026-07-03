"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRScanner } from "@/components/accesos/QRScanner";
import { ScanStats } from "@/components/accesos/ScanStats";
import { Loader2, LogOut, Shield } from "lucide-react";

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Shield className="h-16 w-16 mx-auto mb-4 text-red-300" />
          <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-20">
      <header className="bg-black bg-opacity-50 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                Control de Accesos
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 truncate">
                Bienvenido, <span className="font-semibold">{user?.name}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          {events.length > 0 && (
            <div className="max-w-md mx-auto">
              <label className="block text-white text-sm mb-2">Evento activo</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} — {new Date(ev.eventDate).toLocaleDateString("es-MX")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <ScanStats />
          </div>

          <div className="flex justify-center">
            <QRScanner eventId={selectedEventId || undefined} />
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg p-4 sm:p-6 text-white">
              <h3 className="font-bold text-base sm:text-lg mb-3">Instrucciones</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
                <li>1. Selecciona el evento si tienes varios asignados</li>
                <li>2. Apunta la cámara al código QR del boleto</li>
                <li>3. Verde = acceso concedido · Rojo = denegado</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 border-t border-gray-700 py-2">
        <div className="container mx-auto px-3 text-center">
          <p className="text-xs text-gray-400">
            Somnus © {new Date().getFullYear()} · Control de Accesos
          </p>
        </div>
      </footer>
    </div>
  );
}
