"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Cart } from "@/components/eventos/Cart";
import { CartItem, Concert } from "@/components/eventos/types";
import { EventCardZamna } from "@/components/eventos/EventCardZamna";
import { GalleryEventCardZamna } from "@/components/eventos/GalleryEventCardZamna";
import { UpcomingEventsCarousel } from "@/components/eventos/UpcomingEventsCarousel";
import { BrandPresenceCarousel } from "@/components/BrandPresenceCarousel";
import { GALLERY_EVENTS } from "@/lib/gallery-events";
import { RevealSection } from "@/components/RevealSection";

const HERO_VIDEO = "/assets/Adobe Express 2026-02-17 16.05.01.mp4";

function convertEventToConcert(event: any): Concert & { eventDate?: string } {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
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
    eventDate: event.eventDate,
  };
}

function getEventStatus(concert: Concert & { eventDate?: string }): string | null {
  if (concert.eventDate && new Date(concert.eventDate) < new Date()) {
    return "Past event";
  }
  const totalAvailable = concert.sections?.reduce(
    (sum, s) => sum + (s.available || 0),
    0
  );
  if (!totalAvailable) return "Sold out";
  if (totalAvailable <= 20) return "Last tickets";
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [activeConcerts, setActiveConcerts] = useState<Concert[]>([]);
  const [pastConcerts, setPastConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("somnus-loaded");
    if (!seen) {
      setShowLoader(true);
      sessionStorage.setItem("somnus-loaded", "1");
      const t = setTimeout(() => setShowLoader(false), 1200);
      return () => clearTimeout(t);
    }
  }, []);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

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
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setUserRole(data.user?.role || null);
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
        // Traer todos: activo (para hero) + pasados (para sección eventos)
        const response = await fetch("/api/events");
        const data = await response.json();

        if (data.success && data.data) {
          const now = new Date();
          const withTickets = data.data.filter(
            (e: any) => e.ticketTypes && e.ticketTypes.length > 0
          );
          // Futuros = fecha futura o hoy (mostrar todos, activos o no)
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const futureEvents = withTickets.filter(
            (e: any) => new Date(e.eventDate) >= today
          );
          // Pasados = ya pasó la fecha
          const pastEvents = withTickets.filter(
            (e: any) => new Date(e.eventDate) < today
          );
          // Ordenar: primero los activos (para hero), luego por fecha. Pasados por fecha desc.
          const futureConverted = futureEvents
            .sort((a: any, b: any) => {
              if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
              return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
            })
            .map(convertEventToConcert);
          const pastConverted = pastEvents
            .sort((a: any, b: any) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
            .map(convertEventToConcert);
          setConcerts(futureConverted.concat(pastConverted));
          setActiveConcerts(futureConverted);
          setPastConcerts(pastConverted);
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
          router.push(`/eventos/${concert.id}/boletos`);
        }
      } else {
        toast.error("Error loading event information");
      }
    } catch (error) {
      console.error("Error verifying event:", error);
      toast.error("Error verifying the event");
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
      "Payment functionality coming soon. Total: $" +
        total.toLocaleString() +
        " MXN"
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-xl">Loading events...</p>
        </div>
      </div>
    );
  }

  const nextEvent = activeConcerts.length > 0 ? activeConcerts[0] : null;
  const displayEvents = concerts.length > 0 ? concerts : GALLERY_EVENTS;
  const isGalleryMode = concerts.length === 0;

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      {/* Loader entrada - una vez por sesión */}
      {showLoader && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <p className="text-white text-lg uppercase tracking-[0.5em] animate-pulse">
            SOMNUS
          </p>
        </div>
      )}
      {/* 1. HERO INMERSIVO - Full-height, impacto inmediato */}
      <section
        id="hero"
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden somnus-hero"
      >
        <div className="absolute inset-0 z-[1] w-full h-full overflow-hidden">
          <video
            ref={heroVideoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
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
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
        </div>

        {/* Próximo evento - visible al cargar, sobre el video */}
        {nextEvent && (
          <div className="absolute bottom-0 left-0 right-0 z-20 liquid-glass bg-black/50 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-white">
                <span className="text-sm uppercase tracking-wider text-white/80">
                  Next event
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
                Buy tickets
              </button>
            </div>
          </div>
        )}

        {/* Navbar igual que admin */}
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            aria-label="SOMNUS"
          >
            SOMNUS
          </button>

          <nav className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <a
              href="#eventos"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
            >
              Events
            </a>
            <Link
              href="/galeria"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              Gallery
            </Link>
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
              >
                Panel
              </Link>
            )}
            {(userRole === "ACCESOS" || userRole === "ADMIN") && (
              <Link
                href="/accesos"
                className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors"
              >
                Access
              </Link>
            )}
            <Link
              href="/mis-boletos"
              className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-white transition-colors hidden sm:inline"
            >
              My Tickets
            </Link>
            {user ? (
              <button
                onClick={() => router.push("/mis-boletos")}
                className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider"
              >
                {user?.name || user?.email}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="text-white/90 text-xs sm:text-sm font-medium px-2 py-1 uppercase tracking-wider"
              >
                Login
              </button>
            )}
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
              View events
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

      {/* 2. UPCOMING EVENTS - Carrusel centrado estilo Bresh, cards Zamna */}
      <RevealSection>
        <section
          id="eventos"
          className="py-28 sm:py-36 lg:py-44 px-4 sm:px-6 lg:px-8 somnus-events-bg relative"
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="somnus-title-secondary text-center text-4xl md:text-5xl lg:text-6xl mb-4 uppercase tracking-wider font-bold">
              Upcoming Events
            </h2>
            <p className="somnus-text-body text-center mb-16 max-w-2xl mx-auto text-lg">
              Get in the dream with us.
            </p>

            {activeConcerts.length > 0 ? (
              <UpcomingEventsCarousel>
                {activeConcerts.map((concert, index) => (
                  <EventCardZamna
                    key={concert.id}
                    concert={concert}
                    isPast={false}
                    isFeatured={index === 0}
                    onSelect={() => handleSelectConcert(concert)}
                  />
                ))}
              </UpcomingEventsCarousel>
            ) : !isGalleryMode ? (
              <p className="text-center text-white/50 py-12">
                No upcoming events at the moment
              </p>
            ) : (
              <UpcomingEventsCarousel>
                {GALLERY_EVENTS.map((item) => (
                  <GalleryEventCardZamna
                    key={item.id}
                    event={item}
                    onSelect={() => router.push(item.galleryUrl)}
                  />
                ))}
              </UpcomingEventsCarousel>
            )}

            {/* EVENTOS PASADOS */}
            {pastConcerts.length > 0 && (
              <div className="mt-24 pt-24 border-t border-white/10">
                <h2 className="somnus-title-secondary text-center text-3xl md:text-4xl mb-4 uppercase tracking-wider">
                  Past events
                </h2>
                <p className="somnus-text-body text-center mb-12 max-w-xl mx-auto text-white/60">
                  Events that have already taken place
                </p>
                <UpcomingEventsCarousel>
                  {pastConcerts.map((concert) => (
                    <EventCardZamna
                      key={concert.id}
                      concert={concert}
                      isPast
                      onSelect={() => toast.info("This event has already passed")}
                    />
                  ))}
                </UpcomingEventsCarousel>
              </div>
            )}
          </div>
        </section>
      </RevealSection>

      {/* 3. BRAND PRESENCE - Carrusel infinito de marcas */}
      <BrandPresenceCarousel />

      {/* 4. MANIFIESTO - ¿Por qué Somnus? */}
      <RevealSection>
        <section className="py-28 sm:py-36 lg:py-44 px-4 sm:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="somnus-title-secondary text-3xl md:text-4xl mb-8 uppercase tracking-wider">
              ¿Por qué Somnus?
            </h2>
            <p className="somnus-text-body text-lg md:text-xl mb-20 text-white/70">
              Tu plataforma de confianza para eventos en vivo exclusivos
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-20">
              <div className="liquid-glass p-6 md:p-8 rounded-2xl space-y-4">
                <span className="text-4xl font-bold text-white">✓</span>
                <h3 className="somnus-title-secondary text-lg uppercase">
                  Boletos garantizados
                </h3>
                <p className="somnus-text-body text-sm text-white/60">
                  100% auténticos y verificados
                </p>
              </div>
              <div className="liquid-glass p-6 md:p-8 rounded-2xl space-y-4">
                <span className="text-4xl font-bold text-white">★</span>
                <h3 className="somnus-title-secondary text-lg uppercase">
                  Mejor precio
                </h3>
                <p className="somnus-text-body text-sm text-white/60">
                  Sin comisiones ocultas
                </p>
              </div>
              <div className="liquid-glass p-6 md:p-8 rounded-2xl space-y-4">
                <span className="text-4xl font-bold text-white">♥</span>
                <h3 className="somnus-title-secondary text-lg uppercase">
                  Soporte
                </h3>
                <p className="somnus-text-body text-sm text-white/60">
                  Atención cuando la necesites
                </p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 5. FOOTER */}
      <footer className="border-t border-white/10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <Link
            href="/"
            className="text-white text-xl font-bold uppercase tracking-[0.3em] hover:text-white/80 transition-colors"
          >
            SOMNUS
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm">
            <a
              href="#eventos"
              className="text-white/60 hover:text-white transition-colors uppercase tracking-wider"
            >
              Eventos
            </a>
            <a
              href="/galeria"
              className="text-white/60 hover:text-white transition-colors uppercase tracking-wider"
            >
              Galería
            </a>
            <a
              href="/mis-boletos"
              className="text-white/60 hover:text-white transition-colors uppercase tracking-wider"
            >
              Mis Boletos
            </a>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-xs uppercase tracking-wider">
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
