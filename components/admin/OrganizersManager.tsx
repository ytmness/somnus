"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrganizerDetailModal } from "./OrganizerDetailModal";

interface OrganizerRow {
  id: string;
  businessName: string;
  contactEmail: string;
  stripeOnboardingStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  isActive: boolean;
  eventCount: number;
  user: { email: string; name: string; isActive: boolean };
  organizations: Array<{ id: string; name: string; _count?: { events: number } }>;
}

interface OrganizersManagerProps {
  onViewEvents: (organizerId: string) => void;
  onConfigureCommission: (organizerId: string) => void;
}

export function OrganizersManager({
  onViewEvents,
  onConfigureCommission,
}: OrganizersManagerProps) {
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);

  const load = async (search?: string) => {
    try {
      const url = search
        ? `/api/admin/organizers?q=${encodeURIComponent(search)}`
        : "/api/admin/organizers";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setOrganizers(data.data || []);
    } catch {
      toast.error("Error al cargar organizadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    void load(q);
  };

  const handleSaved = () => {
    setLoading(true);
    void load(q);
  };

  if (loading && organizers.length === 0) {
    return <p className="text-white/60">Cargando organizadores...</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90"
        >
          Buscar
        </button>
      </form>

      {organizers.length === 0 ? (
        <p className="text-white/50">No hay organizadores registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="text-left py-3 px-2">Organizador</th>
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Stripe</th>
                <th className="text-left py-3 px-2">Organizaciones</th>
                <th className="text-right py-3 px-2">Eventos</th>
                <th className="text-right py-3 px-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((o) => {
                const stripeOk = o.chargesEnabled && o.payoutsEnabled;
                return (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-3 px-2">
                      <p className="text-white font-medium">{o.businessName}</p>
                      {!o.isActive && (
                        <span className="text-xs text-red-400">Inactivo</span>
                      )}
                      {!o.user.isActive && (
                        <span className="text-xs text-amber-400 ml-2">Sin acceso</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-white/70">{o.user.email}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          stripeOk
                            ? "bg-green-500/20 text-green-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {o.stripeOnboardingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-white/70">
                      {o.organizations.length > 0
                        ? o.organizations.map((org) => org.name).join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 px-2 text-right text-white/80">{o.eventCount}</td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrganizerId(o.id)}
                      >
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrganizerId && (
        <OrganizerDetailModal
          organizerId={selectedOrganizerId}
          onClose={() => setSelectedOrganizerId(null)}
          onSaved={handleSaved}
          onViewEvents={onViewEvents}
          onConfigureCommission={onConfigureCommission}
        />
      )}
    </div>
  );
}
