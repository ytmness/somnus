"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";

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

  // Cargar estadísticas al montar y cada 5 segundos
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Función pública para refrescar stats desde el componente padre
  const refresh = () => {
    fetchStats();
  };

  // Exponer función refresh
  useEffect(() => {
    (window as any).refreshScanStats = refresh;
    return () => {
      delete (window as any).refreshScanStats;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-12 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Escaneos",
      value: stats.total,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Accesos Válidos",
      value: stats.successful,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Duplicados",
      value: stats.duplicates,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Inválidos",
      value: stats.invalid + stats.cancelled,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-600">
          Estadísticas de Hoy - {new Date(stats.date).toLocaleDateString("es-MX")}
        </h2>
        <button
          onClick={refresh}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`p-4 ${stat.bgColor} border-2 border-gray-200 hover:border-gray-300 transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color} opacity-60`} />
              </div>
            </Card>
          );
        })}
      </div>

      {stats.successful > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Tasa de éxito:{" "}
            <span className="font-bold text-green-600">
              {((stats.successful / stats.total) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
}


