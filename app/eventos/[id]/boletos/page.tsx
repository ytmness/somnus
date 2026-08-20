"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, X, Ticket, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { calculateServiceFee } from "@/lib/utils";
import {
  effectiveTicketPriceAt,
  priceForGuestCount,
} from "@/lib/ticket-pricing";
import { isSalesOpen, salesOpenStatus } from "@/lib/ticket-sales-window";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useCart } from "@/components/cart/CartContext";

interface TicketTypeRow {
  id: string;
  name: string;
  description?: string | null;
  kind: "STANDARD" | "TABLE";
  isTable: boolean;
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  minPurchaseQty: number;
  maxPurchaseQty?: number | null;
  maxQuantity: number;
  soldQuantity: number;
  manualSoldOut?: boolean;
  price: number;
  pricePhases?: Parameters<typeof effectiveTicketPriceAt>[1];
  groupPriceRows?: Parameters<typeof priceForGuestCount>[1];
  variablePricingEnabled: boolean;
  tableCapacity?: number | null;
  hasPassword?: boolean;
  linkedTicketTypeId?: string | null;
  linkedTicketType?: { id: string; name: string } | null;
}

interface CartItem {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
  guestCount?: number;
}

function isVisibleTicketType(tt: TicketTypeRow): boolean {
  // Legacy VIP map tables stay off the regular boletos list
  if (tt.isTable && tt.kind !== "TABLE") return false;
  return tt.kind === "STANDARD" || tt.kind === "TABLE";
}

function isSoldOut(tt: TicketTypeRow): boolean {
  return (
    Boolean(tt.manualSoldOut) ||
    tt.maxQuantity - (tt.soldQuantity || 0) <= 0
  );
}

function tierSalesStatus(
  event: { salesStartDate: string; salesEndDate: string },
  tt: TicketTypeRow,
  now: Date
) {
  return salesOpenStatus(event, tt, now);
}

