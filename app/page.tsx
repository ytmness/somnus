"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Info } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/eventos/Header";
import { HeroCarousel } from "@/components/eventos/HeroCarousel";
import { ConcertCarousel } from "@/components/eventos/ConcertCarousel";
import { Cart } from "@/components/eventos/Cart";
import { CartItem, Concert } from "@/components/eventos/types";

// Función para convertir eventos de la BD al formato Concert
function convertEventToConcert(event: any): Concert {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Verificar que tenga tipos de boletos
  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    console.warn(`Evento ${event.name} no tiene tipos de boletos`);
    // Retornar un evento con sección vacía para evitar errores
    return {
      id: event.id,
      artist: event.artist,
      tour: event.tour || "",
      date: formattedDate,
      time: event.eventTime,
      venue: event.venue,
      image: event.imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
      minPrice: 0,
      sections: [],
    };
  }

  // Calcular precio mínimo (convertir Decimal a número)
  const minPrice = event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((tt: any) => Number(tt.price)))
    : 0;

  // Convertir ticketTypes a sections
  const sections = event.ticketTypes.map((tt: any) => ({
    id: tt.id,
    name: tt.name,
    description: tt.description || "",
    price: Number(tt.price), // Convertir Decimal a número
    available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)), // Asegurar que no sea negativo
  }));

  return {
    id: event.id,
    artist: event.artist,
    tour: event.tour || "",
    date: formattedDate,
    time: event.eventTime,
    venue: event.venue,
    image: event.imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
    minPrice,
    sections,
  };
}

