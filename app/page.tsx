"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const SOMNUS_VIDEOS = [
  "/assets/PANORAMA SOMNUSNIGHTS AFTERMOVIE 4.0.mp4",
  "/assets/SOMNUS 30-08-25 AFTERMOVIE 2.0.mp4",
  "/assets/SOMNUS VIVA BRUNCH 2.0.mp4",
  "/assets/SOMNYS BLACKOUTorBLACKOUT.mp4",
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Cart } from "@/components/eventos/Cart";
import { CartItem, Concert } from "@/components/eventos/types";

function convertEventToConcert(event: any): Concert {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const heroImage =
    event.imageUrl && !event.imageUrl.includes("unsplash")
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

  const minPrice =
    event.ticketTypes.length > 0
      ? Math.min(...event.ticketTypes.map((tt: any) => Number(tt.price)))
      : 0;

  const generalTypes = event.ticketTypes.filter(
    (tt: any) => tt.category === "GENERAL"
  );
  const preferenteTypes = event.ticketTypes.filter(
    (tt: any) =>
      tt.category === "PREFERENTE" &&
      (tt.name.toLowerCase().includes("a") ||
        tt.name.toLowerCase().includes("b"))
  );
  const vipTypes = event.ticketTypes.filter(
    (tt: any) => tt.category === "VIP"
  );
  const otherTypes = event.ticketTypes.filter(
    (tt: any) =>
      tt.category !== "GENERAL" &&
      tt.category !== "VIP" &&
      !(
        tt.category === "PREFERENTE" &&
        (tt.name.toLowerCase().includes("a") ||
          tt.name.toLowerCase().includes("b"))
      )
  );

  const sections: any[] = [];

  generalTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: Number(tt.price),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

  if (preferenteTypes.length > 0) {
    const totalPreferenteQuantity = preferenteTypes.reduce(
      (sum: number, tt: any) =>
        sum + Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
      0
    );
    const preferentePrice = preferenteTypes[0]?.price || 0;
    const preferenteDescription =
      preferenteTypes[0]?.description ||
      "Asientos numerados, excelente vista";

    sections.push({
      id: `preferente-combined-${event.id}`,
      name: "Preferente A y B",
      description: preferenteDescription,
      price: Number(preferentePrice),
      available: totalPreferenteQuantity,
    });
  }

  vipTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: Number(tt.price),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

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

function getEventStatus(concert: Concert): string | null {
  const totalAvailable = concert.sections?.reduce(
    (sum, s) => sum + (s.available || 0),
    0
  );
  if (!totalAvailable) return "Agotado";
  if (totalAvailable <= 20) return "Últimos boletos";
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const shuffledVideos = useMemo(() => shuffleArray(SOMNUS_VIDEOS), []);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.muted = true;
      v.playsInline = true;
      v.play().catch(() => {});
    };
    v.addEventListener("loadeddata", tryPlay, { once: true });
    tryPlay();
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, [currentVideoIndex]);

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % shuffledVideos.length);
  };

  // Preload next video when current is ~80% through (evita cargar todo de golpe)
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      const dur = v.duration;
      if (dur > 0 && v.currentTime > dur * 0.8) {
        const nextIdx = (currentVideoIndex + 1) % shuffledVideos.length;
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = shuffledVideos[nextIdx];
        document.head.appendChild(link);
        v.removeEventListener("timeupdate", onTimeUpdate);
      }
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [currentVideoIndex, shuffledVideos]);

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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/events?isActive=true");
        const data = await response.json();

        if (data.success && data.data) {
          const activeEvents = data.data.filter((event: any) => {
            const hasTicketTypes =
              event.ticketTypes && event.ticketTypes.length > 0;
            return event.isActive && hasTicketTypes;
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
        const hasTables = event.ticketTypes?.some(
          (tt: any) => tt.isTable === true
        );

        if (hasTables) {
          router.push(`/eventos/${concert.id}/mesas`);
        } else {
          toast.error(
            "Este evento no tiene mesas configuradas. Próximamente podrás comprar boletos generales."
          );
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
      0
    );
    alert(
      "Funcionalidad de pago próximamente. Total: $" +
        (total * 1.16).toLocaleString() +
        " MXN"
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

  const nextEvent = concerts.length > 0 ? concerts[0] : null;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* 1. HERO INMERSIVO - Full-height, impacto inmediato */}
      <section
        id="hero"
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden somnus-hero"
      >
        <div className="absolute inset-0 z-[1] w-full h-full overflow-hidden">
          <video
            key={currentVideoIndex}
            ref={heroVideoRef}
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={handleVideoEnded}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover hero-video-no-controls video-cupido-mobile"
            style={{
              objectPosition: "center 45%",
              opacity: 0.9,
              width: "100vw",
              height: "100vh",
              minWidth: "100vw",
              minHeight: "100vh",
              pointerEvents: "none",
            }}
            webkit-playsinline="true"
            x5-playsinline="true"
            disablePictureInPicture
            controlsList="nodownload"
          >
            <source src={shuffledVideos[currentVideoIndex]} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        </div>

        {/* Header transparente sobre hero - barra nav estilo Bresh/Zamna */}
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-white/90 text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            aria-label="SOMNUS"
          >
            SOMNUS
          </button>

          <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <a
              href="#eventos"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Eventos
            </a>
            <a
              href="/galeria"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              Galería
            </a>
            {userRole === "ADMIN" && (
              <button
                onClick={() => router.push("/admin")}
                className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
              >
                Admin
              </button>
            )}
            {(userRole === "ACCESOS" || userRole === "ADMIN") && (
              <button
                onClick={() => router.push("/accesos")}
                className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden md:inline"
              >
                Accesos
              </button>
            )}
            <button
              onClick={() => router.push("/mis-boletos")}
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              Mis Boletos
            </button>
            <button
              onClick={() => router.push("/login")}
              className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1"
            >
              {user?.name || user?.email || "Login"}
            </button>
          </nav>
        </header>

        {/* Contenido Hero - centro */}
        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 text-center">
          <Image
            src="/assets/SOMNUS LOGO BLANCO.png"
            alt="SOMNUS"
            width={400}
            height={120}
            className="mx-auto w-64 sm:w-80 md:w-96 h-auto object-contain mb-4"
            priority
          />
          <p className="somnus-subtitle text-xl md:text-2xl tracking-[0.4em] mb-10">
            AWAKE IN A DREAM
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#eventos"
              className="somnus-btn px-10 py-4 text-base inline-flex items-center gap-2"
            >
              Ver eventos
            </a>
          </div>

          {/* Scroll indicator */}
          <div
            className="mt-16 cursor-pointer animate-bounce"
            onClick={() =>
              document
                .getElementById("eventos")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            aria-label="Scroll down"
          >
            <ChevronDown className="w-8 h-8 text-white/60 mx-auto" />
          </div>
        </div>
      </section>

      {/* 2. NEXT EVENT STRIP - Barra conversión directa (solo si hay evento) */}
      {nextEvent && (
        <section className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-white">
              <span className="text-sm uppercase tracking-wider text-white/80">
                Próximo evento
              </span>
              <span className="font-bold text-lg">{nextEvent.artist}</span>
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                {nextEvent.venue}
              </span>
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <Calendar className="w-4 h-4" />
                {nextEvent.date}
              </span>
            </div>
            <button
              onClick={() => handleSelectConcert(nextEvent)}
              className="somnus-btn shrink-0 px-6 py-3 text-sm"
            >
              Comprar tickets
            </button>
          </div>
        </section>
      )}

      {/* 3. FEATURED EVENTS - Grid premium */}
      <section id="eventos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-4 uppercase tracking-wider">
            Eventos
          </h2>
          <p className="somnus-text-body text-center mb-14 max-w-xl mx-auto">
            Experiencias en vivo exclusivas
          </p>

          {concerts.length === 0 ? (
            <div className="text-center py-16 somnus-card max-w-md mx-auto">
              <p className="somnus-text-body text-lg">Próximamente nuevos eventos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {concerts.map((concert) => {
                const isMystery =
                  concert.artist === "Artista por Confirmar" ||
                  concert.artist.toLowerCase().includes("por confirmar");
                const status = getEventStatus(concert);

                return (
                  <article
                    key={concert.id}
                    onClick={() => !isMystery && handleSelectConcert(concert)}
                    className={`group somnus-card overflow-hidden ${
                      isMystery ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {isMystery ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <p className="text-5xl font-bold text-white/60">?</p>
                        </div>
                      ) : (
                        <>
                          <Image
                            src={concert.image}
                            alt={concert.artist}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        </>
                      )}

                      {/* Badge ciudad/venue arriba */}
                      <span className="absolute top-4 left-4 text-xs font-medium uppercase tracking-wider text-white/90">
                        {isMystery ? "—" : concert.venue}
                      </span>

                      {/* Badge estado */}
                      {status && (
                        <span
                          className={`absolute top-4 right-4 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            status === "Agotado"
                              ? "bg-white/20 text-white"
                              : "bg-[#5B8DEF]/90 text-white"
                          }`}
                        >
                          {status}
                        </span>
                      )}

                      {/* Info abajo */}
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {isMystery ? "Próximamente" : concert.artist}
                        </h3>
                        <p className="text-white/80 text-sm">
                          {isMystery ? "—" : concert.date}
                        </p>
                        {!isMystery && concert.minPrice > 0 && (
                          <p className="text-[#7BA3E8] font-semibold mt-2">
                            Desde ${concert.minPrice.toLocaleString("es-MX")} MXN
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <span
                        className={`somnus-btn inline-block w-full text-center text-sm py-3 ${
                          isMystery ? "opacity-60 cursor-default" : ""
                        }`}
                      >
                        {isMystery ? "Próximamente" : "Ver boletos"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. MANIFIESTO - ¿Por qué Somnus? (sin stats inventados) */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="somnus-title-secondary text-2xl md:text-3xl mb-6 uppercase tracking-wider">
            ¿Por qué Somnus?
          </h2>
          <p className="somnus-text-body text-lg mb-14">
            Tu plataforma de confianza para eventos en vivo exclusivos
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <span className="text-3xl font-bold text-[#5B8DEF]">✓</span>
              <h3 className="somnus-title-secondary text-lg uppercase">
                Boletos garantizados
              </h3>
              <p className="somnus-text-body text-sm">
                100% auténticos y verificados
              </p>
            </div>
            <div className="space-y-3">
              <span className="text-3xl font-bold text-[#5B8DEF]">★</span>
              <h3 className="somnus-title-secondary text-lg uppercase">
                Mejor precio
              </h3>
              <p className="somnus-text-body text-sm">
                Sin comisiones ocultas
              </p>
            </div>
            <div className="space-y-3">
              <span className="text-3xl font-bold text-[#5B8DEF]">♥</span>
              <h3 className="somnus-title-secondary text-lg uppercase">
                Soporte
              </h3>
              <p className="somnus-text-body text-sm">
                Atención cuando la necesites
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER MINIMAL */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center">
            <Image
              src="/assets/SOMNUS LOGO BLANCO.png"
              alt="SOMNUS"
              width={120}
              height={36}
              className="h-8 w-auto object-contain opacity-90"
            />
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="#eventos"
              className="somnus-text-body hover:text-white transition-colors"
            >
              Eventos
            </a>
            <a
              href="/galeria"
              className="somnus-text-body hover:text-white transition-colors"
            >
              Galería
            </a>
            <a
              href="/mis-boletos"
              className="somnus-text-body hover:text-white transition-colors"
            >
              Mis Boletos
            </a>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/10 text-center">
          <p className="somnus-text-body text-xs">
            © {new Date().getFullYear()} Somnus
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
