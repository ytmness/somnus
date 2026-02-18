import { X, Trash2, ShoppingBag } from "lucide-react";
import { CartItem } from "./types";
import { calculateClipCommission } from "@/lib/utils";

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
}

export function Cart({ items, onClose, onRemoveItem, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { totalCommission } = calculateClipCommission(subtotal);
  const total = subtotal + totalCommission;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#5B8DEF]/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-[#5B8DEF]" />
            <h2 className="text-[#49484e]">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-[#49484e]" />
          </button>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-[#49484e]/20 mx-auto mb-4" />
              <p className="text-[#49484e]/60">Your cart is empty</p>
              <p className="text-[#49484e]/40 mt-2">Add tickets to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-[#5B8DEF]/20 rounded-lg p-4 hover:border-[#5B8DEF] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-[#49484e]">{item.concertName}</h4>
                      <p className="text-[#49484e]/60">{item.date}</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#49484e]/70">{item.section}</p>
                      <p className="text-[#49484e]/50">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-[#5B8DEF]">
                      ${(item.price * item.quantity).toLocaleString()} MXN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-[#5B8DEF]/20 p-6">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-[#49484e]/60">
                <span>Subtotal ({totalItems} tickets)</span>
                <span>${subtotal.toLocaleString()} MXN</span>
              </div>
              <div className="flex items-center justify-between text-[#49484e]/70">
                <span>Service charge (3.9% + VAT)</span>
                <span>${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
              </div>
              <div className="border-t border-[#5B8DEF]/20 pt-3 flex items-center justify-between">
                <span className="text-[#49484e]">Total</span>
                <span className="text-[#5B8DEF]">
                  ${total.toLocaleString()} MXN
                </span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 rounded-lg bg-[#5B8DEF] text-[#f9fbf6] hover:bg-[#7BA3E8] transition-colors"
            >
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


