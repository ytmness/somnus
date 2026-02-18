"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Plus, Minus, X, Ticket, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { calculateClipCommission } from "@/lib/utils";
import { EventMap } from "@/components/eventos/EventMap";

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
          toast.error("Event not found");
          router.push("/");
        }
      } catch (error) {
        console.error("Error loading event:", error);
        toast.error("Error loading event");
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
      toast.error("Select at least one ticket");
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
    toast.success("Added to cart");
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    toast.success("Removed from cart");
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
      toast.error("Cart is empty");
      return;
    }
    if (!checkoutData.buyerName || !checkoutData.buyerEmail) {
      toast.error("Please enter name and email");
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
        toast.success("Redirecting to payment...");
        setCartItems([]);
        setShowCart(false);
        setShowCheckoutModal(false);
        router.push(`/checkout/${data.data.saleId}`);
        return;
      }

      toast.success("Order created!");
      setCartItems([]);
      setShowCart(false);
      setShowCheckoutModal(false);
      setCheckoutData({ buyerName: "", buyerEmail: "", buyerPhone: "" });
    } catch (error: any) {
      toast.error(error.message || "Processing error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  const eventDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const eventImage =
    event.imageUrl && !event.imageUrl.includes("unsplash")
      ? event.imageUrl
      : "/assets/hero-cuernavaca.jpg";

  return (
    <div className="min-h-screen somnus-events-bg overflow-x-hidden">
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
            Events
          </a>
          <Link
            href="/galeria"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            Gallery
          </Link>
          <Link
            href="/mis-boletos"
            className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
          >
            My Tickets
          </Link>
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors relative"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
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
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>

          {/* Layout tipo Bubbl: imagen izquierda + detalles derecho */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-20">
            {/* Columna izquierda: póster del evento */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1a1a1a]">
                <Image
                  src={eventImage}
                  alt={event.artist}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
            </div>

            {/* Columna derecha: detalles + compra */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="mb-8">
                <span className="inline-block text-xs uppercase tracking-widest text-white/70 mb-2">
                  {event.venue}
                </span>
                <h1 className="somnus-title-secondary text-3xl md:text-4xl lg:text-5xl mb-6 uppercase tracking-wider font-bold">
                  {event.artist}
                </h1>

                <div className="space-y-3 text-white/90 mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-white/70 shrink-0" />
                    <span>
                      {eventDate} · {event.eventTime}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-white/70 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{event.venue}</p>
                      {event.address && (
                        <p className="text-white/70 text-sm mt-0.5">
                          {event.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* About */}
                {event.description && (
                  <div className="mb-8">
                    <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                      About
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Sección de boletos */}
                <h2 className="somnus-title-secondary text-xl mb-6">
                  Select tickets
                </h2>

                {ticketTypes.length === 0 ? (
                  <div className="liquid-glass p-8 rounded-2xl text-center">
                    <Ticket className="w-12 h-12 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70">
                      No ticket types available for this event.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8">
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
                                {available} available
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

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleAddToCart}
                        className="somnus-btn flex-1 py-4 text-base"
                      >
                        Buy Tickets
                      </Button>
                      <Button
                        onClick={() => setShowCart(true)}
                        variant="outline"
                        className="border-white/30 text-white bg-transparent hover:bg-white/10 flex-1 py-4"
                      >
                        View Cart
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sección del mapa */}
          <div>
            <h2 className="somnus-title-secondary text-xl mb-4">
              Location
            </h2>
            <EventMap venue={event.venue} address={event.address} />
          </div>
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
              <h3 className="text-white font-bold text-lg">Your Cart</h3>
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
                  Your cart is empty
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
                    <span>Service fee (3.9% + tax)</span>
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
                    Proceed to payment
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
                Purchase information
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
                  Full name *
                </label>
                <input
                  type="text"
                  value={checkoutData.buyerName}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder="John Doe"
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
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-white/90 font-medium mb-2">
                  Phone (optional)
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
                  <span>Service fee (3.9% + tax)</span>
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
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 somnus-btn"
                disabled={isProcessingCheckout}
              >
                {isProcessingCheckout ? "Processing..." : "Confirm purchase"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
