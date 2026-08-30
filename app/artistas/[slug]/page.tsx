import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Instagram, MapPin, Music } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { formatEventCalendarDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

export default async function ArtistProfilePage({ params }: PageProps) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      events: {
        where: {
          event: { isActive: true, status: "PUBLISHED" },
        },
        orderBy: [{ sortOrder: "asc" }, { event: { eventDate: "asc" } }],
        include: {
          event: {
            select: {
              id: true,
              name: true,
              artist: true,
              venue: true,
              city: true,
              eventDate: true,
              eventTime: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!artist) notFound();

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16 space-y-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-white/10 relative flex-shrink-0">
            {artist.imageUrl ? (
              <Image
                src={artist.imageUrl}
                alt={artist.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/40">
                {artist.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
            {artist.bio && (
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                {artist.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {artist.instagramUrl && (
                <a
                  href={artist.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              )}
              {artist.spotifyUrl && (
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
                >
                  <Music className="w-4 h-4" />
                  Spotify
                </a>
              )}
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider mb-4">
            Lineup / Events
          </h2>
          {artist.events.length === 0 ? (
            <p className="text-white/50 py-8 text-center">
              No upcoming events listed.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {artist.events.map(({ event, role }) => (
                <Link
                  key={event.id}
                  href={`/eventos/${event.id}`}
                  className="somnus-card overflow-hidden hover:border-white/30 transition-colors group"
                >
                  <div className="aspect-video relative bg-white/5">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/30">
                        <Calendar className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    <h3 className="font-semibold">{event.name}</h3>
                    {role && (
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {role}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatEventCalendarDate(event.eventDate)} ·{" "}
                      {event.eventTime}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.city || event.venue}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
