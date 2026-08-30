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
import { validateDiscountCode } from "@/lib/discounts";
import { checkTicketMembershipAccess } from "@/lib/memberships/access";
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

type AddOnLineItem = {
  addOnId?: string;
  quantity?: number;
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
  if (kind === "TABLE" || isTable) return false;
  return kind === "STANDARD";
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
      addOnItems = [],
      discountCode,
      passwordTokens = {},
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentMethod,
      promoterCode,
      ref,
      blastRef,
    } = body as {
      eventId?: string;
      items?: CheckoutLineItem[];
      addOnItems?: AddOnLineItem[];
      discountCode?: string;
      passwordTokens?: Record<string, string>;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      paymentMethod?: string;
      promoterCode?: string;
      ref?: string;
      blastRef?: string;
    };

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Datos inválidos: se requiere eventId e items" },
        { status: 400 }
      );
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para comprar boletos", code: "AUTH_REQUIRED" },
        { status: 401 }
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
        return NextResponse.json(
          {
            error: "Las mesas se venden por link de mesa, no en venta general",
          },
          { status: 400 }
        );
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

      const membershipGate = await checkTicketMembershipAccess({
        userId: user.id,
        organizationId: event.organizationId,
        ticketType: {
          membersOnly: ticketType.membersOnly,
          earlyAccessMembersOnly: ticketType.earlyAccessMembersOnly,
          earlyAccessEndsAt: ticketType.earlyAccessEndsAt,
          salesStartDate: ticketType.salesStartDate,
        },
        ticketName: ticketType.name,
        now,
      });
      if (!membershipGate.allowed) {
        return NextResponse.json(
          { error: membershipGate.error, code: membershipGate.code },
          { status: 403 }
        );
      }

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

    const resolvedAddOns: Array<{
      addOnId: string;
      quantity: number;
      lineTotal: number;
    }> = [];

    if (Array.isArray(addOnItems) && addOnItems.length > 0) {
      const addOnIds = addOnItems
        .map((a) => String(a?.addOnId || ""))
        .filter(Boolean);
      const addOns = await prisma.eventAddOn.findMany({
        where: { eventId, id: { in: addOnIds }, isActive: true },
      });
      for (const raw of addOnItems) {
        const addOnId = String(raw?.addOnId || "");
        const quantity = Math.max(1, Math.floor(Number(raw?.quantity) || 1));
        const addOn = addOns.find((a) => a.id === addOnId);
        if (!addOn) {
          return NextResponse.json(
            { error: `Add-on no encontrado: ${addOnId}` },
            { status: 400 }
          );
        }
        if (addOn.maxQuantity != null) {
          const available = addOn.maxQuantity - addOn.soldQuantity;
          if (quantity > available) {
            return NextResponse.json(
              {
                error: `Solo hay ${Math.max(0, available)} disponibles de ${addOn.name}`,
              },
              { status: 400 }
            );
          }
        }
        const lineTotal =
          Math.round(Number(addOn.price) * quantity * 100) / 100;
        resolvedAddOns.push({ addOnId, quantity, lineTotal });
        chargeSubtotal += lineTotal;
        fullSubtotal += lineTotal;
      }
      chargeSubtotal = Math.round(chargeSubtotal * 100) / 100;
      fullSubtotal = Math.round(fullSubtotal * 100) / 100;
    }

    let discountAmount = 0;
    let discountCodeId: string | null = null;
    if (discountCode && String(discountCode).trim()) {
      const validated = await validateDiscountCode({
        code: String(discountCode),
        eventId,
        subtotal: chargeSubtotal,
      });
      if (!validated.valid) {
        return NextResponse.json(
          { error: validated.error || "Código de descuento inválido" },
          { status: 400 }
        );
      }
      discountAmount = validated.discountAmount;
      discountCodeId = validated.discountCodeId;
      chargeSubtotal = Math.max(
        0,
        Math.round((chargeSubtotal - discountAmount) * 100) / 100
      );
      fullSubtotal = Math.max(
        0,
        Math.round((fullSubtotal - discountAmount) * 100) / 100
      );
    }

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

    const userId = user.id;

    const approvalStatus = needsApproval ? "PENDING" : "NOT_REQUIRED";
    const balancePayToken =
      depositOnly && balanceDueCents && balanceDueCents > 0
        ? newBalancePayToken()
        : null;

    let promoterLinkId: string | null = null;
    const promoterRaw =
      (typeof promoterCode === "string" && promoterCode.trim()) ||
      (typeof ref === "string" &&
      !ref.trim().toLowerCase().startsWith("blast_")
        ? ref.trim()
        : "") ||
      "";
    if (promoterRaw) {
      const link = await prisma.promoterLink.findFirst({
        where: {
          eventId,
          code: promoterRaw.toUpperCase(),
          isActive: true,
        },
        select: { id: true },
      });
      if (link) promoterLinkId = link.id;
    }

    let campaignBlastId: string | null = null;
    const blastRaw =
      (typeof blastRef === "string" && blastRef.trim()) ||
      (typeof ref === "string" && ref.trim()) ||
      "";
    const blastMatch = blastRaw.match(/^(?:blast_)?([0-9a-f-]{8,})$/i);
    if (blastMatch || blastRaw.toLowerCase().startsWith("blast_")) {
      const trackingCode = blastRaw.toLowerCase().startsWith("blast_")
        ? blastRaw.slice("blast_".length)
        : blastMatch?.[1] || blastRaw;
      const blast = await prisma.campaignBlast.findFirst({
        where: {
          trackingCode,
          OR: [{ eventId }, { eventId: null }],
        },
        select: { id: true },
      });
      if (blast) campaignBlastId = blast.id;
    }

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
        discountCodeId,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        currency: "MXN",
        promoterLinkId,
        campaignBlastId,
      },
    });

    if (useOnlinePayment) {
      await prisma.saleItem.createMany({
        data: [
          ...ticketDetails.map((d) => ({
            saleId: sale.id,
            ticketTypeId: d.ticketTypeId,
            quantity: d.quantity,
            isTable: d.isTable ?? false,
            tableNumber: d.tableNumber ?? null,
            guestCount: d.guestCount ?? null,
          })),
          ...resolvedAddOns.map((a) => ({
            saleId: sale.id,
            ticketTypeId: null as string | null,
            addOnId: a.addOnId,
            quantity: a.quantity,
            isTable: false,
            tableNumber: null as string | null,
            guestCount: null as number | null,
          })),
        ],
      });

      return NextResponse.json({
        success: true,
        message: "Redirigiendo a pago",
        data: {
          saleId: sale.id,
          requiresApproval: needsApproval,
          depositOnly,
          balanceDueCents,
          discountAmount,
        },
      });
    }

    const tickets = [];
    for (const detail of ticketDetails) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: detail.ticketTypeId },
      });
      if (!ticketType) continue;

      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          ticketTypeId: detail.ticketTypeId,
          quantity: detail.quantity,
          isTable: detail.isTable ?? false,
          tableNumber: detail.tableNumber ?? null,
          guestCount: detail.guestCount ?? null,
        },
      });

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

    for (const a of resolvedAddOns) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          addOnId: a.addOnId,
          quantity: a.quantity,
          isTable: false,
        },
      });
      await prisma.eventAddOn.update({
        where: { id: a.addOnId },
        data: { soldQuantity: { increment: a.quantity } },
      });
    }

    if (discountCodeId) {
      await prisma.discountCode.update({
        where: { id: discountCodeId },
        data: { usedCount: { increment: 1 } },
      });
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
    isHidden?: boolean;
    manualSoldOut: boolean;
  },
  quantity: number,
  passwordToken: string | undefined,
  now: Date
): { ok: true } | { ok: false; error: string } {
  if (!tt.isActive) {
    return { ok: false, error: `${tt.name} no está disponible` };
  }

  if (tt.isHidden) {
    return { ok: false, error: `${tt.name} no está disponible` };
  }

  if (!isTicketTypeVisible(tt.kind, tt.isTable)) {
    return {
      ok: false,
      error:
        tt.kind === "TABLE" || tt.isTable
          ? `${tt.name} se vende por link de mesa, no en venta general`
          : `${tt.name} no está disponible para compra`,
    };
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
