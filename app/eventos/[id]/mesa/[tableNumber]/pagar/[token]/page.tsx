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
  Plus,
  Minus,
} from "lucide-react";
import { isSalesOpen } from "@/lib/ticket-sales-window";
import {
  inviteTicketAvailable,
  isInviteTicketSoldOut,
  type InviteTicketTypePayload,
} from "@/lib/invite-tickets";

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
    salesStartDate?: string;
    salesEndDate?: string;
  };
  ticketTypeName?: string | null;
  ticketTypes?: InviteTicketTypePayload[];
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

function eventFlyerSrc(imageUrl: string | undefined) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  if (imageUrl.startsWith("/")) return imageUrl;
  return `/${imageUrl}`;
}

export default function PagarInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    name: string;
    phone?: string | null;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [formData, setFormData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [extraPeople, setExtraPeople] = useState<
    Array<{ name: string; email: string; phone: string }>
  >([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const inviteReturnPath = `/eventos/${params.eventId}/mesa/${params.tableNumber}/pagar/${token}`;

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setSessionUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            phone: data.user.phone,
          });
          setFormData((prev) => ({
            ...prev,
            buyerEmail: data.user.email || prev.buyerEmail,
            buyerName: prev.buyerName || data.user.name || "",
            buyerPhone: prev.buyerPhone || data.user.phone || "",
          }));
        } else {
          router.replace(`/register?redirect=${encodeURIComponent(inviteReturnPath)}`);
        }
      })
      .catch(() => {
        router.replace(`/register?redirect=${encodeURIComponent(inviteReturnPath)}`);
      })
      .finally(() => setAuthChecked(true));
  }, [inviteReturnPath, router]);

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
    if (!authChecked || !sessionUser) {
      if (authChecked && !sessionUser) setIsLoading(false);
      return;
    }
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
        const initial: Record<string, number> = {};
        (d.ticketTypes || []).forEach((tt) => {
          initial[tt.id] = 0;
        });
        setQuantities(initial);
        setError(null);
        if (d.status !== "PAID" && !d.tableReserved) {
          setFormData((prev) => ({
            buyerName: prev.buyerName || (d.isPool ? "" : d.invitedName === "Pendiente" ? "" : d.invitedName || ""),
            buyerEmail: prev.buyerEmail || d.invitedEmail || "",
            buyerPhone: prev.buyerPhone || d.invitedPhone || "",
          }));
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadInvite, authChecked, sessionUser]);

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
    if (!sessionUser) {
      toast.error("Crea una cuenta o inicia sesión para pagar");
      router.replace(`/register?redirect=${encodeURIComponent(inviteReturnPath)}`);
      return;
    }
    if (!formData.buyerName.trim() || !formData.buyerEmail.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }

    const pickerTypes = invite?.ticketTypes || [];
    const selectedItems = pickerTypes
      .filter((tt) => (quantities[tt.id] || 0) > 0)
      .map((tt) => ({ ticketTypeId: tt.id, quantity: quantities[tt.id] }));

    if (invite?.isPool && pickerTypes.length > 0 && selectedItems.length === 0) {
      toast.error("Selecciona al menos un boleto");
      return;
    }

    setIsProcessing(true);
    try {
      for (const p of extraPeople) {
        if (!p.name.trim()) {
          toast.error("Para agregar una persona extra, el nombre es requerido");
          setIsProcessing(false);
          return;
        }
      }

      const extraPayload = extraPeople.map((p) => ({
        name: p.name.trim(),
        email: p.email.trim() || undefined,
        phone: p.phone.trim() || undefined,
      }));

      const res = await fetch("/api/checkout/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: token,
          buyerName: formData.buyerName.trim(),
          buyerEmail: formData.buyerEmail.trim(),
          buyerPhone: formData.buyerPhone?.trim() || undefined,
          ...(selectedItems.length > 0
            ? { items: selectedItems }
            : { extraPeople: extraPayload }),
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

  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center relative z-0">
        <div className="text-center relative z-10">
          <div className="w-14 h-14 border-2 border-white/20 border-t-[#5B8DEF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (authChecked && !sessionUser) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center relative z-0">
        <div className="text-center relative z-10">
          <div className="w-14 h-14 border-2 border-white/20 border-t-[#5B8DEF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Redirigiendo a iniciar sesión…</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4 relative z-0">
        <div className="text-center max-w-md relative z-10">
          <h1 className="text-xl font-semibold text-white mb-4">{error || "Invitación no encontrada"}</h1>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors"
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
  const pickerTypes = invite.ticketTypes || [];
  const hasTicketPicker = Boolean(invite.isPool && pickerTypes.length > 0);
  const eventWindow =
    invite.event?.salesStartDate && invite.event?.salesEndDate
      ? {
          salesStartDate: invite.event.salesStartDate,
          salesEndDate: invite.event.salesEndDate,
        }
      : null;
  const now = new Date();
  const selectionCount = pickerTypes.reduce(
    (sum, tt) => sum + (quantities[tt.id] || 0),
    0
  );
  const selectionTotal = pickerTypes.reduce(
    (sum, tt) => sum + tt.price * (quantities[tt.id] || 0),
    0
  );
  const checkoutTotal = hasTicketPicker
    ? selectionTotal
    : (invite.pricePerSeat ?? 0) * (1 + extraPeople.length);

  const bumpQty = (tt: InviteTicketTypePayload, delta: number) => {
    if (!eventWindow) return;
    if (isInviteTicketSoldOut(tt) || !isSalesOpen(eventWindow, tt, now)) return;
    const available = inviteTicketAvailable(tt);
    const min = tt.minPurchaseQty || 1;
    const max = tt.maxPurchaseQty ?? available;
    setQuantities((prev) => {
      const current = prev[tt.id] || 0;
      let next = current + delta;
      if (next <= 0) next = 0;
      else if (current === 0 && next > 0) next = Math.min(min, available);
      else next = Math.max(0, Math.min(max, available, next));
      return { ...prev, [tt.id]: next };
    });
  };

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
      <div className="min-h-screen somnus-bg-main text-white pb-32 relative z-0">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="flex-1 text-center text-sm font-bold tracking-[0.15em] text-white truncate uppercase">
            {invite.tableNumber || "Mesa"}
          </h1>
          <Link
            href="/"
            className="p-2 -mr-2 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Ayuda"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>
        </header>

        {/* Flyer / imagen del evento completa (sin recorte) */}
        {invite.event?.imageUrl ? (
          <div className="relative z-10 px-4 pt-4">
            <div className="max-w-lg mx-auto rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <div className="flex justify-center items-start w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={eventFlyerSrc(invite.event.imageUrl)}
                  alt={invite.event.name || "Evento"}
                  className="w-full h-auto max-h-[min(88vh,960px)] object-contain object-top"
                />
              </div>
            </div>
          </div>
        ) : null}

        <main className="max-w-lg mx-auto px-4 pt-6 relative z-10 space-y-6">
          {invite.event?.name && (
            <section className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="font-bold text-white text-lg leading-snug">{invite.event.name}</p>
              {invite.event.artist && (
                <p className="text-white/70 text-sm mt-1">{invite.event.artist}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/55">
                {eventDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#5B8DEF]/80" />
                    {eventDate}
                  </span>
                )}
                {invite.event.eventTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5B8DEF]/80" />
                    {invite.event.eventTime}
                  </span>
                )}
                {invite.event.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#5B8DEF]/80" />
                    {invite.event.venue}
                  </span>
                )}
              </div>
            </section>
          )}

          <section className="rounded-xl bg-white/5 border border-white/10 p-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#7BA3E8] uppercase mb-2">Mesa compartida</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-1">{invite.tableNumber}</h2>
            {invite.ticketTypeName ? (
              <p className="text-white/55 text-sm mb-1">{invite.ticketTypeName}</p>
            ) : null}
            <p className="text-white/60 text-sm flex items-center gap-1.5 mb-5">
              <Users className="w-4 h-4 opacity-80" />
              {paidCount === 1 ? "1 participante" : `${paidCount} participantes`}
            </p>
            <p className="text-white/45 text-xs mb-1">
              {hasTicketPicker
                ? pickerTypes.length === 1
                  ? "Elige cuántos quieres de este tipo de mesa"
                  : "Elige cuántos boletos quieres de cada tipo"
                : "Cada pago usa el precio de mesa del evento"}
            </p>
            {!hasTicketPicker && (
              <p className="text-lg font-semibold text-[#7BA3E8] tabular-nums">{priceFormatted}</p>
            )}
            {invite.minPaidToConfirm != null &&
              invite.pricePerSeat != null &&
              !invite.tableConfirmed && (
                <p className="mt-2 text-[11px] text-white/40">
                  Con {invite.minPaidToConfirm} pagos a este precio se considera la mesa confirmada (total aprox.{" "}
                  {mxn.format(invite.minPaidToConfirm * invite.pricePerSeat)}); pueden seguir entrando más pagos.
                </p>
              )}
            {invite.minPaidToConfirm != null && (
              <p className="mt-4 text-xs text-white/50 border-t border-white/10 pt-4">
                {invite.tableConfirmed ? (
                  <span className="text-emerald-400/90 font-medium">Mesa confirmada</span>
                ) : (
                  <>
                    Confirmación al completar{" "}
                    <span className="text-white/80 font-medium">{invite.minPaidToConfirm}</span> pagos:{" "}
                    <span className="text-white/80">
                      {paidCount}/{invite.minPaidToConfirm}
                    </span>
                  </>
                )}
              </p>
            )}
            <div className="mt-5 flex items-center gap-2 text-xs text-white/50">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5B8DEF] to-[#7BA3E8] flex items-center justify-center text-[10px] font-bold text-white">
                S
              </span>
              <span>
                Creado por <span className="text-white/75 font-medium">Somnus</span>
              </span>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white/80 mb-3 px-0.5">Actividad</h3>
            {timeline.length === 0 ? (
              <div className="rounded-xl bg-white/5 border border-dashed border-white/15 py-10 px-4 text-center">
                <p className="text-white/50 text-sm leading-relaxed">
                  Anímate a ser el primero en pagar
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 pr-2">
                <ul className="relative">
                  <span
                    className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-[#5B8DEF]/60 via-[#5B8DEF]/25 to-transparent"
                    aria-hidden
                  />
                  {timeline.map((entry, i) => (
                    <li key={`${entry.seatNumber}-${entry.order}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                      <div className="relative z-10 flex-shrink-0 w-8 flex flex-col items-center">
                        <span className="w-8 h-8 rounded-full bg-[#0A0A0A] border-2 border-[#5B8DEF]/70 flex items-center justify-center text-[11px] font-bold text-[#7BA3E8]">
                          {entry.order}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-[15px] leading-snug break-words">
                              {entry.name}
                            </p>
                            <p className="text-xs text-white/45 mt-0.5">
                              {entry.order === 1 ? "Primero en pagar" : `Pago #${entry.order}`}
                              {entry.paidAt ? ` · ${formatPaidAt(entry.paidAt)}` : ""}
                            </p>
                          </div>
                          <p className="text-[#7BA3E8] font-bold tabular-nums text-base sm:text-right flex-shrink-0">
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
            <section className="rounded-xl bg-white/5 border border-white/10 p-5">
              {authChecked && !sessionUser && (
                <div className="mb-4 rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-white/80 text-sm">
                    Crea una cuenta o inicia sesión para pagar esta invitación.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      router.replace(`/register?redirect=${encodeURIComponent(inviteReturnPath)}`);
                    }}
                    className="mt-2 somnus-btn px-4 py-2 text-xs"
                  >
                    Continuar
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-[#5B8DEF]/15 flex items-center justify-center border border-[#5B8DEF]/25">
                  <CreditCard className="w-5 h-5 text-[#7BA3E8]" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Total este checkout</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {mxn.format(checkoutTotal)}
                  </p>
                  {hasTicketPicker && (
                    <p className="text-[11px] text-white/40 mt-1">
                      {selectionCount === 0
                        ? "Selecciona boletos abajo"
                        : `${selectionCount} boleto${selectionCount === 1 ? "" : "s"}`}
                    </p>
                  )}
                </div>
              </div>
              <form id="pool-pay-form" onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.buyerName}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerName: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerEmail: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5">Teléfono (opcional)</label>
                  <input
                    type="tel"
                    value={formData.buyerPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, buyerPhone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                    placeholder="55 1234 5678"
                  />
                </div>

                {hasTicketPicker ? (
                  <div className="pt-2 space-y-3">
                    <p className="text-white/50 text-xs">Boletos</p>
                    {pickerTypes.map((tt) => {
                      const soldOut = isInviteTicketSoldOut(tt);
                      const salesOpen = eventWindow
                        ? isSalesOpen(eventWindow, tt, now)
                        : true;
                      const disabled = soldOut || !salesOpen;
                      const qty = quantities[tt.id] || 0;
                      const available = inviteTicketAvailable(tt);
                      const maxQ = tt.maxPurchaseQty ?? available;
                      return (
                        <div
                          key={tt.id}
                          className={`rounded-lg border border-white/10 bg-white/5 p-3 ${
                            disabled ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {tt.name}
                              </p>
                              <p className="text-white/55 text-xs tabular-nums mt-0.5">
                                {mxn.format(tt.price)}
                                {tt.kind === "TABLE" ? " / mesa" : ""}
                              </p>
                              {soldOut && (
                                <p className="text-[10px] uppercase tracking-wider text-white/45 mt-1">
                                  Agotado
                                </p>
                              )}
                              {!soldOut && !salesOpen && (
                                <p className="text-[10px] uppercase tracking-wider text-amber-200/80 mt-1">
                                  Fuera de venta
                                </p>
                              )}
                            </div>
                            {!disabled && (
                              <div className="flex items-center gap-1 border border-white/20 rounded-lg shrink-0">
                                <button
                                  type="button"
                                  onClick={() => bumpQty(tt, -1)}
                                  disabled={qty === 0}
                                  aria-label={`Quitar ${tt.name}`}
                                  className="p-2 text-white/80 hover:text-white disabled:opacity-40"
                                >
                                  <Minus className="w-4 h-4" aria-hidden />
                                </button>
                                <span className="px-3 py-1.5 text-white text-sm tabular-nums min-w-[2rem] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => bumpQty(tt, 1)}
                                  disabled={qty >= maxQ || qty >= available}
                                  aria-label={`Agregar ${tt.name}`}
                                  className="p-2 text-white/80 hover:text-white disabled:opacity-40"
                                >
                                  <Plus className="w-4 h-4" aria-hidden />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-xs">Agregar personas extra (opcional)</p>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraPeople((prev) => [
                          ...prev,
                          { name: "", email: "", phone: "" },
                        ])
                      }
                      className="text-xs text-[#7BA3E8] hover:underline"
                    >
                      + Agregar
                    </button>
                  </div>

                  {extraPeople.length > 0 && (
                    <div className="space-y-3">
                      {extraPeople.map((p, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-white/5 border border-white/10 p-3"
                        >
                          <p className="text-white/70 text-[11px] mb-2">
                            Persona extra #{idx + 1}
                          </p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) =>
                                setExtraPeople((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, name: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="Nombre *"
                              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                            />
                            <input
                              type="email"
                              value={p.email}
                              onChange={(e) =>
                                setExtraPeople((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, email: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="Email (opcional)"
                              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                            />
                            <input
                              type="tel"
                              value={p.phone}
                              onChange={(e) =>
                                setExtraPeople((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, phone: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="Teléfono (opcional)"
                              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]/40"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExtraPeople((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-[11px] text-white/40 hover:text-white/70"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </form>
            </section>
          ) : (
            <section className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Mesa completa</h2>
              <p className="text-white/55 text-sm">Todos los lugares de este link ya fueron pagados.</p>
            </section>
          )}
        </main>

        {!poolFull && invite.status !== "PAID" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/98 to-transparent">
            <div className="max-w-lg mx-auto space-y-3">
              {expiresLine && (
                <p className="text-center text-[11px] text-white/45">
                  Se aceptan pagos hasta el {expiresLine}
                </p>
              )}
              <button
                type="submit"
                form="pool-pay-form"
                disabled={isProcessing || (hasTicketPicker && selectionCount === 0)}
                className="w-full py-4 rounded-xl bg-white text-black font-bold uppercase tracking-wider text-sm hover:bg-white/95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/30 transition-colors"
              >
                {isProcessing
                  ? "Procesando…"
                  : hasTicketPicker && selectionCount === 0
                    ? "Selecciona boletos"
                    : `Pagar ${mxn.format(checkoutTotal)}`}
              </button>
              <p className="text-center text-[10px] text-white/40">Pago seguro con Stripe</p>
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
          <span className="text-white/60 text-sm">Pago seguro con Stripe</span>
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
            Serás redirigido al checkout seguro con Stripe para ingresar los datos de tu tarjeta.
          </p>
        )}
      </main>
    </div>
  );
}
