import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { userCanAccessConversation } from "@/lib/auth/social-access";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/conversations/[id]/read
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const canAccess = await userCanAccessConversation(user, params.id);
    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.message.updateMany({
      where: {
        conversationId: params.id,
        senderUserId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH read conversation error:", error);
    return NextResponse.json({ error: "Error al marcar como leído" }, { status: 500 });
  }
}
