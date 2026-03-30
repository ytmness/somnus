"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  HelpCircle,
  Users,
} from "lucide-react";

type PaymentTimelineEntry = {
  order: number;
  name: string;
  amount: number;
  paidAt: string | null;
  seatNumber: number;
};

type InviteData = {
  isPool?: boolean;
  tableNumber?: string;
  tableReserved?: boolean;
  status?: string;
  paidCount?: number;
  maxSlots?: number | null;
  minPaidToConfirm?: number;
  tableConfirmed?: boolean;
  pricePerSeat?: number;
  totalCollected?: number;
  paymentTimeline?: PaymentTimelineEntry[];
  expiresAt?: string | null;
  event?: {
    name?: string;
    artist?: string;
    imageUrl?: string;
    eventDate?: string;
    eventTime?: string;
    venue?: string;
  };
  invitedName?: string;
  invitedEmail?: string;
  invitedPhone?: string;
  seatNumber?: number | null;
};

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatPaidAt(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function PagarInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!token) return null;
    const res = await fetch(`/api/invites/${token}`);
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "Invitación no encontrada" as string };
    }
    if (data.success && data.data) {
      return { data: data.data as InviteData };
    }
    return { error: "Invitación no encontrada" };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadInvite();
      if (cancelled) return;
      if (result && "error" in result) {
        setError(result.error);
        setInvite(null);
      } else if (result && "data" in result) {
        const d = result.data;
        setInvite(d);
        setError(null);
        if (d.status !== "PAID" && !d.tableReserved) {
          setFormData({
            buyerName: d.isPool ? "" : d.invitedName === "Pendiente" ? "" : d.invitedName || "",
            buyerEmail: d.invitedEmail || "",
            buyerPhone: d.invitedPhone || "",
          });
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadInvite]);

  useEffect(() => {
    if (!token || !invite?.isPool || invite.tableReserved) return;
    const t = setInterval(async () => {
      const result = await loadInvite();
      if (result && "data" in result && result.data) {
        setInvite(result.data);
      }
    }, 12000);
    return () => clearInterval(t);
  }, [token, invite?.isPool, invite?.tableReserved, loadInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyerName.trim() || !formData.buyerEmail.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/checkout/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: token,
          buyerName: formData.buyerName.trim(),
          buyerEmail: formData.buyerEmail.trim(),
          buyerPhone: formData.buyerPhone?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear la orden");
      }

      if (data.data?.saleId) {
        toast.success("Redirigiendo a pago...");
        router.push(`/checkout/${data.data.saleId}`);
        return;
      }

      setError("No se recibió el ID de venta");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1016] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-[#0c1016] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-white mb-4">{error || "Invitación no encontrada"}</h1>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-400 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const priceFormatted = mxn.format(invite.pricePerSeat ?? 0);
  const totalCollected = invite.totalCollected ?? 0;
  const timeline = invite.paymentTimeline ?? [];
  const paidCount = invite.paidCount ?? 0;

  const eventDate = invite.event?.eventDate
    ? new Intl.DateTimeFormat("es-MX", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(invite.event.eventDate))
    : "";

  if (invite.isPool) {
    const poolFull = !!invite.tableReserved;
    const expiresLine =
      invite.expiresAt &&
      new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(invite.expiresAt));

    return (
      <div className="min-h-screen bg-[#0c1016] text-white pb-32">
        {/* Barra superior */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 border-b border-white/[0.06] bg-[#0c1016]/95 backdrop-blur-md">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center text-sm font-bold tracking-[0.2em] text-white truncate uppercase">
            {invite.tableNumber || "Mesa"}
          </h1>
          <Link
            href="/"
            className="p-2 -mr-2 rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Ayuda"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>
        </header>

        {/* Franja decorativa */}
        <div className="relative h-36 bg-gradient-to-br from-sky-500/25 via-sky-600/10 to-transparent overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-4xl opacity-40 select-none" aria-hidden>
            💸
          </div>
        </div>

        <main className="max-w-lg mx-auto px-4 -mt-10 relative z-10 space-y-6">
          {/* Tarjeta resumen estilo pool */}
          <section className="rounded-2xl bg-[#161b24] border border-white/[0.08] shadow-xl shadow-black/40 p-6">
            <p className="text-[11px] font-semibold tracking-widest text-sky-400/90 uppercase mb-1">Money pool</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-1">{invite.tableNumber}</h2>
            <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-5">
              <Users className="w-4 h-4 opacity-70" />
              {paidCount === 1 ? "1 participante" : `${paidCount} participantes`}
            </p>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Recaudado</p>
            <p className="text-4xl font-bold text-white tabular-nums mb-4">{mxn.format(totalCollected)}</p>
            <p className="text-slate-500 text-xs mb-1">Tu aportación sugerida</p>
            <p className="text-lg font-semibold text-sky-300 tabular-nums">{priceFormatted}</p>
            {invite.minPaidToConfirm != null && (
              <p className="mt-4 text-xs text-slate-500 border-t border-white/[0.06] pt-4">
                {invite.tableConfirmed ? (
                  <span className="text-emerald-400 font-medium">Mesa confirmada</span>
                ) : (
                  <>
                    Confirmación al completar{" "}
                    <span className="text-slate-300 font-medium">{invite.minPaidToConfirm}</span> pagos:{" "}
                    <span className="text-slate-300">
                      {paidCount}/{invite.minPaidToConfirm}
                    </span>
                  </>
                )}
              </p>
            )}
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                S
              </span>
              <span>
                Creado por <span className="text-slate-300 font-medium">Somnus</span>
              </span>
            </div>
          </section>

          {/* Evento compacto */}
          {invite.event?.name && (
            <section className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#121820]">
              {invite.event.imageUrl ? (
                <div className="relative h-28 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      invite.event.imageUrl.startsWith("http")
                        ? invite.event.imageUrl
                        : invite.event.imageUrl.startsWith("/")
                          ? invite.event.imageUrl
                          : `/${invite.event.imageUrl}`
                    }
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121820] to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="font-semibold text-white text-sm line-clamp-2">{invite.event.name}</p>
                    {invite.event.artist && (
                      <p className="text-xs text-slate-400 truncate">{invite.event.artist}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="font-semibold text-white">{invite.event.name}</p>
                  {invite.event.artist && <p className="text-xs text-slate-400 mt-0.5">{invite.event.artist}</p>}
                </div>
              )}
              <div className="px-4 py-3 flex flex-wrap gap-3 text-xs text-slate-400 border-t border-white/[0.06]">
                {eventDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {eventDate}
                  </span>
                )}
                {invite.event.eventTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {invite.event.eventTime}
                  </span>
                )}
                {invite.event.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {invite.event.venue}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Actividad — timeline vertical */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 px-0.5">Actividad</h3>
            {timeline.length === 0 ? (
              <div className="rounded-2xl bg-[#161b24] border border-dashed border-white/[0.1] py-10 px-4 text-center">
                <p className="text-slate-500 text-sm leading-relaxed">
                  Anímate a ser el primero en pagar
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#161b24] border border-white/[0.08] p-4 pr-2">
                <ul className="relative">
                  {/* línea vertical del timeline */}
                  <span
                    className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-sky-500/50 via-sky-500/20 to-transparent"
                    aria-hidden
                  />
                  {timeline.map((entry, i) => (
                    <li key={`${entry.seatNumber}-${entry.order}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                      <div className="relative z-10 flex-shrink-0 w-8 flex flex-col items-center">
                        <span className="w-8 h-8 rounded-full bg-[#0c1016] border-2 border-sky-500/80 flex items-center justify-center text-[11px] font-bold text-sky-300">
                          {entry.order}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-[15px] leading-snug break-words">
                              {entry.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {entry.order === 1 ? "Primero en pagar" : `Pago #${entry.order}`}
                              {entry.paidAt ? ` · ${formatPaidAt(entry.paidAt)}` : ""}
                            </p>
                          </div>
                          <p className="text-sky-300 font-bold tabular-nums text-base sm:text-right flex-shrink-0">
                            {mxn.format(entry.amount)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {!poolFull && invite.status !== "PAID" ? (
            <section className="rounded-2xl bg-[#161b24] border border-white/[0.08] p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-sky-500/15 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Siguiente pago</p>
                  <p className="text-lg font-bold text-white tabular-nums">{priceFormatted}</p>
                </div>
              </div>
              <form id="pool-pay-form" onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.buyerName}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerName: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#0c1016] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerEmail: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#0c1016] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Teléfono (opcional)</label>
                  <input
                    type="tel"
                    value={formData.buyerPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerPhone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[#0c1016] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="55 1234 5678"
                  />
                </div>
              </form>
            </section>
          ) : (
            <section className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Mesa completa</h2>
              <p className="text-slate-400 text-sm">Todos los lugares de este link ya fueron pagados.</p>
            </section>
          )}
        </main>

        {/* Barra inferior fija */}
        {!poolFull && invite.status !== "PAID" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0c1016] via-[#0c1016] to-transparent">
            <div className="max-w-lg mx-auto space-y-3">
              {expiresLine && (
                <p className="text-center text-[11px] text-slate-500">
                  Se aceptan pagos hasta el {expiresLine}
                </p>
              )}
              <button
                type="submit"
                form="pool-pay-form"
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg shadow-sky-500/25 transition-colors"
              >
                {isProcessing ? "Procesando…" : "Pagar"}
              </button>
              <p className="text-center text-[10px] text-slate-600">Pago seguro con Clip</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ——— Modo link individual (no pool): layout clásico Somnus ——— */
  return (
    <div className="min-h-screen somnus-bg-main">
      <header className="border-b border-white/10 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-white/80 hover:text-white text-sm font-medium uppercase tracking-wider flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            SOMNUS
          </Link>
          <span className="text-white/60 text-sm">Pago seguro con Clip</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl overflow-hidden border border-white/10 mb-8">
          {invite.event?.imageUrl ? (
            <div className="relative w-full aspect-[16/9] bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  invite.event.imageUrl.startsWith("http")
                    ? invite.event.imageUrl
                    : invite.event.imageUrl.startsWith("/")
                      ? invite.event.imageUrl
                      : `/${invite.event.imageUrl}`
                }
                alt={invite.event.name || "Evento"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{invite.event.name}</h1>
                {invite.event.artist && (
                  <p className="text-white/90 text-sm sm:text-base mt-0.5">{invite.event.artist}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 p-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{invite.event?.name}</h1>
              {invite.event?.artist && <p className="text-white/80 mt-1">{invite.event.artist}</p>}
            </div>
          )}
          <div className="p-4 sm:p-5 bg-white/5 border-t border-white/10 flex flex-wrap gap-4 text-sm text-white/80">
            {eventDate && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white/60" />
                {eventDate}
              </span>
            )}
            {invite.event?.eventTime && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/60" />
                {invite.event.eventTime}
              </span>
            )}
            {invite.event?.venue && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/60" />
                {invite.event.venue}
              </span>
            )}
          </div>
        </div>

        <p className="text-white/70 text-center mb-6">
          Mesa <strong className="text-white">{invite.tableNumber}</strong>
          {" · "}
          Asiento <strong className="text-white">{invite.seatNumber}</strong>
        </p>

        {invite.tableReserved || invite.status === "PAID" ? (
          <div className="somnus-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Mesa reservada</h2>
            <p className="text-white/70">Esta invitación ya fue utilizada.</p>
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="somnus-card p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total a pagar</p>
                <p className="text-2xl font-bold text-white">{priceFormatted}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.buyerName}
                  onChange={(e) => setFormData((p) => ({ ...p, buyerName: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.buyerEmail}
                  onChange={(e) => setFormData((p) => ({ ...p, buyerEmail: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={formData.buyerPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, buyerPhone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="55 1234 5678"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full mt-6 px-6 py-4 rounded-lg bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? "Procesando..." : "Pagar con tarjeta"}
              </button>
            </form>
          </div>
        )}

        {invite.tableReserved || invite.status === "PAID" ? null : (
          <p className="text-white/50 text-xs text-center">
            Serás redirigido a la pasarela de Clip para ingresar los datos de tu tarjeta.
          </p>
        )}
      </main>
    </div>
  );
}
