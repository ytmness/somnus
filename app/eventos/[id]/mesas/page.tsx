"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Las mesas VIP se gestionan por links desde Admin (Invites de mesas VIP).
 * Redirigimos al evento/boletos para no usar el mapa de mesas.
 */
export default function EventMesasRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  useEffect(() => {
    if (eventId) {
      router.replace(`/eventos/${eventId}/boletos`);
    }
  }, [eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/90">
      <p className="text-white/70">Redirigiendo...</p>
    </div>
  );
}
