"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Building2, Calendar, Ticket } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EventMap } from "@/components/eventos/EventMap";
import {
  imageFramingStyle,
  normalizeImageFraming,
} from "@/lib/utils/image-framing";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEvent(data.data);
      } else {
        setEvent(null);
        setLoadError(true);
        toast.error("Event not found");
      }
    } catch (error) {
      console.error("Error loading event:", error);
      setEvent(null);
      setLoadError(true);
      toast.error("Error loading event");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) void loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="min-h-screen somnus-events-bg overflow-x-hidden">
        <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-12 py-4 sm:py-5">
          <span
            className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wider"
            translate="no"
          >
            SOMNUS
          </span>
        </header>
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            </div>
            <div className="lg:col-span-7 space-y-4">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
              <div className="h-24 w-full bg-white/5 rounded-2xl animate-pulse mt-8" />
              <div className="h-24 w-full bg-white/5 rounded-2xl animate-pulse" />
              <p className="sr-only" role="status">
                Loading event…
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="somnus-display text-3xl mb-4">Event unavailable</h1>
          <p className="somnus-lede mx-auto mb-8 text-center">
            We could not load this event. Check your connection and try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => void loadEvent()}
              className="somnus-btn"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="somnus-nav-link px-8 py-3.5 border border-white/30 text-white/90 uppercase tracking-wider text-sm"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventDate = event.eventDate
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(event.eventDate))
    : "";

  const eventImage =
    event.imageUrl && !event.imageUrl.includes("unsplash")
      ? event.imageUrl
      : "/assets/hero-cuernavaca.jpg";

  const posterFraming = imageFramingStyle(
    normalizeImageFraming({
      posX: event.imagePosX,
      posY: event.imagePosY,
      zoom: event.imageZoom,
    })
  );

  const byName =
    event.organization?.name || event.organizer?.businessName || null;

  const ticketTypes = (event.ticketTypes || []).filter(
    (tt: any) => !tt.isTable,
  );
  const allSoldOut =
    ticketTypes.length > 0 &&
    ticketTypes.every(
      (tt: any) => tt.maxQuantity - (tt.soldQuantity || 0) <= 0,
    );

  return (
    <div className="min-h-screen somnus-events-bg overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <main className="pt-20 sm:pt-24 lg:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="somnus-nav-link inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Back to Events
          </button>

          {/* Layout tipo Bubbl: poster izquierda + detalle y CTA derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1a1a1a]">
                <Image
                  src={eventImage}
                  alt={event.artist}
                  fill
                  className="object-cover"
                  style={posterFraming}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col">
              {byName && (
                <span className="inline-flex items-center gap-1.5 self-start text-xs text-white/70 border border-white/15 rounded-full px-3 py-1 mb-4">
                  <Building2 className="w-3.5 h-3.5" aria-hidden />
                  by {byName}
                </span>
              )}

              <h1 className="somnus-title-secondary text-3xl md:text-4xl lg:text-5xl mb-1 uppercase tracking-wider font-bold">
                {event.artist}
              </h1>
              {event.tour && (
                <p className="text-white/60 text-sm mb-6">{event.tour}</p>
              )}
              {!event.tour && <div className="mb-6" />}

              <div className="flex items-center gap-3 text-white/90 mb-8">
                <Calendar
                  className="w-5 h-5 text-white/70 shrink-0"
                  aria-hidden
                />
                <span>
                  {eventDate} · {event.eventTime}
                </span>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/eventos/${eventId}/boletos`)}
                disabled={allSoldOut}
                className="w-full py-4 rounded-xl bg-white text-black font-semibold uppercase tracking-wider text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
              >
                {allSoldOut ? (
                  "Sold out"
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="w-4 h-4" aria-hidden />
                    Buy tickets
                  </span>
                )}
              </button>

              {event.description && (
                <div className="mb-8">
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    About
                  </h2>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {(event.venue || event.address) && (
                <div>
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    Location
                  </h2>
                  <EventMap venue={event.venue} address={event.address} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
