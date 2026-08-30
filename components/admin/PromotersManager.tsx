"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";

interface EventOption {
  id: string;
  name: string;
}

interface PromoterRow {
  id: string;
  code: string;
  label: string | null;
  clickCount: number;
  salesCount: number;
  salesAmount: number | string;
  commissionPct: number | string | null;
  isActive: boolean;
  user: { id: string; name: string; email: string };
}

export function PromotersManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<PromoterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const loadPromoters = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    try {
      const res = await fetch(`/api/events/${id}/promoters`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setRows(data.data || []);
      else setRows([]);
    } catch {
      toast.error("Error al cargar promoters");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (eventId) void loadPromoters(eventId);
  }, [eventId, loadPromoters]);

  const trackUrl = (c: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/promoters/track/${encodeURIComponent(c)}`;

  const copyLink = async (id: string, c: string) => {
    try {
      await navigator.clipboard.writeText(trackUrl(c));
      setCopiedId(id);
      toast.success("Link copiado");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleCreate = async () => {
    if (!eventId || !email.trim()) {
      toast.error("Evento y email del promoter son requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/promoters`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim() || undefined,
          label: label.trim() || undefined,
          commissionPct: commissionPct.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear");
        return;
      }
      toast.success("Promoter creado");
      setEmail("");
      setCode("");
      setLabel("");
      setCommissionPct("");
      await loadPromoters(eventId);
    } catch {
      toast.error("Error al crear promoter");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-white/70">
        Cargando promoters...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm text-white/70">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-white/70">
          Email del promoter
          <input
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="promoter@email.com"
          />
        </label>
        <label className="text-sm text-white/70">
          Código (opcional)
          <input
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AUTO"
          />
        </label>
        <label className="text-sm text-white/70">
          Etiqueta
          <input
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="text-sm text-white/70">
          Comisión %
          <input
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            placeholder="10"
          />
        </label>
      </div>

      <Button onClick={handleCreate} disabled={submitting || !eventId}>
        <UserPlus className="w-4 h-4" aria-hidden />
        {submitting ? "Creando…" : "Crear link"}
      </Button>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/60 text-sm">Sin promoters en este evento</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-white/80">
                <th className="py-3 px-4">Promoter</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Clicks</th>
                <th className="py-3 px-4">Ventas</th>
                <th className="py-3 px-4">Link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 text-sm">
                  <td className="py-3 px-4">
                    <div className="text-white/90">{r.user.name}</div>
                    <div className="text-white/40 text-xs">{r.user.email}</div>
                    {r.label && (
                      <div className="text-white/50 text-xs">{r.label}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-white/80">{r.code}</td>
                  <td className="py-3 px-4 text-white/70">{r.clickCount}</td>
                  <td className="py-3 px-4 text-white/70">
                    {r.salesCount} · $
                    {Number(r.salesAmount || 0).toLocaleString("es-MX")}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => copyLink(r.id, r.code)}
                      className="inline-flex items-center gap-1 text-white/70 hover:text-white"
                    >
                      {copiedId === r.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Copiar
                    </button>
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
