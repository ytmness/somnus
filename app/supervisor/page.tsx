"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, TrendingUp } from "lucide-react";

export default function SupervisorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{
    report?: {
      summary?: {
        salesCount: number;
        buyerTotal: number;
        organizerPayouts: number;
        platformCommission: number;
      };
    };
    recentPosSales?: Array<{
      id: string;
      total: string;
      paidAt: string;
      buyerName: string;
      event: { name: string };
      user?: { name: string } | null;
    }>;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const session = await sessionRes.json();
        if (!session.user) {
          router.push("/login?redirect=/supervisor");
          return;
        }
        const hasAccess =
          session.user.role === "ADMIN" ||
          session.user.role === "SUPERVISOR" ||
          session.user.staffRoles?.includes("SUPERVISOR");
        if (!hasAccess) {
          router.push("/");
          return;
        }

        const res = await fetch("/api/supervisor/reports", { credentials: "include" });
        const data = await res.json();
        if (res.ok) setReport(data.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totals = report?.report?.summary;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h1 className="font-bold text-lg">Supervisor — Cortes</h1>
          </div>
          <Link href="/" className="text-white/60 text-sm hover:text-white">
            Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/50 text-sm">Ventas</p>
            <p className="text-2xl font-bold">{totals?.salesCount ?? 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/50 text-sm">Ingreso bruto</p>
            <p className="text-xl font-bold">
              {formatMoney(totals?.buyerTotal ?? 0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/50 text-sm">Neto organizador</p>
            <p className="text-xl font-bold">
              {formatMoney(totals?.organizerPayouts ?? 0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/50 text-sm">Comisión plataforma</p>
            <p className="text-xl font-bold">
              {formatMoney(totals?.platformCommission ?? 0)}
            </p>
          </div>
        </div>

        <section>
          <h2 className="font-semibold mb-4">Últimas ventas POS</h2>
          {!report?.recentPosSales?.length ? (
            <p className="text-white/50">Sin ventas POS recientes.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/60">
                    <th className="text-left p-3">Evento</th>
                    <th className="text-left p-3">Comprador</th>
                    <th className="text-left p-3">Vendedor</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentPosSales.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="p-3">{s.event.name}</td>
                      <td className="p-3">{s.buyerName}</td>
                      <td className="p-3">{s.user?.name || "—"}</td>
                      <td className="p-3 text-right">
                        {formatMoney(Number(s.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
