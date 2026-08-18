"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Play, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type HistoryItem = {
  id: string;
  createdAt: string;
  changes: {
    sql?: string;
    kind?: string;
    rowCount?: number;
    affected?: number;
  } | null;
  user?: { email: string; name: string } | null;
};

function isSelectLike(sql: string): boolean {
  const head = sql.trim().replace(/^\(/, "").toLowerCase();
  return (
    head.startsWith("select") ||
    head.startsWith("with") ||
    head.startsWith("show") ||
    head.startsWith("explain")
  );
}

export function SqlEditorManager() {
  const [sql, setSql] = useState("SELECT id, email, role FROM \"User\" LIMIT 20;");
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [writeResult, setWriteResult] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sql");
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const runSql = async (confirmWrite = false) => {
    setLoading(true);
    setWriteResult(null);
    try {
      const res = await fetch("/api/admin/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, confirmWrite }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfirmation) {
          setConfirmOpen(true);
          return;
        }
        throw new Error(data.error || "Error al ejecutar SQL");
      }

      if (data.kind === "select") {
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setWriteResult(null);
        if (data.truncatedHint) toast.message(data.truncatedHint);
      } else {
        setColumns([]);
        setRows([]);
        setWriteResult(`Filas afectadas: ${data.affected ?? 0}`);
        toast.success("Sentencia ejecutada");
      }
      setConfirmOpen(false);
      void loadHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error SQL");
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => {
    if (!sql.trim()) {
      toast.error("Escribe una sentencia SQL");
      return;
    }
    if (!isSelectLike(sql)) {
      setConfirmOpen(true);
      return;
    }
    void runSql(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100 text-sm flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Editor SQL con lectura y escritura</p>
          <p className="text-amber-100/80">
            Una sola sentencia por ejecución. Haz backup de Postgres antes de
            escrituras masivas (
            <code className="bg-black/30 px-1 rounded">scripts/backup-postgres.sh</code>
            ). Toda escritura queda en AuditLog.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-white/70 text-sm mb-2 uppercase tracking-wider">
          SQL
        </label>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full font-mono text-sm rounded-xl bg-black/50 border border-white/15 text-white p-4 focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder='SELECT * FROM "Event" LIMIT 10;'
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="bg-white text-black hover:bg-white/90"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? "Ejecutando..." : "Ejecutar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadHistory()}
            className="border-white/20 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Historial
          </Button>
        </div>
      </div>

      {confirmOpen &&
        isMounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sql-confirm-title"
          >
            <div className="liquid-glass max-w-lg w-full p-6 rounded-2xl space-y-4">
              <h3 id="sql-confirm-title" className="text-white text-lg font-bold">
                Confirmar escritura
              </h3>
              <p className="text-white/70 text-sm">
                Esta sentencia no es SELECT y puede modificar o borrar datos.
                ¿Seguro que quieres continuar?
              </p>
              <pre className="text-xs bg-black/40 p-3 rounded-lg text-white/80 overflow-auto max-h-40 whitespace-pre-wrap">
                {sql}
              </pre>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={loading}
                  onClick={() => void runSql(true)}
                >
                  Sí, ejecutar
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {writeResult && (
        <p className="text-emerald-300 text-sm font-medium">{writeResult}</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-auto rounded-xl border border-white/10 max-h-[420px]">
          <table className="min-w-full text-sm text-left text-white/90">
            <thead className="bg-white/10 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap max-w-xs truncate">
                      {row[col] === null || row[col] === undefined
                        ? "NULL"
                        : typeof row[col] === "object"
                          ? JSON.stringify(row[col])
                          : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="text-white font-semibold mb-3">Historial reciente</h3>
        <ul className="space-y-2 text-sm">
          {history.length === 0 && (
            <li className="text-white/40">Sin ejecuciones aún</li>
          )}
          {history.map((h) => (
            <li
              key={h.id}
              className="rounded-lg bg-white/5 border border-white/10 p-3 cursor-pointer hover:bg-white/10"
              onClick={() => {
                if (h.changes?.sql) setSql(h.changes.sql);
              }}
            >
              <div className="flex justify-between gap-2 text-white/50 text-xs mb-1">
                <span>
                  {h.user?.email || "admin"} · {h.changes?.kind || "?"}
                </span>
                <span>{new Date(h.createdAt).toLocaleString("es-MX")}</span>
              </div>
              <pre className="text-white/80 whitespace-pre-wrap font-mono text-xs">
                {(h.changes?.sql || "").slice(0, 200)}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
