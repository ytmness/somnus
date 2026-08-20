"use client";

import { ShoppingBag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { calculateServiceFee } from "@/lib/utils";

export function HeaderCartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, removeItem, clearCart, itemCount } =
    useCart();

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { totalCommission } = calculateServiceFee(subtotal);
  const total = subtotal + totalCommission;
  const primaryEventId = items[0]?.eventId;

  const handleCheckout = () => {
    closeCart();
    const next = primaryEventId
      ? `/eventos/${primaryEventId}/boletos?cart=1`
      : "/#eventos";
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          router.push(`/register?redirect=${encodeURIComponent(next)}`);
          return;
        }
        router.push(next);
      })
      .catch(() => {
        router.push(`/register?redirect=${encodeURIComponent(next)}`);
      });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end overscroll-contain"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close cart"
        onClick={closeCart}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="header-cart-title"
        className="relative w-full max-w-md bg-[#0A0A0A] border-l border-white/10 overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#7BA3E8]" aria-hidden />
            <h2
              id="header-cart-title"
              className="text-white font-semibold uppercase tracking-wider text-sm"
            >
              Cart{itemCount > 0 ? ` (${itemCount})` : ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="somnus-nav-link p-2 text-white/70 hover:text-white"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="p-5">
          {items.length === 0 ? (
            <div className="text-center py-14">
              <ShoppingBag
                className="w-12 h-12 text-white/20 mx-auto mb-4"
                aria-hidden
              />
              <p className="text-white/70 mb-2">Your cart is empty</p>
              <p className="text-white/45 text-sm mb-6">
                Pick tickets from an upcoming event
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  router.push("/#eventos");
                }}
                className="somnus-btn px-6 py-3 text-sm"
              >
                View events
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.eventId}-${item.ticketTypeId}-${index}`}
                  className="liquid-glass p-4 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {item.concertName}
                      </p>
                      <p className="text-white/55 text-sm">{item.date}</p>
                      <p className="text-white/70 text-sm mt-1">
                        {item.section} · Qty {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-[#7BA3E8] font-medium tabular-nums">
                        ${(item.price * item.quantity).toLocaleString()} MXN
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="somnus-nav-link p-1.5 text-white/45 hover:text-red-400"
                        aria-label={`Remove ${item.section}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="somnus-safe-bottom sticky bottom-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/10 p-5 space-y-3">
            <div className="flex justify-between text-white/60 text-sm">
              <span>Subtotal</span>
              <span className="tabular-nums">
                ${subtotal.toLocaleString()} MXN
              </span>
            </div>
            <div className="flex justify-between text-white/70 text-sm">
              <span>Service fee</span>
              <span className="tabular-nums">
                $
                {totalCommission.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                MXN
              </span>
            </div>
            <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-3">
              <span>Total</span>
              <span className="tabular-nums text-[#7BA3E8]">
                $
                {total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                MXN
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              className="somnus-btn w-full py-3.5"
            >
              Continue to checkout
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="somnus-nav-link w-full text-center text-xs uppercase tracking-wider text-white/45 hover:text-white py-2"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
