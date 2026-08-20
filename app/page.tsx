"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Cart } from "@/components/eventos/Cart";
import { CartItem, Concert } from "@/components/eventos/types";
import { EventCardZamna } from "@/components/eventos/EventCardZamna";
import { GalleryEventCardZamna } from "@/components/eventos/GalleryEventCardZamna";
import { UpcomingEventsCarousel } from "@/components/eventos/UpcomingEventsCarousel";
import { CarouselPosterSettingsProvider } from "@/components/eventos/carousel-poster-settings";
import { BrandPresenceCarousel } from "@/components/BrandPresenceCarousel";
import { ContactForm } from "@/components/ContactForm";
import { GALLERY_EVENTS } from "@/lib/gallery-events";
import { RevealSection } from "@/components/RevealSection";
import {
  formatEventCalendarDate,
  eventCalendarKey,
  localTodayCalendarKey,
  isEventPastByCalendar,
} from "@/lib/utils";
import {
  SiteHeader,
  type SessionUser,
} from "@/components/layout/SiteHeader";
import { effectiveTicketPriceAt } from "@/lib/ticket-pricing";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { useClientTour } from "@/components/onboarding/useClientTour";
import { CLIENT_TOUR } from "@/components/onboarding/tours";

const HERO_VIDEO = "/assets/Adobe Express 2026-02-17 16.05.01.mp4";

