"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Clock, Music, Users, User, LogIn, Shield, Scan } from "lucide-react";
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

  // Separar tipos de boletos
  const generalTypes = event.ticketTypes.filter((tt: any) => tt.category === "GENERAL");
  const preferenteTypes = event.ticketTypes.filter((tt: any) => 
    tt.category === "PREFERENTE" && 
    (tt.name.toLowerCase().includes("a") || tt.name.toLowerCase().includes("b"))
  );
  const vipTypes = event.ticketTypes.filter((tt: any) => tt.category === "VIP");
  const otherTypes = event.ticketTypes.filter((tt: any) => 
    tt.category !== "GENERAL" && 
    tt.category !== "VIP" && 
    !(tt.category === "PREFERENTE" && (tt.name.toLowerCase().includes("a") || tt.name.toLowerCase().includes("b")))
  );

  const sections: any[] = [];

  // General
  generalTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: Number(tt.price),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

  // Preferente A y B combinados
  if (preferenteTypes.length > 0) {
    const totalPreferenteQuantity = preferenteTypes.reduce((sum: number, tt: any) => 
      sum + Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)), 0
    );
    const preferentePrice = preferenteTypes[0]?.price || 0;
    const preferenteDescription = preferenteTypes[0]?.description || "Asientos numerados, excelente vista";

    sections.push({
      id: `preferente-combined-${event.id}`,
      name: "Preferente A y B",
      description: preferenteDescription,
      price: Number(preferentePrice),
      available: totalPreferenteQuantity,
    });
  }

  // VIP
  vipTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: Number(tt.price),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

  // Otros tipos
  otherTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: Number(tt.price),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

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
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reproducción automática agresiva con DEBUG
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log("🎬 [DEBUG] Video useEffect iniciado", {
      videoExists: !!video,
      classList: video?.className,
      offsetWidth: video?.offsetWidth,
      offsetHeight: video?.offsetHeight,
      display: typeof window !== 'undefined' ? window.getComputedStyle(video).display : 'n/a',
      visibility: typeof window !== 'undefined' ? window.getComputedStyle(video).visibility : 'n/a'
    });

    // Configurar para autoplay (crítico)
    video.muted = true;
    video.volume = 0;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    
    let hasPlayed = false;
    let attemptCount = 0;

    const forcePlay = async () => {
      attemptCount++;
      if (hasPlayed || !video) return;
      
      console.log(`🎯 [DEBUG] Intento #${attemptCount} de reproducir video`, {
        readyState: video.readyState,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      try {
        // Re-asegurar que esté muted
        video.muted = true;
        video.volume = 0;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
          hasPlayed = true;
          console.log("✅ [DEBUG] Video playing SUCCESS!", {
            currentTime: video.currentTime,
            paused: video.paused
          });
        }
      } catch (error: any) {
        console.error("❌ [DEBUG] Video play FAILED", {
          error: String(error),
          errorName: error?.name,
          errorMessage: error?.message,
          readyState: video.readyState,
          paused: video.paused
        });
      }
    };

    // Intentos múltiples inmediatos
    console.log("⏰ [DEBUG] Setting up timers para reproducción");
    forcePlay();
    setTimeout(forcePlay, 100);
    setTimeout(forcePlay, 300);
    setTimeout(forcePlay, 500);
    setTimeout(forcePlay, 1000);
    
    // También intentar cuando el video esté listo
    const handleCanPlay = () => {
      console.log("📡 [DEBUG] canplay event fired", { readyState: video.readyState });
      forcePlay();
    };
    const handleLoadedData = () => {
      console.log("📡 [DEBUG] loadeddata event fired", { readyState: video.readyState, duration: video.duration });
      forcePlay();
    };
    const handleLoadedMetadata = () => {
      console.log("📡 [DEBUG] loadedmetadata event fired", {
        readyState: video.readyState,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      forcePlay();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, []);

  // Cargar sesión del usuario
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.success && data.data) {
          setUser(data.data.user);
          setUserRole(data.data.user?.role || null);
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error);
      }
    };
    loadSession();
  }, []);

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
    <div className="min-h-screen regia-bg-main overflow-x-hidden">
      {/* HERO SECTION - Estilo Flyer Cuernavaca con Video de Fondo */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-end overflow-hidden bg-black">
        {/* Video de fondo (solo desktop) / Imagen (móvil) */}
        {featuredEvent && (
          <div className="absolute inset-0 z-0">
            {/* Video solo en desktop */}
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster="/assets/flyerfinal-10-1-25.jpg"
              className="hidden lg:block w-full h-full object-cover hero-video-no-controls"
              webkit-playsinline="true"
              x5-playsinline="true"
              x-webkit-airplay="allow"
              disablePictureInPicture
              controlsList="nodownload"
            >
              <source src="/assets/hero-video.mp4" type="video/mp4" />
            </video>

            {/* Imagen estática en móvil */}
            <div 
              className="lg:hidden w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(/assets/flyerfinal-10-1-25.jpg)' }}
            />
            {/* Overlay oscuro con gradiente - más suave para ver el video */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
            
            {/* Efecto de neblina dorada (simulado con gradientes radiales) */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-regia-gold-bright/20 rounded-full blur-[120px]" />
              <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-regia-gold-old/15 rounded-full blur-[100px]" />
              <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-regia-gold-old/15 rounded-full blur-[100px]" />
            </div>
          </div>
        )}

        {/* Header flotante con logos y navegación integrada */}
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-6">
          {/* Versión móvil - Logos simplificados */}
          <div className="w-full flex lg:hidden items-center justify-between">
            <Image
              src="/assets/logo-grupo-regia.png"
              alt="Grupo Regia"
              width={80}
              height={48}
              className="opacity-90"
            />
            <button
              onClick={() => router.push("/login")}
              className="text-regia-gold-old hover:text-regia-gold-bright transition-colors"
            >
              <LogIn className="w-6 h-6" />
            </button>
          </div>

          {/* Versión desktop - Navegación completa */}
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

            {/* Eventos */}
            <a
              href="#eventos"
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Calendar className="w-4 h-4" />
              <span>Eventos</span>
            </a>

            {/* Mis Boletos */}
            <button
              onClick={() => router.push("/mis-boletos")}
              className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
            >
              <Music className="w-4 h-4" />
              <span>Mis Boletos</span>
            </button>

            {/* Admin - solo si tiene rol */}
            {userRole === "ADMIN" && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            {/* Accesos - solo si tiene rol */}
            {(userRole === "ACCESOS" || userRole === "ADMIN") && (
              <button
                onClick={() => router.push("/accesos")}
                className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
              >
                <Scan className="w-4 h-4" />
                <span>Accesos</span>
              </button>
            )}

            {/* Login / User */}
            {user ? (
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
              >
                <User className="w-4 h-4" />
                <span>{user.name || user.email}</span>
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 text-regia-cream/90 hover:text-regia-gold-bright transition-all duration-300 text-sm font-medium uppercase tracking-wider hover:scale-105"
              >
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

        {/* Contenido principal - flujo vertical normal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-6xl flex flex-col items-center justify-center px-4 pt-24">
          {featuredEvent ? (
            <>
              {/* Nombre del evento - Victor Mendivil */}
              <div className="w-full flex justify-center mb-6">
                <Image
                  src="/assets/victor-mendivil-title.png"
                  alt={featuredEvent.artist}
                  width={1689}
                  height={689}
                  className="w-full max-w-6xl h-auto"
                  style={{ 
                    filter: 'drop-shadow(0 0 20px rgba(244, 208, 63, 0.6))'
                  }}
                  priority
                />
              </div>

              {/* Contenedor para fecha, botón, info y estrella - ligeramente a la derecha */}
              <div className="w-full flex flex-col items-center pl-0 md:pl-12 lg:pl-16">
                {/* Fecha - 28 de marzo */}
                <div className="w-full flex justify-center mb-8">
                  <Image
                    src="/assets/fecha-evento.png"
                    alt="28 de marzo de 2026"
                    width={1689}
                    height={202}
                    className="w-full max-w-lg h-auto"
                    style={{ 
                      filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.5))'
                    }}
                    priority
                  />
                </div>

                {/* Botón CTA - Comprar Boletos */}
                <div className="mb-4">
                  <button
                    onClick={() => handleSelectConcert(featuredEvent)}
                    className="group relative inline-flex items-center gap-3 px-10 py-4 text-base md:text-lg font-bold uppercase tracking-widest overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'linear-gradient(135deg, #C5A059 0%, #F4D03F 100%)',
                      color: '#0A0A0A',
                      borderRadius: '50px',
                      boxShadow: '0 8px 32px rgba(244, 208, 63, 0.4)',
                    }}
                  >
                    Comprar Boletos
                  </button>
                </div>

                {/* Info adicional */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 mb-4">
                  <div className="flex items-center gap-2 text-regia-cream/80 text-sm">
                    <MapPin className="w-4 h-4 text-regia-gold-old" />
                    <span>{featuredEvent.venue}</span>
                  </div>
                  {featuredEvent.time && (
                    <div className="flex items-center gap-2 text-regia-cream/80 text-sm">
                      <Clock className="w-4 h-4 text-regia-gold-old" />
                      <span>{featuredEvent.time}</span>
                    </div>
                  )}
                </div>

                {/* Scroll indicator - Estrella */}
                <div className="mt-8 ml-2 animate-bounce cursor-pointer hover:scale-110 transition-transform duration-300">
                  <Image 
                    src="/assets/estrella.png" 
                    alt="Scroll" 
                    width={80} 
                    height={80} 
                    className="opacity-90"
                    style={{ 
                      filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.6))'
                    }}
                    onClick={() => {
                      const nextSection = document.getElementById('info-evento');
                      nextSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  />
                </div>
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
      </section>

      {/* SECCIÓN: INFORMACIÓN DEL EVENTO */}
      {featuredEvent && (
        <section id="info-evento" className="relative py-24 px-4 sm:px-6 lg:px-8 regia-bg-main">
          <div className="max-w-6xl mx-auto pl-0 md:pl-8 lg:pl-12">
            <div className="flex justify-start mb-16">
              <Image
                src="/assets/info-evento-titulo.png"
                alt="Información del Evento"
                width={1456}
                height={244}
                className="w-full max-w-3xl h-auto"
                style={{ 
                  filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.4))'
                }}
              />
            </div>

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
          <div className="max-w-6xl mx-auto pl-0 md:pl-8 lg:pl-12">
            <div className="flex justify-center mb-16">
              <Image
                src="/assets/tipos-de-boletos-titulo.png"
                alt="Tipos de Boletos"
                width={1456}
                height={244}
                className="w-full max-w-2xl h-auto"
                style={{ 
                  filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.4))'
                }}
                priority
              />
            </div>
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
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 regia-bg-main">
          <div className="max-w-6xl mx-auto pl-0 md:pl-8 lg:pl-12">
            <div className="flex justify-center mb-16">
              <Image
                src="/assets/mas-eventos-titulo.png"
                alt="Más Eventos"
                width={1456}
                height={244}
                className="w-full max-w-2xl h-auto"
                style={{ 
                  filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.4))'
                }}
                priority
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {concerts.slice(1).map((concert) => {
                const isMystery = concert.artist === 'Artista por Confirmar' || concert.artist.toLowerCase().includes('por confirmar');
                
                return (
                  <div
                    key={concert.id}
                    className="regia-card-glow group cursor-pointer"
                    onClick={() => handleSelectConcert(concert)}
                  >
                    <div className="relative h-80 overflow-hidden rounded-t-2xl bg-gradient-to-br from-regia-black via-regia-metallic-gray to-regia-black">
                      {isMystery ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-regia-gold-bright text-6xl font-bold mb-4">?????</p>
                            <p className="text-regia-cream/60 text-sm">Próximamente</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Image
                            src={concert.image}
                            alt={concert.artist}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        </>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-3xl font-bold text-regia-gold-bright mb-2">
                          {isMystery ? '?????' : concert.artist}
                        </h3>
                        <p className="text-regia-cream text-sm">{isMystery ? '?????' : concert.date}</p>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-regia-cream/80 text-sm mb-4">
                        <MapPin className="w-4 h-4 text-regia-gold-old" />
                        <span>{isMystery ? '?????' : concert.venue}</span>
                      </div>

                      {!isMystery && concert.minPrice > 0 && (
                        <p className="text-regia-gold-bright text-xl font-bold mb-4">
                          Desde ${concert.minPrice.toLocaleString('es-MX')} MXN
                        </p>
                      )}

                      {isMystery && (
                        <p className="text-regia-gold-bright text-xl font-bold mb-4">
                          ?????
                        </p>
                      )}

                      <button className="regia-btn-secondary w-full">
                        {isMystery ? 'Próximamente' : 'Ver Boletos'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: POR QUÉ COMPRAR CON NOSOTROS */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 regia-bg-main">
        <div className="max-w-6xl mx-auto pl-0 md:pl-8 lg:pl-12">
          <div className="flex justify-start mb-16">
            <Image
              src="/assets/porque-grupo-regia-titulo.png"
              alt="¿Por qué Grupo Regia?"
              width={1456}
              height={244}
              className="w-full max-w-3xl h-auto"
              style={{ 
                filter: 'drop-shadow(0 0 15px rgba(244, 208, 63, 0.4))'
              }}
            />
          </div>

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

          {/* Copyright */}
          <div className="border-t border-regia-gold-old/20 pt-8 pb-6 text-center">
            <p className="regia-footer-text">
              © {new Date().getFullYear()} Grupo Regia. Todos los derechos reservados.
            </p>
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
