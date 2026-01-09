"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Clock, Music, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

  // Usar la imagen del flyer como imagen de fondo heroica
  // Si el evento tiene una imagen específica, se usará; si no, se usa el flyer
  const heroImage = event.imageUrl && !event.imageUrl.includes('unsplash') 
    ? event.imageUrl 
    : "/assets/hero-cuernavaca.jpg";

  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    return {
      id: event.id,
      artist: event.artist,
      tour: event.tour || "",
      date: formattedDate,
      time: event.eventTime,
      venue: event.venue,
      image: heroImage,
      minPrice: 0,
      sections: [],
    };
  }

  const minPrice = event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((tt: any) => Number(tt.price)))
    : 0;

  const sections = event.ticketTypes.map((tt: any) => ({
    id: tt.id,
    name: tt.name,
    description: tt.description || "",
    price: Number(tt.price),
    available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
  }));

  return {
    id: event.id,
    artist: event.artist,
    tour: event.tour || "",
    date: formattedDate,
    time: event.eventTime,
    venue: event.venue,
    image: heroImage,
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
          const now = new Date();
          const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          
          const activeEvents = data.data.filter((event: any) => {
            const eventDateUTC = new Date(event.eventDate);
            const eventDateOnly = new Date(Date.UTC(
              eventDateUTC.getUTCFullYear(),
              eventDateUTC.getUTCMonth(),
              eventDateUTC.getUTCDate()
            ));
            
            const hasTicketTypes = event.ticketTypes && event.ticketTypes.length > 0;
            const result = event.isActive && hasTicketTypes;
            
            return result;
          });

          const convertedConcerts = activeEvents.map(convertEventToConcert);
          setConcerts(convertedConcerts);
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
    try {
      const response = await fetch(`/api/events/${concert.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const event = data.data;
        const hasTables = event.ticketTypes?.some((tt: any) => tt.isTable === true);
        
        if (hasTables) {
          router.push(`/eventos/${concert.id}/mesas`);
        } else {
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
      <div className="min-h-screen regia-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-regia-gold-bright border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="regia-text-body text-xl">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  // Obtener el primer evento destacado
  const featuredEvent = concerts.length > 0 ? concerts[0] : null;

  return (
    <div className="min-h-screen regia-bg-main">
      {/* HERO SECTION - Estilo Flyer Cuernavaca */}
      <section className="relative min-h-screen md:h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Imagen de fondo con silueta dramática */}
        {featuredEvent && (
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <div className="relative w-full h-full md:w-[90%] md:h-[95%]">
              <Image
                src={featuredEvent.image}
                alt={featuredEvent.artist}
                fill
                className="object-contain md:object-cover"
                priority
              />
            </div>
            {/* Overlay oscuro con gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/90" />
            
            {/* Efecto de neblina dorada (simulado con gradientes radiales) */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-regia-gold-bright/20 rounded-full blur-[120px]" />
              <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-regia-gold-old/15 rounded-full blur-[100px]" />
              <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-regia-gold-old/15 rounded-full blur-[100px]" />
            </div>
          </div>
        )}

        {/* Header flotante con logos */}
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            {/* Logo GRUPO REGIA - Izquierda */}
            <div className="flex-shrink-0">
              <Image
                src="/assets/logo.png"
                alt="Grupo Regia"
                width={120}
                height={60}
                className="opacity-90"
              />
            </div>

            {/* Elemento decorativo central - 3 cruces */}
            <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
              <Sparkles className="w-8 h-8 text-regia-gold-old animate-pulse" />
              <Sparkles className="w-10 h-10 text-regia-gold-bright animate-pulse" style={{ animationDelay: '0.3s' }} />
              <Sparkles className="w-8 h-8 text-regia-gold-old animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>

            {/* Logo secundario - Derecha (usando logo principal temporalmente) */}
            <div className="flex-shrink-0 text-right">
              <h2 className="text-regia-gold-old font-bold text-xs sm:text-sm tracking-[0.3em] uppercase">
                RICO O<br/>MUERTO
              </h2>
            </div>
          </div>
        </header>

        {/* Contenido principal centrado */}
        <div className="relative z-20 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-8 md:pt-0">
          {featuredEvent ? (
            <>
              {/* Nombre del evento - Tipografía gótica/vintage */}
              <h1 
                className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] xl:text-[12rem] font-black uppercase mb-6 md:mb-8"
                style={{
                  background: 'linear-gradient(135deg, #F4D03F 0%, #C5A059 50%, #8B7355 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 80px rgba(244, 208, 63, 0.3)',
                  letterSpacing: '0.02em',
                  lineHeight: '0.85',
                }}
              >
                {featuredEvent.artist}
              </h1>

              {/* Fecha - Tipografía elegante */}
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-regia-gold-old mb-6 md:mb-8 tracking-[0.15em] uppercase">
                {featuredEvent.date}
              </p>

              {/* Botón CTA principal */}
              <button
                onClick={() => handleSelectConcert(featuredEvent)}
                className="group relative inline-flex items-center gap-3 px-10 md:px-14 py-4 md:py-5 text-base md:text-lg font-bold uppercase tracking-widest overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'linear-gradient(135deg, #C5A059 0%, #F4D03F 100%)',
                  color: '#0A0A0A',
                  borderRadius: '50px',
                  boxShadow: '0 8px 32px rgba(244, 208, 63, 0.4)',
                }}
              >
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                Comprar Boletos
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* Info adicional debajo del botón */}
              <div className="mt-8 md:mt-10 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                <div className="flex items-center gap-2 text-regia-cream/80 text-sm md:text-base">
                  <MapPin className="w-4 h-4 text-regia-gold-old" />
                  <span>{featuredEvent.venue}</span>
                </div>
                {featuredEvent.time && (
                  <div className="flex items-center gap-2 text-regia-cream/80 text-sm md:text-base">
                    <Clock className="w-4 h-4 text-regia-gold-old" />
                    <span>{featuredEvent.time}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center">
              <h1 className="text-6xl mb-6 font-black text-regia-gold-bright">
                Próximamente
              </h1>
              <p className="regia-text-body text-xl">
                Nuevos eventos muy pronto
              </p>
            </div>
          )}
        </div>

        {/* Scroll indicator - Solo en móvil */}
        <div className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 border-2 border-regia-gold-old rounded-full flex justify-center p-1">
            <div className="w-1 h-3 bg-regia-gold-bright rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* SECCIÓN: INFORMACIÓN DEL EVENTO */}
      {featuredEvent && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-regia-metallic-gray/30 to-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="regia-title-main text-4xl md:text-5xl text-center mb-16">
              Información del Evento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Fecha */}
              <div className="text-center p-8 regia-ticket-card">
                <Calendar className="w-12 h-12 text-regia-gold-bright mx-auto mb-4" />
                <h3 className="regia-title-secondary text-xl mb-2">Fecha</h3>
                <p className="regia-text-body">{featuredEvent.date}</p>
                {featuredEvent.time && (
                  <p className="text-regia-gold-old text-sm mt-2">{featuredEvent.time}</p>
                )}
              </div>

              {/* Ubicación */}
              <div className="text-center p-8 regia-ticket-card">
                <MapPin className="w-12 h-12 text-regia-gold-bright mx-auto mb-4" />
                <h3 className="regia-title-secondary text-xl mb-2">Ubicación</h3>
                <p className="regia-text-body">{featuredEvent.venue}</p>
              </div>

              {/* Artista */}
              <div className="text-center p-8 regia-ticket-card">
                <Music className="w-12 h-12 text-regia-gold-bright mx-auto mb-4" />
                <h3 className="regia-title-secondary text-xl mb-2">Artista</h3>
                <p className="regia-text-body">{featuredEvent.artist}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: TIPOS DE BOLETOS */}
      {featuredEvent && featuredEvent.sections.length > 0 && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 regia-bg-main">
          <div className="max-w-6xl mx-auto">
            <h2 className="regia-title-main text-4xl md:text-5xl text-center mb-4">
              Tipos de Boletos
            </h2>
            <p className="regia-text-body text-center mb-16 max-w-2xl mx-auto">
              Selecciona tu experiencia y asegura tu lugar en este evento exclusivo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvent.sections.map((section) => (
                <div 
                  key={section.id}
                  className="regia-ticket-card group hover:scale-105 transition-all duration-300"
                  style={{
                    boxShadow: '0 4px 24px rgba(197, 160, 89, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="w-8 h-8 text-regia-gold-bright" />
                    <h3 className="regia-title-secondary text-2xl uppercase">
                      {section.name}
                    </h3>
                  </div>

                  {section.description && (
                    <p className="regia-text-body text-sm mb-6 leading-relaxed">
                      {section.description}
                    </p>
                  )}

                  <div className="mb-6 pb-6 border-b border-regia-gold-old/30">
                    <p className="text-regia-gold-bright text-3xl font-bold">
                      ${section.price.toLocaleString('es-MX')}
                      <span className="text-regia-cream/60 text-sm font-normal ml-2">MXN</span>
                    </p>
                    <p className="text-regia-cream/60 text-xs mt-1">
                      {section.available > 0 
                        ? `${section.available} disponibles` 
                        : 'Agotado'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectConcert(featuredEvent)}
                    disabled={section.available === 0}
                    className="regia-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {section.available > 0 ? 'Seleccionar' : 'Agotado'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: TODOS LOS EVENTOS (si hay más de uno) */}
      {concerts.length > 1 && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black via-regia-metallic-gray/20 to-black">
          <div className="max-w-7xl mx-auto">
            <h2 className="regia-title-main text-4xl md:text-5xl text-center mb-16">
              Más Eventos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {concerts.slice(1).map((concert) => (
                <div
                  key={concert.id}
                  className="regia-card-glow group cursor-pointer"
                  onClick={() => handleSelectConcert(concert)}
                >
                  <div className="relative h-80 overflow-hidden rounded-t-2xl">
                    <Image
                      src={concert.image}
                      alt={concert.artist}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-3xl font-bold text-regia-gold-bright mb-2">
                        {concert.artist}
                      </h3>
                      <p className="text-regia-cream text-sm">{concert.date}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-regia-cream/80 text-sm mb-4">
                      <MapPin className="w-4 h-4 text-regia-gold-old" />
                      <span>{concert.venue}</span>
                    </div>

                    {concert.minPrice > 0 && (
                      <p className="text-regia-gold-bright text-xl font-bold mb-4">
                        Desde ${concert.minPrice.toLocaleString('es-MX')} MXN
                      </p>
                    )}

                    <button className="regia-btn-secondary w-full">
                      Ver Boletos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: POR QUÉ COMPRAR CON NOSOTROS */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 regia-bg-main">
        <div className="max-w-6xl mx-auto">
          <h2 className="regia-title-main text-4xl md:text-5xl text-center mb-16">
            ¿Por qué Grupo Regia?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-20 h-20 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 glow-gold-strong">
                <span className="text-regia-black text-3xl font-bold">✓</span>
              </div>
              <h3 className="regia-title-secondary text-xl mb-3">Boletos Garantizados</h3>
              <p className="regia-text-body text-sm">
                Todos nuestros boletos son 100% auténticos y verificados
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-20 h-20 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 glow-gold-strong">
                <span className="text-regia-black text-3xl font-bold">★</span>
              </div>
              <h3 className="regia-title-secondary text-xl mb-3">Mejor Precio</h3>
              <p className="regia-text-body text-sm">
                Precios competitivos sin comisiones ocultas
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-20 h-20 regia-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 glow-gold-strong">
                <span className="text-regia-black text-3xl font-bold">♥</span>
              </div>
              <h3 className="regia-title-secondary text-xl mb-3">Soporte 24/7</h3>
              <p className="regia-text-body text-sm">
                Estamos aquí para ayudarte en cualquier momento
              </p>
            </div>
          </div>
        </div>
      </section>

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
                  <a href="#eventos" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
                    Eventos
                  </a>
                </li>
                <li>
                  <a href="#nosotros" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
                    Nosotros
                  </a>
                </li>
                <li>
                  <a href="#contacto" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
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

          {/* Copyright y créditos */}
          <div className="border-t border-regia-gold-old/20 pt-8 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="regia-footer-text">
                © {new Date().getFullYear()} Grupo Regia. Todos los derechos reservados.
              </p>
              <p className="regia-footer-text text-xs">
                PRODUCTION BY: <span className="text-regia-gold-old font-semibold tracking-wider">ECHO VISIONS</span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart */}
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
