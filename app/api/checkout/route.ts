import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { generateQRHash } from "@/lib/services/qr-generator";
import { calculateSaleAmounts } from "@/lib/payments/commissions";
import { isStripeEnabled } from "@/lib/payments/config";
import {
  effectiveTicketPriceAt,
  priceForGuestCount,
} from "@/lib/ticket-pricing";
import { ticketTypeInclude } from "@/lib/ticket-type-persist";
import {
  newBalancePayToken,
  verifyTicketPasswordToken,
} from "@/lib/ticket-access";
import {
  isSalesOpen,
  salesOpenStatus,
} from "@/lib/ticket-sales-window";
import type { TicketKind } from "@prisma/client";

export const dynamic = "force-dynamic";

type CheckoutLineItem = {
  ticketTypeId?: string;
  section?: { id: string; name?: string };
  quantity?: number;
  guestCount?: number;
  /** Legacy mesa VIP por mapa */
  table?: { number: string; price: number };
};

type TicketDetail = {
  ticketTypeId: string;
  quantity: number;
  isTable: boolean;
  tableNumber?: string;
  guestCount?: number;
  lineTotal: number;
  fullLineTotal: number;
  depositEnabled: boolean;
  depositPercent: number | null;
  requiresApproval: boolean;
};

function isTicketTypeVisible(kind: TicketKind, isTable: boolean): boolean {
  if (kind === "TABLE") return true;
  if (kind === "STANDARD" && !isTable) return true;
  return false;
}

function resolveTicketTypeId(item: CheckoutLineItem): string | null {
  if (item.ticketTypeId) return item.ticketTypeId;
  if (item.section?.id) return item.section.id;
  return null;
}

