"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Plus, Minus, X, Ticket, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { calculateClipCommission } from "@/lib/utils";

interface CartItem {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function EventBoletosPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();

        if (data.success && data.data) {
          setEvent(data.data);
          const initial: Record<string, number> = {};
          (data.data.ticketTypes || [])
            .filter((tt: any) => !tt.isTable)
            .forEach((tt: any) => {
              initial[tt.id] = 0;
            });
          setQuantities(initial);
        } else {
          toast.error("Evento no encontrado");
          router.push("/");
        }
      } catch (error) {
        console.error("Error al cargar evento:", error);
        toast.error("Error al cargar el evento");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) loadEvent();
  }, [eventId, router]);

  const ticketTypes = (event?.ticketTypes || []).filter((tt: any) => !tt.isTable);

  const getAvailable = (tt: any) => tt.maxQuantity - (tt.soldQuantity || 0);

  const handleQuantityChange = (ttId: string, delta: number) => {
    const tt = ticketTypes.find((t: any) => t.id === ttId);
    if (!tt) return;
    const available = getAvailable(tt);
    setQuantities((prev) => {
      const current = prev[ttId] || 0;
      const next = Math.max(0, Math.min(available, current + delta));
      return { ...prev, [ttId]: next };
    });
  };

  const handleAddToCart = () => {
    const toAdd = ticketTypes
      .filter((tt: any) => (quantities[tt.id] || 0) > 0)
      .map((tt: any) => ({
        ticketTypeId: tt.id,
        name: tt.name,
        price: Number(tt.price),
        quantity: quantities[tt.id],
      }));

    if (toAdd.length === 0) {
      toast.error("Selecciona al menos una cantidad");
      return;
    }

    setCartItems((prev) => {
      const next = [...prev];
      for (const item of toAdd) {
        const existing = next.find((c) => c.ticketTypeId === item.ticketTypeId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          next.push({ ...item });
        }
      }
      return next;
    });
    setQuantities((prev) => {
      const next = { ...prev };
      toAdd.forEach((item: CartItem) => (next[item.ticketTypeId] = 0));
      return next;
    });
    toast.success("Agregado al carrito");
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    toast.success("Eliminado del carrito");
  };

  const getSubtotal = () =>
    cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  // Comisión Clip (3.9%) + IVA 16% sobre comisión: la paga el cliente
  const getTotal = () => {
    const sub = getSubtotal();
    const { totalCommission } = calculateClipCommission(sub);
    return sub + totalCommission;
  };
  const getCommission = () => {
    const { totalCommission } = calculateClipCommission(getSubtotal());
    return totalCommission;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    if (!checkoutData.buyerName || !checkoutData.buyerEmail) {
      toast.error("Completa nombre y email");
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const items = cartItems.map((c) => ({
        section: { id: c.ticketTypeId, name: c.name },
        quantity: c.quantity,
      }));

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items,
          buyerName: checkoutData.buyerName,
          buyerEmail: checkoutData.buyerEmail,
          buyerPhone: checkoutData.buyerPhone || null,
          paymentMethod: "clip",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al procesar");

      if (data.data?.saleId) {
        toast.success("Redirigiendo a pago...");
        setCartItems([]);
        setShowCart(false);
        setShowCheckoutModal(false);
        router.push(`/checkout/${data.data.saleId}`);
        return;
      }

      toast.success("¡Orden creada!");
      setCartItems([]);
      setShowCart(false);
      setShowCheckoutModal(false);
      setCheckoutData({ buyerName: "", buyerEmail: "", buyerPhone: "" });
    } catch (error: any) {
      toast.error(error.message || "Error al procesar");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!event) return null;

  const eventDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Navbar */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
        >
          SOMNUS
        </button>
        <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <a
            href="/#eventos"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
          >
            Eventos
          </a>
          <Link
            href="/galeria"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Galería
          </Link>
          <Link
            href="/mis-boletos"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Mis Boletos
          </Link>
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors relative"
          >
            <ShoppingCart className="w-4 h-4" />
            Carrito
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push("/login")}
            className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider"
          >
            Login
          </button>
        </nav>
      </header>

      <main className="pt-20 sm:pt-24 lg:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Eventos
          </button>

          <div className="mb-10">
            <h1 className="somnus-title-secondary text-3xl md:text-4xl mb-2">
              {event.artist}
            </h1>
            <div className="flex flex-wrap gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {eventDate} · {event.eventTime}
              </span>
            </div>
          </div>

          <h2 className="somnus-title-secondary text-xl mb-6">
            Elige tu tipo de boleto
          </h2>

          {ticketTypes.length === 0 ? (
            <div className="liquid-glass p-8 rounded-2xl text-center">
              <Ticket className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70">
                No hay tipos de boleto disponibles para este evento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ticketTypes.map((tt: any) => {
                const available = getAvailable(tt);
                const qty = quantities[tt.id] || 0;
                return (
                  <div
                    key={tt.id}
                    className="liquid-glass p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
                        {tt.name}
                      </h3>
                      {tt.description && (
                        <p className="text-white/60 text-sm mt-1">
                          {tt.description}
                        </p>
                      )}
                      <p className="text-white/80 mt-2 font-medium">
                        ${Number(tt.price).toLocaleString("en-US")} MXN
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {available} disponibles
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 border border-white/20 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(tt.id, -1)}
                          disabled={qty === 0}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 py-2 text-white font-medium min-w-[3rem] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(tt.id, 1)}
                          disabled={qty >= available}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ticketTypes.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleAddToCart}
                className="somnus-btn flex-1"
              >
                Agregar al carrito
              </Button>
              <Button
                onClick={() => setShowCart(true)}
                variant="outline"
                className="border-white/30 text-white bg-transparent hover:bg-white/10 flex-1"
              >
                Ver carrito
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Cart sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="relative w-full max-w-md bg-[#0A0A0A] border-l border-white/10 overflow-y-auto">
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-6 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Tu Carrito</h3>
              <button
                onClick={() => setShowCart(false)}
                className="text-white/70 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {cartItems.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  El carrito está vacío
                </p>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center liquid-glass p-4 rounded-xl"
                    >
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-white/60 text-sm">
                          {item.quantity} × ${item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">
                          ${(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(i)}
                          className="text-white/50 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cartItems.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Cargo por servicio (3.9% + IVA)</span>
                    <span>${getCommission().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg border-t border-white/10 pt-3">
                    <span>Total</span>
                    <span>${getTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                  </div>
                  <Button
                    onClick={() => {
                      setShowCart(false);
                      setShowCheckoutModal(true);
                    }}
                    className="somnus-btn w-full mt-4"
                  >
                    Proceder al pago
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="liquid-glass max-w-md w-full p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-xl">
                Información de compra
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/90 font-medium mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={checkoutData.buyerName}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-white/90 font-medium mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={checkoutData.buyerEmail}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerEmail: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-white/90 font-medium mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={checkoutData.buyerPhone}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerPhone: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder="+52 123 456 7890"
                />
              </div>
              <div className="liquid-glass p-4 rounded-xl mt-4 space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>${getSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Cargo por servicio (3.9% + IVA)</span>
                  <span>${getCommission().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-xl border-t border-white/20 pt-2">
                  <span>Total</span>
                  <span>${getTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCheckoutModal(false)}
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
                disabled={isProcessingCheckout}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 somnus-btn"
                disabled={isProcessingCheckout}
              >
                {isProcessingCheckout ? "Procesando..." : "Confirmar compra"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
