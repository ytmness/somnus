"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Search, BadgeCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { formatEventCalendarDate } from "@/lib/utils";

type Tab = "events" | "artists" | "organizations";

interface ExploreEvent {
  id: string;
  name: string;
  artist: string;
  venue: string;
  city: string | null;
  eventDate: string;
  eventTime: string;
  imageUrl: string | null;
}

interface ExploreArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  bio: string | null;
  _count: { events: number };
}

interface ExploreOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  isVerified: boolean;
  description: string | null;
  _count: { followers: number; events: number };
}

export default function ExplorarPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<Tab>("events");
  const [cities, setCities] = useState<string[]>([]);
  const [events, setEvents] = useState<ExploreEvent[]>([]);
  const [artists, setArtists] = useState<ExploreArtist[]>([]);
  const [organizations, setOrganizations] = useState<ExploreOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (city) params.set("city", city);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("type", "all");

      const res = await fetch(`/api/explore?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setEvents(json.data.events || []);
        setArtists(json.data.artists || []);
        setOrganizations(json.data.organizations || []);
        if (Array.isArray(json.data.cities)) setCities(json.data.cities);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, city, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Explorar</h1>
        <p className="text-white/60 text-sm mb-6">
          Search events, artists, and communities
        </p>

        <div className="space-y-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, artists, and communities"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-white/40"
            >
              <option value="" className="bg-[#111]">
                All cities
              </option>
              {cities.map((c) => (
                <option key={c} value={c} className="bg-[#111]">
                  {c}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-white/40"
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-white/40"
              aria-label="To date"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b border-white/10 mb-6">
          {(
            [
              ["events", "Events", events.length],
              ["artists", "Artists", artists.length],
              ["organizations", "Organizations", organizations.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {label}
              <span className="ml-1.5 text-white/40">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : tab === "events" ? (
          events.length === 0 ? (
            <p className="text-center text-white/50 py-12">No events found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
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
                        <Calendar className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    <h3 className="font-semibold">{event.name}</h3>
                    <p className="text-white/60 text-sm">{event.artist}</p>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatEventCalendarDate(event.eventDate)} · {event.eventTime}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.city || event.venue}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : tab === "artists" ? (
          artists.length === 0 ? (
            <p className="text-center text-white/50 py-12">No artists found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artistas/${artist.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 relative flex-shrink-0">
                    {artist.imageUrl ? (
                      <Image
                        src={artist.imageUrl}
                        alt={artist.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/50">
                        {artist.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{artist.name}</h3>
                    <p className="text-white/50 text-sm">
                      {artist._count.events} event
                      {artist._count.events === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : organizations.length === 0 ? (
          <p className="text-center text-white/50 py-12">No organizations found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizaciones/${org.slug}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 relative flex-shrink-0">
                  {org.logoUrl ? (
                    <Image
                      src={org.logoUrl}
                      alt={org.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/50">
                      {org.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate inline-flex items-center gap-1.5">
                    {org.name}
                    {org.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    )}
                  </h3>
                  <p className="text-white/50 text-sm truncate">
                    {[org.city, `${org._count.followers} followers`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
