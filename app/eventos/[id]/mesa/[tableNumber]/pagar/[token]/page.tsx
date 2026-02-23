"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";

export default function PagarInvitePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const tableNumber = params.tableNumber as string;
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) return;
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invitación no encontrada");
          return;
        }

        if (data.success && data.data) {
          setInvite(data.data);
          if (data.data.status !== "PAID") {
            setFormData({
              buyerName: data.data.isPool ? "" : (data.data.invitedName === "Pendiente" ? "" : (data.data.invitedName || "")),
              buyerEmail: data.data.invitedEmail || "",
              buyerPhone: data.data.invitedPhone || "",
            });
          }
        } else {
          setError("Invitación no encontrada");
        }
      } catch {
        setError("Error al cargar la invitación");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvite();
  }, [token]);

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
    } catch (err: any) {
      toast.error(err.message || "Error al procesar");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error || "Invitación no encontrada"}
          </h1>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const priceFormatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(invite.pricePerSeat);

  const eventDate = invite.event?.eventDate
    ? new Date(invite.event.eventDate).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

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
        {/* Bloque evento: imagen + detalles */}
        <div className="rounded-xl overflow-hidden border border-white/10 mb-8">
          {invite.event?.imageUrl ? (
            <div className="relative w-full aspect-[16/9] bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invite.event.imageUrl.startsWith("http") ? invite.event.imageUrl : invite.event.imageUrl.startsWith("/") ? invite.event.imageUrl : `/${invite.event.imageUrl}`}
                alt={invite.event.name || "Evento"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {invite.event.name}
                </h1>
                {invite.event.artist && (
                  <p className="text-white/90 text-sm sm:text-base mt-0.5">
                    {invite.event.artist}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 p-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {invite.event?.name}
              </h1>
              {invite.event?.artist && (
                <p className="text-white/80 mt-1">{invite.event.artist}</p>
              )}
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
          {invite.isPool ? (
            <>
              {" · "}
              <span className="text-white">Link compartido</span>
              {invite.paidCount != null && invite.maxSlots != null && (
                <span className="block mt-1 text-white/60 text-sm">
                  {invite.paidCount} de {invite.maxSlots} ya pagaron
                </span>
              )}
            </>
          ) : (
            <>
              {" · "}
              Asiento <strong className="text-white">{invite.seatNumber}</strong>
            </>
          )}
        </p>

        {invite.tableReserved || invite.status === "PAID" ? (
          <div className="somnus-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Mesa reservada</h2>
            <p className="text-white/70">
              Esta mesa ya está completa. Todos los asientos han sido pagados.
              {invite.paidCount != null && invite.totalSlots != null && (
                <span className="block mt-1 text-white/60 text-sm">
                  {invite.paidCount}/{invite.totalSlots} pagados
                </span>
              )}
            </p>
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
              <label className="block text-white/80 text-sm font-medium mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.buyerName}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, buyerName: e.target.value }))
                }
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.buyerEmail}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, buyerEmail: e.target.value }))
                }
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={formData.buyerPhone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, buyerPhone: e.target.value }))
                }
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
            Serás redirigido a la pasarela de Clip para ingresar los datos de tu
            tarjeta. Tu información está protegida.
          </p>
        )}
      </main>
    </div>
  );
}
