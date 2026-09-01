"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatEventCalendarDate } from "@/lib/utils";

interface OrganizerEvent {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  isActive: boolean;
}

interface CommissionRule {
  id: string;
  scope: string;
  commissionType: string;
  commissionPercentage: string | null;
  commissionFixedAmount: string | null;
  isActive: boolean;
}

interface OrganizerDetail {
  id: string;
  businessName: string;
  contactEmail: string;
  isActive: boolean;
  stripeAccountId: string | null;
  stripeOnboardingStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    isActive: boolean;
  };
  organizations: Array<{ id: string; name: string; isActive: boolean }>;
  events: OrganizerEvent[];
  commissionRules: CommissionRule[];
}

interface OrganizerDetailModalProps {
  organizerId: string;
  onClose: () => void;
  onSaved: () => void;
  onViewEvents: (organizerId: string) => void;
  onConfigureCommission: (organizerId: string) => void;
}

export function OrganizerDetailModal({
  organizerId,
  onClose,
  onSaved,
  onViewEvents,
  onConfigureCommission,
}: OrganizerDetailModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [detail, setDetail] = useState<OrganizerDetail | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    isActive: true,
    userName: "",
    userPhone: "",
    userIsActive: true,
  });

  useEffect(() => setIsMounted(true), []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");

      const org: OrganizerDetail = data.data;
      setDetail(org);
      setForm({
        businessName: org.businessName,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        userName: org.user.name,
        userPhone: org.user.phone || "",
        userIsActive: org.user.isActive,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar organizador");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: form.businessName,
          contactEmail: form.contactEmail,
          isActive: form.isActive,
          userName: form.userName,
          userPhone: form.userPhone || null,
          userIsActive: form.userIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Organizador actualizado");
      onSaved();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleResetStripe = async () => {
    if (!detail) return;
    const confirmed = confirm(
      `¿Resetear Stripe de "${detail.businessName}"?\n\n` +
        "Se borrará el vínculo local con Stripe. El organizador deberá volver a /organizador para conectar su cuenta."
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}/reset-stripe`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al resetear");
      toast.success("Stripe reseteado. El organizador debe volver a /organizador.");
      onSaved();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al resetear Stripe");
    } finally {
      setResetting(false);
    }
  };

  const stripeOk = detail?.chargesEnabled && detail?.payoutsEnabled;

  if (!isMounted) return null;

  /**
   * Portaled to body: rendered inside `.liquid-glass` on admin organizers,
   * and `backdrop-filter` would make that card the containing block for the
   * fixed overlay (same root cause as EventCreatorShell).
   */
  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organizer-detail-title"
    >
      <div className="bg-[#2a2c30] rounded-xl border border-brand-gold/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#2a2c30] border-b border-brand-gold/20 p-6 flex items-center justify-between z-10">
          <div>
            <h2 id="organizer-detail-title" className="text-2xl font-bold text-white">
              {loading ? "Cargando..." : detail?.businessName || "Organizador"}
            </h2>
            {detail && (
              <p className="text-white/50 text-sm mt-1">{detail.user.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-white/60">Cargando detalle...</div>
        ) : detail ? (
          <div className="p-6 space-y-8">
            {/* Perfil */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Perfil</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-white/70 text-sm">Nombre del negocio</span>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-white/70 text-sm">Email de contacto</span>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-white/70 text-sm">Nombre del usuario</span>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-white/70 text-sm">Teléfono</span>
                  <input
                    type="text"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-white/70 text-sm">Email de login (solo lectura)</span>
                  <input
                    type="email"
                    value={detail.user.email}
                    disabled
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-6 mt-4">
                <label className="flex items-center gap-2 text-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Organizador activo
                </label>
                <label className="flex items-center gap-2 text-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={form.userIsActive}
                    onChange={(e) => setForm({ ...form, userIsActive: e.target.checked })}
                    className="rounded"
                  />
                  Usuario puede iniciar sesión
                </label>
              </div>
              <p className="text-white/40 text-xs mt-2">
                Desactivar el organizador no despublica sus eventos automáticamente.
              </p>
              <div className="mt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </section>

            {/* Stripe */}
            <section className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Stripe Connect</h3>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    stripeOk
                      ? "bg-green-500/20 text-green-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {detail.stripeOnboardingStatus}
                </span>
                <span className="text-white/60 text-sm">
                  Cobros: {detail.chargesEnabled ? "Sí" : "No"} · Pagos:{" "}
                  {detail.payoutsEnabled ? "Sí" : "No"}
                </span>
              </div>
              {detail.stripeAccountId && (
                <p className="text-white/50 text-xs font-mono mb-3">
                  {detail.stripeAccountId}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetStripe}
                disabled={resetting || !detail.stripeAccountId}
                className="border-red-400/50 text-red-300 hover:bg-red-500/10"
              >
                {resetting ? "Reseteando..." : "Resetear Stripe"}
              </Button>
            </section>

            {/* Organizaciones */}
            {detail.organizations.length > 0 && (
              <section className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Organizaciones</h3>
                <ul className="space-y-1">
                  {detail.organizations.map((org) => (
                    <li key={org.id} className="text-white/70 text-sm">
                      {org.name}
                      {!org.isActive && (
                        <span className="ml-2 text-xs text-red-400">(inactiva)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Eventos */}
            <section className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Eventos ({detail.events.length})
                </h3>
                {detail.events.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onViewEvents(organizerId);
                    }}
                  >
                    Ver en pestaña Eventos
                  </Button>
                )}
              </div>
              {detail.events.length === 0 ? (
                <p className="text-white/50 text-sm">Sin eventos registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/60">
                        <th className="text-left py-2 px-2">Evento</th>
                        <th className="text-left py-2 px-2">Fecha</th>
                        <th className="text-left py-2 px-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.events.map((ev) => (
                        <tr key={ev.id} className="border-b border-white/5">
                          <td className="py-2 px-2 text-white">{ev.name}</td>
                          <td className="py-2 px-2 text-white/70">
                            {formatEventCalendarDate(ev.eventDate)}
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                ev.isActive
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {ev.isActive ? "Publicado" : "Borrador"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Comisiones */}
            <section className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Comisiones</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onConfigureCommission(organizerId);
                  }}
                >
                  Nueva comisión
                </Button>
              </div>
              {detail.commissionRules.length === 0 ? (
                <p className="text-white/50 text-sm">
                  Sin reglas de comisión para este organizador.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.commissionRules.map((rule) => (
                    <li
                      key={rule.id}
                      className="flex items-center justify-between border border-white/10 rounded-lg p-3"
                    >
                      <div>
                        <p className="text-white text-sm">
                          {rule.commissionType}
                          {rule.commissionPercentage ? ` ${rule.commissionPercentage}%` : ""}
                          {rule.commissionFixedAmount
                            ? ` + $${rule.commissionFixedAmount}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          rule.isActive
                            ? "bg-green-500/20 text-green-300"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {rule.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
