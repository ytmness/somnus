"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ShoppingCart } from "lucide-react";

type TicketType = {
  id: string;
  name: string;
  price: string;
  maxQuantity: number;
  soldQuantity: number;
};

type EventOption = {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  ticketTypes: TicketType[];
};

export default function VendedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const session = await sessionRes.json();
        if (!session.user) {
          router.push("/login?redirect=/vendedor");
          return;
        }
        const hasAccess =
          session.user.role === "ADMIN" ||
          session.user.role === "VENDEDOR" ||
          session.user.staffRoles?.includes("VENDEDOR");
        if (!hasAccess) {
          router.push("/");
          return;
        }

        const res = await fetch("/api/vendedor/sales", { credentials: "include" });
        const data = await res.json();
        if (res.ok) {
          setEvents(data.data || []);
          if (data.data?.[0]) setSelectedEventId(data.data[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !buyer.name || !buyer.email) {
      toast.error("Completa comprador y evento");
      return;
    }

    const items = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    if (items.length === 0) {
      toast.error("Selecciona al menos un boleto");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendedor/sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          items,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: buyer.phone,
          paymentMethod: "efectivo",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success(`Venta registrada — $${Number(data.data.total).toFixed(2)}`);
      setQuantities({});
      setBuyer({ name: "", email: "", phone: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h1 className="font-bold text-lg">Punto de venta</h1>
          </div>
          <Link href="/" className="text-white/60 text-sm hover:text-white">
            Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {events.length === 0 ? (
          <p className="text-white/60">No tienes eventos asignados para vender.</p>
        ) : (
          <form onSubmit={handleSale} className="space-y-6">
            <div>
              <label className="block text-sm text-white/70 mb-2">Evento</label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setQuantities({});
                }}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-gray-900">
                    {ev.name} — {new Date(ev.eventDate).toLocaleDateString("es-MX")}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="space-y-3">
                <h2 className="font-semibold">Boletos</h2>
                {selectedEvent.ticketTypes.map((tt) => (
                  <div
                    key={tt.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <div>{tt.name}</div>
                      <div className="text-sm text-white/50">
                        ${Number(tt.price).toFixed(2)} ·{" "}
                        {tt.maxQuantity - tt.soldQuantity} disponibles
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={tt.maxQuantity - tt.soldQuantity}
                      value={quantities[tt.id] || 0}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [tt.id]: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-center"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                placeholder="Nombre comprador"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
              <input
                required
                type="email"
                placeholder="Email comprador"
                value={buyer.email}
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
              <input
                placeholder="Teléfono"
                value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 md:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
            >
              {submitting ? "Registrando..." : "Registrar venta POS"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
