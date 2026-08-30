"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

interface EventOption {
  id: string;
  name: string;
}

interface BlastRow {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  clickCount: number;
  salesCount: number;
  trackingCode: string;
  sentAt: string | null;
  createdAt: string;
}

export function BlastsManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [blasts, setBlasts] = useState<BlastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [channel, setChannel] = useState<"SMS" | "PUSH" | "EMAIL">("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const opts = data.data.map((e: { id: string; name: string }) => ({
          id: e.id,
          name: e.name,
        }));
        setEvents(opts);
        setEventId((prev) => prev || opts[0]?.id || "");
      }
    } catch {
      toast.error("Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlasts = useCallback(async (id: string) => {
    if (!id) {
      setBlasts([]);
      return;
    }
    try {
      const res = await fetch(`/api/events/${id}/blasts`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setBlasts(data.data || []);
      else setBlasts([]);
    } catch {
      toast.error("Error al cargar blasts");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (eventId) void loadBlasts(eventId);
  }, [eventId, loadBlasts]);

  const handleSend = async () => {
    if (!eventId || !body.trim()) {
      toast.error("Selecciona evento y escribe el mensaje");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/blasts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          subject: subject.trim() || undefined,
          body: body.trim(),
          sendNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar");
        return;
      }
      toast.success(
        `Blast enviado · ${data.data?.sentCount ?? 0}/${data.data?.recipientCount ?? 0}`
      );
      setBody("");
      setSubject("");
      await loadBlasts(eventId);
    } catch {
      toast.error("Error al enviar blast");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-white/70">Cargando blasts...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1 text-sm text-white/70">
          Evento
          <select
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id} className="bg-zinc-900">
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/70">
          Canal
          <select
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={channel}
            onChange={(e) =>
              setChannel(e.target.value as "SMS" | "PUSH" | "EMAIL")
            }
          >
            <option value="EMAIL" className="bg-zinc-900">
              Email
            </option>
            <option value="SMS" className="bg-zinc-900">
              SMS
            </option>
            <option value="PUSH" className="bg-zinc-900">
              Push
            </option>
          </select>
        </label>
      </div>

      {(channel === "EMAIL" || channel === "PUSH") && (
        <label className="block text-sm text-white/70">
          Asunto / título
          <input
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      )}

      <label className="block text-sm text-white/70">
        Mensaje
        <textarea
          className="mt-1 w-full min-h-[120px] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Usa {{link}} para insertar el link con tracking"
        />
      </label>

      <Button onClick={handleSend} disabled={submitting || !eventId}>
        <Send className="w-4 h-4" aria-hidden />
        {submitting ? "Enviando…" : "Crear y enviar"}
      </Button>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        {blasts.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/60 text-sm">Sin blasts aún para este evento</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-white/80">
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Enviados</th>
                <th className="py-3 px-4">Tracking</th>
                <th className="py-3 px-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {blasts.map((b) => (
                <tr key={b.id} className="border-b border-white/5 text-sm">
                  <td className="py-3 px-4 text-white/90">{b.channel}</td>
                  <td className="py-3 px-4 text-white/70">{b.status}</td>
                  <td className="py-3 px-4 text-white/70">
                    {b.sentCount}/{b.recipientCount}
                  </td>
                  <td className="py-3 px-4 text-white/50 font-mono text-xs">
                    blast_{b.trackingCode.slice(0, 8)}…
                  </td>
                  <td className="py-3 px-4 text-white/50">
                    {b.sentAt
                      ? new Date(b.sentAt).toLocaleString("es-MX")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
