"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PatriotasTablesMap } from "@/components/eventos/PatriotasTablesMap";
import { IndividualTable, VIP_TABLES_162, NON_VIP_SECTIONS_162 } from "@/lib/patriotas-tables-162";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ArrowLeft, MapPin, Users, CreditCard, Ticket, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/eventos/Header";

interface Section {
  id: string;
  name: string;
  type: "GENERAL" | "PREFERENTE" | "PROTECCION";
  price: number;
  capacity: number;
  sold: number;
  color: string;
  description: string;
}

interface CartItem {
  table?: IndividualTable;
  section?: Section;
  quantity?: number;
  addedAt: Date;
}

export default function EventMesasPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [tables, setTables] = useState<IndividualTable[]>(VIP_TABLES_162);
  const [sections, setSections] = useState<Section[]>(NON_VIP_SECTIONS_162 as Section[]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Función para cargar mesas y secciones desde la BD
  const loadTables = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/tables`);
      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.tables && data.data.tables.length > 0) {
          console.log(`[LoadTables] Cargadas ${data.data.tables.length} mesas desde BD`);
          console.log(`[LoadTables] Mesas vendidas:`, data.data.tables.filter((t: IndividualTable) => t.status === "sold").length);
          setTables(data.data.tables);
        } else {
          console.warn("No se encontraron mesas en la respuesta, usando mesas por defecto");
          setTables(VIP_TABLES_162);
        }
        if (data.data.sections) {
          console.log(`[LoadTables] Cargadas ${data.data.sections.length} secciones desde BD`);
          setSections(data.data.sections);
        }
      } else {
        // Si no hay mesas configuradas, usar las por defecto
        console.warn("No se encontraron mesas en BD:", data.error || data.details);
        setTables(VIP_TABLES_162);
        setSections(NON_VIP_SECTIONS_162 as Section[]);
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      // En caso de error, usar mesas por defecto
      setTables(VIP_TABLES_162);
      setSections(NON_VIP_SECTIONS_162 as Section[]);
    }
  };

  // Cargar evento y mesas desde la BD
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();

        if (data.success && data.data) {
          setEvent(data.data);
          // Cargar mesas desde la BD
          await loadTables();
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

    if (eventId) {
      loadEvent();
    }
  }, [eventId, router]);

  const handleSelectTable = (table: IndividualTable) => {
    // Verificar si ya está en el carrito
    if (cartItems.some((item) => item.table?.id === table.id)) {
      toast.error("Esta mesa ya está en tu carrito");
      return;
    }

    // Agregar al carrito
    setCartItems([...cartItems, { table, addedAt: new Date() }]);
    toast.success(`Mesa #${table.number} agregada al carrito`);
  };

  const handleSelectSection = (section: Section, quantity: number) => {
    // Verificar disponibilidad
    const available = section.capacity - section.sold;
    if (quantity > available) {
      toast.error(`Solo hay ${available} boletos disponibles`);
      return;
    }

    // Agregar al carrito
    setCartItems([...cartItems, { section, quantity, addedAt: new Date() }]);
    toast.success(`${quantity} boleto(s) de ${section.name} agregado(s) al carrito`);
  };

  const handleRemoveItem = (index: number) => {
    const item = cartItems[index];
    setCartItems(cartItems.filter((_, i) => i !== index));
    if (item.table) {
      toast.success("Mesa removida del carrito");
    } else if (item.section) {
      toast.success("Sección removida del carrito");
    }
  };

  const getTotalPersons = () => {
    return cartItems.reduce((sum, item) => {
      if (item.table) return sum + item.table.seatsPerTable;
      if (item.section && item.quantity) return sum + item.quantity;
      return sum;
    }, 0);
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      if (item.table) return sum + item.table.price;
      if (item.section && item.quantity) return sum + item.section.price * item.quantity;
      return sum;
    }, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.16; // IVA 16%
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
  });
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    // Validar datos del comprador
    if (!checkoutData.buyerName || !checkoutData.buyerEmail) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsProcessingCheckout(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          items: cartItems,
          buyerName: checkoutData.buyerName,
          buyerEmail: checkoutData.buyerEmail,
          buyerPhone: checkoutData.buyerPhone,
          paymentMethod: "simulado", // Por ahora simulado
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar la orden");
      }

      toast.success("¡Orden creada exitosamente! Te enviaremos un correo con tus boletos.");
      
      // Limpiar carrito
      setCartItems([]);
      setShowCart(false);
      setShowCheckoutModal(false);
      setCheckoutData({ buyerName: "", buyerEmail: "", buyerPhone: "" });

      // Recargar mesas para actualizar estado desde BD
      await loadTables();
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la orden");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e]">
        <Header
          cartItemsCount={cartItems.reduce((sum, item) => {
          if (item.table) return sum + 1;
          if (item.section && item.quantity) return sum + item.quantity;
          return sum;
        }, 0)}
          onCartClick={() => setShowCart(true)}
        />
        <main className="w-full py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <p className="text-white/70 text-xl">Cargando evento...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  // Formatear fecha del evento
  const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();
  const formattedDate = eventDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a2c30] to-[#49484e]">
      <Header
        cartItemsCount={cartItems.reduce((sum, item) => {
          if (item.table) return sum + 1;
          if (item.section && item.quantity) return sum + item.quantity;
          return sum;
        }, 0)}
        onCartClick={() => setShowCart(true)}
      />
      
      <main className="w-full py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Botón volver */}
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="mb-6 border-white/30 text-white bg-transparent hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Eventos
        </Button>

        {/* Header con info del evento */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-white mb-2">
              {event.name}
            </h1>
            <p className="text-white/70">
              {formattedDate} • {event.eventTime}
            </p>
            <p className="text-white/60 text-sm">
              {event.venue}
            </p>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#c4a905]/20">
              <p className="text-white/70 text-sm mb-1">Total Mesas VIP</p>
              <p className="text-2xl font-bold text-white">162</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#c4a905]/20">
              <p className="text-white/70 text-sm mb-1">Precio por Mesa</p>
              <p className="text-2xl font-bold text-[#c4a905]">$2,500</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#c4a905]/20">
              <p className="text-white/70 text-sm mb-1">Personas por Mesa</p>
              <p className="text-2xl font-bold text-white">4</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#c4a905]/20">
              <p className="text-white/70 text-sm mb-1">Capacidad Total</p>
              <p className="text-2xl font-bold text-white">648</p>
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mb-6 p-4 bg-[#c4a905]/10 border border-[#c4a905]/30 rounded-lg">
          <p className="text-white text-sm">
            💡 <strong>Instrucciones:</strong> Haz click en cualquier mesa
            disponible (dorada) para agregarla al carrito. También puedes seleccionar
            las secciones GENERAL, PREFERENTE A o PREFERENTE B. Las mesas
            vendidas aparecen en gris.
          </p>
        </div>

        {/* Mapa interactivo con 162 mesas */}
        <PatriotasTablesMap
          eventName={event.name}
          eventDate={formattedDate}
          tables={tables}
          sections={sections}
          onSelectTable={handleSelectTable}
          onSelectSection={handleSelectSection}
        />

        {/* Info adicional */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#c4a905]/20">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-[#c4a905]" />
              <h3 className="text-white font-bold text-lg">
                Distribución de Mesas
              </h3>
            </div>
            <ul className="text-white/70 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#c4a905] mt-1">•</span>
                <span><strong>Zona Frontal</strong> (Filas 1-3): Vista directa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#c4a905] mt-1">•</span>
                <span><strong>Zona Media</strong> (Filas 4-6): Vista lateral</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#c4a905] mt-1">•</span>
                <span><strong>Zona Trasera</strong> (Filas 7-9): Vista completa</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#c4a905]/20">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-6 h-6 text-[#c4a905]" />
              <h3 className="text-white font-bold text-lg">
                ¿Qué Incluye Cada Mesa?
              </h3>
            </div>
            <ul className="text-white/70 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c4a905]" />
                <span>Acceso para 4 personas</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c4a905]" />
                <span>Mesa privada VIP</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c4a905]" />
                <span>Servicio preferente</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c4a905]" />
                <span>Vista al escenario</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#c4a905]/20">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-[#c4a905]" />
              <h3 className="text-white font-bold text-lg">
                Métodos de Pago
              </h3>
            </div>
            <ul className="text-white/70 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#c4a905]" />
                <span>Efectivo</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#c4a905]" />
                <span>Tarjeta (crédito/débito)</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#c4a905]" />
                <span>Transferencia bancaria</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#c4a905]" />
                <span>Stripe/PayPal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Panel de carrito lateral */}
        {showCart && (
          <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-[#2a2c30] border-l border-[#c4a905]/20 shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              {/* Header del carrito */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Tu Carrito ({cartItems.length})
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">Tu carrito está vacío</p>
                  <p className="text-white/40 text-sm mt-2">
                    Selecciona mesas en el mapa
                  </p>
                </div>
              ) : (
                <>
                  {/* Items del carrito */}
                  <div className="space-y-4 mb-6">
                    {cartItems.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {item.table ? (
                              <>
                                <h3 className="text-white font-bold text-lg">
                                  Mesa #{item.table.number}
                                </h3>
                                <p className="text-white/60 text-sm">
                                  Fila {item.table.row} • Columna {item.table.column}
                                </p>
                              </>
                            ) : item.section ? (
                              <>
                                <h3 className="text-white font-bold text-lg">
                                  {item.section.name}
                                </h3>
                                <p className="text-white/60 text-sm">
                                  {item.quantity} boleto(s)
                                </p>
                              </>
                            ) : null}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70 text-sm">
                            {item.table
                              ? `${item.table.seatsPerTable} personas`
                              : item.section
                              ? item.section.description
                              : ""}
                          </span>
                          <span className="text-[#c4a905] font-bold">
                            {item.table
                              ? `$${item.table.price.toLocaleString()}`
                              : item.section && item.quantity
                              ? `$${(item.section.price * item.quantity).toLocaleString()}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen */}
                  <div className="bg-white/5 rounded-lg p-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-white/70">
                        {cartItems.length} item(s)
                      </span>
                      <span className="text-white/70">
                        {getTotalPersons()} persona(s)
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-white/70">Subtotal:</span>
                      <span className="text-white font-bold">
                        ${getSubtotal().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span className="text-white/70">IVA (16%):</span>
                      <span className="text-white font-bold">
                        ${getTax().toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg">Total:</span>
                        <span className="text-[#c4a905] font-bold text-2xl">
                          ${getTotal().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full bg-[#c4a905] text-white hover:bg-[#d4b815] h-12 text-lg"
                      disabled={isProcessingCheckout}
                    >
                      {isProcessingCheckout ? "Procesando..." : "Proceder al Pago"}
                    </Button>
                    <Button
                      onClick={() => setCartItems([])}
                      variant="outline"
                      className="w-full border-white/30 text-white bg-transparent hover:bg-white/10"
                    >
                      Vaciar Carrito
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal de Checkout */}
        {showCheckoutModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#2a2c30] rounded-xl border border-[#c4a905]/30 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Información de Compra</h3>
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
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#c4a905]"
                    placeholder="Juan Pérez"
                    required
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
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#c4a905]"
                    placeholder="juan@ejemplo.com"
                    required
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
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#c4a905]"
                    placeholder="+52 123 456 7890"
                  />
                </div>

                <div className="bg-white/5 rounded-lg p-4 mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70">Total:</span>
                    <span className="text-[#c4a905] font-bold text-xl">
                      ${getTotal().toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-2">
                    * Pago simulado - En producción se integrará con pasarela de pago
                  </p>
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
                  className="flex-1 bg-[#c4a905] text-white hover:bg-[#d4b815]"
                  disabled={isProcessingCheckout}
                >
                  {isProcessingCheckout ? "Procesando..." : "Confirmar Compra"}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

