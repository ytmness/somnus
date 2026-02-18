"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Calendar, Ticket, Users, ImageIcon } from "lucide-react";
import { EventsTable } from "@/components/admin/EventsTable";
import { CreateEventModal } from "@/components/admin/CreateEventModal";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { toast } from "sonner";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"eventos" | "galeria">("eventos");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (!data.user || data.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      setUser(data.user);
    } catch (error) {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sesión cerrada");
      router.push("/login");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    setRefreshKey((prev) => prev + 1);
    toast.success("Evento creado exitosamente");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen regia-gradient flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen regia-gradient">
      {/* Header */}
      <header className="bg-[#49484e] border-b border-[#5B8DEF]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-white/70 text-sm">Bienvenido, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-regia-gold hover:bg-regia-gold/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white/20 text-white bg-transparent hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="regia-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Total Eventos</p>
                <p className="text-3xl font-bold text-white">12</p>
              </div>
              <div className="w-12 h-12 bg-regia-gold/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-regia-gold" />
              </div>
            </div>
          </div>

          <div className="regia-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Boletos Vendidos</p>
                <p className="text-3xl font-bold text-white">2,450</p>
              </div>
              <div className="w-12 h-12 bg-regia-gold/20 rounded-lg flex items-center justify-center">
                <Ticket className="w-6 h-6 text-regia-gold" />
              </div>
            </div>
          </div>

          <div className="regia-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Usuarios Activos</p>
                <p className="text-3xl font-bold text-white">8</p>
              </div>
              <div className="w-12 h-12 bg-regia-gold/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-regia-gold" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("eventos")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "eventos"
                ? "bg-regia-gold text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Eventos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("galeria")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "galeria"
                ? "bg-regia-gold text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Galería
          </button>
        </div>

        {activeTab === "eventos" && (
          <div className="regia-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Eventos</h2>
            </div>
            <EventsTable key={refreshKey} />
          </div>
        )}

        {activeTab === "galeria" && (
          <div className="regia-card p-6">
            <h2 className="text-xl font-bold text-white mb-6">Galería</h2>
            <p className="text-white/70 text-sm mb-6">
              Crea secciones y agrega fotos por URL. Las imágenes deben estar en{" "}
              <code className="bg-white/10 px-1 rounded">/assets/</code> o en una URL pública.
            </p>
            <GalleryManager />
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}