export default function EventBoletosPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { items: globalItems, addItems, setItems: setGlobalItems } = useCart();

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const cartItems: CartItem[] = useMemo(
    () =>
      globalItems
        .filter((i) => i.eventId === eventId)
        .map((i) => ({
          ticketTypeId: i.ticketTypeId,
          name: i.section,
          price: i.price,
          quantity: i.quantity,
        })),
    [globalItems, eventId]
  );

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [passwordTokens, setPasswordTokens] = useState<Record<string, string>>({});
  const [passwordVerifying, setPasswordVerifying] = useState<Record<string, boolean>>({});
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEvent(data.data);
        const visible = (data.data.ticketTypes || []).filter(isVisibleTicketType);
        const initialQty: Record<string, number> = {};
        const initialGuests: Record<string, number> = {};
        visible.forEach((tt: TicketTypeRow) => {
          initialQty[tt.id] = 0;
          if (tt.kind === "TABLE") {
            initialGuests[tt.id] = tt.tableCapacity || 1;
          }
        });
        setQuantities(initialQty);
        setGuestCounts(initialGuests);
      } else {
        setEvent(null);
        setLoadError(true);
        toast.error("Event not found");
      }
    } catch (error) {
      console.error("Error loading event:", error);
      setEvent(null);
      setLoadError(true);
      toast.error("Error loading event");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) void loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("cart") === "1") setShowCart(true);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.email) {
          setCheckoutData((prev) => ({
            ...prev,
            buyerEmail: data.user.email,
            buyerName: prev.buyerName || data.user.name || prev.buyerName,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const ticketTypes: TicketTypeRow[] = useMemo(
    () => (event?.ticketTypes || []).filter(isVisibleTicketType),
    [event]
  );

  const cartTicketIds = useMemo(() => {
    const ids = new Set(cartItems.map((c) => c.ticketTypeId));
    Object.entries(quantities).forEach(([id, q]) => {
      if (q > 0) ids.add(id);
    });
    return ids;
  }, [cartItems, quantities]);

  const unitPrice = useCallback(
    (tt: TicketTypeRow) => {
      const base = effectiveTicketPriceAt(
        Number(tt.price),
        tt.pricePhases,
        new Date()
      );
      if (tt.kind === "TABLE" && tt.variablePricingEnabled) {
        const gc = guestCounts[tt.id] ?? tt.tableCapacity ?? 1;
        return priceForGuestCount(
          base,
          tt.groupPriceRows,
          gc,
          tt.variablePricingEnabled
        );
      }
      return base;
    },
    [guestCounts]
  );

  const getAvailable = (tt: TicketTypeRow) =>
    tt.maxQuantity - (tt.soldQuantity || 0);

  const handleQuantityChange = (tt: TicketTypeRow, delta: number) => {
    const now = new Date();
    if (
      isSoldOut(tt) ||
      !event ||
      !isSalesOpen(
        {
          salesStartDate: event.salesStartDate,
          salesEndDate: event.salesEndDate,
        },
        tt,
        now
      )
    )
      return;
    const available = getAvailable(tt);
    const min = tt.minPurchaseQty || 1;
    const max = tt.maxPurchaseQty ?? available;
    setQuantities((prev) => {
      const current = prev[tt.id] || 0;
      let next = current + delta;
      if (next === 0) next = 0;
      else if (current === 0 && next > 0) next = Math.min(min, available);
      else next = Math.max(0, Math.min(max, available, next));
      return { ...prev, [tt.id]: next };
    });
  };

  const verifyPassword = async (tt: TicketTypeRow) => {
    const pwd = passwordInputs[tt.id]?.trim();
    if (!pwd && tt.hasPassword) {
      toast.error("Ingresa la contraseña");
      return;
    }
    setPasswordVerifying((p) => ({ ...p, [tt.id]: true }));
    try {
      const res = await fetch(`/api/ticket-types/${tt.id}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd || "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Contraseña incorrecta");
      setPasswordTokens((t) => ({ ...t, [tt.id]: json.token }));
      toast.success("Acceso verificado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setPasswordVerifying((p) => ({ ...p, [tt.id]: false }));
    }
  };

  const needsPassword = (tt: TicketTypeRow) =>
    Boolean(tt.hasPassword) && !passwordTokens[tt.id];

  const handleAddToCart = () => {
    const selected = ticketTypes.filter((tt) => (quantities[tt.id] || 0) > 0);

    if (selected.length === 0) {
      toast.error("Select at least one ticket");
      return;
    }

    for (const tt of selected) {
      if (needsPassword(tt)) {
        toast.error(`Verifica la contraseña de ${tt.name}`);
        return;
      }
      if (tt.linkedTicketTypeId && !cartTicketIds.has(tt.linkedTicketTypeId)) {
        const linked =
          tt.linkedTicketType?.name ||
          ticketTypes.find((t) => t.id === tt.linkedTicketTypeId)?.name ||
          "entrada vinculada";
        toast.error(`Debes incluir también: ${linked}`);
        return;
      }
    }

    const toAdd = selected.map((tt) => ({
      ticketTypeId: tt.id,
      name: tt.name,
      price: unitPrice(tt),
      quantity: quantities[tt.id],
      guestCount: tt.kind === "TABLE" ? guestCounts[tt.id] : undefined,
    }));

    const eventDateLabel = event?.eventDate
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(event.eventDate))
      : "";

    addItems(
      toAdd.map((item) => ({
        eventId,
        concertName: event?.title || "Event",
        section: item.name,
        ticketTypeId: item.ticketTypeId,
        price: item.price,
        quantity: item.quantity,
        date: eventDateLabel,
      })),
      { open: false }
    );

    setQuantities((prev) => {
      const next = { ...prev };
      toAdd.forEach((item) => (next[item.ticketTypeId] = 0));
      return next;
    });
    setShowCart(true);
    toast.success("Added to cart");
  };

  const handleRemoveFromCart = (index: number) => {
    const target = cartItems[index];
    if (!target) return;
    setGlobalItems(
      globalItems.filter(
        (i) =>
          !(i.eventId === eventId && i.ticketTypeId === target.ticketTypeId)
      )
    );
    toast.success("Removed from cart");
  };

  const clearEventCart = () => {
    setGlobalItems(globalItems.filter((i) => i.eventId !== eventId));
  };

  const getSubtotal = () =>
    cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const getTotal = () => {
    const sub = getSubtotal();
    const { totalCommission } = calculateServiceFee(sub);
    return sub + totalCommission;
  };

  const getCommission = () => {
    const { totalCommission } = calculateServiceFee(getSubtotal());
    return totalCommission;
  };

  const checkoutPasswordTokens = useMemo(() => {
    const tokens = { ...passwordTokens };
    for (const item of cartItems) {
      const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (tt?.hasPassword && tokens[tt.id]) continue;
    }
    return tokens;
  }, [passwordTokens, cartItems, ticketTypes]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!checkoutData.buyerName || !checkoutData.buyerEmail) {
      toast.error("Please enter name and email");
      return;
    }

    for (const item of cartItems) {
      const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (tt?.hasPassword && !checkoutPasswordTokens[tt.id]) {
        toast.error(`Verifica la contraseña de ${item.name}`);
        return;
      }
      if (tt?.linkedTicketTypeId) {
        const linkedInCart = cartItems.some(
          (c) => c.ticketTypeId === tt.linkedTicketTypeId
        );
        if (!linkedInCart) {
          toast.error(
            `Debes incluir también: ${tt.linkedTicketType?.name || "entrada vinculada"}`
          );
          return;
        }
      }
    }

    setIsProcessingCheckout(true);
    try {
      const items = cartItems.map((c) => {
        const tt = ticketTypes.find((t) => t.id === c.ticketTypeId);
        return {
          section: { id: c.ticketTypeId, name: c.name },
          quantity: c.quantity,
          guestCount:
            tt?.kind === "TABLE"
              ? guestCounts[c.ticketTypeId] ?? tt.tableCapacity ?? 1
              : undefined,
        };
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items,
          passwordTokens: checkoutPasswordTokens,
          buyerName: checkoutData.buyerName,
          buyerEmail: checkoutData.buyerEmail,
          buyerPhone: checkoutData.buyerPhone || null,
          paymentMethod: "stripe",
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not process order");

      if (data.data?.saleId) {
        toast.success("Redirecting to payment…");
        clearEventCart();
        setShowCart(false);
        setShowCheckoutModal(false);
        router.push(`/checkout/${data.data.saleId}`);
        return;
      }

      toast.success("Order created!");
      clearEventCart();
      setShowCart(false);
      setShowCheckoutModal(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Processing error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const selectionCount = Object.values(quantities).reduce((s, q) => s + q, 0);
  const selectionSubtotal = ticketTypes.reduce(
    (sum, tt) => sum + unitPrice(tt) * (quantities[tt.id] || 0),
    0
  );

  const now = new Date();
  const eventWindow = event
    ? {
        salesStartDate: event.salesStartDate as string,
        salesEndDate: event.salesEndDate as string,
      }
    : null;

  const purchasableTypes = eventWindow
    ? ticketTypes.filter(
        (tt) =>
          !isSoldOut(tt) && isSalesOpen(eventWindow, tt, now)
      )
    : [];
  const allSoldOut =
    ticketTypes.length > 0 && ticketTypes.every(isSoldOut);
  const allSalesClosed =
    ticketTypes.length > 0 &&
    !allSoldOut &&
    purchasableTypes.length === 0;
  const anyNotStarted =
    eventWindow &&
    ticketTypes.some(
      (tt) =>
        !isSoldOut(tt) && tierSalesStatus(eventWindow, tt, now) === "not_started"
    );

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-events-bg overflow-x-hidden">
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5">
          <span
            className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider"
            translate="no"
          >
            SOMNUS
          </span>
        </header>
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            </div>
            <div className="lg:col-span-7 space-y-4">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-3/4 bg-white/10 rounded animate-pulse" />
              <p className="sr-only" role="status">
                Loading event…
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="somnus-display text-3xl mb-4">Event unavailable</h1>
          <p className="somnus-lede mx-auto mb-8 text-center">
            We could not load this event. Check your connection and try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => void loadEvent()} className="somnus-btn">
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="somnus-nav-link px-8 py-3.5 border border-white/30 text-white/90 uppercase tracking-wider text-sm"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-events-bg overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <main className="pt-20 sm:pt-24 lg:pt-28 pb-28 lg:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.push(`/eventos/${eventId}`)}
            className="somnus-nav-link inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Back to event
          </button>

          <div className="mb-8">
            <span className="inline-block text-xs uppercase tracking-widest text-white/70 mb-1">
              {event.venue}
            </span>
            <h1 className="somnus-title-secondary text-2xl md:text-3xl uppercase tracking-wider font-bold">
              {event.artist}
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="somnus-title-secondary text-xl mb-6">
              Select tickets
            </h2>

            {ticketTypes.length === 0 ? (
              <div className="liquid-glass p-8 rounded-2xl text-center">
                <Ticket className="w-12 h-12 text-white/50 mx-auto mb-4" aria-hidden />
                <p className="text-white/70">
                  No ticket types available for this event.
                </p>
              </div>
            ) : allSoldOut ? (
              <div className="liquid-glass p-8 rounded-2xl text-center">
                <Ticket className="w-12 h-12 text-white/50 mx-auto mb-4" aria-hidden />
                <p className="text-white font-semibold uppercase tracking-wider mb-2">
                  Sold out
                </p>
                <p className="text-white/65 text-sm">
                  All tickets for this event have been sold.
                </p>
              </div>
            ) : allSalesClosed ? (
              <div className="liquid-glass p-8 rounded-2xl text-center">
                <Ticket className="w-12 h-12 text-white/50 mx-auto mb-4" aria-hidden />
                <p className="text-white font-semibold uppercase tracking-wider mb-2">
                  {anyNotStarted ? "Sales not open yet" : "Sales closed"}
                </p>
                <p className="text-white/65 text-sm">
                  {anyNotStarted
                    ? "Ticket sales for this event have not started yet."
                    : "The sales window for this event has ended."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {ticketTypes.map((tt) => {
                    const soldOut = isSoldOut(tt);
                    const salesStatus = eventWindow
                      ? tierSalesStatus(eventWindow, tt, now)
                      : "open";
                    const salesOpen = salesStatus === "open";
                    const disabled = soldOut || !salesOpen;
                    const qty = quantities[tt.id] || 0;
                    const available = getAvailable(tt);
                    const minQ = tt.minPurchaseQty || 1;
                    const maxQ = tt.maxPurchaseQty ?? available;
                    const linkedMissing =
                      tt.linkedTicketTypeId &&
                      qty > 0 &&
                      !cartTicketIds.has(tt.linkedTicketTypeId);

                    return (
                      <div
                        key={tt.id}
                        className={`liquid-glass p-5 rounded-2xl flex flex-col gap-4 ${
                          disabled ? "opacity-70" : ""
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold text-lg">
                                {tt.name}
                              </h3>
                              {soldOut && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                                  Sold out
                                </span>
                              )}
                              {!soldOut && !salesOpen && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                  {salesStatus === "not_started"
                                    ? "Not on sale yet"
                                    : "Sales closed"}
                                </span>
                              )}
                              {tt.kind === "TABLE" && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                  Table
                                </span>
                              )}
                            </div>
                            {tt.description && (
                              <p className="text-white/60 text-sm mt-1">
                                {tt.description}
                              </p>
                            )}
                            <p className="text-white/80 mt-2 font-medium tabular-nums">
                              ${unitPrice(tt).toLocaleString("en-US")} MXN
                              {tt.kind === "TABLE" ? " / table" : ""}
                            </p>
                            {!disabled && (minQ > 1 || maxQ < available) && (
                              <p className="text-white/45 text-xs mt-1">
                                Min {minQ}
                                {maxQ < available ? ` · Max ${maxQ}` : ""}
                              </p>
                            )}
                          </div>

                          {!disabled && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 border border-white/20 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(tt, -1)}
                                  disabled={qty === 0}
                                  aria-label={`Decrease ${tt.name} quantity`}
                                  className="somnus-nav-link p-2 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg"
                                >
                                  <Minus className="w-4 h-4" aria-hidden />
                                </button>
                                <span className="px-4 py-2 text-white font-medium min-w-[3rem] text-center tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(tt, 1)}
                                  disabled={qty >= maxQ || qty >= available}
                                  aria-label={`Increase ${tt.name} quantity`}
                                  className="somnus-nav-link p-2 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg"
                                >
                                  <Plus className="w-4 h-4" aria-hidden />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {!disabled &&
                          tt.kind === "TABLE" &&
                          tt.variablePricingEnabled &&
                          tt.groupPriceRows &&
                          tt.groupPriceRows.length > 0 && (
                            <div>
                              <label className="block text-white/70 text-sm mb-1.5">
                                Guest count
                              </label>
                              <select
                                value={guestCounts[tt.id] ?? tt.tableCapacity ?? 1}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  setGuestCounts((g) => ({ ...g, [tt.id]: n }));
                                }}
                                className="somnus-input max-w-[8rem]"
                              >
                                {tt.groupPriceRows.map((row) => (
                                  <option
                                    key={`${row.minGuests}-${row.maxGuests}`}
                                    value={row.minGuests}
                                  >
                                    {row.minGuests}
                                    {row.maxGuests !== row.minGuests
                                      ? `–${row.maxGuests}`
                                      : ""}{" "}
                                    guests
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                        {!disabled && tt.hasPassword && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Lock
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                                aria-hidden
                              />
                              <input
                                type="password"
                                value={passwordInputs[tt.id] || ""}
                                onChange={(e) =>
                                  setPasswordInputs((p) => ({
                                    ...p,
                                    [tt.id]: e.target.value,
                                  }))
                                }
                                placeholder="Access password"
                                className="somnus-input pl-10"
                                disabled={Boolean(passwordTokens[tt.id])}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void verifyPassword(tt)}
                              disabled={
                                passwordVerifying[tt.id] ||
                                Boolean(passwordTokens[tt.id])
                              }
                              className="border-white/30 text-white bg-transparent hover:bg-white/10 shrink-0"
                            >
                              {passwordTokens[tt.id] ? "Verified" : "Verify"}
                            </Button>
                          </div>
                        )}

                        {linkedMissing && (
                          <p className="flex items-start gap-2 text-amber-300/90 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                            Also add{" "}
                            {tt.linkedTicketType?.name || "linked ticket"} to your
                            cart.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={selectionCount === 0}
                    className="somnus-btn flex-1 py-4 text-base"
                  >
                    Buy Tickets
                  </Button>
                  <Button
                    type="button"
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
      </main>

      {!allSoldOut && !allSalesClosed && ticketTypes.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/55 text-xs uppercase tracking-wider">
                {selectionCount === 0
                  ? "Select tickets"
                  : `${selectionCount} selected`}
              </p>
              <p className="text-white font-semibold tabular-nums truncate">
                ${selectionSubtotal.toLocaleString("en-US")} MXN
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={selectionCount === 0}
              className="somnus-btn shrink-0 px-5 py-3 text-sm"
            >
              Buy tickets
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end overscroll-contain" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close cart"
            onClick={() => setShowCart(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="boletos-cart-title"
            className="relative w-full max-w-md bg-[#0A0A0A] border-l border-white/10 overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <h3 id="boletos-cart-title" className="text-white font-bold text-lg">
                Your Cart
              </h3>
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="somnus-nav-link text-white/70 hover:text-white p-2"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="p-6">
              {cartItems.length === 0 ? (
                <p className="text-white/50 text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center liquid-glass p-4 rounded-xl gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        <p className="text-white/60 text-sm tabular-nums">
                          {item.quantity} × ${item.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white font-bold tabular-nums">
                          ${(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(i)}
                          className="somnus-nav-link text-white/50 hover:text-red-400 p-1"
                          aria-label={`Remove ${item.name}`}
                        >
                          <X className="w-4 h-4" aria-hidden />
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
                    <span className="tabular-nums">${getSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Service fee</span>
                    <span className="tabular-nums">
                      $
                      {getCommission().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg border-t border-white/10 pt-3">
                    <span>Total</span>
                    <span className="tabular-nums">
                      $
                      {getTotal().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      MXN
                    </span>
                  </div>
                  <Button
                    type="button"
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

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overscroll-contain">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="liquid-glass max-w-md w-full p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="checkout-title" className="text-white font-bold text-xl">
                Purchase information
              </h3>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="somnus-nav-link text-white/70 hover:text-white p-1"
                aria-label="Close checkout"
              >
                <X className="w-6 h-6" aria-hidden />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="buyer-name" className="block text-white/90 font-medium mb-2">
                  Full name *
                </label>
                <input
                  id="buyer-name"
                  type="text"
                  autoComplete="name"
                  value={checkoutData.buyerName}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerName: e.target.value })
                  }
                  className="somnus-input"
                />
              </div>
              <div>
                <label htmlFor="buyer-email" className="block text-white/90 font-medium mb-2">
                  Email *
                </label>
                <input
                  id="buyer-email"
                  type="email"
                  autoComplete="email"
                  value={checkoutData.buyerEmail}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerEmail: e.target.value })
                  }
                  className="somnus-input"
                />
              </div>
              <div>
                <label htmlFor="buyer-phone" className="block text-white/90 font-medium mb-2">
                  Phone (optional)
                </label>
                <input
                  id="buyer-phone"
                  type="tel"
                  autoComplete="tel"
                  value={checkoutData.buyerPhone}
                  onChange={(e) =>
                    setCheckoutData({ ...checkoutData, buyerPhone: e.target.value })
                  }
                  className="somnus-input"
                />
              </div>
              <div className="liquid-glass p-4 rounded-xl mt-4 space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${getSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Service fee</span>
                  <span className="tabular-nums">
                    $
                    {getCommission().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-white font-bold text-xl border-t border-white/20 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums">
                    $
                    {getTotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    MXN
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                variant="outline"
                className="flex-1 border-white/30 text-white bg-transparent hover:bg-white/10"
                disabled={isProcessingCheckout}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCheckout}
                className="flex-1 somnus-btn"
                disabled={isProcessingCheckout}
              >
                {isProcessingCheckout ? "Processing…" : "Confirm purchase"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
