"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Flujo viejo estilo plano/filas (invitar asiento por asiento).
 * En Somnus las mesas se crean solo como links desde Admin.
 */
export default function EventMesaInvitarRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  useEffect(() => {
    if (eventId) {
      router.replace(`/eventos/${eventId}`);
    }
  }, [eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/90 px-4">
      <p className="text-white/70 text-center text-sm max-w-sm">
        Las mesas se gestionan con links desde Admin. No hay plano ni filas.
        Redirigiendo…
      </p>
    </div>
  );
}
