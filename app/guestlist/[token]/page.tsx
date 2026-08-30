"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";

type GuestData = {
  name: string;
  quantity: number;
  status: string;
  canRedeem: boolean;
  note: string | null;
  event: {
    id: string;
    name: string;
    artist: string | null;
    venue: string | null;
    eventDate: string | null;
  };
};

export default function GuestListRedeemPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [data, setData] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<
    Array<{ ticketNumber: string; qrCode: string }>
  >([]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/guestlist/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else toast.error(json.error || "No encontrado");
      })
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  const redeem = async (mode: "tickets" | "confirm") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/guestlist/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      toast.success(json.message || "Listo");
      if (json.data?.tickets?.length) setTickets(json.data.tickets);
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: json.data?.entry?.status || prev.status,
              canRedeem: false,
            }
          : prev
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen somnus-events-bg">
      <SiteHeader eventsHref="/" />
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto">
        {loading ? (
          <p className="text-white/60">Cargando…</p>
        ) : !data ? (
          <p className="text-white/70">Invitación no disponible</p>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 mb-1">
                Guest list
              </p>
              <h1 className="text-2xl font-bold text-white">{data.event.name}</h1>
              <p className="text-white/70 mt-2">
                {data.name} · {data.quantity}{" "}
                {data.quantity === 1 ? "acceso" : "accesos"}
              </p>
              <p className="text-white/50 text-sm mt-1">Estado: {data.status}</p>
            </div>

            {data.canRedeem && (
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void redeem("tickets")}
                >
                  Canjear boletos (QR)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void redeem("confirm")}
                >
                  Solo confirmar asistencia
                </Button>
              </div>
            )}

            {tickets.length > 0 && (
              <div className="space-y-2 border border-white/10 rounded-xl p-4">
                <p className="text-white font-medium">Tus boletos</p>
                {tickets.map((t) => (
                  <p key={t.ticketNumber} className="text-white/70 text-sm font-mono">
                    {t.ticketNumber}
                  </p>
                ))}
                <Button
                  type="button"
                  className="w-full mt-2"
                  onClick={() => router.push("/perfil")}
                >
                  Ver en mi perfil
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
