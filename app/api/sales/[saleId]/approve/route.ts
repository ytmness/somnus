import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import { getStripe } from "@/lib/payments/stripe";
import { fulfillSale } from "@/lib/payments/fulfill-sale";
import { retrievePaymentIntentForSale } from "@/lib/payments/stripe-connect-charge";

export const dynamic = "force-dynamic";

/**
 * POST /api/sales/[saleId]/approve
 * Admin u organizador aprueba una venta pendiente de aprobación.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.saleId },
      include: {
        event: true,
        tickets: { select: { id: true } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    const canManage = await userOwnsEvent(user, sale.eventId);
    if (!canManage && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (sale.approvalStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Esta venta no está pendiente de aprobación" },
        { status: 409 }
      );
    }

    if (sale.status === "CANCELLED" || sale.status === "REFUNDED") {
      return NextResponse.json(
        { error: "La venta ya fue cancelada o reembolsada" },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    let chargeId: string | undefined;

    if (sale.paymentIntentId) {
      const pi = await retrievePaymentIntentForSale(
        stripe,
        sale.paymentIntentId,
        sale.stripeConnectedAccountId
      );

      if (pi.status === "requires_capture") {
        const captured = await stripe.paymentIntents.capture(
          pi.id,
          {},
          sale.stripeConnectedAccountId
            ? { stripeAccount: sale.stripeConnectedAccountId }
            : undefined
        );
        chargeId =
          typeof captured.latest_charge === "string"
            ? captured.latest_charge
            : captured.latest_charge?.id;
      } else if (pi.status === "succeeded") {
        chargeId =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id;
      } else if (
        pi.status !== "processing" &&
        sale.status === "PENDING"
      ) {
        return NextResponse.json(
          {
            error: `El pago no está listo para capturar (estado: ${pi.status})`,
          },
          { status: 409 }
        );
      }
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: user.id,
        ...(chargeId ? { stripeChargeId: chargeId } : {}),
      },
    });

    let ticketsCreated = 0;
    if (sale.status === "PENDING" && sale.tickets.length === 0) {
      const result = await fulfillSale({
        saleId: sale.id,
        provider: "stripe",
        providerPaymentId: sale.paymentIntentId || sale.paymentId || sale.id,
        providerStatus: "succeeded",
        stripeChargeId: chargeId,
        stripeConnectedAccountId: sale.stripeConnectedAccountId || undefined,
      });
      ticketsCreated = result.ticketsCreated;
    } else if (sale.status === "COMPLETED") {
      await prisma.sale.update({
        where: { id: sale.id },
        data: { approvalStatus: "APPROVED" },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        saleId: sale.id,
        approvalStatus: "APPROVED",
        ticketsCreated,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[sales/approve] Error:", msg);
    return NextResponse.json({ error: msg || "Error al aprobar" }, { status: 500 });
  }
}
