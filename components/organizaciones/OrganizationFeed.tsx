"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, LayoutList, MapPin } from "lucide-react";
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
  const [eventsView, setEventsView] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const d = new Date(ev.eventDate);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

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

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/15 p-0.5">
          <button
            type="button"
            onClick={() => setEventsView("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              eventsView === "list"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setEventsView("calendar")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              eventsView === "calendar"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {eventsView === "list" ? (
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
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
              className="text-white/60 hover:text-white text-sm px-2 py-1"
            >
              ←
            </button>
            <h3 className="font-medium text-sm">{monthLabel}</h3>
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
              className="text-white/60 hover:text-white text-sm px-2 py-1"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-white/40 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${year}-${month}-${day}`;
              const dayEvents = eventsByDay.get(key) || [];
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-xs ${
                    dayEvents.length
                      ? "border-white/30 bg-white/10"
                      : "border-transparent text-white/40"
                  }`}
                >
                  <span>{day}</span>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/eventos/${ev.id}`}
                      className="mt-0.5 w-full truncate text-[9px] text-sky-300 hover:underline"
                      title={ev.name}
                    >
                      {ev.name}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
