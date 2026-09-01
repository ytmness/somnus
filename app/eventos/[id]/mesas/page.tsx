"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Legacy: mapa de mesas con filas (Patriotas).
 * Somnus vende mesas solo por link desde Admin.
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
    <div className="min-h-screen flex items-center justify-center bg-black/90 px-4">
      <p className="text-white/70 text-center text-sm max-w-sm">
        No hay mapa de mesas. Las mesas se cobran con link desde Admin.
        Redirigiendo a boletos…
      </p>
    </div>
  );
}