function convertEventToConcert(event: any): Concert {
  const formattedDate = formatEventCalendarDate(event.eventDate);

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
      imagePosX: event.imagePosX ?? 50,
      imagePosY: event.imagePosY ?? 50,
      imageZoom: event.imageZoom ?? 1,
      minPrice: 0,
      sections: [],
    };
  }

  const at = new Date();
  const eff = (tt: any) =>
    effectiveTicketPriceAt(Number(tt.price), tt.pricePhases, at);

  const minPrice =
    event.ticketTypes.length > 0
      ? Math.min(...event.ticketTypes.map((tt: any) => eff(tt)))
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
      price: eff(tt),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

  if (preferenteTypes.length > 0) {
    const totalPreferenteQuantity = preferenteTypes.reduce(
      (sum: number, tt: any) =>
        sum + Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
      0
    );
    const preferentePrice = preferenteTypes[0] ? eff(preferenteTypes[0]) : 0;
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
      price: eff(tt),
      available: Math.max(0, tt.maxQuantity - (tt.soldQuantity || 0)),
    });
  });

  otherTypes.forEach((tt: any) => {
    sections.push({
      id: tt.id,
      name: tt.name,
      description: tt.description || "",
      price: eff(tt),
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
    imagePosX: event.imagePosX ?? 50,
    imagePosY: event.imagePosY ?? 50,
    imageZoom: event.imageZoom ?? 1,
    minPrice,
    sections,
    eventDate: event.eventDate,
  };
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const clientTour = useClientTour(sessionUser, sessionReady);
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
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        // Traer todos: activo (para hero) + pasados (para sección eventos)
        const response = await fetch("/api/events");
        const data = await response.json();

        if (data.success && data.data) {
          const withTickets = data.data.filter(
            (e: any) => e.ticketTypes && e.ticketTypes.length > 0
          );
          const todayKey = localTodayCalendarKey();

          // "Upcoming" = eventos marcados activos en admin (no solo por fecha futura)
          const adminActiveEvents = withTickets.filter((e: any) => e.isActive);
          const activeConverted = adminActiveEvents
            .sort((a: any, b: any) => {
              if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
              return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
            })
            .map(convertEventToConcert);

          // Pasados = inactivos cuya fecha ya pasó
          const pastEvents = withTickets.filter(
            (e: any) =>
              !e.isActive && eventCalendarKey(e.eventDate) < todayKey
          );
          const pastConverted = pastEvents
            .sort(
              (a: any, b: any) =>
                new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
            )
            .map(convertEventToConcert);

          setConcerts(activeConverted.concat(pastConverted));
          setActiveConcerts(activeConverted);
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
        router.push(`/eventos/${concert.id}`);
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
          <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" aria-hidden />
          <p className="text-white/70 text-xl">Loading events…</p>
        </div>
      </div>
    );
  }

  const nextEvent = activeConcerts.length > 0 ? activeConcerts[0] : null;

  return (
    <div className="min-h-screen somnus-bg-main">
      {/* Loader entrada - una vez por sesión */}
      {showLoader && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" role="status" aria-live="polite">
          <p className="text-white text-lg uppercase tracking-[0.5em]">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />
        </div>

        <SiteHeader
          eventsHref="#eventos"
          onUserChange={(user) => {
            setSessionUser(user);
            setSessionReady(true);
          }}
        />

        {/* Contenido Hero - brand primero + un CTA */}
        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 text-center pb-28 sm:pb-32">
          <Image
            src="/assets/SOMNUS LOGO BLANCO.png"
            alt="SOMNUS"
            width={400}
            height={120}
            className="mx-auto w-64 sm:w-80 md:w-96 h-auto object-contain mb-5"
            priority
          />
          <p className="somnus-subtitle text-lg md:text-xl tracking-[0.4em] mb-10">
            AWAKE IN A DREAM
          </p>

          <div className="flex flex-col items-center gap-5">
            <a
              href="#eventos"
              data-tour="client-view-events"
              className="somnus-btn px-10 py-4 text-base inline-flex items-center gap-2"
            >
              View events
            </a>
            {sessionReady && sessionUser ? (
              <button
                type="button"
                onClick={() => router.push("/mis-boletos")}
                className="somnus-nav-link text-sm uppercase tracking-wider text-white/70 hover:text-white underline-offset-4 hover:underline"
              >
                My tickets
              </button>
            ) : sessionReady ? (
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="somnus-nav-link text-sm uppercase tracking-wider text-white/70 hover:text-white underline-offset-4 hover:underline"
              >
                Create free account
              </button>
            ) : null}
          </div>
        </div>

        {/* Next event bar — sole bottom edge element */}
        {nextEvent && (
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 text-white text-center sm:text-left min-w-0">
                <span className="somnus-eyebrow shrink-0">Next event</span>
                <span className="font-bold text-lg md:text-xl truncate">
                  {nextEvent.artist}
                </span>
                <span className="flex items-center justify-center sm:justify-start gap-4 text-white/65 text-sm">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {nextEvent.venue}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5" aria-hidden />
                    {nextEvent.date}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectConcert(nextEvent)}
                className="somnus-btn shrink-0 px-6 py-3 text-sm"
              >
                Buy tickets
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. UPCOMING EVENTS */}
      <RevealSection>
        <section
          id="eventos"
          data-tour="client-events"
          className="py-28 sm:py-36 lg:py-44 px-4 sm:px-6 lg:px-8 somnus-events-bg somnus-events-bg--flyer relative overflow-x-hidden scroll-mt-8"
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="somnus-display text-center mb-4">
              Upcoming Events
            </h2>
            <p className="somnus-lede text-center mx-auto mb-16">
              Get in the dream with us.
            </p>

            <CarouselPosterSettingsProvider>
              {activeConcerts.length > 0 ? (
                <UpcomingEventsCarousel
                  standaloneSettingsProvider={false}
                  showPosterTuner={
                    sessionReady && sessionUser?.role === "ADMIN"
                  }
                >
                  {activeConcerts.map((concert, index) => (
                    <EventCardZamna
                      key={concert.id}
                      concert={concert}
                      isPast={
                        concert.eventDate
                          ? isEventPastByCalendar(concert.eventDate)
                          : false
                      }
                      isFeatured={index === 0}
                      carouselGlass
                      onSelect={() => handleSelectConcert(concert)}
                    />
                  ))}
                </UpcomingEventsCarousel>
              ) : concerts.length === 0 && GALLERY_EVENTS.length > 0 ? (
                <UpcomingEventsCarousel
                  standaloneSettingsProvider={false}
                  showPosterTuner={
                    sessionReady && sessionUser?.role === "ADMIN"
                  }
                >
                  {GALLERY_EVENTS.map((item) => (
                    <GalleryEventCardZamna
                      key={item.id}
                      event={item}
                      carouselGlass
                      onSelect={() => router.push(item.galleryUrl)}
                    />
                  ))}
                </UpcomingEventsCarousel>
              ) : (
                <p className="text-center text-white/60 py-12">
                  No upcoming events at the moment
                </p>
              )}

              {pastConcerts.length > 0 && (
                <div className="mt-24">
                  <h2 className="somnus-display text-center mb-4">
                    Past events
                  </h2>
                  <p className="somnus-lede text-center mx-auto mb-16">
                    Events that have already taken place
                  </p>
                  <UpcomingEventsCarousel
                    standaloneSettingsProvider={false}
                    showPosterTuner={
                      sessionReady && sessionUser?.role === "ADMIN"
                    }
                  >
                    {pastConcerts.map((concert, index) => (
                      <EventCardZamna
                        key={concert.id}
                        concert={concert}
                        isPast
                        isFeatured={index === 0}
                        carouselGlass
                        onSelect={() =>
                          toast.info("This event has already passed")
                        }
                      />
                    ))}
                  </UpcomingEventsCarousel>
                </div>
              )}
            </CarouselPosterSettingsProvider>
          </div>
        </section>
      </RevealSection>

      {/* 3. BRAND PRESENCE */}
      <BrandPresenceCarousel />

      {/* 4. CONTACT / JOIN */}
      <RevealSection>
        <section className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="somnus-eyebrow mb-4">
                Exclusive events &amp; promotions
              </p>
              <h2 className="somnus-display mb-6">
                Be part of Somnus
              </h2>
              <p className="somnus-lede mx-auto lg:mx-0 mb-8">
                {sessionReady && sessionUser
                  ? "You are already part of Somnus. Explore events or check your tickets."
                  : "Join our community and get updates on the best live events."}
              </p>
              {sessionReady && sessionUser ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a href="#eventos" className="somnus-btn px-8 py-3.5 text-center">
                    View events
                  </a>
                  <button
                    type="button"
                    onClick={() => router.push("/mis-boletos")}
                    className="somnus-nav-link px-8 py-3.5 rounded-none border border-white/30 text-white/90 hover:bg-white/10 uppercase tracking-wider text-sm font-medium"
                  >
                    My tickets
                  </button>
                </div>
              ) : sessionReady ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="somnus-btn px-8 py-3.5"
                  >
                    Create my account
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="somnus-nav-link px-8 py-3.5 rounded-none border border-white/30 text-white/90 hover:bg-white/10 uppercase tracking-wider text-sm font-medium"
                  >
                    I already have an account
                  </button>
                </div>
              ) : null}
            </div>

            <div className="liquid-glass p-8 sm:p-10 rounded-2xl">
              <ContactForm />
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 5. FOOTER */}
      <footer className="border-t border-white/10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <Link
            href="/"
            className="somnus-nav-link text-white text-xl font-bold uppercase tracking-[0.3em] hover:text-white/80"
            translate="no"
          >
            SOMNUS
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm" aria-label="Footer">
            <a
              href="#eventos"
              className="somnus-nav-link text-white/60 hover:text-white uppercase tracking-wider"
            >
              Events
            </a>
            <Link
              href="/galeria"
              className="somnus-nav-link text-white/60 hover:text-white uppercase tracking-wider"
            >
              Gallery
            </Link>
            <Link
              href="/mis-boletos"
              className="somnus-nav-link text-white/60 hover:text-white uppercase tracking-wider"
            >
              My Tickets
            </Link>
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

      <ProductTour
        steps={CLIENT_TOUR}
        open={clientTour.open && !isLoading && !showLoader}
        onClose={() => void clientTour.close()}
      />
    </div>
  );
}
