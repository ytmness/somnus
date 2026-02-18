import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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

    if (sale.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Esta venta ya fue pagada" },
        { status: 400 }
      );
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