/**
 * POST /api/checkout
 * Crear una orden/venta desde el carrito
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      items,
      passwordTokens = {},
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentMethod,
    } = body as {
      eventId?: string;
      items?: CheckoutLineItem[];
      passwordTokens?: Record<string, string>;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      paymentMethod?: string;
    };

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Datos inválidos: se requiere eventId e items" },
        { status: 400 }
      );
    }

    if (!buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Se requiere nombre y email del comprador" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          include: ticketTypeInclude,
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const now = new Date();
    const ticketDetails: TicketDetail[] = [];
    const cartTicketTypeIds = new Set<string>();

    for (const item of items) {
      if (item.table) {
        const want = Number(item.table.price);
        const ticketType = event.ticketTypes.find((tt) => {
          if (!tt.isTable || tt.kind !== "TABLE") return false;
          const unit = effectiveTicketPriceAt(
            Number(tt.price),
            tt.pricePhases,
            now
          );
          return Math.abs(unit - want) < 0.02;
        });

        if (!ticketType) {
          return NextResponse.json(
            {
              error: `Tipo de boleto no encontrado para mesa ${item.table.number}`,
            },
            { status: 400 }
          );
        }

        cartTicketTypeIds.add(ticketType.id);
        const validation = validateTicketTypeForPurchase(
          event,
          ticketType,
          1,
          passwordTokens[ticketType.id],
          now
        );
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const guestCount = item.guestCount ?? ticketType.tableCapacity ?? 1;
        const unit = unitPriceForTicketType(ticketType, guestCount, now);
        const lineTotal = unit;

        ticketDetails.push({
          ticketTypeId: ticketType.id,
          quantity: 1,
          isTable: true,
          tableNumber: `Mesa ${item.table.number}`,
          guestCount,
          lineTotal,
          fullLineTotal: lineTotal,
          depositEnabled: ticketType.depositEnabled,
          depositPercent: ticketType.depositPercent,
          requiresApproval: ticketType.requiresApproval,
        });
        continue;
      }

      const ticketTypeId = resolveTicketTypeId(item);
      const quantity = Math.max(1, Number(item.quantity) || 1);

      if (!ticketTypeId) {
        return NextResponse.json(
          { error: "Cada item debe incluir ticketTypeId o section.id" },
          { status: 400 }
        );
      }

      const ticketType = event.ticketTypes.find((tt) => tt.id === ticketTypeId);
      if (!ticketType) {
        return NextResponse.json(
          {
            error: `Tipo de boleto no encontrado${item.section?.name ? `: ${item.section.name}` : ""}`,
          },
          { status: 400 }
        );
      }

      cartTicketTypeIds.add(ticketType.id);

      const validation = validateTicketTypeForPurchase(
        event,
        ticketType,
        quantity,
        passwordTokens[ticketType.id],
        now
      );
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const guestCount =
        ticketType.kind === "TABLE"
          ? item.guestCount ?? ticketType.tableCapacity ?? 1
          : undefined;

      if (ticketType.kind === "TABLE" && ticketType.variablePricingEnabled) {
        if (!guestCount || guestCount < 1) {
          return NextResponse.json(
            { error: `Se requiere guestCount para ${ticketType.name}` },
            { status: 400 }
          );
        }
      }

      const unit = unitPriceForTicketType(ticketType, guestCount, now);
      const lineTotal = unit * quantity;

      ticketDetails.push({
        ticketTypeId: ticketType.id,
        quantity,
        isTable: ticketType.kind === "TABLE",
        guestCount,
        lineTotal,
        fullLineTotal: lineTotal,
        depositEnabled: ticketType.depositEnabled,
        depositPercent: ticketType.depositPercent,
        requiresApproval: ticketType.requiresApproval,
      });
    }

    for (const detail of ticketDetails) {
      const tt = event.ticketTypes.find((t) => t.id === detail.ticketTypeId);
      if (!tt?.linkedTicketTypeId) continue;
      if (!cartTicketTypeIds.has(tt.linkedTicketTypeId)) {
        const linked = event.ticketTypes.find(
          (t) => t.id === tt.linkedTicketTypeId
        );
        return NextResponse.json(
          {
            error: `Debes incluir también "${linked?.name || "entrada vinculada"}" en tu carrito`,
          },
          { status: 400 }
        );
      }
    }

    let fullSubtotal = 0;
    let chargeSubtotal = 0;
    let needsApproval = false;
    let depositOnly = false;

    for (const detail of ticketDetails) {
      fullSubtotal += detail.fullLineTotal;
      needsApproval = needsApproval || detail.requiresApproval;

      if (detail.depositEnabled && detail.depositPercent) {
        depositOnly = true;
        const depositFraction = detail.depositPercent / 100;
        chargeSubtotal += detail.fullLineTotal * depositFraction;
      } else {
        chargeSubtotal += detail.fullLineTotal;
      }
    }

    fullSubtotal = Math.round(fullSubtotal * 100) / 100;
    chargeSubtotal = Math.round(chargeSubtotal * 100) / 100;

    const balanceDueCents = depositOnly
      ? Math.max(0, Math.round((fullSubtotal - chargeSubtotal) * 100))
      : null;

    if (!isStripeEnabled()) {
      return NextResponse.json(
        {
          error:
            "El pago con tarjeta no está disponible. Contacta al administrador.",
        },
        { status: 503 }
      );
    }

    const useOnlinePayment = paymentMethod !== "simulado";
    const amounts = await calculateSaleAmounts(eventId, chargeSubtotal);
    const tax = useOnlinePayment ? amounts.serviceFeePesos : 0;
    const total = useOnlinePayment ? amounts.totalPesos : chargeSubtotal;

    const user = await getSession();
    const userId = user?.id || null;

    const approvalStatus = needsApproval ? "PENDING" : "NOT_REQUIRED";
    const balancePayToken =
      depositOnly && balanceDueCents && balanceDueCents > 0
        ? newBalancePayToken()
        : null;

    const sale = await prisma.sale.create({
      data: {
        eventId,
        userId,
        channel: "ONLINE",
        status: useOnlinePayment
          ? "PENDING"
          : paymentMethod === "simulado"
            ? "COMPLETED"
            : "PENDING",
        subtotal: chargeSubtotal,
        tax,
        total,
        platformFeeAmount: useOnlinePayment ? amounts.platformFeePesos : null,
        organizerNetAmount: useOnlinePayment ? amounts.organizerNetPesos : null,
        paymentProvider: useOnlinePayment ? "stripe" : null,
        buyerName,
        buyerEmail,
        buyerPhone: buyerPhone || null,
        paymentMethod: useOnlinePayment ? null : paymentMethod || "simulado",
        paidAt: useOnlinePayment
          ? null
          : paymentMethod === "simulado"
            ? new Date()
            : null,
        approvalStatus,
        depositOnly,
        balanceDueCents,
        balancePayToken,
      },
    });

    if (useOnlinePayment) {
      await prisma.saleItem.createMany({
        data: ticketDetails.map((d) => ({
          saleId: sale.id,
          ticketTypeId: d.ticketTypeId,
          quantity: d.quantity,
          isTable: d.isTable ?? false,
          tableNumber: d.tableNumber ?? null,
          guestCount: d.guestCount ?? null,
        })),
      });

      return NextResponse.json({
        success: true,
        message: "Redirigiendo a pago",
        data: {
          saleId: sale.id,
          requiresApproval: needsApproval,
          depositOnly,
          balanceDueCents,
        },
      });
    }

    const tickets = [];
    for (const detail of ticketDetails) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: detail.ticketTypeId },
      });
      if (!ticketType) continue;

      const ticketsToCreate = detail.isTable
        ? ticketType.seatsPerTable || ticketType.tableCapacity || 4
        : detail.quantity;

      for (let i = 0; i < ticketsToCreate; i++) {
        const ticketCount = await prisma.ticket.count({
          where: { ticketTypeId: detail.ticketTypeId },
        });
        const ticketNumber = `${event.name.substring(0, 3).toUpperCase()}-${ticketType.name.substring(0, 3).toUpperCase()}-${String(ticketCount + 1).padStart(6, "0")}`;

        const ticket = await prisma.ticket.create({
          data: {
            saleId: sale.id,
            ticketTypeId: detail.ticketTypeId,
            ticketNumber,
            qrCode: "TEMP",
            tableNumber: detail.tableNumber || null,
            seatNumber: detail.tableNumber ? i + 1 : null,
          },
        });

        const qrHash = generateQRHash(ticket.id);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCode: qrHash },
        });

        tickets.push(ticket);

        await prisma.ticketType.update({
          where: { id: detail.ticketTypeId },
          data: { soldQuantity: { increment: 1 } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Orden creada exitosamente",
      data: { sale, tickets },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Error al procesar la orden" },
      { status: 500 }
    );
  }
}

function unitPriceForTicketType(
  tt: {
    price: unknown;
    pricePhases: Parameters<typeof effectiveTicketPriceAt>[1];
    groupPriceRows: Parameters<typeof priceForGuestCount>[1];
    variablePricingEnabled: boolean;
    kind: TicketKind;
  },
  guestCount: number | undefined,
  now: Date
): number {
  const base = effectiveTicketPriceAt(Number(tt.price), tt.pricePhases, now);
  if (tt.kind === "TABLE" && tt.variablePricingEnabled && guestCount) {
    return priceForGuestCount(
      base,
      tt.groupPriceRows,
      guestCount,
      tt.variablePricingEnabled
    );
  }
  return base;
}

function validateTicketTypeForPurchase(
  event: { salesStartDate: Date; salesEndDate: Date },
  tt: {
    id: string;
    name: string;
    kind: TicketKind;
    isTable: boolean;
    salesStartDate: Date | null;
    salesEndDate: Date | null;
    minPurchaseQty: number;
    maxPurchaseQty: number | null;
    passwordHash: string | null;
    maxQuantity: number;
    soldQuantity: number;
    isActive: boolean;
    manualSoldOut: boolean;
  },
  quantity: number,
  passwordToken: string | undefined,
  now: Date
): { ok: true } | { ok: false; error: string } {
  if (!tt.isActive) {
    return { ok: false, error: `${tt.name} no está disponible` };
  }

  if (!isTicketTypeVisible(tt.kind, tt.isTable)) {
    return { ok: false, error: `${tt.name} no está disponible para compra` };
  }

  if (tt.manualSoldOut) {
    return { ok: false, error: `${tt.name} está agotado` };
  }

  if (!isSalesOpen(event, tt, now)) {
    const status = salesOpenStatus(event, tt, now);
    return {
      ok: false,
      error:
        status === "not_started"
          ? `Las ventas de ${tt.name} aún no han comenzado`
          : `Las ventas de ${tt.name} ya cerraron`,
    };
  }

  const available = tt.maxQuantity - tt.soldQuantity;
  if (available <= 0) {
    return { ok: false, error: `No hay disponibilidad para ${tt.name}` };
  }

  if (quantity < tt.minPurchaseQty) {
    return {
      ok: false,
      error: `Mínimo ${tt.minPurchaseQty} boletos para ${tt.name}`,
    };
  }

  if (tt.maxPurchaseQty != null && quantity > tt.maxPurchaseQty) {
    return {
      ok: false,
      error: `Máximo ${tt.maxPurchaseQty} boletos para ${tt.name}`,
    };
  }

  if (quantity > available) {
    return {
      ok: false,
      error: `Solo hay ${available} disponibles para ${tt.name}`,
    };
  }

  if (tt.passwordHash) {
    if (!passwordToken || !verifyTicketPasswordToken(passwordToken, tt.id)) {
      return {
        ok: false,
        error: `Se requiere contraseña válida para ${tt.name}`,
      };
    }
  }

  return { ok: true };
}
