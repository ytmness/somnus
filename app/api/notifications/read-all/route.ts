import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/read-all
 */
export async function PATCH() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH read-all notifications error:", error);
    return NextResponse.json({ error: "Error al marcar notificaciones" }, { status: 500 });
  }
}
