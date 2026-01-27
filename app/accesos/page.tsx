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
}

export default function AccesosPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (!data.user) {
        router.push("/login?redirect=/accesos");
        return;
      }

      // Verificar rol ACCESOS o ADMIN
      if (data.user.role !== "ACCESOS" && data.user.role !== "ADMIN") {
        setError("No tienes permisos para acceder a esta página");
        setTimeout(() => {
          router.push("/");
        }, 2000);
        return;
      }

      setUser(data.user);
    } catch (err) {
      console.error("Error al verificar autenticación:", err);
      setError("Error al verificar permisos");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
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
      {/* Header */}
      <header className="bg-black bg-opacity-50 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Control de Accesos</h1>
              <p className="text-xs sm:text-sm text-gray-300 truncate">
                Bienvenido, <span className="font-semibold">{user?.name}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm sm:text-base font-medium transition-colors flex-shrink-0"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          {/* Estadísticas */}
          <div>
            <ScanStats />
          </div>

          {/* Escáner */}
          <div className="flex justify-center">
            <QRScanner />
          </div>

          {/* Instrucciones */}
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg p-4 sm:p-6 text-white">
              <h3 className="font-bold text-base sm:text-lg mb-3">📋 Instrucciones</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">1.</span>
                  <span>Solicita al cliente que presente su boleto físico o digital</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">2.</span>
                  <span>Apunta la cámara al código QR del boleto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">3.</span>
                  <span>Espera la validación automática</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold flex-shrink-0">4.</span>
                  <span>
                    ✅ <strong>Verde</strong> = Acceso concedido | ❌ <strong>Rojo</strong> = Acceso denegado
                  </span>
                </li>
              </ul>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  💡 <strong>Tip:</strong> Si el boleto ya fue usado, verás la fecha y hora del primer escaneo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 border-t border-gray-700 py-2 sm:py-3 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <p className="text-xs text-gray-400">
            Boletera Regia © {new Date().getFullYear()}<span className="hidden sm:inline"> | Sistema de Control de Accesos</span>
          </p>
        </div>
      </footer>
    </div>
  );
}


