/** Etiqueta para boletos/ventas: evita "Mesa Mesa 5" si ya viene con prefijo. */
export function ticketTableLabel(tableKey: string): string {
  const t = tableKey.trim();
  if (!t) return "Mesa";
  if (/^mesa\s/i.test(t)) return t;
  return `Mesa ${t}`;
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
