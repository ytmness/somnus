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
  const cupidoVideoRef = useRef<HTMLVideoElement>(null);

  // Reproducción automática del video del cupido - simple y estable para iOS
  useEffect(() => {
    const v = cupidoVideoRef.current;
    if (!v) return;

    const tryPlay = () => {
      v.muted = true;
      v.playsInline = true;
      v.play().catch(() => {});
    };

    // Una vez cuando ya hay data
    v.addEventListener("loadeddata", tryPlay, { once: true });
    // Intento inmediato por si ya está listo
    tryPlay();

    return () => {
      v.removeEventListener("loadeddata", tryPlay);
    };
  }, []);

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
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="somnus-text-body text-xl">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  // Obtener el primer evento destacado
  const featuredEvent = concerts.length > 0 ? concerts[0] : null;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* HERO SECTION - Estilo SOMNUS con ángel de fondo */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden somnus-hero">
        {/* Video del ángel como fondo - posicionado para abrazar las letras */}
        <div className="absolute inset-0 z-[1] w-full h-full overflow-hidden">
          <video
            ref={cupidoVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover hero-video-no-controls video-cupido-mobile"
            style={{
              objectPosition: 'center 45%',
              opacity: 0.9,
              width: '100vw',
              height: '100vh',
              minWidth: '100vw',
              minHeight: '100vh',
              pointerEvents: 'none'
            }}
            webkit-playsinline="true"
            x5-playsinline="true"
            x-webkit-airplay="allow"
            disablePictureInPicture
            controlsList="nodownload"
            onError={(e) => {
              console.error('Error cargando video:', e);
            }}
          >
            <source src="/assets/cupido-angel-video.mp4" type="video/mp4" />
          </video>
          {/* Overlay oscuro sutil para mantener legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        </div>
        
        {/* Video de fondo opcional (solo si existe featuredEvent) - con overlay más oscuro */}
        {featuredEvent && (
          <div className="absolute inset-0 z-0 opacity-30">
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
            <div 
              className="lg:hidden w-full h-full bg-cover bg-center"
              style={{ backgroundImage: 'url(/assets/flyerfinal-10-1-25.jpg)' }}
            />
            {/* Overlay adicional para oscurecer el video y dar más protagonismo a los gradientes */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/95" />
          </div>
        )}

        {/* Header estilo SOMNUS - BRAND IDENTITY | 2025 | DOBLE SS STUDIO */}
        <header className="somnus-header">
          {/* Versión móvil */}
          <div className="w-full flex lg:hidden items-center justify-between">
            <span className="somnus-header-item">BRAND IDENTITY</span>
            <span className="somnus-header-item">2025</span>
            <button
              onClick={() => router.push("/login")}
              className="somnus-header-item hover:opacity-70 transition-opacity"
            >
              <LogIn className="w-5 h-5" />
            </button>
          </div>

          {/* Versión desktop */}
          <div className="w-full hidden lg:flex items-center justify-between">
            <span className="somnus-header-item">BRAND IDENTITY</span>
            <span className="somnus-header-item">2025</span>
            <div className="flex items-center gap-6">
              {/* Navegación oculta pero funcional */}
              <a
                href="#eventos"
                className="somnus-header-item hover:opacity-70 transition-opacity hidden"
              >
                Eventos
              </a>
              <button
                onClick={() => router.push("/mis-boletos")}
                className="somnus-header-item hover:opacity-70 transition-opacity hidden"
              >
                Mis Boletos
              </button>
              {userRole === "ADMIN" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="somnus-header-item hover:opacity-70 transition-opacity"
                >
                  Admin
                </button>
              )}
              {(userRole === "ACCESOS" || userRole === "ADMIN") && (
                <button
                  onClick={() => router.push("/accesos")}
                  className="somnus-header-item hover:opacity-70 transition-opacity"
                >
                  Accesos
                </button>
              )}
              {user ? (
                <button
                  onClick={() => router.push("/login")}
                  className="somnus-header-item hover:opacity-70 transition-opacity"
                >
                  {user.name || user.email}
                </button>
              ) : (
                <button
                  onClick={() => router.push("/login")}
                  className="somnus-header-item hover:opacity-70 transition-opacity"
                >
                  Login
                </button>
              )}
            </div>
            <span className="somnus-header-item">DOBLE SS STUDIO</span>
          </div>
        </header>

        {/* Contenido principal - Estilo SOMNUS */}
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-6xl flex flex-col items-center justify-center px-2 sm:px-4">
          {featuredEvent ? (
            <>
              {/* Logo SOMNUS */}
              <div className="flex justify-center mb-4">
                <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={800} height={240} className="w-[40rem] sm:w-[44rem] md:w-[56rem] lg:w-[64rem] h-auto object-contain" priority />
              </div>
              
              {/* Subtítulo AWAKE IN A DREAM */}
              <p className="somnus-subtitle">
                AWAKE IN A DREAM
              </p>
              
              {/* Información del evento (opcional, más discreta) */}
              <div className="mt-8 text-center opacity-80">
                <p className="text-white text-sm md:text-base font-light tracking-wider mb-2">
                  {featuredEvent.artist}
                </p>
                <p className="text-white/70 text-xs md:text-sm font-light">
                  {featuredEvent.date} • {featuredEvent.venue}
                </p>
              </div>
              
              {/* Botón CTA - Comprar Boletos */}
              <div className="mt-8">
                <button
                  onClick={() => handleSelectConcert(featuredEvent)}
                  className="group relative inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-sm md:text-base font-bold uppercase tracking-wider overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      borderRadius: '50px',
                      border: '1px solid rgba(255, 105, 180, 0.4)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 32px rgba(255, 105, 180, 0.3)',
                    }}
                >
                  <span>Comprar Boletos</span>
                </button>
              </div>
              
              {/* Scroll indicator */}
              <div className="mt-12 cursor-pointer animate-bounce" onClick={() => {
                const nextSection = document.getElementById('info-evento');
                nextSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
                  <div className="w-1 h-3 bg-white/50 rounded-full"></div>
                </div>
              </div>
              
            </>
          ) : (
            <>
              {/* Logo SOMNUS - siempre visible */}
              <div className="flex justify-center mb-4">
                <Image src="/assets/SOMNUS LOGO BLANCO.png" alt="SOMNUS" width={800} height={240} className="w-[40rem] sm:w-[44rem] md:w-[56rem] lg:w-[64rem] h-auto object-contain" priority />
              </div>
              
              {/* Subtítulo AWAKE IN A DREAM */}
              <p className="somnus-subtitle">
                AWAKE IN A DREAM
              </p>
              
              {/* Mensaje cuando no hay eventos */}
              <div className="mt-8 text-center opacity-80">
                <p className="text-white text-sm md:text-base font-light tracking-wider">
                  Próximamente
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* SECCIÓN: INFORMACIÓN DEL EVENTO */}
      {featuredEvent && (
        <section id="info-evento" className="relative py-24 px-4 sm:px-6 lg:px-8 somnus-bg-main">
          <div className="max-w-6xl mx-auto">
            <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-12 uppercase tracking-wider">
              Información del Evento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              {/* Fecha */}
              <div className="text-center somnus-card">
                <Calendar className="w-12 h-12 text-white mx-auto mb-4 opacity-80" />
                <h3 className="somnus-title-secondary text-xl mb-2 uppercase">Fecha</h3>
                <p className="somnus-text-body">{featuredEvent.date}</p>
                {featuredEvent.time && (
                  <p className="text-white/60 text-sm mt-2">{featuredEvent.time}</p>
                )}
              </div>

              {/* Ubicación */}
              <div className="text-center somnus-card">
                <MapPin className="w-12 h-12 text-white mx-auto mb-4 opacity-80" />
                <h3 className="somnus-title-secondary text-xl mb-2 uppercase">Ubicación</h3>
                <p className="somnus-text-body">{featuredEvent.venue}</p>
              </div>

              {/* Artista */}
              <div className="text-center somnus-card">
                <Music className="w-12 h-12 text-white mx-auto mb-4 opacity-80" />
                <h3 className="somnus-title-secondary text-xl mb-2 uppercase">Artista</h3>
                <p className="somnus-text-body">{featuredEvent.artist}</p>
              </div>
            </div>

            {/* Mapa del evento */}
            <div className="somnus-card overflow-hidden">
              <h3 className="somnus-title-secondary text-xl mb-6 text-center uppercase">
                Ubicación del Evento
              </h3>
              <div className="w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden opacity-90">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(featuredEvent.venue || 'Campo La Unión Patriotas')}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
              <p className="somnus-text-body text-sm text-center mt-4">
                {featuredEvent.venue}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN: TIPOS DE BOLETOS */}
      {featuredEvent && featuredEvent.sections.length > 0 && (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 somnus-bg-main">
          <div className="max-w-6xl mx-auto">
            <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-6 uppercase tracking-wider">
              Tipos de Boletos
            </h2>
            <p className="somnus-text-body text-center mb-16 max-w-2xl mx-auto">
              Selecciona tu experiencia y asegura tu lugar en este evento exclusivo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {featuredEvent.sections.map((section) => (
                <div 
                  key={section.id}
                  className="somnus-card group hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="w-8 h-8 text-white opacity-80" />
                    <h3 className="somnus-title-secondary text-2xl uppercase">
                      {section.name}
                    </h3>
                  </div>

                  {section.description && (
                    <p className="somnus-text-body text-sm mb-6 leading-relaxed">
                      {section.description}
                    </p>
                  )}

                  <div className="mb-6 pb-6 border-b border-white/20">
                    <p className="text-white text-3xl font-bold">
                      ${section.price.toLocaleString('es-MX')}
                      <span className="text-white/60 text-sm font-normal ml-2">MXN</span>
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      {section.available > 0 
                        ? `${section.available} disponibles` 
                        : 'Agotado'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectConcert(featuredEvent)}
                    disabled={section.available === 0}
                    className="somnus-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 somnus-bg-main">
          <div className="max-w-6xl mx-auto">
            <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-12 uppercase tracking-wider">
              Más Eventos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {concerts.slice(1).map((concert) => {
                const isMystery = concert.artist === 'Artista por Confirmar' || concert.artist.toLowerCase().includes('por confirmar');
                
                return (
                  <div
                    key={concert.id}
                    className="somnus-card group cursor-pointer"
                    onClick={() => handleSelectConcert(concert)}
                  >
                    <div className="relative h-80 overflow-hidden">
                      {isMystery ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center">
                            <p className="text-white text-6xl font-bold mb-4">?????</p>
                            <p className="text-white/60 text-sm">Próximamente</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Image
                            src={concert.image}
                            alt={concert.artist}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        </>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-3xl font-bold text-white mb-2">
                          {isMystery ? '?????' : concert.artist}
                        </h3>
                        <p className="text-white/80 text-sm">{isMystery ? '?????' : concert.date}</p>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                        <MapPin className="w-4 h-4 text-white/60" />
                        <span>{isMystery ? '?????' : concert.venue}</span>
                      </div>

                      {!isMystery && concert.minPrice > 0 && (
                        <p className="text-white text-xl font-bold mb-4">
                          Desde ${concert.minPrice.toLocaleString('es-MX')} MXN
                        </p>
                      )}

                      <button className="somnus-btn w-full">
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
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 somnus-bg-main">
        <div className="max-w-6xl mx-auto">
          <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-12 uppercase tracking-wider">
            ¿Por qué Somnus?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center somnus-card">
              <div className="w-20 h-20 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-3xl font-bold">✓</span>
              </div>
              <h3 className="somnus-title-secondary text-xl mb-3 uppercase">Boletos Garantizados</h3>
              <p className="somnus-text-body text-sm">
                Todos nuestros boletos son 100% auténticos y verificados
              </p>
            </div>

            <div className="text-center somnus-card">
              <div className="w-20 h-20 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-3xl font-bold">★</span>
              </div>
              <h3 className="somnus-title-secondary text-xl mb-3 uppercase">Mejor Precio</h3>
              <p className="somnus-text-body text-sm">
                Precios competitivos sin comisiones ocultas
              </p>
            </div>

            <div className="text-center somnus-card">
              <div className="w-20 h-20 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-3xl font-bold">♥</span>
              </div>
              <h3 className="somnus-title-secondary text-xl mb-3 uppercase">Soporte 24/7</h3>
              <p className="somnus-text-body text-sm">
                Estamos aquí para ayudarte en cualquier momento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER MINIMALISTA */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Columna 1: Logo y descripción */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4 tracking-wider uppercase">
                Somnus
              </h3>
              <p className="somnus-text-body text-sm">
                Tu plataforma de confianza para eventos en vivo exclusivos
              </p>
            </div>

            {/* Columna 2: Enlaces */}
            <div>
              <h4 className="somnus-title-secondary text-base mb-4 uppercase">Enlaces</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#eventos" className="somnus-text-body text-sm hover:text-white transition-colors">
                    Eventos
                  </a>
                </li>
                <li>
                  <a href="#nosotros" className="somnus-text-body text-sm hover:text-white transition-colors">
                    Nosotros
                  </a>
                </li>
                <li>
                  <a href="#contacto" className="somnus-text-body text-sm hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Contacto */}
            <div>
              <h4 className="somnus-title-secondary text-base mb-4 uppercase">Contacto</h4>
              <p className="somnus-text-body text-sm mb-2">
                contacto@somnus.com
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/10 pt-8 pb-6 text-center">
            <p className="somnus-text-body text-sm">
              © {new Date().getFullYear()} Somnus. Todos los derechos reservados.
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

