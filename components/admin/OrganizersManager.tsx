"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface OrganizerRow {
  id: string;
  businessName: string;
  contactEmail: string;
  stripeOnboardingStatus: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  eventCount: number;
  user: { email: string; name: string };
  organizations: Array<{ id: string; name: string; _count?: { events: number } }>;
}

export function OrganizersManager() {
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

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

  if (loading) {
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
              </tr>
            </thead>
            <tbody>
              {organizers.map((o) => (
                <tr key={o.id} className="border-b border-white/5">
                  <td className="py-3 px-2 text-white font-medium">{o.businessName}</td>
                  <td className="py-3 px-2 text-white/70">{o.user.email}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        o.chargesEnabled && o.payoutsEnabled
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