export default function HomePage() {
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Cargar eventos desde la base de datos
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/events?isActive=true");
        const data = await response.json();

        if (data.success && data.data) {
          console.log("Eventos recibidos de la API:", data.data.length);
          
          // Filtrar eventos activos que tengan tipos de boletos
          // Comparar solo la fecha (sin hora) para evitar problemas de zona horaria
          const now = new Date();
          // Obtener fecha de hoy en UTC para comparar correctamente
          const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          
          const activeEvents = data.data.filter((event: any) => {
            const eventDateUTC = new Date(event.eventDate);
            // Obtener solo la fecha en UTC (sin hora)
            const eventDateOnly = new Date(Date.UTC(
              eventDateUTC.getUTCFullYear(),
              eventDateUTC.getUTCMonth(),
              eventDateUTC.getUTCDate()
            ));
            
            const hasTicketTypes = event.ticketTypes && event.ticketTypes.length > 0;
            // Permitir eventos de hoy o futuros
            const isTodayOrFuture = eventDateOnly >= todayUTC;
            
            // Temporalmente mostrar todos los eventos activos para debug
            // TODO: Restaurar filtro de fecha después de verificar
            const result = event.isActive && hasTicketTypes; // && isTodayOrFuture;
            
            console.log(`Evento ${event.name}:`, {
              isActive: event.isActive,
              hasTicketTypes,
              ticketTypesCount: event.ticketTypes?.length || 0,
              eventDate: event.eventDate,
              eventDateOnly: eventDateOnly.toISOString(),
              todayUTC: todayUTC.toISOString(),
              isTodayOrFuture,
              comparison: `${eventDateOnly.getTime()} >= ${todayUTC.getTime()} = ${eventDateOnly.getTime() >= todayUTC.getTime()}`,
              willShow: result,
              fechaActual: new Date().toISOString(),
            });
            
            return result;
          });

          console.log("Eventos activos después del filtro:", activeEvents.length);

          // Convertir eventos al formato Concert
          const convertedConcerts = activeEvents.map(convertEventToConcert);
          console.log("Conciertos convertidos:", convertedConcerts.length);
          setConcerts(convertedConcerts);
        } else {
          console.error("Error en la respuesta de la API:", data);
        }
      } catch (error) {
        console.error("Error al cargar eventos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleSelectConcert = async (concert: Concert) => {
    // Verificar si el evento tiene mesas configuradas
    try {
      const response = await fetch(`/api/events/${concert.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const event = data.data;
        // Verificar si tiene algún ticketType con isTable = true
        const hasTables = event.ticketTypes?.some((tt: any) => tt.isTable === true);
        
        if (hasTables) {
          // Si tiene mesas, redirigir a la página de mesas
          router.push(`/eventos/${concert.id}/mesas`);
        } else {
          // Si no tiene mesas, mostrar un mensaje o redirigir a otra página
          toast.error("Este evento no tiene mesas configuradas. Próximamente podrás comprar boletos generales.");
        }
      } else {
        toast.error("Error al cargar información del evento");
      }
    } catch (error) {
      console.error("Error al verificar evento:", error);
      toast.error("Error al verificar el evento");
    }
  };

  const handleAddToCart = (items: CartItem[]) => {
    setCartItems((prev) => [...prev, ...items]);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    alert(
      "Funcionalidad de pago próximamente. Total: $" +
        (total * 1.16).toLocaleString() +
        " MXN",
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen regia-bg-textured">
        <Header
          cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onCartClick={() => setShowCart(true)}
        />
        <main className="w-full py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <p className="regia-text-body text-xl">Cargando eventos...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen regia-bg-textured">
      <Header
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setShowCart(true)}
      />

      <main className="w-full py-8">
        {concerts.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <h1 className="regia-title-main mb-4 text-4xl">No hay eventos disponibles</h1>
              <p className="regia-text-body max-w-2xl mx-auto">
                Pronto tendremos nuevos eventos disponibles. ¡Vuelve pronto!
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
              <HeroCarousel
                concerts={concerts.slice(0, 4)}
                onSelectConcert={handleSelectConcert}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12" id="eventos">
                <h1 className="regia-title-main mb-4 text-4xl">Próximos Conciertos</h1>
                <p className="regia-text-body max-w-2xl mx-auto">
                  Descubre los mejores eventos en vivo. Compra tus boletos de manera segura.
                </p>
              </div>
            </div>

            {concerts.length > 0 && (
              <div className="max-w-6xl mx-auto mb-16">
                <h2 className="regia-title-secondary text-xl mb-6 px-4">
                  Eventos Destacados
                </h2>
                <ConcertCarousel
                  concerts={concerts.slice(0, 4)}
                  onSelectConcert={handleSelectConcert}
                />
              </div>
            )}

            {concerts.length > 4 && (
              <div className="max-w-6xl mx-auto mb-12">
                <h2 className="regia-title-secondary text-xl mb-6 px-4">
                  Más Eventos
                </h2>
                <ConcertCarousel
                  concerts={concerts.slice(4)}
                  onSelectConcert={handleSelectConcert}
                />
              </div>
            )}
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16" id="nosotros">
          <div className="regia-ticket-card">
            <h2 className="regia-title-main text-center mb-4 text-3xl">
              ¿Por qué comprar con Grupo Regia?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-16 h-16 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-regia-black text-2xl">✓</span>
                </div>
                <h4 className="regia-title-secondary mb-2">Boletos Garantizados</h4>
                <p className="regia-text-body text-sm">
                  Todos nuestros boletos son 100% auténticos
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-regia-black text-2xl">★</span>
                </div>
                <h4 className="regia-title-secondary mb-2">Mejor Precio</h4>
                <p className="regia-text-body text-sm">
                  Precios competitivos sin comisiones ocultas
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-regia-black text-2xl">♥</span>
                </div>
                <h4 className="regia-title-secondary mb-2">Soporte 24/7</h4>
                <p className="regia-text-body text-sm">
                  Estamos aquí para ayudarte
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16" id="contacto">
          <div className="regia-ticket-card">
            <h2 className="regia-title-main text-center mb-6 text-3xl">
              Contáctanos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="text-center">
                <Mail className="w-12 h-12 text-regia-gold-old mx-auto mb-4" />
                <h4 className="regia-title-secondary mb-2 text-xl">Email</h4>
                <p className="regia-text-body">
                  contacto@grupoRegia.com
                </p>
              </div>
              <div className="text-center">
                <Info className="w-12 h-12 text-regia-gold-old mx-auto mb-4" />
                <h4 className="regia-title-secondary mb-2 text-xl">Horario de Atención</h4>
                <p className="regia-text-body">
                  Lunes a Viernes: 9:00 AM - 8:00 PM<br />
                  Sábados: 10:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="regia-footer mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="regia-footer-text">
            © 2025 Grupo Regia. Todos los derechos reservados.
          </p>
        </div>
      </footer>


      {showCart && (
        <Cart
          items={cartItems}
          onClose={() => setShowCart(false)}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
