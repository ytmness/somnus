"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ContactLead {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
}

export function ContactLeadsManager() {
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/contact-leads", { credentials: "include" });
        const data = await res.json();
        if (data.success && data.data) {
          setLeads(data.data);
        } else {
          setLeads([]);
        }
      } catch {
        toast.error("Error al cargar solicitudes");
        setLeads([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Cargando solicitudes...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg bg-white/5 border border-white/10">
        <Mail className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <p className="text-white/70 mb-2">No hay solicitudes aún</p>
        <p className="text-white/50 text-sm">Las solicitudes del formulario de contacto aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">Nombre</th>
            <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">Email</th>
            <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">Teléfono</th>
            <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">Ubicación</th>
            <th className="text-left py-3 px-4 text-white/90 font-semibold text-sm">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-3 px-4">
                <span className="text-white/90 font-medium">
                  {lead.name} {lead.lastName}
                </span>
              </td>
              <td className="py-3 px-4">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-regia-gold hover:text-regia-gold/80 flex items-center gap-2 text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {lead.email}
                </a>
              </td>
              <td className="py-3 px-4 text-white/70 text-sm">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-white">
                    <Phone className="w-4 h-4" />
                    {lead.phone}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 px-4 text-white/70 text-sm">
                {lead.city || lead.country ? (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white/50" />
                    {[lead.city, lead.country].filter(Boolean).join(", ")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 px-4 text-white/60 text-sm">
                {new Date(lead.createdAt).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
