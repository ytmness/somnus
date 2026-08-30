"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SiteHeader, type SessionUser } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  perks: string | null;
  earlyAccessHours: number | null;
}

function MembresiasContent() {
  const params = useParams();
  const slug = String(params.slug || "");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgName, setOrgName] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleUserChange = useCallback((_u: SessionUser | null) => {}, []);

  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      toast.success("Membresía activada");
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const orgRes = await fetch(`/api/organizations/public/${encodeURIComponent(slug)}`);
        const orgJson = await orgRes.json();
        if (!orgRes.ok || !orgJson.data?.id) {
          toast.error("Organización no encontrada");
          setLoading(false);
          return;
        }

        setOrgName(orgJson.data.name || slug);

        const plansRes = await fetch(
          `/api/organizations/${orgJson.data.id}/membership-plans`
        );
        const plansJson = await plansRes.json();
        if (plansRes.ok) setPlans(plansJson.data || []);
      } catch {
        toast.error("Error al cargar membresías");
      } finally {
        setLoading(false);
      }
    };
    if (slug) void load();
  }, [slug]);

  const subscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const sessionRes = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const sessionJson = await sessionRes.json();
      if (!sessionJson.user) {
        router.push(`/login?next=/organizaciones/${slug}/membresias`);
        return;
      }

      const res = await fetch("/api/memberships/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "No se pudo suscribir");
        return;
      }
      if (json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      toast.success("Membresía activada");
    } catch {
      toast.error("Error al suscribirse");
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (cents: number, currency: string, interval: string) => {
    const amount = (cents / 100).toLocaleString("es-MX", {
      style: "currency",
      currency: currency || "MXN",
    });
    return `${amount}/${interval === "year" ? "año" : "mes"}`;
  };

  return (
    <div className="min-h-screen somnus-bg-main">
      <SiteHeader eventsHref="/" onUserChange={handleUserChange} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 lg:pt-32 pb-16">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
          Membresías{orgName ? ` · ${orgName}` : ""}
        </h1>
        <p className="text-white/60 text-sm mb-8">
          Acceso anticipado y beneficios exclusivos de la comunidad.
        </p>

        {loading ? (
          <p className="text-white/60">Cargando planes…</p>
        ) : plans.length === 0 ? (
          <p className="text-white/60">
            Esta organización aún no tiene planes de membresía.
          </p>
        ) : (
          <ul className="space-y-4">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
              >
                <div>
                  <h2 className="text-lg text-white font-medium">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-white/60 text-sm mt-1">
                      {plan.description}
                    </p>
                  )}
                  {plan.earlyAccessHours != null && (
                    <p className="text-white/40 text-xs mt-2">
                      Acceso anticipado: {plan.earlyAccessHours}h
                    </p>
                  )}
                  <p className="text-white mt-2">
                    {formatPrice(plan.priceCents, plan.currency, plan.interval)}
                  </p>
                </div>
                <Button
                  onClick={() => subscribe(plan.id)}
                  disabled={subscribing === plan.id}
                >
                  {subscribing === plan.id ? "Procesando…" : "Suscribirme"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function MembresiasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center text-white/70">
          Cargando…
        </div>
      }
    >
      <MembresiasContent />
    </Suspense>
  );
}
