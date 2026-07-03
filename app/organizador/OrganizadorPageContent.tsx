"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Calendar, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { OrganizationsManager } from "@/components/organizador/OrganizationsManager";
import { OrganizerEventsManager } from "@/components/organizador/OrganizerEventsManager";
import { OrganizerMessagesTab } from "@/components/mensajes/OrganizerMessagesTab";
import { StaffManager } from "@/components/admin/StaffManager";
import { VenuesManager } from "@/components/admin/VenuesManager";
import { formatStripeRequirements } from "@/lib/payments/stripe-requirements";

interface Organization {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  isActive: boolean;
  _count?: { events: number };
}

interface OrganizerStatus {
  hasOrganizer: boolean;
  organizer?: { id: string; businessName: string; contactEmail: string };
  status?: {
    stripeAccountId: string | null;
    stripeOnboardingStatus: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsDue: string[];
    isReady: boolean;
  } | null;
  organizations?: Organization[];
  recentSales?: Array<{
    id: string;
    total: number;
    platformFeeAmount: number | null;
    organizerNetAmount: number | null;
    providerStatus: string | null;
    paidAt: string | null;
    event: { name: string };
  }>;
}

export default function OrganizadorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<OrganizerStatus | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showPayments, setShowPayments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"eventos" | "mensajes">("eventos");

  const loadOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations", { credentials: "include" });
      const json = await res.json();
      if (res.ok) setOrganizations(json.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/organizers/stripe/onboard", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
      if (json.status?.isReady || json.status?.stripeAccountId) {
        setShowPayments(true);
      }
      await loadOrganizations();
    } catch {
      toast.error("Error al cargar el panel");
    } finally {
      setLoading(false);
    }
  }, [router, loadOrganizations]);

  useEffect(() => {
    void loadStatus();
    const stripeParam = searchParams.get("stripe");
    const tabParam = searchParams.get("tab");
    if (tabParam === "mensajes") setActiveTab("mensajes");
    if (stripeParam === "return") {
      toast.success("Regresaste de Stripe. Actualizando estado...");
      setShowPayments(true);
      void loadStatus();
    }
  }, [searchParams, loadStatus]);

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const json = await res.json();
      if (json.user?.id) setCurrentUserId(json.user.id);
    };
    void loadUser();
  }, []);

  const handleStartPublishing = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/organizers/start", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al activar el panel");
      toast.success("¡Listo! Ya puedes configurar tus eventos.");
      await loadStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al comenzar");
    } finally {
      setStarting(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/organizers/stripe/onboard", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "STRIPE_CONNECT_NOT_ENABLED") {
          setConnectError(json.error);
          setConnecting(false);
          return;
        }
        throw new Error(json.error || "Error al conectar Stripe");
      }
      window.location.href = json.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al conectar Stripe");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const hasOrganizer = data?.hasOrganizer ?? false;
  const status = data?.status;
  const isReady = status?.isReady;

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <header className="border-b border-white/10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-white/80 hover:text-white text-sm uppercase tracking-wider"
          >
            ← SOMNUS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/mis-boletos"
              className="text-white/60 hover:text-white text-sm"
            >
              Mis boletos
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                  toast.success("Sesión cerrada");
                  window.location.href = "/";
                } catch {
                  toast.error("Error al cerrar sesión");
                }
              }}
              className="text-white/60 hover:text-white text-sm uppercase tracking-wider"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {!hasOrganizer ? (
          <section className="somnus-card p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white/80" />
            </div>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-wider mb-3">
                Publica tus eventos en Somnus
              </h1>
              <p className="text-white/60 max-w-lg mx-auto">
                Crea tu marca, publica eventos y cobra boletos en línea. Solo configura
                los pagos cuando estés listo para vender.
              </p>
            </div>
            <ul className="text-left max-w-md mx-auto space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5 text-white/50" />
                Crea organizaciones (marcas) y eventos desde un solo lugar
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5 text-white/50" />
                Stripe Connect solo cuando quieras recibir pagos
              </li>
            </ul>
            <button
              type="button"
              onClick={handleStartPublishing}
              disabled={starting}
              className="somnus-btn px-10 py-4 disabled:opacity-50"
            >
              {starting ? "Activando..." : "Comenzar a publicar"}
            </button>
            <p className="text-xs text-white/40">
              ¿Solo quieres comprar boletos?{" "}
              <Link href="/" className="underline hover:text-white/60">
                Volver a eventos
              </Link>
            </p>
          </section>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">
                Publicar eventos
              </h1>
              <p className="text-white/60">
                {data?.organizer?.businessName} · {data?.organizer?.contactEmail}
              </p>
            </div>

            <OrganizationsManager
              organizations={organizations}
              onRefresh={() => void loadOrganizations()}
            />

            <section className="somnus-card p-6">
              <VenuesManager />
            </section>

            <section className="somnus-card p-6">
              <h2 className="text-xl font-semibold mb-4">Equipo</h2>
              <StaffManager mode="organizer" />
            </section>

            <div className="flex gap-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("eventos")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "eventos"
                    ? "border-white text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                Eventos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mensajes")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "mensajes"
                    ? "border-white text-white"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                Mensajes
              </button>
            </div>

            {activeTab === "eventos" ? (
              <OrganizerEventsManager
                stripeReady={!!isReady}
                organizations={organizations}
                onRefreshOrgs={() => void loadOrganizations()}
              />
            ) : (
              currentUserId && (
                <OrganizerMessagesTab
                  organizations={organizations}
                  currentUserId={currentUserId}
                />
              )
            )}

            <section className="somnus-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPayments((v) => !v)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <div>
                  <h2 className="text-xl font-semibold">Configurar pagos (Stripe)</h2>
                  <p className="text-white/50 text-sm mt-1">
                    {isReady
                      ? "Cuenta conectada y lista"
                      : "Opcional hasta que quieras cobrar eventos"}
                  </p>
                </div>
                {showPayments ? (
                  <ChevronUp className="w-5 h-5 text-white/50" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/50" />
                )}
              </button>

              {showPayments && (
                <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
                  {!isReady ? (
                    <>
                      <p className="text-white/70 text-sm">
                        Conecta Stripe para recibir el dinero de tus ventas. No es
                        necesario si aún no vas a publicar eventos de pago.
                      </p>
                      {connectError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
                          <p className="font-medium mb-1">No se pudo conectar Stripe</p>
                          <p>{connectError}</p>
                        </div>
                      )}
                      {status?.requirementsDue && status.requirementsDue.length > 0 && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200">
                          <p className="font-medium mb-1">
                            Falta completar tu perfil en Stripe
                          </p>
                          <p className="text-amber-100/80 mb-2">
                            Stripe te pedirá estos datos en su formulario seguro
                            (incluye banco, identificación y dirección). Somnus no
                            guarda esa información.
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {formatStripeRequirements(status.requirementsDue).map(
                              (req) => (
                                <li key={req}>{req}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleConnectStripe}
                        disabled={connecting}
                        className="px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50"
                      >
                        {connecting
                          ? "Redirigiendo..."
                          : status?.stripeAccountId
                            ? "Completar configuración"
                            : "Conectar Stripe"}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                      <p className="text-green-300 font-medium">
                        Cuenta conectada y lista para recibir pagos
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        ID: {status?.stripeAccountId}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {data?.recentSales && data.recentSales.length > 0 && (
              <section className="somnus-card p-6">
                <h2 className="text-xl font-semibold mb-4">Ventas recientes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 border-b border-white/10">
                        <th className="text-left py-2">Evento</th>
                        <th className="text-right py-2">Total</th>
                        <th className="text-right py-2">Comisión</th>
                        <th className="text-right py-2">Neto</th>
                        <th className="text-right py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSales.map((sale) => (
                        <tr key={sale.id} className="border-b border-white/5">
                          <td className="py-3">{sale.event.name}</td>
                          <td className="text-right">${Number(sale.total).toFixed(2)}</td>
                          <td className="text-right">
                            ${Number(sale.platformFeeAmount || 0).toFixed(2)}
                          </td>
                          <td className="text-right">
                            ${Number(sale.organizerNetAmount || 0).toFixed(2)}
                          </td>
                          <td className="text-right text-white/60">
                            {sale.providerStatus || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
