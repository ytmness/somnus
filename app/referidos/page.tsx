"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Upload, Gift } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, type SessionUser } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

interface ReferralData {
  code: string;
  shareUrl: string;
  referredCount: number;
  activeReferrals: number;
  totalEarned: number;
  program: { revenueSharePct: number; durationMonths: number };
}

export default function ReferidosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUserChange = useCallback((u: SessionUser | null) => {
    setUser(u);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", {
          credentials: "include",
        });
        const sessionJson = await sessionRes.json();
        if (!sessionJson.user) {
          router.push("/login");
          return;
        }
        setUser(sessionJson.user);

        const res = await fetch("/api/referrals", { credentials: "include" });
        const json = await res.json();
        if (res.ok && json.data) setData(json.data);
        else toast.error(json.error || "No se pudo cargar referidos");
      } catch {
        toast.error("Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router]);

  const copyShare = async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const onCsv = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Error al importar");
        return;
      }
      toast.success(
        `Importados ${json.data?.importedRows ?? 0} de ${json.data?.totalRows ?? 0}`
      );
    } catch {
      toast.error("Error al importar CSV");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main">
      <SiteHeader eventsHref="/" onUserChange={handleUserChange} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 lg:pt-32 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-7 h-7 text-white/80" aria-hidden />
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">
            Programa de referidos
          </h1>
        </div>
        <p className="text-white/60 text-sm mb-8">
          Gana el {data?.program.revenueSharePct ?? 15}% de la comisión de
          plataforma de organizadores que invites, durante{" "}
          {data?.program.durationMonths ?? 12} meses.
        </p>

        {loading ? (
          <p className="text-white/60">Cargando…</p>
        ) : data ? (
          <div className="space-y-8">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Tu código
              </p>
              <p className="text-3xl font-mono text-white tracking-wide">
                {data.code}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <code className="text-xs text-white/50 break-all flex-1">
                  {data.shareUrl}
                </code>
                <Button type="button" onClick={copyShare} variant="outline">
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  Copiar link
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-white/40 text-xs">Referidos</p>
                  <p className="text-xl text-white">{data.referredCount}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Activos</p>
                  <p className="text-xl text-white">{data.activeReferrals}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Ganancias est.</p>
                  <p className="text-xl text-white">
                    ${Number(data.totalEarned).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg text-white font-medium">Cómo funciona</h2>
              <ol className="list-decimal list-inside text-white/70 text-sm space-y-2">
                <li>Comparte tu link o código con organizadores nuevos.</li>
                <li>
                  Cuando se registran con tu código, quedan atribuidos{" "}
                  {data.program.durationMonths} meses.
                </li>
                <li>
                  Recibes el {data.program.revenueSharePct}% de la fee de
                  plataforma de sus ventas completadas.
                </li>
              </ol>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <h2 className="text-lg text-white font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importar contactos (CSV)
              </h2>
              <p className="text-white/50 text-sm">
                Columnas: email, name, phone
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={uploading}
                onChange={(e) => onCsv(e.target.files?.[0] || null)}
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:text-black file:px-3 file:py-1.5"
              />
              {user && (
                <p className="text-white/40 text-xs">
                  Sesión: {user.email}
                </p>
              )}
            </section>
          </div>
        ) : (
          <p className="text-white/60">No hay datos de referidos.</p>
        )}
      </main>
    </div>
  );
}
