import { useState } from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { Concert, CartItem } from "./types";

interface TicketSelectorProps {
  concert: Concert;
  onClose: () => void;
  onAddToCart: (items: CartItem[]) => void;
}

export function TicketSelector({ concert, onClose, onAddToCart }: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const updateQuantity = (sectionId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[sectionId] || 0;
      const newValue = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [sectionId]: newValue };
    });
  };

  const handleAddToCart = () => {
    const items: CartItem[] = [];
    concert.sections.forEach((section) => {
      const quantity = quantities[section.id] || 0;
      if (quantity > 0) {
        items.push({
          concertId: concert.id,
          concertName: `${concert.artist} - ${concert.tour}`,
          section: section.name,
          price: section.price,
          quantity,
          date: concert.date,
        });
      }
    });
    
    if (items.length > 0) {
      onAddToCart(items);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    }
  };

  const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = concert.sections.reduce((sum, section) => {
    const qty = quantities[section.id] || 0;
    return sum + section.price * qty;
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#c4a905]/20 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-[#49484e] mb-1">{concert.artist}</h2>
            <p className="text-[#49484e]/60">{concert.tour}</p>
            <p className="text-[#49484e]/60 mt-2">
              {concert.date} • {concert.time}
            </p>
            <p className="text-[#49484e]/60">{concert.venue}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-[#49484e]" />
          </button>
        </div>

        {showSuccess && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800">Boletos agregados al carrito</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          <h3 className="text-[#49484e] mb-4">Selecciona tus boletos</h3>
          
          {concert.sections.map((section) => (
            <div
              key={section.id}
              className="border border-[#c4a905]/20 rounded-lg p-4 hover:border-[#c4a905] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-[#49484e]">{section.name}</h4>
                  <p className="text-[#49484e]/60">{section.description}</p>
                  <p className="text-[#c4a905] mt-2">${section.price.toLocaleString()} MXN</p>
                  <p className="text-[#49484e]/50">
                    {section.available} boletos disponibles
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(section.id, -1)}
                    className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!quantities[section.id]}
                  >
                    <Minus className="w-4 h-4 text-[#49484e]" />
                  </button>
                  <span className="w-8 text-center text-[#49484e]">
                    {quantities[section.id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(section.id, 1)}
                    className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(quantities[section.id] || 0) >= Math.min(10, section.available)}
                  >
                    <Plus className="w-4 h-4 text-[#49484e]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#c4a905]/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#49484e]/60">Total ({totalItems} boletos)</p>
              <p className="text-[#c4a905]">${totalPrice.toLocaleString()} MXN</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={totalItems === 0}
              className="px-8 py-3 rounded-lg bg-[#c4a905] text-[#f9fbf6] hover:bg-[#d4b815] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


