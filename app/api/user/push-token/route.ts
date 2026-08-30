import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/push-token
 * Guarda el pushToken FCM/APNs del usuario actual.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const token =
      typeof body.pushToken === "string"
        ? body.pushToken.trim()
        : typeof body.token === "string"
          ? body.token.trim()
          : "";

    if (!token) {
      return NextResponse.json(
        { error: "pushToken es requerido" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pushToken: token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push-token]", error);
    return NextResponse.json(
      { error: "Error al guardar push token" },
      { status: 500 }
    );
  }
}
