import { NextRequest, NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/discounts";

export const dynamic = "force-dynamic";

/**
 * POST /api/discounts/validate
 * { code, eventId, subtotal } → { valid, discountAmount, discountCodeId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body?.code || "");
    const eventId = String(body?.eventId || "");
    const subtotal = Number(body?.subtotal);

    if (!code || !eventId || !Number.isFinite(subtotal)) {
      return NextResponse.json(
        { error: "Se requiere code, eventId y subtotal" },
        { status: 400 }
      );
    }

    const result = await validateDiscountCode({
      code,
      eventId,
      subtotal,
    });

    if (!result.valid) {
      return NextResponse.json({
        success: true,
        valid: false,
        discountAmount: 0,
        discountCodeId: null,
        error: result.error,
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      discountAmount: result.discountAmount,
      discountCodeId: result.discountCodeId,
      code: result.code,
      discountType: result.discountType,
      value: result.value,
    });
  } catch (error) {
    console.error("[discounts/validate]", error);
    return NextResponse.json(
      { error: "Error al validar código" },
      { status: 500 }
    );
  }
}
