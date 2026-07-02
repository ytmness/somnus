"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RevenueSummary {
  salesCount: number;
  gmvSubtotal: number;
  platformCommission: number;
  serviceFees: number;
  platformTotal: number;
  organizerPayouts: number;
  buyerTotal: number;
  refundedCount: number;
}

interface RevenueByEvent {
  eventId: string;
  eventName: string;
  organizerName: string;
  salesCount: number;
  subtotal: number;
  platformCommission: number;
  organizerNet: number;
}

interface RevenueByOrganizer {
  organizerId: string;
  businessName: string;
  salesCount: number;
  platformCommission: number;
  organizerNet: number;
}

interface RecentSale {
  id: string;
  eventName: string;
  paidAt: string | null;
  subtotal: number;
  platformFeeAmount: number;
  organizerNetAmount: number;
  total: number;
}

interface RevenueReport {
  summary: RevenueSummary;
  byEvent: RevenueByEvent[];
  byOrganizer: RevenueByOrganizer[];
  recentSales: RecentSale[];
}

interface OrganizerOption {
  id: string;
  businessName: string;
}

interface EventOption {
  id: string;
  name: string;
}

type PeriodPreset = "7" | "30" | "90" | "all" | "custom";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function RevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    database: { platformTotal: number };
    stripe: { stripeTotalPesos: number; feeCount: number; stripeEnabled: boolean };
    difference: number;
  } | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [period, setPeriod] = useState<PeriodPreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [eventId, setEventId] = useState("");
  const [organizerId, setOrganizerId] = useState("");

  const dateRange = useMemo(() => {
    if (period === "all") return { from: "", to: "" };
    if (period === "custom") {
      return { from: customFrom, to: customTo };
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(period));
    return { from: toInputDate(from), to: toInputDate(to) };
  }, [period, customFrom, customTo]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    if (eventId) params.set("eventId", eventId);
    if (organizerId) params.set("organizerId", organizerId);
    return params.toString();
  }, [dateRange, eventId, organizerId]);

  const loadFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commissions");
      const data = await res.json();
      if (res.ok) {
        setOrganizers(data.organizers || []);
        setEvents(data.events || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const url = queryString
        ? `/api/admin/revenue?${queryString}`
        : "/api/admin/revenue";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar ingresos");
      setReport(data);
      setVerifyResult(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar ingresos");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleVerifyStripe = async () => {
    setVerifying(true);
    try {
      const url = queryString
        ? `/api/admin/revenue/verify?${queryString}`
        : "/api/admin/revenue/verify";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al verificar");
      setVerifyResult(data);
      toast.success("Verificación con Stripe completada");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al verificar");
    } finally {
      setVerifying(false);
    }
  };

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-white/60 text-xs block mb-1">Periodo</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        {period === "custom" && (
          <>
            <div>
              <label className="text-white/60 text-xs block mb-1">Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </>
        )}
        <div>
          <label className="text-white/60 text-xs block mb-1">Evento</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-xs block mb-1">Organizador</label>
          <select
            value={organizerId}
            onChange={(e) => setOrganizerId(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.businessName}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadReport()}
          disabled={loading}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
        <Button
          type="button"
          onClick={() => void handleVerifyStripe()}
          disabled={verifying}
          className="somnus-btn"
        >
          {verifying ? "Verificando..." : "Verificar con Stripe"}
        </Button>
      </div>

      <p className="text-white/50 text-sm">
        La comisión mostrada es la regla vigente al momento de cada venta
        (configúrala en la pestaña Comisiones).
      </p>

      {loading && !report ? (
        <p className="text-white/70">Cargando ingresos...</p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Ventas completadas" value={String(summary.salesCount)} />
            <KpiCard label="GMV boletos" value={formatMoney(summary.gmvSubtotal)} />
            <KpiCard
              label="Comisión Somnus"
              value={formatMoney(summary.platformCommission)}
              highlight
            />
            <KpiCard label="Cargos de servicio" value={formatMoney(summary.serviceFees)} />
            <KpiCard
              label="Total ganancia plataforma"
              value={formatMoney(summary.platformTotal)}
              highlight
            />
            <KpiCard
              label="Neto a organizadores"
              value={formatMoney(summary.organizerPayouts)}
            />
          </div>

          {summary.refundedCount > 0 && (
            <p className="text-amber-300/90 text-sm">
              {summary.refundedCount} venta(s) reembolsada(s) en el periodo (no
              incluidas en los totales de arriba).
            </p>
          )}

          {verifyResult && (
            <div className="rounded-lg border border-white/20 bg-white/5 p-4 text-sm text-white/90">
              <p className="font-medium mb-2">Reconciliación Stripe</p>
              <p>BD (comisión + servicio): {formatMoney(verifyResult.database.platformTotal)}</p>
              <p>
                Stripe application fees:{" "}
                {verifyResult.stripe.stripeEnabled
                  ? `${formatMoney(verifyResult.stripe.stripeTotalPesos)} (${verifyResult.stripe.feeCount} fees)`
                  : "Stripe no configurado"}
              </p>
              <p
                className={
                  Math.abs(verifyResult.difference) < 0.01
                    ? "text-green-300"
                    : "text-amber-300"
                }
              >
                Diferencia: {formatMoney(verifyResult.difference)}
              </p>
            </div>
          )}

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Por evento</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white/90">
                <thead>
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="text-left py-2">Evento</th>
                    <th className="text-left py-2">Organizador</th>
                    <th className="text-right py-2">Ventas</th>
                    <th className="text-right py-2">GMV</th>
                    <th className="text-right py-2">Comisión</th>
                    <th className="text-right py-2">Neto org.</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byEvent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-white/50">
                        Sin ventas en este periodo
                      </td>
                    </tr>
                  ) : (
                    report.byEvent.map((row) => (
                      <tr key={row.eventId} className="border-b border-white/5">
                        <td className="py-2">{row.eventName}</td>
                        <td className="py-2">{row.organizerName}</td>
                        <td className="py-2 text-right">{row.salesCount}</td>
                        <td className="py-2 text-right">{formatMoney(row.subtotal)}</td>
                        <td className="py-2 text-right">
                          {formatMoney(row.platformCommission)}
                        </td>
                        <td className="py-2 text-right">
                          {formatMoney(row.organizerNet)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Por organizador</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white/90">
                <thead>
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="text-left py-2">Organizador</th>
                    <th className="text-right py-2">Ventas</th>
                    <th className="text-right py-2">Comisión Somnus</th>
                    <th className="text-right py-2">Neto organizador</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byOrganizer.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-white/50">
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    report.byOrganizer.map((row) => (
                      <tr key={row.organizerId} className="border-b border-white/5">
                        <td className="py-2">{row.businessName}</td>
                        <td className="py-2 text-right">{row.salesCount}</td>
                        <td className="py-2 text-right">
                          {formatMoney(row.platformCommission)}
                        </td>
                        <td className="py-2 text-right">
                          {formatMoney(row.organizerNet)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Últimas ventas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white/90">
                <thead>
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Evento</th>
                    <th className="text-right py-2">Subtotal</th>
                    <th className="text-right py-2">Comisión</th>
                    <th className="text-right py-2">Neto org.</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-white/50">
                        Sin ventas recientes
                      </td>
                    </tr>
                  ) : (
                    report.recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-white/5">
                        <td className="py-2">{formatDate(sale.paidAt)}</td>
                        <td className="py-2">{sale.eventName}</td>
                        <td className="py-2 text-right">{formatMoney(sale.subtotal)}</td>
                        <td className="py-2 text-right">
                          {formatMoney(sale.platformFeeAmount)}
                        </td>
                        <td className="py-2 text-right">
                          {formatMoney(sale.organizerNetAmount)}
                        </td>
                        <td className="py-2 text-right">{formatMoney(sale.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`liquid-glass p-4 ${highlight ? "ring-1 ring-white/30" : ""}`}
    >
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
