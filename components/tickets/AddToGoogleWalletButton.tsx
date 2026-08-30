"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { isNativeAndroid } from "@/lib/native/platform";

interface AddToGoogleWalletButtonProps {
  ticketId: string;
  /** Flag del servidor: false cuando falta GOOGLE_WALLET_ISSUER_ID. */
  enabled: boolean;
}

/**
 * Stub UI de Google Wallet. Solo se muestra si el servidor está configurado
 * y el dispositivo es Android (o Chrome en Android). No interfiere con Apple Wallet.
 */
export function AddToGoogleWalletButton({
  ticketId,
  enabled,
}: AddToGoogleWalletButtonProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    const androidUa = /Android/i.test(ua);
    setVisible(androidUa || isNativeAndroid());
  }, []);

  if (!enabled || !visible) return null;

  async function onClick() {
    setLoading(true);
    try {
      // Stub: cuando exista el endpoint de JWT, abrir save URL de Google.
      void ticketId;
      toast.message("Google Wallet próximamente", {
        description:
          "El issuer está configurado; la firma JWT aún no está activa.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="somnus-nav-link inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg border border-white/25 bg-white/5 text-white text-sm font-medium hover:bg-white/10 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet className="w-4 h-4" aria-hidden="true" />
      {loading ? "Preparando…" : "Agregar a Google Wallet"}
    </button>
  );
}
