import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userOwnsEvent } from "@/lib/auth/event-access";
import { getStripe } from "@/lib/payments/stripe";
import { cancelPaymentIntentForSale } from "@/lib/payments/stripe-connect-charge";

export const dynamic = "force-dynamic";

/**
 * POST /api/sales/[saleId]/reject
 * Admin u organizador rechaza una venta pendiente de aprobación.
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
      include: { event: true },
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

    if (sale.paymentIntentId) {
      const stripe = getStripe();
      await cancelPaymentIntentForSale(
        stripe,
        sale.paymentIntentId,
        sale.stripeConnectedAccountId
      ).catch((err) => {
        console.warn("[sales/reject] cancel PI:", err);
      });
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        approvalStatus: "REJECTED",
        status: "CANCELLED",
        providerStatus: "canceled",
      },
    });

    return NextResponse.json({
      success: true,
      data: { saleId: sale.id, approvalStatus: "REJECTED" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[sales/reject] Error:", msg);
    return NextResponse.json(
      { error: msg || "Error al rechazar" },
      { status: 500 }
    );
  }
}
