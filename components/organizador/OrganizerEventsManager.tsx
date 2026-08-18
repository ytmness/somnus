"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatEventCalendarDate } from "@/lib/utils";
import { EventFormWizard } from "@/components/event-form/EventFormWizard";

interface EventRow {
  id: string;
  name: string;
  eventDate: string;
  isActive: boolean;
  organization?: { id: string; name: string } | null;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface OrganizerEventsManagerProps {
  stripeReady: boolean;
  organizations: OrganizationOption[];
  onRefreshOrgs: () => void;
}

export function OrganizerEventsManager({
  stripeReady,
  organizations,
  onRefreshOrgs,
}: OrganizerEventsManagerProps) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/events?mine=true", { credentials: "include" });
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch {
      toast.error("Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const toggleActive = async (eventId: string, current: boolean) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      toast.success(current ? "Evento despublicado" : "Evento publicado");
      void loadEvents();
    } catch {
      toast.error("Error al actualizar evento");
    }
  };

  const canCreate = stripeReady && organizations.length > 0;

  const handleCreateClick = () => {
    if (!stripeReady) {
      toast.error("Conecta tu cuenta de Stripe antes de crear eventos");
      return;
    }
    if (organizations.length === 0) {
      toast.error("Crea al menos una organización antes de publicar eventos");
      onRefreshOrgs();
      return;
    }
    setShowForm(true);
  };

  return (
    <section className="somnus-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Mis eventos</h2>
        <button
          type="button"
          onClick={handleCreateClick}
          data-tour="org-create-event"
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            canCreate
              ? "bg-white text-black hover:bg-white/90"
              : "bg-white/20 text-white/60 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Create event
        </button>
      </div>

      {!stripeReady && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200">
          Conecta Stripe arriba para poder publicar eventos y recibir pagos.
        </div>
      )}

      {stripeReady && organizations.length === 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200">
          Crea una organización arriba para poder publicar eventos bajo tu marca.
        </div>
      )}

      {loading ? (
        <p className="text-white/50 text-sm">Cargando eventos...</p>
      ) : events.length === 0 ? (
        <p className="text-white/50 text-sm">No tienes eventos publicados aún.</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 rounded-lg p-4"
            >
              <div>
                <p className="font-medium">{ev.name}</p>
                <p className="text-white/50 text-sm">
                  {formatEventCalendarDate(ev.eventDate)}
                  {ev.organization ? ` · ${ev.organization.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEventId(ev.id)}
                  className="p-2 text-white/60 hover:text-white"
                  title="Edit event"
                  aria-label={`Edit ${ev.name}`}
                >
                  <Pencil className="w-4 h-4" aria-hidden />
                </button>
                <Link href={`/eventos/${ev.id}/boletos`}>
                  <button
                    type="button"
                    className="p-2 text-white/60 hover:text-white"
                    title="Ver página de boletos"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(ev.id, ev.isActive)}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    ev.isActive
                      ? "bg-green-500/20 text-green-300"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {ev.isActive ? "Publicado" : "Borrador"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EventFormWizard
          mode="organizer"
          organizations={organizations}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            void loadEvents();
          }}
        />
      )}

      {editingEventId && (
        <EventFormWizard
          mode="organizer"
          eventId={editingEventId}
          organizations={organizations}
          onClose={() => setEditingEventId(null)}
          onSuccess={() => {
            setEditingEventId(null);
            void loadEvents();
          }}
        />
      )}
    </section>
  );
}
