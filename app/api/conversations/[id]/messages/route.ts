import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/supabase-auth";
import { messageSchema } from "@/lib/validations/schemas";
import {
  userCanAccessConversation,
  getConversationCounterpartyUserId,
} from "@/lib/auth/social-access";
import { createNotification } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/[id]/messages
 */
export async function GET(
  request: NextRequest,
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: params.id },
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId: params.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }
}

/**
 * POST /api/conversations/[id]/messages
 */
export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const result = messageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        organization: { select: { name: true, slug: true, organizer: { select: { userId: true } } } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        senderUserId: user.id,
        body: result.data.body,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    await prisma.conversation.update({
      where: { id: params.id },
      data: { lastMessageAt: message.createdAt },
    });

    const recipientId = await getConversationCounterpartyUserId(user, conversation);
    if (recipientId !== user.id) {
      const isFromOrg = conversation.organization.organizer.userId === user.id;
      await createNotification({
        userId: recipientId,
        type: "NEW_MESSAGE",
        title: isFromOrg
          ? `Mensaje de ${conversation.organization.name}`
          : `Mensaje de ${user.name}`,
        body: result.data.body.slice(0, 120),
        linkUrl: isFromOrg ? "/mensajes" : "/organizador?tab=mensajes",
        metadata: { conversationId: params.id, messageId: message.id },
      });
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("POST message error:", error);
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
