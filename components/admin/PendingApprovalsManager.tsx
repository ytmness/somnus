"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Clock,
  RefreshCw,
  Instagram,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { BuyerProfileCard } from "@/lib/profile-types";

interface PendingSaleItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  guestCount: number | null;
}

interface PendingSale {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  providerStatus: string | null;
  event: {
    id: string;
    name: string;
    artist: string;
    eventDate: string;
  };
  saleItems: PendingSaleItem[];
  buyerProfile: BuyerProfileCard | null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function PendingApprovalsManager() {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sales/pending-approvals", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar");
      setSales(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (saleId: string, action: "approve" | "reject") => {
    setActingId(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      toast.success(
        action === "approve"
          ? "Aprobada — se cobró al comprador"
          : "Solicitud rechazada — no se cobró"
      );
      setSales((prev) => prev.filter((s) => s.id !== saleId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setActingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/60">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" aria-hidden />
        Cargando aprobaciones…
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-10 h-10 text-white/40 mx-auto mb-3" aria-hidden />
        <p className="text-white/70">No hay solicitudes pendientes.</p>
        <p className="text-white/45 text-sm mt-2 max-w-md mx-auto">
          Cuando un boleto con “Requiere aprobación” se compra, aparece aquí para
          que revises el perfil del cliente antes de cobrar.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="mt-4 border-white/30 text-white bg-transparent hover:bg-white/10"
        >
          Actualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-white/60 text-sm">
          {sales.length} solicitud{sales.length !== 1 ? "es" : ""} — revisa el
          perfil y aprueba para cobrar
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          className="border-white/30 text-white bg-transparent hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden />
          Actualizar
        </Button>
      </div>

      {sales.map((sale) => {
        const bp = sale.buyerProfile;
        const displayName = bp?.name || sale.buyerName;
        const displayPhone = bp?.phone || sale.buyerPhone;
        const avatarUrl = bp?.avatarUrl;

        return (
          <article
            key={sale.id}
            className="liquid-glass rounded-xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/55">
                      {initials(displayName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-white font-semibold truncate text-lg">
                      {displayName}
                    </p>
                    {bp?.emailVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#9BB8F0]">
                        <ShieldCheck className="w-3 h-3" aria-hidden />
                        Verified
                      </span>
                    )}
                    {!bp?.hasAccount && (
                      <span className="text-[10px] uppercase tracking-wider text-amber-200/80 bg-amber-500/15 px-2 py-0.5 rounded-full">
                        Guest checkout
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm truncate">
                    {sale.buyerEmail}
                  </p>
                  {displayPhone && (
                    <p className="text-white/50 text-sm">{displayPhone}</p>
                  )}
                  {bp?.instagramUsername && (
                    <a
                      href={`https://instagram.com/${bp.instagramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
                    >
                      <Instagram className="w-3.5 h-3.5" aria-hidden />@
                      {bp.instagramUsername}
                    </a>
                  )}
                  {bp?.bio && (
                    <p className="text-sm text-white/55 text-pretty line-clamp-3">
                      {bp.bio}
                    </p>
                  )}
                  {bp && (
                    <p className="text-xs text-white/40 pt-0.5">
                      {bp.completedPurchases} compra
                      {bp.completedPurchases !== 1 ? "s" : ""} ·{" "}
                      {bp.communities} comunidad
                      {bp.communities !== 1 ? "es" : ""}
                      {bp.memberSince
                        ? ` · miembro desde ${new Date(
                            bp.memberSince
                          ).toLocaleDateString("es-MX")}`
                        : ""}
                    </p>
                  )}
                  {bp?.userId && (
                    <Link
                      href={`/perfil/${bp.userId}`}
                      className="inline-flex items-center gap-1 text-xs text-[#9BB8F0] hover:text-white mt-1"
                    >
                      Ver perfil completo
                      <ExternalLink className="w-3 h-3" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-white font-bold tabular-nums text-lg">
                  $
                  {sale.total.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </p>
                <p className="text-white/45 text-xs mt-0.5">
                  Autorizado — se cobra al aprobar
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {new Date(sale.createdAt).toLocaleString("es-MX")}
                </p>
              </div>
            </div>

            <div className="text-sm text-white/70 border-t border-white/10 pt-3">
              <p className="font-medium text-white/90">
                {sale.event.name} · {sale.event.artist}
              </p>
              <ul className="mt-1 space-y-0.5">
                {sale.saleItems.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.ticketTypeName}
                    {item.guestCount ? ` (${item.guestCount} personas)` : ""}
                  </li>
                ))}
              </ul>
              {sale.providerStatus && (
                <p className="text-xs text-white/45 mt-1">
                  Pago: {sale.providerStatus}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                onClick={() => void handleAction(sale.id, "approve")}
                disabled={actingId === sale.id}
                className="somnus-btn flex-1 sm:flex-none"
              >
                <Check className="w-4 h-4 mr-1.5" aria-hidden />
                Aprobar y cobrar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleAction(sale.id, "reject")}
                disabled={actingId === sale.id}
                className="flex-1 sm:flex-none border-red-400/40 text-red-300 hover:bg-red-500/10 bg-transparent"
              >
                <X className="w-4 h-4 mr-1.5" aria-hidden />
                Rechazar
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
