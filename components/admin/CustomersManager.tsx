"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Download, Search, Ticket, Users } from "lucide-react";
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
  eventId: string;
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

type FilterId = "buyers" | "account" | "guest" | "all";
type SortId = "name" | "tickets" | "paid" | "recent";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "buyers", label: "Compradores" },
  { id: "account", label: "Con cuenta" },
  { id: "guest", label: "Sin cuenta" },
  { id: "all", label: "Todos" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ORGANIZER: "Organizador",
  VENDEDOR: "Vendedor",
  SUPERVISOR: "Supervisor",
  ACCESOS: "Accesos",
  CLIENTE: "Cliente",
};

const SALE_STATUS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Pagada",
  CANCELLED: "Cancelada",
  REFUNDED: "Reembolsada",
};

const TICKET_STATUS: Record<string, string> = {
  VALID: "Válido",
  USED: "Usado",
  CANCELLED: "Cancelado",
  REPRINTED: "Reimpreso",
};

function labelOf(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] || value;
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd/MM/yyyy HH:mm");
}

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function salesFor(customer: Customer, eventId: string) {
  if (eventId === "all") return customer.sales;
  return customer.sales.filter((sale) => sale.eventId === eventId);
}

function latestOf(sales: SaleRow[]) {
  return sales.reduce<SaleRow | null>((latest, sale) => {
    if (!latest) return sale;
    return new Date(sale.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? sale
      : latest;
  }, null);
}

function paidOf(sales: SaleRow[]) {
  return sales.reduce((sum, sale) => (sale.status === "COMPLETED" ? sum + sale.total : sum), 0);
}

function ticketCountOf(sales: SaleRow[]) {
  return sales.reduce((sum, sale) => sum + sale.tickets.length, 0);
}

function eventNamesOf(sales: SaleRow[]) {
  return Array.from(new Set(sales.map((sale) => sale.eventName)));
}

function activityTime(customer: Customer, sales: SaleRow[]) {
  const sale = latestOf(sales);
  const saleTime = sale ? new Date(sale.createdAt).getTime() : 0;
  const accountTime = customer.account ? new Date(customer.account.createdAt).getTime() : 0;
  return Math.max(saleTime, accountTime);
}

function matchesQuery(customer: Customer, sales: SaleRow[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    customer.name,
    customer.email,
    customer.phone,
    ...sales.flatMap((sale) => [
      sale.eventName,
      sale.paymentMethod,
      ...sale.tickets.map((ticket) => ticket.ticketNumber),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xml(value == null ? "" : String(value))}</Data></Cell>`;
}

function sheet(name: string, rows: (string | number | null | undefined)[][], widths: number[]) {
  const columns = widths.map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("");
  const body = rows
    .map((row, index) => {
      const cells = row
        .map((value) =>
          index === 0 ? cell(value).replace("<Cell>", '<Cell ss:StyleID="hdr">') : cell(value)
        )
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  return (
    `<Worksheet ss:Name="${xml(name)}">` +
    `<Table>${columns}${body}</Table>` +
    `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">` +
    `<FreezePanes/><FrozenNoScroll/><SplitHorizontal>1</SplitHorizontal>` +
    `<TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>` +
    `</WorksheetOptions></Worksheet>`
  );
}

function downloadExcel(customers: Customer[], eventId: string) {
  const people: (string | number | null | undefined)[][] = [
    [
      "Nombre",
      "Email",
      "Teléfono",
      "Cuenta",
      "Estado de cuenta",
      "Email verificado",
      "Eventos",
      "Ventas",
      "Boletos",
      "Pagado",
      "Última compra",
      "Último evento",
    ],
  ];

  const tickets: (string | number | null | undefined)[][] = [
    [
      "Nombre",
      "Email",
      "Teléfono",
      "Evento",
      "Estado de venta",
      "Total",
      "Método de pago",
      "Fecha",
      "Número de boleto",
      "Tipo",
      "Estado del boleto",
      "Mesa",
      "Asiento",
      "Escaneado",
    ],
  ];

  const ordered = [...customers].sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, "es")
  );

  for (const customer of ordered) {
    const sales = salesFor(customer, eventId);
    const last = latestOf(sales);
    const events = eventNamesOf(sales);
    people.push([
      customer.name || "",
      customer.email,
      customer.phone || "",
      customer.account ? labelOf(ROLE_LABEL, customer.account.role) : "Sin cuenta",
      customer.account ? (customer.account.isActive ? "Activa" : "Inactiva") : "",
      customer.account ? (customer.account.emailVerified ? "Sí" : "No") : "",
      events.join(", "),
      sales.length,
      ticketCountOf(sales),
      Math.round(paidOf(sales) * 100) / 100,
      last ? formatWhen(last.paidAt || last.createdAt) : "",
      last?.eventName || "",
    ]);

    const salesByEvent = [...sales].sort((a, b) =>
      a.eventName.localeCompare(b.eventName, "es") ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const sale of salesByEvent) {
      const shared = [
        customer.name || "",
        customer.email,
        customer.phone || "",
        sale.eventName,
        labelOf(SALE_STATUS, sale.status),
        sale.total,
        sale.paymentMethod || "",
        formatWhen(sale.paidAt || sale.createdAt),
      ];
      if (sale.tickets.length === 0) {
        tickets.push([...shared, "", "", "", "", "", ""]);
        continue;
      }
      for (const ticket of sale.tickets) {
        tickets.push([
          ...shared,
          ticket.ticketNumber,
          ticket.typeName,
          labelOf(TICKET_STATUS, ticket.status),
          ticket.tableNumber || "",
          ticket.seatNumber ?? "",
          ticket.scannedAt ? formatWhen(ticket.scannedAt) : "",
        ]);
      }
    }
  }

  const workbook =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/></Style></Styles>` +
    sheet("Clientes", people, [160, 200, 120, 110, 120, 120, 220, 70, 70, 90, 140, 180]) +
    sheet("Boletos", tickets, [160, 200, 120, 180, 110, 80, 120, 140, 140, 120, 120, 80, 70, 140]) +
    `</Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clientes-somnus-${format(new Date(), "yyyy-MM-dd")}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CustomersManager() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("buyers");
  const [sort, setSort] = useState<SortId>("name");
  const [eventId, setEventId] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [serverQuery, setServerQuery] = useState("");

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
        setTruncated(Boolean(data.truncated));
        setServerQuery(query.trim());
        setOpen(null);
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

  const events = useMemo(() => {
    const names = new Map<string, string>();
    for (const customer of rows) {
      for (const sale of customer.sales) {
        if (sale.eventId) names.set(sale.eventId, sale.eventName);
      }
    }
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const visible = useMemo(() => {
    const filtered = rows.filter((customer) => {
      const sales = salesFor(customer, eventId);
      if (eventId !== "all" && sales.length === 0) return false;
      if (filter === "buyers" && sales.length === 0) return false;
      if (filter === "account" && !customer.account) return false;
      if (filter === "guest" && customer.account) return false;
      return matchesQuery(customer, sales, q);
    });

    return filtered.sort((a, b) => {
      const salesA = salesFor(a, eventId);
      const salesB = salesFor(b, eventId);
      if (sort === "tickets") {
        return ticketCountOf(salesB) - ticketCountOf(salesA) || salesB.length - salesA.length;
      }
      if (sort === "paid") return paidOf(salesB) - paidOf(salesA);
      if (sort === "recent") return activityTime(b, salesB) - activityTime(a, salesA);
      return (a.name || a.email).localeCompare(b.name || b.email, "es");
    });
  }, [rows, filter, sort, eventId, q]);

  const stats = useMemo(() => {
    return visible.reduce(
      (acc, customer) => {
        const sales = salesFor(customer, eventId);
        acc.sales += sales.length;
        acc.tickets += ticketCountOf(sales);
        acc.paid += paidOf(sales);
        return acc;
      },
      { customers: visible.length, sales: 0, tickets: 0, paid: 0 }
    );
  }, [visible, eventId]);

  const summary = [
    { label: "En esta vista", value: String(stats.customers) },
    { label: "Ventas", value: String(stats.sales) },
    { label: "Boletos", value: String(stats.tickets) },
    { label: "Pagado", value: formatMoney(stats.paid) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load(q);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={q}
              onChange={(e) => {
                const next = e.target.value;
                setQ(next);
                if (!next.trim() && serverQuery) void load("");
              }}
              placeholder="Nombre, email, teléfono, evento o boleto"
              aria-label="Buscar clientes"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-white/10 px-4 text-sm text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Buscar
          </button>
        </form>

        <button
          type="button"
          disabled={isLoading || visible.length === 0}
          onClick={() => {
            downloadExcel(visible, eventId);
            toast.success(
              `Excel listo: ${visible.length} cliente${visible.length === 1 ? "" : "s"}`
            );
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" aria-hidden />
          Descargar Excel
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar clientes">
          {FILTERS.map((item) => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(item.id)}
                className={
                  selected
                    ? "rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    : "rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="customer-event">
            Filtrar por evento
          </label>
          <select
            id="customer-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="max-w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <option value="all">Todos los eventos</option>
            {events.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="customer-sort">
            Ordenar clientes
          </label>
          <select
            id="customer-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <option value="name">Nombre</option>
            <option value="tickets">Más boletos</option>
            <option value="paid">Más pagado</option>
            <option value="recent">Más recientes</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-white/45">
        El Excel descarga esta vista en dos hojas: Clientes y Boletos.
        {truncated
          ? " La lista está recortada; busca un nombre o boleto para traer el resto."
          : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <p className="sr-only">Cargando clientes</p>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 py-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <p className="text-white/70">
            {rows.length === 0
              ? "No hay clientes ni usuarios con esa búsqueda."
              : q.trim()
                ? "Nadie coincide aquí. Pulsa Buscar para consultar todos los registros."
                : "Nadie coincide con este filtro."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 bg-black/80 text-left text-white/80 backdrop-blur">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Eventos</th>
                <th className="px-4 py-3 font-medium">Boletos</th>
                <th className="px-4 py-3 font-medium">Pagado</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => {
                const expanded = open === customer.email;
                const sales = salesFor(customer, eventId);
                const last = latestOf(sales);
                const eventsForRow = eventNamesOf(sales);
                return (
                  <Fragment key={customer.email || customer.sales[0]?.id || customer.name}>
                    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : customer.email)}
                          className="flex items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                          <ChevronDown
                            className={`mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform ${
                              expanded ? "rotate-180" : ""
                            }`}
                            aria-hidden
                          />
                          <span>
                            <span className="block font-medium text-white">
                              {customer.name || "Sin nombre"}
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                              {customer.account
                                ? labelOf(ROLE_LABEL, customer.account.role)
                                : "Sin cuenta"}
                              {customer.account && !customer.account.isActive ? " · inactiva" : ""}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top text-white/70">
                        <div>{customer.email}</div>
                        <div className="text-white/40">{customer.phone || "Sin teléfono"}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-white/75">
                        {eventsForRow.length === 0 ? (
                          <span className="text-white/40">Sin eventos</span>
                        ) : (
                          <span>
                            {eventsForRow.slice(0, 2).join(", ")}
                            {eventsForRow.length > 2 ? ` +${eventsForRow.length - 2}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-white/80">{ticketCountOf(sales)}</td>
                      <td className="px-4 py-3 align-top text-white/80">
                        {formatMoney(paidOf(sales))}
                      </td>
                      <td className="px-4 py-3 align-top text-white/70">
                        {last ? (
                          <>
                            <div className="text-white">{last.eventName}</div>
                            <div className="text-white/40">
                              {formatWhen(last.paidAt || last.createdAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-white/40">Sin compras</span>
                        )}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-white/5">
                        <td colSpan={6} className="bg-black/25 px-4 py-4">
                          {sales.length === 0 ? (
                            <p className="text-sm text-white/55">
                              Tiene cuenta y todavía no registra compras.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {sales.map((sale) => (
                                <div
                                  key={sale.id}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium text-white">{sale.eventName}</p>
                                    <p className="text-sm text-white/60">
                                      {formatMoney(sale.total)} · {labelOf(SALE_STATUS, sale.status)} ·{" "}
                                      {formatWhen(sale.paidAt || sale.createdAt)}
                                    </p>
                                  </div>
                                  {sale.tickets.length === 0 ? (
                                    <p className="text-sm text-white/45">Venta sin boletos.</p>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-left text-white/40">
                                          <th className="py-1 pr-3 font-medium">Boleto</th>
                                          <th className="py-1 pr-3 font-medium">Tipo</th>
                                          <th className="py-1 pr-3 font-medium">Estado</th>
                                          <th className="py-1 pr-3 font-medium">Mesa</th>
                                          <th className="py-1 font-medium">Asiento</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sale.tickets.map((ticket) => (
                                          <tr key={ticket.id} className="text-white/75">
                                            <td className="py-1 pr-3">
                                              <span className="inline-flex items-center gap-1.5">
                                                <Ticket className="h-3.5 w-3.5 text-white/35" aria-hidden />
                                                {ticket.ticketNumber}
                                              </span>
                                            </td>
                                            <td className="py-1 pr-3">{ticket.typeName}</td>
                                            <td className="py-1 pr-3">
                                              {labelOf(TICKET_STATUS, ticket.status)}
                                            </td>
                                            <td className="py-1 pr-3">{ticket.tableNumber || "—"}</td>
                                            <td className="py-1">{ticket.seatNumber ?? "—"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
