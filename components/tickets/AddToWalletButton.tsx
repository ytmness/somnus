"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { isAppleDevice, isNativePlatform } from "@/lib/native/platform";

interface AddToWalletButtonProps {
  ticketId: string;
  /** Flag del servidor: false cuando faltan los certificados del Pass Type ID. */
  enabled: boolean;
}

/**
 * Añade el boleto a Apple Wallet.
 *
 * Pide primero un enlace firmado (la sesión vive en el WebView) y luego lo abre.
 * En la app nativa se abre con SFSafariViewController, que es quien sabe
 * presentar el diálogo "Agregar a Apple Wallet" de un .pkpass.
 */
export function AddToWalletButton({ ticketId, enabled }: AddToWalletButtonProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVisible(isAppleDevice());
  }, []);

  if (!enabled || !visible) return null;

  async function onClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/pkpass-link`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No se pudo generar el pase");
      }

      if (isNativePlatform()) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el boleto a Apple Wallet"
      );
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
      className="somnus-nav-link inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg border border-white/25 bg-black text-white text-sm font-medium hover:bg-white/10 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet className="w-4 h-4" aria-hidden="true" />
      {loading ? "Preparando…" : "Agregar a Apple Wallet"}
    </button>
  );
}
