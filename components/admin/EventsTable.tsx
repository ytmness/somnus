"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { formatEventCalendarDate } from "@/lib/utils";
import { EventFormWizard } from "@/components/event-form/EventFormWizard";

interface Event {
  id: string;
  name: string;
  artist: string;
  venue: string;
  eventDate: string;
  isActive: boolean;
  isFeatured: boolean;
  organizer?: { id: string; businessName: string } | null;
  organization?: { id: string; name: string } | null;
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    maxQuantity: number;
    soldQuantity: number;
    isTable?: boolean;
  }[];
}

interface EventsTableProps {
  initialOrganizerFilter?: string;
}

export function EventsTable({
  initialOrganizerFilter = "all",
}: EventsTableProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [organizerFilter, setOrganizerFilter] = useState<string>(
    initialOrganizerFilter
  );

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    setOrganizerFilter(initialOrganizerFilter);
  }, [initialOrganizerFilter]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events", { credentials: "include" });
      const data = await response.json();
      if (data.success) setEvents(data.data);
    } catch {
      toast.error("Error loading events");
    } finally {
      setIsLoading(false);
    }
  };

  const organizerOptions = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => {
      if (e.organizer) map.set(e.organizer.id, e.organizer.businessName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (organizerFilter === "all") return events;
    if (organizerFilter === "platform") {
      return events.filter((e) => !e.organizer);
    }
    return events.filter((e) => e.organizer?.id === organizerFilter);
  }, [events, organizerFilter]);

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`Delete event "${eventName}"?`)) return;
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success("Event deleted");
      loadEvents();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete event"
      );
    }
  };

  const patchEvent = async (eventId: string, body: Record<string, boolean>) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Update failed");
  };

  const toggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      await patchEvent(eventId, { isActive: !currentStatus });
      toast.success(currentStatus ? "Event unpublished" : "Event published");
      loadEvents();
    } catch {
      toast.error("Could not update event");
    }
  };

  const toggleFeatured = async (eventId: string, current: boolean) => {
    try {
      await patchEvent(eventId, { isFeatured: !current });
      toast.success(current ? "Removed from hero" : "Featured on hero");
      loadEvents();
    } catch {
      toast.error("Could not update featured");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Loading events…</p>
      </div>
    );
  }

  const EventActions = ({ event }: { event: Event }) => (
    <div className="flex items-center gap-1.5">
      <Link href={`/eventos/${event.id}/boletos`}>
        <Button
          size="sm"
          variant="ghost"
          className="text-white/70 hover:text-white"
          aria-label="View tickets page"
        >
          <Eye className="w-4 h-4" aria-hidden />
        </Button>
      </Link>
      <Button
        size="sm"
        variant="ghost"
        className="text-[#7BA3E8] hover:text-white"
        onClick={() => setEditingEventId(event.id)}
        aria-label="Edit event"
      >
        <Pencil className="w-4 h-4" aria-hidden />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-400 hover:text-red-300"
        onClick={() => handleDelete(event.id, event.name)}
        aria-label="Delete event"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4" data-tour="admin-events-table">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="organizer-filter"
          className="text-white/70 text-sm"
        >
          Filter by organizer:
        </label>
        <select
          id="organizer-filter"
          value={organizerFilter}
          onChange={(e) => setOrganizerFilter(e.target.value)}
          className="somnus-input !py-2 !px-3 text-sm w-auto min-w-[12rem]"
        >
          <option value="all" className="bg-[#0A0A0A]">
            All
          </option>
          <option value="platform" className="bg-[#0A0A0A]">
            Platform (no organizer)
          </option>
          {organizerOptions.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#0A0A0A]">
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/70">No events match this filter</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredEvents.map((event) => {
              const totalTickets = event.ticketTypes.reduce(
                (sum, tt) => sum + tt.maxQuantity,
                0
              );
              const soldTickets = event.ticketTypes.reduce(
                (sum, tt) => sum + tt.soldQuantity,
                0
              );
              return (
                <article
                  key={event.id}
                  className="liquid-glass rounded-xl p-4 border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {event.name}
                      </p>
                      <p className="text-white/50 text-xs">{event.venue}</p>
                    </div>
                    <EventActions event={event} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        Organizer
                      </p>
                      <p className="text-white/80">
                        {event.organization?.name ||
                          event.organizer?.businessName ||
                          "Platform"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        Date
                      </p>
                      <p className="text-white/80">
                        {formatEventCalendarDate(event.eventDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        Tickets
                      </p>
                      <p className="text-white/80 tabular-nums">
                        {soldTickets} / {totalTickets}
                      </p>
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(event.id, event.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {event.isActive ? "Published" : "Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleFeatured(event.id, event.isFeatured)
                        }
                        className={`p-2 rounded ${
                          event.isFeatured
                            ? "text-[#7BA3E8]"
                            : "text-white/30 hover:text-white/60"
                        }`}
                        title={
                          event.isFeatured
                            ? "Remove from hero"
                            : "Feature on hero"
                        }
                        aria-label={
                          event.isFeatured
                            ? "Remove from hero"
                            : "Feature on hero"
                        }
                      >
                        <Star
                          className={`w-4 h-4 ${
                            event.isFeatured ? "fill-current" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Event
                  </th>
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Organizer
                  </th>
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Date
                  </th>
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Tickets
                  </th>
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-white/90 font-semibold">
                    Hero
                  </th>
                  <th className="text-right py-4 px-4 text-white/90 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const totalTickets = event.ticketTypes.reduce(
                    (sum, tt) => sum + tt.maxQuantity,
                    0
                  );
                  const soldTickets = event.ticketTypes.reduce(
                    (sum, tt) => sum + tt.soldQuantity,
                    0
                  );

                  return (
                    <tr
                      key={event.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="text-white font-medium">{event.name}</p>
                        <p className="text-white/50 text-xs">{event.venue}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white/80 text-sm">
                          {event.organization?.name ||
                            event.organizer?.businessName ||
                            "Platform"}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white/80">
                          {formatEventCalendarDate(event.eventDate)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white/80 tabular-nums">
                          {soldTickets} / {totalTickets}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(event.id, event.isActive)
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.isActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {event.isActive ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleFeatured(event.id, event.isFeatured)
                          }
                          className={`p-2 rounded ${
                            event.isFeatured
                              ? "text-[#7BA3E8]"
                              : "text-white/30 hover:text-white/60"
                          }`}
                          title={
                            event.isFeatured
                              ? "Remove from hero"
                              : "Feature on hero"
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${
                              event.isFeatured ? "fill-current" : ""
                            }`}
                            aria-hidden
                          />
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end">
                          <EventActions event={event} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingEventId && (
        <EventFormWizard
          mode="admin"
          eventId={editingEventId}
          onClose={() => setEditingEventId(null)}
          onSuccess={() => {
            setEditingEventId(null);
            loadEvents();
          }}
        />
      )}
    </div>
  );
}
