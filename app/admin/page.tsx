"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, HelpCircle, Menu } from "lucide-react";
import { EventsTable } from "@/components/admin/EventsTable";
import { EventFormWizard } from "@/components/event-form/EventFormWizard";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { InvitesManager } from "@/components/admin/InvitesManager";
import { PendingApprovalsManager } from "@/components/admin/PendingApprovalsManager";
import { ContactLeadsManager } from "@/components/admin/ContactLeadsManager";
import { CommissionsManager } from "@/components/admin/CommissionsManager";
import { OrganizersManager } from "@/components/admin/OrganizersManager";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { StaffManager } from "@/components/admin/StaffManager";
import { VenuesManager } from "@/components/admin/VenuesManager";
import { SqlEditorManager } from "@/components/admin/SqlEditorManager";
import {
  AdminSidebar,
  ADMIN_SECTION_META,
  type AdminSection,
} from "@/components/admin/AdminSidebar";
import {
  AdminOverview,
  type AdminStats,
} from "@/components/admin/AdminOverview";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { useProductTour } from "@/components/onboarding/useProductTour";
import { ADMIN_TOUR } from "@/components/onboarding/tours";
import { toast } from "sonner";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

export default function AdminPage() {
  const router = useRouter();
  const tour = useProductTour("admin");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [eventsOrganizerFilter, setEventsOrganizerFilter] = useState("all");
  const [commissionPrefillOrganizerId, setCommissionPrefillOrganizerId] =
    useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) void fetchStats();
  }, [user, refreshKey]);

  useEffect(() => {
    if (user) void fetchOrganizations();
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (!data.user || data.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      setUser(data.user);
    } catch {
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

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations", { credentials: "include" });
      const json = await res.json();
      if (res.ok) setOrganizations(json.data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sesión cerrada");
      router.push("/login");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    setRefreshKey((prev) => prev + 1);
    fetchStats();
  };

  const sectionMeta = ADMIN_SECTION_META[activeSection];

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
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

      <div className="pt-20 sm:pt-24 lg:pt-28 pb-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-start gap-2">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden somnus-nav-link p-2 -ml-2 mt-0.5 text-white/70 hover:text-white"
                aria-label="Open admin menu"
              >
                <Menu className="w-5 h-5" aria-hidden />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white truncate">
                    {sectionMeta.title}
                  </h1>
                  <button
                    type="button"
                    onClick={tour.start}
                    className="somnus-nav-link p-1.5 text-white/50 hover:text-white shrink-0"
                    aria-label="Replay tutorial"
                    title="Replay tutorial"
                  >
                    <HelpCircle className="w-5 h-5" aria-hidden />
                  </button>
                </div>
                <p className="text-white/60 text-sm mt-0.5 line-clamp-2">
                  {sectionMeta.description}
                  {user?.name ? ` · ${user.name}` : ""}
                </p>
              </div>
            </div>
            {activeSection !== "overview" && (
              <div className="flex items-center gap-4 shrink-0">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  data-tour="admin-new-event"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">New event</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-6 lg:gap-8 items-start">
          <AdminSidebar
            activeSection={activeSection}
            onSelect={setActiveSection}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
          />

          <div className="min-w-0 flex-1">
            {activeSection === "overview" && (
              <AdminOverview
                stats={stats}
                onNavigate={setActiveSection}
                onCreateEvent={() => setShowCreateModal(true)}
              />
            )}

            {activeSection === "eventos" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <EventsTable
                  key={refreshKey}
                  initialOrganizerFilter={eventsOrganizerFilter}
                />
              </div>
            )}

            {activeSection === "organizadores" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <OrganizersManager
                  onViewEvents={(id) => {
                    setEventsOrganizerFilter(id);
                    setActiveSection("eventos");
                  }}
                  onConfigureCommission={(id) => {
                    setCommissionPrefillOrganizerId(id);
                    setActiveSection("comisiones");
                  }}
                />
              </div>
            )}

            {activeSection === "equipo" && <StaffManager mode="admin" />}

            {activeSection === "venues" && <VenuesManager showOrganizer />}

            {activeSection === "galeria" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <GalleryManager />
              </div>
            )}

            {activeSection === "invites" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <InvitesManager />
              </div>
            )}

            {activeSection === "aprobaciones" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <PendingApprovalsManager />
              </div>
            )}

            {activeSection === "contacto" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <ContactLeadsManager />
              </div>
            )}

            {activeSection === "ingresos" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <RevenueDashboard />
              </div>
            )}

            {activeSection === "comisiones" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl">
                <CommissionsManager
                  initialOrganizerId={commissionPrefillOrganizerId}
                  onPrefillConsumed={() =>
                    setCommissionPrefillOrganizerId(null)
                  }
                />
              </div>
            )}

            {activeSection === "sql" && (
              <div className="liquid-glass p-4 sm:p-6 rounded-2xl border border-amber-500/20">
                <SqlEditorManager />
              </div>
            )}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <EventFormWizard
          mode="admin"
          organizations={organizations}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleEventCreated}
        />
      )}

      <ProductTour
        steps={ADMIN_TOUR}
        open={tour.open && !isLoading}
        onClose={() => tour.close(true)}
      />
    </div>
  );
}
