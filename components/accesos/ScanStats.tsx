"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanStats {
  total: number;
  successful: number;
  duplicates: number;
  invalid: number;
  cancelled: number;
  date: string;
}

export function ScanStats() {
  const [stats, setStats] = useState<ScanStats>({
    total: 0,
    successful: 0,
    duplicates: 0,
    invalid: 0,
    cancelled: 0,
    date: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/tickets/scan", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    fetchStats();
  };

  useEffect(() => {
    (window as Window & { refreshScanStats?: () => void }).refreshScanStats =
      refresh;
    return () => {
      delete (window as Window & { refreshScanStats?: () => void })
        .refreshScanStats;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="liquid-glass p-4 animate-pulse h-[88px] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      icon: Activity,
      accent: "text-[#7BA3E8]",
    },
    {
      label: "Válidos",
      value: stats.successful,
      icon: CheckCircle2,
      accent: "text-emerald-400",
    },
    {
      label: "Duplicados",
      value: stats.duplicates,
      icon: XCircle,
      accent: "text-red-400",
    },
    {
      label: "Inválidos",
      value: stats.invalid + stats.cancelled,
      icon: AlertTriangle,
      accent: "text-amber-400",
    },
  ];

  const successRate =
    stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] uppercase tracking-wider text-white/45">
          Hoy · {new Date(stats.date).toLocaleDateString("es-MX")}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="somnus-nav-link text-[11px] uppercase tracking-wider text-white/45 hover:text-white"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="liquid-glass p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-white/45 truncate">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "text-2xl sm:text-3xl font-bold tabular-nums mt-1",
                      stat.accent
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
                <Icon
                  className={cn("h-5 w-5 shrink-0 opacity-50", stat.accent)}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>

      {successRate !== null && stats.successful > 0 && (
        <p className="text-center text-xs text-white/50">
          Tasa de éxito{" "}
          <span className="font-semibold text-emerald-400">{successRate}%</span>
        </p>
      )}
    </div>
  );
}
