"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface EventOption {
  id: string;
  name: string;
}

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  quantity: number;
  note: string | null;
  status: string;
  inviteToken: string;
  redeemUrl: string;
  redeemedAt: string | null;
  createdAt: string;
}

export function GuestListManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [entries, setEntries] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const list: EventOption[] = data.data.map((e: { id: string; name: string }) => ({
          id: e.id,
          name: e.name,
        }));
        setEvents(list);
        setSelectedEventId((prev) => {
          if (prev && list.some((x) => x.id === prev)) return prev;
          return list[0]?.id || "";
        });
      }
    } catch {
      toast.error("Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async (eventId: string) => {
    if (!eventId) {
      setEntries([]);
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/guestlist`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setEntries(data.data || []);
      else setEntries([]);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadEntries(selectedEventId);
  }, [selectedEventId, loadEntries]);

  const copyUrl = async (row: GuestRow) => {
    try {
      await navigator.clipboard.writeText(row.redeemUrl);
      setCopiedId(row.id);
      toast.success("Link copiado");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleCreate = async () => {
    if (!selectedEventId || !name.trim()) {
      toast.error("Nombre y evento requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/guestlist`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          quantity,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast.success("Cortesía creada");
      setName("");
      setEmail("");
      setPhone("");
      setQuantity(1);
      setNote("");
      void loadEntries(selectedEventId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-white/60 text-sm">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Users className="w-5 h-5 text-white/70" aria-hidden />
        <label className="text-sm text-white/70">Evento</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm min-w-[200px]"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id} className="bg-[#111]">
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
        <input
          placeholder="Nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
        />
        <input
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="Cantidad"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm"
        />
        <input
          placeholder="Nota"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm sm:col-span-2"
        />
        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={submitting}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden />
          Agregar a guest list
        </Button>
      </div>

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-white/50 text-sm py-6 text-center">
            Sin cortesías en este evento
          </p>
        ) : (
          entries.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/10"
            >
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{row.name}</p>
                <p className="text-white/50 text-xs">
                  ×{row.quantity} · {row.status}
                  {row.email ? ` · ${row.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyUrl(row)}
                className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5"
              >
                {copiedId === row.id ? (
                  <Check className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                )}
                Link
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
