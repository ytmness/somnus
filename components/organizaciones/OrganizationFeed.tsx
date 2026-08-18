"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { OrganizationPostCard, type OrgPost } from "./OrganizationPostCard";
import { formatEventCalendarDate } from "@/lib/utils";

interface EventItem {
  id: string;
  name: string;
  artist: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  imageUrl: string | null;
}

interface OrganizationFeedProps {
  organizationId: string;
  activeTab: "posts" | "events";
}

export function OrganizationFeed({ organizationId, activeTab }: OrganizationFeedProps) {
  const [posts, setPosts] = useState<OrgPost[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === "posts") {
          const res = await fetch(`/api/organizations/${organizationId}/posts`);
          const json = await res.json();
          if (res.ok) setPosts(json.data || []);
        } else {
          const res = await fetch(
            `/api/events?organizationId=${organizationId}&isActive=true`
          );
          const json = await res.json();
          if (res.ok) setEvents(json.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organizationId, activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (activeTab === "posts") {
    if (posts.length === 0) {
      return (
        <p className="text-center text-white/50 py-12">
          Aún no hay publicaciones.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <OrganizationPostCard key={post.id} post={post} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-center text-white/50 py-12">
        No hay eventos activos.
      </p>
    );
  }

  return (
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
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">{event.name}</h3>
            <p className="text-white/60 text-sm">{event.artist}</p>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              {formatEventCalendarDate(event.eventDate)} · {event.eventTime}
            </div>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
