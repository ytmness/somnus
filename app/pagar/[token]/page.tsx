"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { calculateServiceFee } from "@/lib/utils";

type LinkData = {
  token: string;
  label: string | null;
  quantity: number;
  amountPesos: number | null;
  ticketTypeName: string | null;
  event: {
    id: string;
    name: string;
    artist: string | null;
    venue: string | null;
  };
};

export default function PaymentLinkPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    name: string;
    email: string;
    phone?: string | null;
  } | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.user) {
          setSessionUser(json.user);
          setBuyerName(json.user.name || "");
          setBuyerEmail(json.user.email || "");
          setBuyerPhone(json.user.phone || "");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/checkout/payment-link?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else toast.error(json.error || "Link no válido");
      })
      .catch(() => toast.error("Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  const subtotal = data?.amountPesos ?? 0;
  const { totalCommission } = calculateServiceFee(subtotal);
  const total = subtotal + totalCommission;

  const pay = async () => {
    if (!sessionUser) {
      toast.error("Inicia sesión para pagar");
      router.push(
        `/login?redirect=${encodeURIComponent(`/pagar/${token}`)}`
      );
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Nombre y email requeridos");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/payment-link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      if (json.data?.saleId) {
        router.push(`/checkout/${json.data.saleId}`);
        return;
      }
      throw new Error("No se creó la venta");
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
          <p className="text-white/70">Link no disponible</p>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50 mb-1">
                Pago
              </p>
              <h1 className="text-2xl font-bold text-white">
                {data.label || data.event.name}
              </h1>
              <p className="text-white/70 mt-1">{data.event.name}</p>
              {data.ticketTypeName && (
                <p className="text-white/50 text-sm mt-1">
                  {data.ticketTypeName} × {data.quantity}
                </p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-MX")}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Cargo por servicio</span>
                <span>
                  $
                  {totalCommission.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2">
                <span>Total</span>
                <span>
                  $
                  {total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
                  MXN
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Nombre"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
              <input
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
              <input
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Teléfono"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
              />
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void pay()}
              >
                {busy ? "Procesando…" : "Pagar"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
