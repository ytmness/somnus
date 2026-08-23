"use client";

import { useEffect, useState } from "react";
import { Search, Ticket, Users } from "lucide-react";
import { toast } from "sonner";

type TicketRow = {
  id: string;
  ticketNumber: string;
  status: string;
  typeName: string;
  tableNumber: string | null;
  seatNumber: number | null;
  scannedAt: string | null;
};

type SaleRow = {
  id: string;
  status: string;
  total: number;
  eventName: string;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  tickets: TicketRow[];
};

type Customer = {
  email: string;
  name: string;
  phone: string | null;
  account: {
    id: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
  } | null;
  saleCount: number;
  ticketCount: number;
  sales: SaleRow[];
};

export function CustomersManager() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [totals, setTotals] = useState({
    customers: 0,
    users: 0,
    sales: 0,
    tickets: 0,
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (query = "") => {
    setIsLoading(true);
    try {
      const res = await fetch(
        "/api/admin/customers" + (query ? "?q=" + encodeURIComponent(query) : ""),
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setRows(data.data || []);
        setTotals(data.totals || totals);
      } else {
        toast.error(data.error || "No se pudo cargar");
      }
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm text-white/70">
        <span className="rounded-lg bg-white/5 px-3 py-1.5">{totals.customers} clientes</span>
        <span className="rounded-lg bg-white/5 px-3 py-1.5">{totals.users} usuarios</span>
        <span className="rounded-lg bg-white/5 px-3 py-1.5">{totals.sales} ventas</span>
        <span className="rounded-lg bg-white/5 px-3 py-1.5">{totals.tickets} boletos</span>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, email, teléfono"
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-white text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-white/10 px-4 text-sm text-white">
          Buscar
        </button>
      </form>

      {isLoading ? (
        <p className="text-center py-12 text-white/70">Cargando clientes...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 rounded-lg bg-white/5 border border-white/10">
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <p className="text-white/70">No hay clientes ni usuarios</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-white/90">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Cuenta</th>
                <th className="py-3 px-4">Ventas</th>
                <th className="py-3 px-4">Boletos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.email} className="border-b border-white/5 align-top">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setOpen(open === c.email ? null : c.email)}
                    >
                      <div className="text-white font-medium">{c.name || "—"}</div>
                      <div className="text-white/50">{c.email}</div>
                      {c.phone ? <div className="text-white/40">{c.phone}</div> : null}
                    </button>
                    {open === c.email && c.sales.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {c.sales.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-white/10 bg-black/20 p-3 text-white/80"
                          >
                            <div className="flex justify-between gap-2">
                              <span>{s.eventName}</span>
                              <span>
                                ${s.total.toFixed(2)} · {s.status}
                              </span>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {s.tickets.map((t) => (
                                <li key={t.id} className="flex items-center gap-2">
                                  <Ticket className="w-3.5 h-3.5 text-white/40" />
                                  <span>
                                    {t.ticketNumber} · {t.typeName} · {t.status}
                                    {t.tableNumber ? ` · ${t.tableNumber}` : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/70">
                    {c.account ? (
                      <span>
                        {c.account.role}
                        {c.account.isActive ? "" : " · inactivo"}
                      </span>
                    ) : (
                      <span className="text-white/40">sin cuenta</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/80">{c.saleCount}</td>
                  <td className="py-3 px-4 text-white/80">{c.ticketCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
