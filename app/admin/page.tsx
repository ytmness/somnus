"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Ticket, Users, ImageIcon, Link2, Mail, Percent, Building2, TrendingUp, UserCog, MapPin } from "lucide-react";
import { EventsTable } from "@/components/admin/EventsTable";
import { CreateEventModal } from "@/components/admin/CreateEventModal";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { InvitesManager } from "@/components/admin/InvitesManager";
import { ContactLeadsManager } from "@/components/admin/ContactLeadsManager";
import { CommissionsManager } from "@/components/admin/CommissionsManager";
import { OrganizersManager } from "@/components/admin/OrganizersManager";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { StaffManager } from "@/components/admin/StaffManager";
import { VenuesManager } from "@/components/admin/VenuesManager";
import { toast } from "sonner";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminStats {
  totalEvents: number;
  ticketsSold: number;
  activeUsers: number;
  platformCommissionMonth: number;
  salesCompletedMonth: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<
    | "eventos"
    | "organizadores"
    | "equipo"
    | "venues"
    | "galeria"
    | "invites"
    | "contacto"
    | "comisiones"
    | "ingresos"
  >("eventos");
  const [eventsOrganizerFilter, setEventsOrganizerFilter] = useState("all");
  const [commissionPrefillOrganizerId, setCommissionPrefillOrganizerId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) void fetchStats();
  }, [user, refreshKey]);

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

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
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
    fetchStats();
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Navbar igual que página principal */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
        >
          SOMNUS
        </button>
        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Eventos
          </button>
          <button
            onClick={() => router.push("/galeria")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Gallery
          </button>
          <Link
            href="/admin"
            className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider"
          >
            Panel
          </Link>
          <button
            onClick={() => router.push("/accesos")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Accesos
          </button>
          <button
            onClick={() => router.push("/mis-boletos")}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Mis Boletos
          </button>
          <button
            onClick={handleLogout}
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Salir
          </button>
        </nav>
      </header>

      {/* Panel header */}
      <div className="pt-20 sm:pt-24 lg:pt-28 pb-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-white/70 text-sm">Bienvenido, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="somnus-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Liquid Glass con datos reales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Total Eventos</p>
                <p className="text-3xl font-bold text-white">
                  {stats !== null ? stats.totalEvents.toLocaleString("es-MX") : "—"}
                </p>
              </div>
              <div className="w-12 h-12 liquid-glass rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Boletos Vendidos</p>
                <p className="text-3xl font-bold text-white">
                  {stats !== null ? stats.ticketsSold.toLocaleString("es-MX") : "—"}
                </p>
              </div>
              <div className="w-12 h-12 liquid-glass rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Usuarios Activos</p>
                <p className="text-3xl font-bold text-white">
                  {stats !== null ? stats.activeUsers.toLocaleString("es-MX") : "—"}
                </p>
              </div>
              <div className="w-12 h-12 liquid-glass rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Comisión este mes</p>
                <p className="text-2xl font-bold text-white">
                  {stats !== null ? formatMoney(stats.platformCommissionMonth) : "—"}
                </p>
              </div>
              <div className="w-12 h-12 liquid-glass rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Ventas del mes</p>
                <p className="text-2xl font-bold text-white">
                  {stats !== null ? stats.salesCompletedMonth.toLocaleString("es-MX") : "—"}
                </p>
              </div>
              <div className="w-12 h-12 liquid-glass rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Liquid glass */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("eventos")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "eventos"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Eventos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("organizadores")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "organizadores"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Organizadores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipo")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "equipo"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <UserCog className="w-4 h-4 inline mr-2" />
            Equipo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("venues")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "venues"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Venues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("galeria")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "galeria"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Gallery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invites")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "invites"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <Link2 className="w-4 h-4 inline mr-2" />
            Invites Mesas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacto")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "contacto"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Contacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ingresos")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "ingresos"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Ingresos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comisiones")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "comisiones"
                ? "liquid-glass bg-white text-black"
                : "liquid-glass text-white/80 hover:text-white"
            }`}
          >
            <Percent className="w-4 h-4 inline mr-2" />
            Comisiones
          </button>
        </div>

        {activeTab === "eventos" && (
          <div className="liquid-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Eventos</h2>
            </div>
            <EventsTable key={refreshKey} initialOrganizerFilter={eventsOrganizerFilter} />
          </div>
        )}

        {activeTab === "organizadores" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-6">Organizadores</h2>
            <OrganizersManager
              onViewEvents={(id) => {
                setEventsOrganizerFilter(id);
                setActiveTab("eventos");
              }}
              onConfigureCommission={(id) => {
                setCommissionPrefillOrganizerId(id);
                setActiveTab("comisiones");
              }}
            />
          </div>
        )}

        {activeTab === "equipo" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Equipo y roles</h2>
            <StaffManager mode="admin" />
          </div>
        )}

        {activeTab === "venues" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Venues</h2>
            <VenuesManager showOrganizer />
          </div>
        )}

        {activeTab === "galeria" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-6">Gallery</h2>
            <p className="text-white/70 text-sm mb-6">
              Sections sort with the newest on top on the public page. Upload
              files (drag-and-drop or choose files) or add by URL. Files go to
              Supabase Storage (same bucket as event posters,{" "}
              <code className="bg-white/10 px-1 rounded">gallery/</code> folder).
            </p>
            <GalleryManager />
          </div>
        )}

        {activeTab === "invites" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-6">Invites de mesas VIP</h2>
            <p className="text-white/70 text-sm mb-6">
              Genera links de pago por asiento desde el formulario de abajo (evento, mesa, precio total y número de personas). Cópialos y compártelos. Las mesas ya no usan mapa; todo se hace desde aquí.
            </p>
            <InvitesManager />
          </div>
        )}

        {activeTab === "contacto" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-6">Solicitudes de contacto</h2>
            <p className="text-white/70 text-sm mb-6">
              Personas que enviaron el formulario de contacto desde la página principal.
            </p>
            <ContactLeadsManager />
          </div>
        )}

        {activeTab === "ingresos" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-2">Ingresos y comisiones</h2>
            <p className="text-white/70 text-sm mb-6">
              Ganancias de Somnus por comisión configurada y cargos de servicio, con
              desglose por evento y organizador.
            </p>
            <RevenueDashboard />
          </div>
        )}

        {activeTab === "comisiones" && (
          <div className="liquid-glass p-6">
            <h2 className="text-xl font-bold text-white mb-6">Comisiones de plataforma</h2>
            <p className="text-white/70 text-sm mb-6">
              Configura comisiones globales, por organizador o por evento. Resolución: evento → organizador → global.
            </p>
            <CommissionsManager
              initialOrganizerId={commissionPrefillOrganizerId}
              onPrefillConsumed={() => setCommissionPrefillOrganizerId(null)}
            />
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


