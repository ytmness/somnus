import { X, Trash2, ShoppingBag } from "lucide-react";
import { CartItem } from "./types";
import { calculateServiceFee } from "@/lib/utils";

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
}

export function Cart({ items, onClose, onRemoveItem, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { totalCommission } = calculateServiceFee(subtotal);
  const total = subtotal + totalCommission;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overscroll-contain"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="liquid-glass bg-[#0A0A0A]/95 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-[#7BA3E8]" aria-hidden />
            <h2 id="cart-title" className="text-white text-lg font-semibold uppercase tracking-wider">
              Your Cart
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="somnus-nav-link p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close cart"
          >
            <X className="w-6 h-6 text-white/80" aria-hidden />
          </button>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" aria-hidden />
              <p className="text-white/70">Your cart is empty</p>
              <p className="text-white/45 mt-2 text-sm">Add tickets to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-lg p-4 hover:border-white/25 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{item.concertName}</h4>
                      <p className="text-white/55 text-sm">{item.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="somnus-nav-link p-2 hover:bg-red-500/10 rounded-lg shrink-0"
                      aria-label={`Remove ${item.concertName} from cart`}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" aria-hidden />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white/70 truncate">{item.section}</p>
                      <p className="text-white/45 text-sm">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-[#7BA3E8] font-medium tabular-nums shrink-0">
                      ${(item.price * item.quantity).toLocaleString()} MXN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="sticky bottom-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-white/10 p-6">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-white/60 text-sm">
                <span>Subtotal ({totalItems} tickets)</span>
                <span className="tabular-nums">${subtotal.toLocaleString()} MXN</span>
              </div>
              <div className="flex items-center justify-between text-white/70 text-sm">
                <span>Service charge (3.9% + VAT)</span>
                <span className="tabular-nums">
                  ${totalCommission.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  MXN
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-[#7BA3E8] font-semibold tabular-nums">
                  ${total.toLocaleString()} MXN
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="somnus-btn w-full py-3.5"
            >
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
