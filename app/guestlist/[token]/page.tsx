"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";

type GuestTicket = {
  id: string;
  ticketNumber: string;
  qrCode: string;
  status: string;
};

type GuestData = {
  name: string;
  quantity: number;
  status: string;
  note: string | null;
  requiresAuth: boolean;
  canAccept: boolean;
  claimedByCurrentUser: boolean;
  tickets: GuestTicket[];
  error: string | null;
  event: {
    id: string;
    name: string;
    artist: string | null;
    venue: string | null;
    eventDate: string | null;
  };
};

type ViewState = "loading" | "accept" | "confirmed" | "error";

export default function GuestListRedeemPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [data, setData] = useState<GuestData | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<GuestTicket[]>([]);

  const redirectToAuth = useCallback(() => {
    const next = `/guestlist/${token}`;
    const qs = new URLSearchParams({ redirect: next });
    router.replace(`/login?${qs.toString()}`);
  }, [router, token]);

  const applyPayload = useCallback(
    (payload: GuestData) => {
      setData(payload);
      if (payload.requiresAuth) {
        redirectToAuth();
        return;
      }
      if (payload.claimedByCurrentUser) {
        setTickets(payload.tickets || []);
        setView("confirmed");
        return;
      }
      if (payload.canAccept) {
        setView("accept");
        return;
      }
      setErrorMessage(payload.error || "Esta invitación no está disponible.");
      setView("error");
    },
    [redirectToAuth]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guestlist/${token}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setErrorMessage(
            json.error || "Esta invitación no existe o ya no está disponible."
          );
          setView("error");
          return;
        }
        applyPayload(json.data as GuestData);
      } catch {
        if (!cancelled) {
          setErrorMessage("No pudimos cargar tu invitación. Intenta de nuevo.");
          setView("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, applyPayload]);

  const acceptCourtesy = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/guestlist/${token}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.status === 401) {
        redirectToAuth();
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || "No se pudo aceptar la cortesía");
      }
      const issued = (json.data?.tickets || []) as GuestTicket[];
      setTickets(issued);
      setView("confirmed");
      toast.success(json.message || "¡Listo! Ya tienes tu boleto");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo aceptar la cortesía";
      setErrorMessage(message);
      setView("error");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen somnus-events-bg">
      <SiteHeader eventsHref="/" />
      <main className="somnus-page-under-header pb-16 px-4 max-w-lg mx-auto">
        {view === "loading" && (
          <p className="text-white/60">Cargando tu cortesía…</p>
        )}

        {view === "error" && (
          <div className="space-y-4 text-center pt-8">
            <h1 className="text-2xl font-bold text-white">
              Invitación no disponible
            </h1>
            <p className="text-white/70">
              {errorMessage || "Esta invitación no está disponible."}
            </p>
            <Link
              href="/"
              className="inline-block text-sm text-white/60 underline underline-offset-4 hover:text-white"
            >
              Volver al inicio
            </Link>
          </div>
        )}

        {view === "accept" && data && (
          <div className="space-y-8 pt-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                Cortesía
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {data.event.name}
              </h1>
              <p className="text-white/70 mt-3">
                Tienes una cortesía disponible
                {data.quantity > 1
                  ? ` · ${data.quantity} accesos`
                  : ""}
                .
              </p>
              <p className="text-white/50 text-sm mt-2">
                Acéptala para guardar el boleto en tu cuenta.
              </p>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void acceptCourtesy()}
            >
              Aceptar cortesía
            </Button>
          </div>
        )}

        {view === "confirmed" && data && (
          <div className="space-y-6 pt-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                Listo
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Ya tienes tu boleto
              </h1>
              <p className="text-white/70 mt-3">
                Tu cortesía para{" "}
                <span className="text-white">{data.event.name}</span> ya está
                en tu cuenta. Puedes verla y descargarla cuando quieras.
              </p>
            </div>

            {tickets.length > 0 && (
              <div className="space-y-2 border border-white/10 rounded-xl p-4">
                <p className="text-white font-medium">Tus boletos</p>
                {tickets.map((t) => (
                  <p
                    key={t.ticketNumber}
                    className="text-white/70 text-sm font-mono"
                  >
                    {t.ticketNumber}
                    {t.status === "CANCELLED" ? " · Cancelado" : ""}
                  </p>
                ))}
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={() => router.push("/mis-boletos")}
            >
              Ver mis boletos
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
