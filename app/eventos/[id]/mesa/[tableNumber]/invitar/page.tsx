"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, Users, Copy, Check, Plus, Trash2 } from "lucide-react";

const TOTAL_TABLES = 162;

export default function InvitarMesaPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const tableNumberStr = params.tableNumber as string;
  const tableNumber = parseInt(tableNumberStr, 10);

  const [event, setEvent] = useState<any>(null);
  const [seatsPerTable, setSeatsPerTable] = useState(4);
  const [pricePerSeat, setPricePerSeat] = useState(0);
  const [invites, setInvites] = useState<Array<{ name: string; email: string; phone: string }>>([
    { name: "", email: "", phone: "" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<
    Array<{ token: string; name: string; url: string; pricePerSeat: number }>
  >([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId || isNaN(tableNumber) || tableNumber < 1 || tableNumber > TOTAL_TABLES) {
        toast.error("Mesa o evento inválido");
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error("Evento no encontrado");
          router.push("/");
          return;
        }

        const ev = data.data;
        setEvent(ev);

        const tableTicketType = ev.ticketTypes?.find((tt: any) => tt.isTable === true);
        if (!tableTicketType) {
          toast.error("Este evento no tiene mesas VIP");
          router.push("/");
          return;
        }

        const seats = tableTicketType.seatsPerTable ?? 4;
        const priceMesa = Number(tableTicketType.price);
        setSeatsPerTable(seats);
        setPricePerSeat(Math.round((priceMesa / seats) * 100) / 100);
      } catch {
        toast.error("Error al cargar el evento");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId, tableNumber, router]);

  const addInvite = () => {
    if (invites.length >= seatsPerTable) return;
    setInvites((p) => [...p, { name: "", email: "", phone: "" }]);
  };

  const removeInvite = (index: number) => {
    if (invites.length <= 1) return;
    setInvites((p) => p.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: "name" | "email" | "phone", value: string) => {
    setInvites((p) =>
      p.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validInvites = invites.filter((inv) => inv.name.trim());
    if (validInvites.length === 0) {
      toast.error("Agrega al menos un invitado con nombre");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/tables/${tableNumber}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invites: validInvites.map((inv) => ({
              name: inv.name.trim(),
              email: inv.email.trim() || undefined,
              phone: inv.phone.trim() || undefined,
            })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear invitaciones");
      }

      if (data.success && data.data?.invites) {
        setCreatedLinks(data.data.invites);
        toast.success("¡Links generados! Comparte cada uno con su invitado.");
      } else {
        throw new Error("No se recibieron los links");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear invitaciones");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      toast.success("Link copiado");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const priceMesa = event.ticketTypes?.find((tt: any) => tt.isTable)?.price ?? 0;

  return (
    <div className="min-h-screen somnus-bg-main">
      <header className="border-b border-white/10 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link
            href={`/eventos/${eventId}/mesas`}
            className="text-white/80 hover:text-white text-sm font-medium uppercase tracking-wider flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="text-white/60 text-sm">Mesa {tableNumber}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 uppercase tracking-wider">
          Invitar grupo - Mesa {tableNumber}
        </h1>
        <p className="text-white/60 mb-2">{event.name}</p>
        <p className="text-white/80 mb-8">
          Cada invitado recibirá un link para pagar su asiento ($
          {pricePerSeat.toLocaleString()} c/u). La mesa se confirmará cuando
          todos paguen.
        </p>

        {createdLinks.length > 0 ? (
          <div className="somnus-card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Links generados - Comparte cada uno
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Envía cada link por WhatsApp o email. La mesa se confirmará cuando
              todos hayan pagado.
            </p>
            <div className="space-y-4">
              {createdLinks.map((inv, i) => (
                <div
                  key={inv.token}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {inv.name || `Invitado ${i + 1}`}
                    </span>
                    <span className="text-white/60 text-sm">
                      ${inv.pricePerSeat.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inv.url}
                      className="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-white/80 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(inv.url, i)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-2"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedIndex === i ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={`/eventos/${eventId}/mesas`}
              className="inline-block mt-6 px-6 py-3 rounded-lg bg-white text-black font-bold hover:bg-white/90"
            >
              Volver al mapa
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="somnus-card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Datos de los invitados (máx. {seatsPerTable})
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Ingresa nombre y opcionalmente email/teléfono de cada persona.
            </p>

            <div className="space-y-4 mb-6">
              {invites.map((inv, i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/70 text-sm">
                      Invitado {i + 1}
                    </span>
                    {invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInvite(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={inv.name}
                      onChange={(e) => updateInvite(i, "name", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40"
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={inv.email}
                      onChange={(e) => updateInvite(i, "email", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono (opcional)"
                      value={inv.phone}
                      onChange={(e) => updateInvite(i, "phone", e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40"
                    />
                  </div>
                </div>
              ))}
            </div>

            {invites.length < seatsPerTable && (
              <button
                type="button"
                onClick={addInvite}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-6"
              >
                <Plus className="w-4 h-4" />
                Agregar otro invitado
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 rounded-lg bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90 disabled:opacity-50"
            >
              {isSubmitting ? "Generando..." : "Generar links"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
