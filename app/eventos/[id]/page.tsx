"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Music,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { EventMap } from "@/components/eventos/EventMap";
import {
  imageFramingStyle,
  normalizeImageFraming,
} from "@/lib/utils/image-framing";
import { eventTicketPurchaseState } from "@/lib/ticket-sales-window";

/** Light client-side sanitize: strip scripts/on* and keep common markup. */
function sanitizeEventHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const embed = u.pathname.match(/\/embed\/([^/]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setSessionUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          });
        }
      })
      .catch(() => {});
  }, []);

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

  const endDateLabel = event.endDate
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(event.endDate))
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
    (tt: any) => !tt.isTable && tt.kind !== "TABLE" && !tt.isHidden
  );
  const purchaseState = eventTicketPurchaseState(
    {
      salesStartDate: event.salesStartDate,
      salesEndDate: event.salesEndDate,
      ticketTypes,
    },
    new Date()
  );

  const lineup = (event.artists || [])
    .map((row: any) => row.artist || row)
    .filter((a: any) => a?.name);

  const ytEmbed = event.videoUrl ? youtubeEmbedUrl(event.videoUrl) : null;
  const looksLikeHtml =
    typeof event.description === "string" && /<\/?[a-z][\s\S]*>/i.test(event.description);

  const whenLabel = (() => {
    let s = `${eventDate} · ${event.eventTime}`;
    if (endDateLabel || event.endTime) {
      s += ` → ${endDateLabel || eventDate}${event.endTime ? ` · ${event.endTime}` : ""}`;
    }
    return s;
  })();

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
                <p className="text-white/60 text-sm mb-2">{event.tour}</p>
              )}
              {event.city && (
                <p className="inline-flex items-center gap-1.5 text-white/55 text-sm mb-4">
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                  {event.city}
                </p>
              )}
              {!event.tour && !event.city && <div className="mb-6" />}

              <div className="flex items-center gap-3 text-white/90 mb-8">
                <Calendar
                  className="w-5 h-5 text-white/70 shrink-0"
                  aria-hidden
                />
                <span>{whenLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = `/eventos/${eventId}/boletos`;
                  if (!sessionUser) {
                    router.push(
                      `/register?redirect=${encodeURIComponent(next)}`
                    );
                    return;
                  }
                  router.push(next);
                }}
                disabled={purchaseState.ctaDisabled}
                className="w-full py-4 rounded-xl bg-white text-black font-semibold uppercase tracking-wider text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-8"
              >
                {purchaseState.ctaDisabled ? (
                  purchaseState.ctaLabel
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="w-4 h-4" aria-hidden />
                    Buy tickets
                  </span>
                )}
              </button>

              {event.externalUrl && (
                <a
                  href={event.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-6"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden />
                  More info
                </a>
              )}

              {event.description && (
                <div className="mb-8">
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    About
                  </h2>
                  {looksLikeHtml ? (
                    <div
                      className="text-white/80 text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_a]:text-[#5B8DEF] [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeEventHtml(event.description),
                      }}
                    />
                  ) : (
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                      {event.description}
                    </div>
                  )}
                </div>
              )}

              {lineup.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    Lineup
                  </h2>
                  <ul className="space-y-3">
                    {lineup.map((a: any, i: number) => (
                      <li key={a.id || i} className="flex items-center gap-3">
                        {a.imageUrl ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={a.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {a.name}
                          </p>
                          <div className="flex gap-3 text-xs text-white/45">
                            {a.instagramUrl && (
                              <a
                                href={a.instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white"
                              >
                                Instagram
                              </a>
                            )}
                            {a.spotifyUrl && (
                              <a
                                href={a.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white"
                              >
                                Spotify
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(event.songTitle || event.songArtist) && (
                <div className="mb-8">
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    Soundtrack
                  </h2>
                  <div className="flex items-start gap-3 text-white/80 text-sm">
                    <Music className="w-4 h-4 mt-0.5 text-white/50 shrink-0" aria-hidden />
                    <div>
                      <p>
                        {event.songTitle}
                        {event.songArtist ? ` — ${event.songArtist}` : ""}
                      </p>
                      {event.songPreviewUrl && (
                        <a
                          href={event.songPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5B8DEF] text-xs mt-1 inline-block"
                        >
                          Preview
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {ytEmbed && (
                <div className="mb-8">
                  <h2 className="text-white font-semibold uppercase tracking-wider text-sm mb-3">
                    Video
                  </h2>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40">
                    <iframe
                      src={ytEmbed}
                      title="Event video"
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
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
