/** Etiqueta para boletos/ventas: evita "Mesa Mesa 5" si ya viene con prefijo. */
export function ticketTableLabel(tableKey: string): string {
  const t = tableKey.trim();
  if (!t) return "Mesa";
  if (/^mesa\s/i.test(t)) return t;
  return `Mesa ${t}`;
}

export const MAX_TABLES_PER_BATCH = 40;

/** "1" + 4 → ["1","2","3","4"]. "VIP" + 3 → ["VIP","VIP 2","VIP 3"]. */
export function expandTableNumbers(start: string, count: number): string[] {
  const trimmed = start.trim();
  const n = Math.max(
    1,
    Math.min(MAX_TABLES_PER_BATCH, Math.floor(Number(count) || 1))
  );
  if (!trimmed) return [];
  if (n === 1) return [trimmed];
  if (/^\d+$/.test(trimmed)) {
    const first = parseInt(trimmed, 10);
    return Array.from({ length: n }, (_, i) => String(first + i));
  }
  return Array.from({ length: n }, (_, i) =>
    i === 0 ? trimmed : `${trimmed} ${i + 1}`
  );
}

export function parseTableKeyFromPath(raw: string | undefined): string | null {
  if (raw == null || raw === "") return null;
  try {
    const decoded = decodeURIComponent(raw);
    const t = decoded.trim();
    if (t.length === 0 || t.length > 120 || t.includes("/")) return null;
    return t;
  } catch {
    return null;
  }
}
