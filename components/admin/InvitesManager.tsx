"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { expandTableNumbers, MAX_TABLES_PER_BATCH } from "@/lib/table-invite";
import { TableStaffManager } from "@/components/admin/TableStaffManager";

interface EventOption {
  id: string;
  name: string;
}

interface InviteRow {
  id: string;
  tableNumber: string;
  seatNumber: number | null;
  invitedName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  status: string;
  paidAt: string | null;
  pricePerSeat: number;
  totalCollected?: number;
  tableTotal?: number;
  remaining?: number;
  url: string;
  inviteToken: string;
  expiresAt: string | null;
  createdAt: string;
  isPool?: boolean;
  maxSlots?: number | null;
  splitAmong?: number;
  minPaidToConfirm?: number;
  paidCount?: number;
  tableConfirmed?: boolean;
  ticketTypeName?: string | null;
}

export function InvitesManager() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showGenerate, setShowGenerate] = useState(false);
  const [generateEventId, setGenerateEventId] = useState("");
  const [generateTableNumber, setGenerateTableNumber] = useState("");
  const [generateCupos, setGenerateCupos] = useState(8);
  const [generateTotalPrice, setGenerateTotalPrice] = useState("");
  const [generateTableCount, setGenerateTableCount] = useState(1);
  const [isSubmittingGenerate, setIsSubmittingGenerate] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<
    Array<{
      token: string;
      name: string;
      url: string;
      pricePerSeat: number;
      tableTotal?: number;
      seatNumber: number | null;
      tableNumber?: string;
      splitAmong?: number;
      minPaidToConfirm?: number;
      isPool?: boolean;
    }>
  >([]);

  const loadEvents = useCallback(async (): Promise<EventOption[] | null> => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch("/api/events", { credentials: "include" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const allEvents: EventOption[] = data.data.map(
          (e: { id: string; name: string }) => ({
            id: e.id,
            name: e.name,
          })
        );
        setEvents(allEvents);
        setSelectedEventId((prev) => {
          if (allEvents.length === 0) return "";
          if (prev && allEvents.some((x) => x.id === prev)) return prev;
          return allEvents[0].id;
        });
        return allEvents;
      }
      return null;
    } catch {
      toast.error("Error al cargar eventos");
      return null;
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setInvites([]);
      return;
    }
    const loadInvites = async () => {
      setIsLoadingInvites(true);
      try {
        const res = await fetch(`/api/admin/events/${selectedEventId}/invites`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && data.data) {
          setInvites(data.data.invites || []);
        } else {
          setInvites([]);
        }
      } catch {
        toast.error("Error al cargar invitaciones");
        setInvites([]);
      } finally {
        setIsLoadingInvites(false);
      }
    };
    loadInvites();
  }, [selectedEventId]);

  const unitFromForm = (() => {
    const total = parseFloat(generateTotalPrice.replace(/,/g, "."));
    if (!Number.isFinite(total) || total <= 0 || generateCupos < 1) return 0;
    return Math.round((total / generateCupos) * 100) / 100;
  })();

  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copiado");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const cancelInvite = async (
    inviteToken: string,
    isPool: boolean,
    status: string
  ) => {
    try {
      if (status === "PAID") {
        toast.error(
          "No se puede eliminar un link con pagos ya hechos en modo asiento"
        );
        return;
      }

      const ok = window.confirm(
        isPool
          ? "¿Eliminar este link de mesa? Quienes ya pagaron mantienen su boleto; el link deja de funcionar para nuevos pagos."
          : "¿Eliminar este link de asiento?"
      );
      if (!ok) return;

      const res = await fetch(
        `/api/admin/events/${selectedEventId}/invites/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteToken, isPool }),
          credentials: "include",
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar");

      toast.success(data.message || "Cancelado");

      const invRes = await fetch(
        `/api/admin/events/${selectedEventId}/invites`,
        { credentials: "include" }
      );
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      } else {
        setInvites([]);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar");
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = generateEventId || selectedEventId;
    if (!eventId) {
      toast.error("Elige un evento");
      return;
    }
    const tableKey = generateTableNumber.trim();
    if (tableKey.length < 1 || tableKey.length > 120) {
      toast.error("Indica un nombre o número de mesa (1–120 caracteres).");
      return;
    }
    const tableNames = expandTableNumbers(tableKey, generateTableCount);
    if (tableNames.length === 0) {
      toast.error("Indica al menos una mesa.");
      return;
    }
    const totalPrice = parseFloat(generateTotalPrice.replace(/,/g, "."));
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      toast.error("Indica el total de la mesa (mayor a 0).");
      return;
    }
    const cupos = Math.min(500, Math.max(1, generateCupos));

    setIsSubmittingGenerate(true);
    setGeneratedLinks([]);
    try {
      const allInvites: typeof generatedLinks = [];
      for (const name of tableNames) {
        const res = await fetch(
          `/api/events/${eventId}/tables/${encodeURIComponent(name)}/invites`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              mode: "pool",
              totalTablePrice: totalPrice,
              cupos,
              minPaidToConfirm: cupos,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            tableNames.length > 1
              ? `${name}: ${data.error || "Error al generar invites"}`
              : data.error || "Error al generar invites"
          );
        }
        if (data.success && Array.isArray(data.data?.invites)) {
          allInvites.push(...data.data.invites);
        } else {
          throw new Error("No se recibieron los links");
        }
      }

      setGeneratedLinks(allInvites);
      setSelectedEventId(eventId);
      setShowGenerate(false);
      setGenerateTableNumber("");
      setGenerateTotalPrice("");
      toast.success(
        allInvites.length === 1
          ? "Link de mesa guardado. Cópialo y compártelo."
          : `${allInvites.length} links de mesa guardados.`
      );
      const invRes = await fetch(`/api/admin/events/${eventId}/invites`, {
        credentials: "include",
      });
      const invData = await invRes.json();
      if (invData.success && invData.data?.invites) {
        setInvites(invData.data.invites);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setIsSubmittingGenerate(false);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando eventos...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-white/5 border border-white/10 p-6">
        <p className="text-white/70 mb-4">No hay eventos</p>
        <p className="text-white/50 text-sm mb-4">
          Crea un evento con entradas normales. Las mesas se arman aquí con
          total + cupos.
        </p>
        <Link href="/admin">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Ir a Eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold text-white mb-2">Links de mesa</h3>
        <p className="text-white/50 text-sm mb-4">
          Cada mesa es un link: pones el total, de cuántos cupos es, y a medida
          que pagan se resta el saldo. Con todos los cupos pagados queda
          confirmada.
        </p>

        {!showGenerate ? (
          <Button
            onClick={() => {
              setShowGenerate(true);
              setGenerateEventId(selectedEventId || events[0]?.id || "");
              setGenerateTableNumber("");
              setGenerateCupos(8);
              setGenerateTotalPrice("");
              setGenerateTableCount(1);
              setGeneratedLinks([]);
            }}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear link de mesa
          </Button>
        ) : (
          <form onSubmit={handleGenerateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Evento *
                </label>
                <select
                  value={generateEventId}
                  onChange={(e) => setGenerateEventId(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Nombre de esta mesa *
                </label>
                <input
                  type="text"
                  value={generateTableNumber}
                  onChange={(e) => setGenerateTableNumber(e.target.value)}
                  placeholder="Ej: 1, Terraza A…"
                  required
                  maxLength={120}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Total de la mesa (MXN) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={generateTotalPrice}
                  onChange={(e) =>
                    setGenerateTotalPrice(
                      e.target.value.replace(/[^0-9.,]/g, "")
                    )
                  }
                  placeholder="Ej: 8000"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  Cupos (personas) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={generateCupos}
                  onChange={(e) =>
                    setGenerateCupos(
                      Math.min(
                        500,
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    )
                  }
                  className="w-full max-w-[140px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <p className="text-white/45 text-xs mt-1">
                  Con {generateCupos} pagos se confirma. Cada cupo ≈ $
                  {unitFromForm > 0
                    ? unitFromForm.toLocaleString("es-MX")
                    : "—"}
                  .
                </p>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-1">
                  ¿Cuántas mesas seguidas?
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_TABLES_PER_BATCH}
                  value={generateTableCount}
                  onChange={(e) =>
                    setGenerateTableCount(
                      Math.min(
                        MAX_TABLES_PER_BATCH,
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    )
                  }
                  className="w-full max-w-[120px] px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <p className="text-white/45 text-xs mt-1">
                  Con nombre 1 y cantidad 5 crea mesas 1–5 (mismo total/cupos).
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-white/55 text-xs leading-relaxed">
                Quien abre el link puede pagar su parte (cupos) o toda la mesa.
                El saldo pendiente baja con cada pago.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmittingGenerate}
                className="bg-white text-black hover:bg-white/90"
              >
                {isSubmittingGenerate ? "Creando..." : "Crear y guardar link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowGenerate(false);
                  setGeneratedLinks([]);
                }}
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {generatedLinks.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/80 font-medium mb-1">
              Guardado. Copia el link:
            </p>
            <div className="space-y-2">
              {generatedLinks.map((link) => (
                <div
                  key={link.token}
                  className="flex flex-wrap items-center gap-2 p-2 rounded bg-white/5"
                >
                  <span className="text-white/80 text-sm">
                    {link.tableNumber ? `Mesa ${link.tableNumber} · ` : ""}
                    {link.tableTotal != null
                      ? `$${link.tableTotal.toLocaleString("es-MX")} total · `
                      : ""}
                    ${link.pricePerSeat?.toLocaleString("es-MX") ?? "—"} / cupo
                    {link.minPaidToConfirm != null
                      ? ` · ${link.minPaidToConfirm} cupos`
                      : ""}{" "}
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => copyLink(link.url, link.token)}
                    className="text-white/90 hover:text-white text-sm flex items-center gap-1"
                  >
                    {copiedId === link.token ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedId === link.token ? "Copiado" : "Copiar link"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">
          Mesas con link (guardadas)
        </h3>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="text-white/80 text-sm font-medium">Evento:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[240px]"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingInvites ? (
        <div className="text-center py-8">
          <p className="text-white/70">Cargando invitaciones...</p>
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 rounded-lg bg-white/5 border border-white/10">
          <Link2 className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/70 mb-2">
            Aún no hay links de mesa en este evento
          </p>
          <p className="text-white/50 text-sm">
            Crea uno arriba: nombre, total y cupos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Mesa
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Recaudado
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Resta
                </th>
                <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">
                  Por cupo
                </th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold text-sm">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const tableTotal =
                  inv.tableTotal ??
                  (inv.splitAmong
                    ? Math.round(inv.pricePerSeat * inv.splitAmong * 100) /
                      100
                    : null);
                const collected =
                  typeof inv.totalCollected === "number"
                    ? inv.totalCollected
                    : inv.status === "PAID"
                      ? inv.pricePerSeat
                      : 0;
                const remaining =
                  typeof inv.remaining === "number"
                    ? inv.remaining
                    : tableTotal != null
                      ? Math.max(0, tableTotal - collected)
                      : null;

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-3 px-4 text-white/90">
                      <p>{inv.tableNumber}</p>
                      {inv.splitAmong != null && (
                        <p className="text-[11px] text-white/45 mt-0.5">
                          {inv.splitAmong} cupos
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          inv.status === "PAID"
                            ? "bg-green-500/20 text-green-400"
                            : inv.status === "POOL"
                              ? inv.tableConfirmed
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                              : inv.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {inv.status === "POOL" && inv.paidCount != null
                          ? inv.tableConfirmed
                            ? `Confirmada · ${inv.paidCount}/${inv.minPaidToConfirm ?? inv.splitAmong ?? "—"}`
                            : `${inv.paidCount}/${inv.minPaidToConfirm ?? inv.splitAmong ?? "—"} cupos`
                          : inv.status === "PAID"
                            ? "Pagado"
                            : inv.status === "PENDING"
                              ? "Pendiente"
                              : inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {tableTotal != null
                        ? `$${tableTotal.toLocaleString("es-MX")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      ${collected.toLocaleString("es-MX")}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {remaining != null
                        ? `$${remaining.toLocaleString("es-MX")}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      ${inv.pricePerSeat.toLocaleString("es-MX")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/70 hover:text-white"
                          onClick={() => copyLink(inv.url, inv.inviteToken)}
                        >
                          {copiedId === inv.inviteToken ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span className="ml-1 text-xs">
                            {copiedId === inv.inviteToken
                              ? "Copiado"
                              : "Copiar"}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`${
                            inv.status === "PAID"
                              ? "pointer-events-none opacity-50"
                              : "text-red-400 hover:text-red-300"
                          }`}
                          onClick={() =>
                            cancelInvite(
                              inv.inviteToken,
                              !!inv.isPool,
                              inv.status
                            )
                          }
                          aria-label="Cancelar mesa o link"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="ml-1 text-xs">
                            {inv.isPool ? "Eliminar link" : "Eliminar"}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedEventId && <TableStaffManager eventId={selectedEventId} />}
    </div>
  );
}
