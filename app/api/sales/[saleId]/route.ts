import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/sales/[saleId]
 * Obtener una venta por ID (para checkout)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: params.saleId },
      include: {
        event: true,
        saleItems: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para continuar el pago", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const ownsSale =
      sale.userId === user.id ||
      sale.buyerEmail.toLowerCase() === user.email.toLowerCase();
    if (!ownsSale && user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error("Get sale error:", error);
    return NextResponse.json(
      { error: "Error al obtener venta" },
      { status: 500 }
    );
  }
}
