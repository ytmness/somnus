"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  ReceiptPrinter,
  type ReceiptPrinterStage,
} from "@/components/receipt/ReceiptPrinter";
import { SOMNUS_LOGO_PATH } from "@/lib/brand";
import {
  cn,
  formatCurrency,
  formatEventCalendarDate,
} from "@/lib/utils";

type SaleLine = {
  id: string;
  quantity: number;
  ticketTypeName?: string | null;
  addOnName?: string | null;
  isTable?: boolean;
  tableNumber?: string | null;
  guestCount?: number | null;
};

type SaleReceipt = {
  id: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  event?: {
    name?: string | null;
    artist?: string | null;
    venue?: string | null;
    city?: string | null;
    eventDate?: string | null;
    eventTime?: string | null;
  } | null;
  saleItems?: SaleLine[];
};

function money(value: number | string | null | undefined) {
  return formatCurrency(Number(value || 0));
}

function lineLabel(item: SaleLine) {
  if (item.addOnName) return item.addOnName;
  if (item.ticketTypeName) return item.ticketTypeName;
  if (item.isTable) {
    return item.tableNumber ? `Mesa ${item.tableNumber}` : "Mesa";
  }
  return "Boleto";
}

function SomnusMark() {
  return (
    <img
      alt="Somnus"
      className="h-6 w-auto object-contain"
      src={SOMNUS_LOGO_PATH}
    />
  );
}

export function CheckoutReceipt({
  email,
  saleId,
}: {
  email: string | null;
  saleId: string | null;
}) {
  const [stage, setStage] = useState<ReceiptPrinterStage>("processing");
  const [sale, setSale] = useState<SaleReceipt | null>(null);

  useEffect(() => {
    if (!saleId) return;
    let cancelled = false;

    async function loadSale() {
      try {
        const res = await fetch(`/api/sales/${saleId}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data?.data) {
          setSale(data.data as SaleReceipt);
        }
      } catch {
        // El recibo visual sigue funcionando con email / fallback.
      }
    }

    void loadSale();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setStage("complete");
      return;
    }

    const printTimer = window.setTimeout(() => setStage("printing"), 700);
    const doneTimer = window.setTimeout(() => setStage("complete"), 2450);
    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const eventName = sale?.event?.name || "Evento Somnus";
  const eventMeta = useMemo(() => {
    if (!sale?.event) return [];
    const date = sale.event.eventDate
      ? formatEventCalendarDate(sale.event.eventDate, "es-MX")
      : null;
    const venue = [sale.event.venue, sale.event.city].filter(Boolean).join(", ");
    return [date, sale.event.eventTime, venue].filter(Boolean) as string[];
  }, [sale]);

  const items = sale?.saleItems?.length
    ? sale.saleItems
    : [{ id: "fallback", quantity: 1, ticketTypeName: "Compra confirmada" }];

  const receiptEmail = sale?.buyerEmail || email;
  const folio = sale?.id ? sale.id.slice(0, 8).toUpperCase() : null;
  const paidAt = sale?.paidAt || sale?.createdAt;
  const paidLabel = paidAt
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(paidAt))
    : null;

  return (
    <div className="flex w-full flex-col items-center">
      <ReceiptPrinter.Root stage={stage}>
        <ReceiptPrinter.Machine>
          <ReceiptPrinter.Header>
            <SomnusMark />
            <Link
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 transition-transform duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97]"
              href="/"
            >
              <Home aria-hidden="true" className="size-3.5" />
              Inicio
            </Link>
          </ReceiptPrinter.Header>

          <ReceiptPrinter.Screen>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{eventName}</p>
                  <p className="mt-1 truncate text-xs text-white/55">
                    {sale?.event?.artist || "Somnus Live"}
                  </p>
                </div>
                <strong className="shrink-0 text-white">
                  {sale ? money(sale.total) : ""}
                </strong>
              </div>
              <ReceiptPrinter.Status />
            </div>
          </ReceiptPrinter.Screen>
        </ReceiptPrinter.Machine>

        <ReceiptPrinter.Output>
          <ReceiptPrinter.Paper>
            <div className="relative z-10 space-y-4 text-[12px] leading-relaxed">
              <header className="text-center">
                <img
                  alt=""
                  className="mx-auto h-7 w-auto object-contain brightness-0"
                  src={SOMNUS_LOGO_PATH}
                />
                <h2 className="mt-3 font-sans text-lg font-semibold tracking-tight">
                  Recibo
                </h2>
                {folio ? (
                  <p className="mt-1 text-[11px] text-[#161616]/55">
                    Folio {folio}
                  </p>
                ) : null}
              </header>

              <hr className="border-[#161616]/15" />

              <div>
                <p className="font-sans text-sm font-semibold">{eventName}</p>
                {sale?.event?.artist ? (
                  <p className="text-[#161616]/70">{sale.event.artist}</p>
                ) : null}
                {eventMeta.length > 0 ? (
                  <div className="mt-1 space-y-0.5 text-[11px] text-[#161616]/55">
                    {eventMeta.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              <dl className="space-y-2">
                {items.map((item) => (
                  <div
                    className="flex items-start justify-between gap-3"
                    key={item.id}
                  >
                    <dt>
                      {lineLabel(item)}
                      {item.guestCount ? ` (${item.guestCount} pers.)` : ""}
                    </dt>
                    <dd className="shrink-0">x{item.quantity}</dd>
                  </div>
                ))}
              </dl>

              <hr className="border-dashed border-[#161616]/20" />

              <dl className="space-y-1.5">
                {sale ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt>Subtotal</dt>
                      <dd>{money(sale.subtotal)}</dd>
                    </div>
                    {Number(sale.tax || 0) > 0 ? (
                      <div className="flex justify-between gap-3">
                        <dt>Cargo de servicio</dt>
                        <dd>{money(sale.tax)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-3 font-sans text-sm font-semibold">
                      <dt>Total pagado</dt>
                      <dd>{money(sale.total)}</dd>
                    </div>
                  </>
                ) : (
                  <p>Tu pago fue procesado correctamente.</p>
                )}
              </dl>

              <div className="text-[11px] text-[#161616]/65">
                {sale?.buyerName ? <p>{sale.buyerName}</p> : null}
                {receiptEmail ? <p>{receiptEmail}</p> : null}
                {paidLabel ? <p>{paidLabel}</p> : null}
              </div>

              <p className="text-center text-[11px] text-[#161616]/70">
                Gracias por tu pedido. Tus boletos también van a tu correo.
              </p>
            </div>
          </ReceiptPrinter.Paper>
        </ReceiptPrinter.Output>
      </ReceiptPrinter.Root>

      <div
        aria-hidden={stage !== "complete"}
        className={cn(
          "mt-36 flex w-full max-w-sm flex-col gap-3 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-200 ease-out sm:flex-row",
          stage === "complete"
            ? "opacity-100"
            : "invisible pointer-events-none opacity-0"
        )}
      >
        <Link
          className="flex-1 rounded-xl bg-[#5B8DEF] py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#7BA3E8] active:scale-[0.98]"
          href="/mis-boletos"
        >
          Ver mis boletos
        </Link>
        <Link
          className="flex-1 rounded-xl border border-white/20 bg-white/10 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-white/15 active:scale-[0.98]"
          href="/"
        >
          Volver a eventos
        </Link>
      </div>
    </div>
  );
}
