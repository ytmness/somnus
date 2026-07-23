import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createConversationSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    let where: Record<string, unknown> = {};

    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { organizer: { select: { userId: true } } },
      });
      if (!org || (user.role !== "ADMIN" && org.organizer.userId !== user.id)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      where = { organizationId };
    } else if (user.role === "ADMIN") {
      // admin sees all - optional, limit to participant for now
      where = { participantUserId: user.id };
    } else {
      const organizer = await prisma.organizer.findUnique({
        where: { userId: user.id },
        select: { organizations: { select: { id: true } } },
      });

      if (organizer && organizer.organizations.length > 0) {
        const orgIds = organizer.organizations.map((o) => o.id);
        where = {
          OR: [
            { participantUserId: user.id },
            { organizationId: { in: orgIds } },
          ],
        };
      } else {
        where = { participantUserId: user.id };
      }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        participant: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            senderUserId: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const enriched = conversations.map((c) => {
      const lastMessage = c.messages[0] ?? null;
      const unreadCount =
        lastMessage && lastMessage.senderUserId !== user.id && !lastMessage.readAt ? 1 : 0;
      return { ...c, messages: undefined, lastMessage, unreadCount };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("GET conversations error:", error);
    return NextResponse.json({ error: "Error al obtener conversaciones" }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const result = createConversationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findFirst({
      where: { id: result.data.organizationId, isActive: true },
      select: { id: true, organizer: { select: { userId: true } } },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    if (org.organizer.userId === user.id) {
      return NextResponse.json(
        { error: "No puedes iniciar conversación contigo mismo" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        organizationId_participantUserId: {
          organizationId: org.id,
          participantUserId: user.id,
        },
      },
      create: {
        organizationId: org.id,
        participantUserId: user.id,
      },
      update: {},
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        participant: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    console.error("POST conversation error:", error);
    return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 });
  }
}
