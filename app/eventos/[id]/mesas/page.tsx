"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { PatriotasTablesMap } from "@/components/eventos/PatriotasTablesMap";
import { IndividualTable, VIP_TABLES_162, NON_VIP_SECTIONS_162 } from "@/lib/patriotas-tables-162";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ArrowLeft, MapPin, Users, CreditCard, Ticket, Info, X, Calendar, Music, LogIn, User, Shield, Scan } from "lucide-react";
import { toast } from "sonner";

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
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // Cargar sesión del usuario
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.success && data.data) {
          setUser(data.data.user);
          setUserRole(data.data.user?.role || null);
        }
      } catch (error) {
        console.log("No hay sesión activa");
      }
    };
    checkSession();
  }, []);

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
      <div className="min-h-screen flex flex-col regia-bg-main">
        {/* Header flotante personalizado */}
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6 bg-regia-black/80 backdrop-blur-md border-b border-regia-gold-old/20">
          <div className="w-full flex items-center justify-between">
            {/* Logo GRUPO REGIA */}
            <div className="flex-shrink-0">
              <Image
                src="/assets/logo-grupo-regia.png"
                alt="Grupo Regia"
                width={110}
                height={65}
                className="opacity-90 cursor-pointer"
                onClick={() => router.push("/")}
              />
            </div>

            {/* Navegación central */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="/#eventos" className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
                <Calendar className="w-4 h-4" />
                <span>Eventos</span>
              </a>
              <button onClick={() => router.push("/mis-boletos")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
                <Music className="w-4 h-4" />
                <span>Mis Boletos</span>
              </button>
              <button onClick={() => setShowCart(true)} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105 relative">
                <ShoppingCart className="w-4 h-4" />
                <span>Carrito</span>
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-regia-gold-bright text-regia-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
              {user ? (
                <button onClick={() => router.push("/login")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
                  <User className="w-4 h-4" />
                  <span>{user.name || user.email}</span>
                </button>
              ) : (
                <button onClick={() => router.push("/login")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Logo RICO O MUERTO */}
            <div className="flex-shrink-0">
              <Image
                src="/assets/rico-muerto-logo.png"
                alt="Rico o Muerto"
                width={100}
                height={50}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </header>

        <main className="flex-grow w-full py-8 pt-64 lg:pt-72">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <p className="text-regia-cream/70 text-xl">Cargando evento...</p>
            </div>
          </div>
        </main>

        {/* FOOTER MINIMALISTA */}
        <footer className="regia-footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="text-regia-gold-old font-bold text-lg mb-4 tracking-wider">GRUPO REGIA</h3>
                <p className="regia-text-body text-sm">Tu plataforma de confianza para eventos en vivo exclusivos</p>
              </div>
              <div>
                <h4 className="regia-title-secondary text-base mb-4">Enlaces</h4>
                <ul className="space-y-2">
                  <li><a href="/#eventos" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">Eventos</a></li>
                  <li><button onClick={() => router.push("/mis-boletos")} className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors text-left">Mis Boletos</button></li>
                  <li><a href="/#contacto" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">Contacto</a></li>
                </ul>
              </div>
              <div>
                <h4 className="regia-title-secondary text-base mb-4">Contacto</h4>
                <p className="regia-text-body text-sm mb-2">contacto@grupoRegia.com</p>
                <p className="text-regia-gold-old text-xs font-semibold tracking-wider mt-4">RICO O MUERTO</p>
              </div>
            </div>
            <div className="border-t border-regia-gold-old/20 pt-8 pb-6 text-center">
              <p className="regia-footer-text">© {new Date().getFullYear()} Grupo Regia. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
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
    <div className="min-h-screen flex flex-col regia-bg-main relative">
      {/* Header flotante personalizado - igual a la landing */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6 bg-regia-black/80 backdrop-blur-md border-b border-regia-gold-old/20">
        {/* Versión móvil */}
        <div className="w-full flex lg:hidden items-center justify-between">
          <Image
            src="/assets/logo-grupo-regia.png"
            alt="Grupo Regia"
            width={80}
            height={48}
            className="opacity-90 cursor-pointer"
            onClick={() => router.push("/")}
          />
          <div className="flex items-center gap-4">
            <button onClick={() => setShowCart(true)} className="relative text-regia-gold-old hover:text-regia-gold-bright transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-regia-gold-bright text-regia-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
            <button onClick={() => router.push("/login")} className="text-regia-gold-old hover:text-regia-gold-bright transition-colors">
              <LogIn className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Versión desktop */}
        <div className="w-full hidden lg:flex items-center justify-between">
          {/* Logo GRUPO REGIA */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={110}
              height={65}
              className="opacity-90 cursor-pointer"
              onClick={() => router.push("/")}
            />
          </div>

          {/* Navegación central */}
          <a href="/#eventos" className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
            <Calendar className="w-4 h-4" />
            <span>Eventos</span>
          </a>

          <button onClick={() => router.push("/mis-boletos")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
            <Music className="w-4 h-4" />
            <span>Mis Boletos</span>
          </button>

          {/* Admin - solo si tiene rol */}
          {userRole === "ADMIN" && (
            <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}

          {/* Accesos - solo si tiene rol */}
          {(userRole === "ACCESOS" || userRole === "ADMIN") && (
            <button onClick={() => router.push("/accesos")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
              <Scan className="w-4 h-4" />
              <span>Accesos</span>
            </button>
          )}

          {/* Carrito */}
          <button onClick={() => setShowCart(true)} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105 relative">
            <ShoppingCart className="w-4 h-4" />
            <span>Carrito</span>
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-regia-gold-bright text-regia-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>

          {/* Login / User */}
          {user ? (
            <button onClick={() => router.push("/login")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
              <User className="w-4 h-4" />
              <span>{user.name || user.email}</span>
            </button>
          ) : (
            <button onClick={() => router.push("/login")} className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Logo RICO O MUERTO */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/rico-muerto-logo.png"
              alt="Rico o Muerto"
              width={100}
              height={50}
              className="opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </header>
      
      <main className="flex-grow w-full py-4 sm:py-6 lg:py-8 pt-48 sm:pt-56 lg:pt-64 xl:pt-72">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header con info del evento */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="mb-4">
            {event.artist === 'Víctor Mendivil' ? (
              <div className="flex justify-center mb-2">
                <Image
                  src="/assets/victor-mendivil-en-concierto-titulo.png"
                  alt={event.name}
                  width={1456}
                  height={244}
                  className="w-full max-w-[90%] sm:max-w-md md:max-w-2xl lg:max-w-5xl h-auto"
                  style={{ 
                    filter: 'drop-shadow(0 0 20px rgba(244, 208, 63, 0.6))'
                  }}
                  priority
                />
              </div>
            ) : (
              <h1 className="regia-title-main text-3xl sm:text-4xl md:text-5xl mb-2">
                {event.name}
              </h1>
            )}
            <p className="regia-text-muted text-sm">
              {event.venue}
            </p>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="regia-card-gold p-2 sm:p-3 md:p-4">
              <p className="text-regia-cream text-xs sm:text-sm mb-1">Total Mesas VIP</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-regia-cream">162</p>
            </div>
            <div className="regia-card-gold p-2 sm:p-3 md:p-4">
              <p className="text-regia-cream text-xs sm:text-sm mb-1">Precio por Mesa</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-regia-gold-bright">$2,500</p>
            </div>
            <div className="regia-card-gold p-2 sm:p-3 md:p-4">
              <p className="text-regia-cream text-xs sm:text-sm mb-1">Personas por Mesa</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-regia-cream">4</p>
            </div>
            <div className="regia-card-gold p-2 sm:p-3 md:p-4">
              <p className="text-regia-cream text-xs sm:text-sm mb-1">Capacidad Total</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-regia-cream">648</p>
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mb-4 sm:mb-5 lg:mb-6 p-3 sm:p-4 bg-regia-gold-old/10 border border-regia-gold-old/30 rounded-lg">
          <p className="regia-text-body text-xs sm:text-sm">
            💡 <strong className="text-regia-gold-bright">Instrucciones:</strong> Haz click en cualquier mesa
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
        <div className="mt-4 sm:mt-6 lg:mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="regia-card-gold p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-regia-gold-bright" />
              <h3 className="regia-title-secondary text-base sm:text-lg">
                Distribución de Mesas
              </h3>
            </div>
            <ul className="regia-text-body text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-regia-gold-bright mt-1">•</span>
                <span><strong className="text-regia-cream">Zona Frontal</strong> (Filas 1-3): Vista directa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-regia-gold-bright mt-1">•</span>
                <span><strong className="text-regia-cream">Zona Media</strong> (Filas 4-6): Vista lateral</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-regia-gold-bright mt-1">•</span>
                <span><strong className="text-regia-cream">Zona Trasera</strong> (Filas 7-9): Vista completa</span>
              </li>
            </ul>
          </div>

          <div className="regia-card-gold p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-regia-gold-bright" />
              <h3 className="regia-title-secondary text-base sm:text-lg">
                ¿Qué Incluye Cada Mesa?
              </h3>
            </div>
            <ul className="regia-text-body text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-regia-gold-bright" />
                <span>Acceso para 4 personas</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-regia-gold-bright" />
                <span>Mesa privada VIP</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-regia-gold-bright" />
                <span>Servicio preferente</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-regia-gold-bright" />
                <span>Vista al escenario</span>
              </li>
            </ul>
          </div>

          <div className="regia-card-gold p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-regia-gold-bright" />
              <h3 className="regia-title-secondary text-base sm:text-lg">
                Métodos de Pago
              </h3>
            </div>
            <ul className="regia-text-body text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-regia-gold-bright" />
                <span>Efectivo</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-regia-gold-bright" />
                <span>Tarjeta (crédito/débito)</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-regia-gold-bright" />
                <span>Transferencia bancaria</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-regia-gold-bright" />
                <span>Stripe/PayPal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Panel de carrito lateral */}
        {showCart && (
          <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-regia-black border-l border-regia-gold-old/20 shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              {/* Header del carrito */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-regia-cream">
                  Tu Carrito ({cartItems.length})
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-regia-cream/70 hover:text-regia-cream"
                >
                  ✕
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-regia-cream/30 mx-auto mb-4" />
                  <p className="regia-text-body">Tu carrito está vacío</p>
                  <p className="regia-text-muted text-sm mt-2">
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
                        className="bg-regia-cream/5 rounded-lg p-4 border border-regia-gold-old/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            {item.table ? (
                              <>
                                <h3 className="text-regia-cream font-bold text-lg">
                                  Mesa #{item.table.number}
                                </h3>
                                <p className="regia-text-muted text-sm">
                                  Fila {item.table.row} • Columna {item.table.column}
                                </p>
                              </>
                            ) : item.section ? (
                              <>
                                <h3 className="text-regia-cream font-bold text-lg">
                                  {item.section.name}
                                </h3>
                                <p className="regia-text-muted text-sm">
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
                          <span className="regia-text-body text-sm">
                            {item.table
                              ? `${item.table.seatsPerTable} personas`
                              : item.section
                              ? item.section.description
                              : ""}
                          </span>
                          <span className="text-regia-gold-bright font-bold">
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
                  <div className="bg-regia-cream/5 rounded-lg p-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="regia-text-body">
                        {cartItems.length} item(s)
                      </span>
                      <span className="regia-text-body">
                        {getTotalPersons()} persona(s)
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="regia-text-body">Subtotal:</span>
                      <span className="text-regia-cream font-bold">
                        ${getSubtotal().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span className="regia-text-body">IVA (16%):</span>
                      <span className="text-regia-cream font-bold">
                        ${getTax().toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-regia-gold-old/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-regia-cream font-bold text-lg">Total:</span>
                        <span className="text-regia-gold-bright font-bold text-2xl">
                          ${getTotal().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowCheckoutModal(true)}
                      className="regia-btn-primary w-full h-12 text-lg"
                      disabled={isProcessingCheckout}
                    >
                      {isProcessingCheckout ? "Procesando..." : "Proceder al Pago"}
                    </Button>
                    <Button
                      onClick={() => setCartItems([])}
                      variant="outline"
                      className="w-full border-regia-gold-old/50 text-regia-cream bg-transparent hover:bg-regia-gold-old/10"
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
          <div className="fixed inset-0 bg-regia-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-regia-black rounded-xl border border-regia-gold-old/30 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="regia-title-main text-2xl">Información de Compra</h3>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="text-regia-cream/70 hover:text-regia-cream"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-regia-cream/90 font-medium mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={checkoutData.buyerName}
                    onChange={(e) =>
                      setCheckoutData({ ...checkoutData, buyerName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-regia-cream/10 border border-regia-gold-old/20 text-regia-cream focus:outline-none focus:border-regia-gold-bright"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                <div>
                  <label className="block text-regia-cream/90 font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={checkoutData.buyerEmail}
                    onChange={(e) =>
                      setCheckoutData({ ...checkoutData, buyerEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-regia-cream/10 border border-regia-gold-old/20 text-regia-cream focus:outline-none focus:border-regia-gold-bright"
                    placeholder="juan@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-regia-cream/90 font-medium mb-2">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={checkoutData.buyerPhone}
                    onChange={(e) =>
                      setCheckoutData({ ...checkoutData, buyerPhone: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-regia-cream/10 border border-regia-gold-old/20 text-regia-cream focus:outline-none focus:border-regia-gold-bright"
                    placeholder="+52 123 456 7890"
                  />
                </div>

                <div className="bg-regia-cream/5 rounded-lg p-4 mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="regia-text-body">Total:</span>
                    <span className="text-regia-gold-bright font-bold text-xl">
                      ${getTotal().toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="regia-text-muted text-xs mt-2">
                    * Pago simulado - En producción se integrará con pasarela de pago
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCheckoutModal(false)}
                  variant="outline"
                  className="flex-1 border-regia-gold-old/50 text-regia-cream bg-transparent hover:bg-regia-gold-old/10"
                  disabled={isProcessingCheckout}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="flex-1 regia-btn-primary"
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

      {/* FOOTER MINIMALISTA */}
      <footer className="regia-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Columna 1: Logo y descripción */}
            <div>
              <h3 className="text-regia-gold-old font-bold text-lg mb-4 tracking-wider">
                GRUPO REGIA
              </h3>
              <p className="regia-text-body text-sm">
                Tu plataforma de confianza para eventos en vivo exclusivos
              </p>
            </div>

            {/* Columna 2: Enlaces */}
            <div>
              <h4 className="regia-title-secondary text-base mb-4">Enlaces</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/#eventos" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
                    Eventos
                  </a>
                </li>
                <li>
                  <button onClick={() => router.push("/mis-boletos")} className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors text-left">
                    Mis Boletos
                  </button>
                </li>
                <li>
                  <a href="/#contacto" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Contacto */}
            <div>
              <h4 className="regia-title-secondary text-base mb-4">Contacto</h4>
              <p className="regia-text-body text-sm mb-2">
                contacto@grupoRegia.com
              </p>
              <p className="text-regia-gold-old text-xs font-semibold tracking-wider mt-4">
                RICO O MUERTO
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-regia-gold-old/20 pt-8 pb-6 text-center">
            <p className="regia-footer-text">
              © {new Date().getFullYear()} Grupo Regia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

