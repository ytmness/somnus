import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { updateEventSchema } from "@/lib/validations/schemas";
import { userOwnsEvent } from "@/lib/auth/event-access";

export const dynamic = "force-dynamic";

const eventInclude = {
  ticketTypes: {
    orderBy: { price: "asc" as const },
    include: { pricePhases: { orderBy: { sortOrder: "asc" as const } } },
  },
  organizer: { select: { id: true, businessName: true } },
  organization: { select: { id: true, name: true } },
};

/**
 * GET /api/events/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventInclude,
    });

    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json({ error: "Error al obtener evento" }, { status: 500 });
  }
}

/**
 * PATCH /api/events/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsEvent(user!, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Toggle simple isActive
    if (
      Object.keys(body).length === 1 &&
      typeof body.isActive === "boolean"
    ) {
      const event = await prisma.event.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
        include: eventInclude,
      });
      return NextResponse.json({ success: true, data: event });
    }

    // Toggle isFeatured — solo ADMIN
    if (
      Object.keys(body).length === 1 &&
      typeof body.isFeatured === "boolean"
    ) {
      if (user!.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo admin puede destacar eventos" }, { status: 403 });
      }
      const event = await prisma.event.update({
        where: { id: params.id },
        data: { isFeatured: body.isFeatured },
        include: eventInclude,
      });
      return NextResponse.json({ success: true, data: event });
    }

    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { ticketTypes, isFeatured, organizerId, organizationId, ...eventData } =
      result.data;

    const updateData: Record<string, unknown> = { ...eventData };

    if (eventData.eventDate) updateData.eventDate = new Date(eventData.eventDate);
    if (eventData.salesStartDate) updateData.salesStartDate = new Date(eventData.salesStartDate);
    if (eventData.salesEndDate) updateData.salesEndDate = new Date(eventData.salesEndDate);

    // Solo ADMIN puede cambiar isFeatured, organizerId, organizationId
    if (user!.role === "ADMIN") {
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
      if (organizerId !== undefined) updateData.organizerId = organizerId;
      if (organizationId !== undefined) updateData.organizationId = organizationId;
    }

    let event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: eventInclude,
    });

    if (ticketTypes && ticketTypes.length > 0) {
      for (const tt of ticketTypes) {
        const existing = event.ticketTypes.find((t) => t.id === tt.id);
        if (!existing) continue;

        const ttData: Record<string, unknown> = {};
        if (tt.name !== undefined) ttData.name = tt.name;
        if (tt.description !== undefined) ttData.description = tt.description;
        if (tt.category !== undefined) ttData.category = tt.category;
        if (tt.price !== undefined) ttData.price = tt.price;
        if (tt.isTable !== undefined) ttData.isTable = tt.isTable;
        if (tt.seatsPerTable !== undefined) ttData.seatsPerTable = tt.seatsPerTable;
        if (tt.maxQuantity !== undefined) {
          if (tt.maxQuantity < existing.soldQuantity) {
            return NextResponse.json(
              {
                error: `"${existing.name}": la cantidad máxima no puede ser menor que los vendidos (${existing.soldQuantity})`,
              },
              { status: 400 }
            );
          }
          ttData.maxQuantity = tt.maxQuantity;
        }

        if (Object.keys(ttData).length > 0) {
          await prisma.ticketType.update({ where: { id: tt.id }, data: ttData });
        }

        if (tt.pricePhases !== undefined) {
          await prisma.ticketPricePhase.deleteMany({ where: { ticketTypeId: tt.id } });
          if (tt.pricePhases.length > 0) {
            await prisma.ticketPricePhase.createMany({
              data: tt.pricePhases.map((p, i) => ({
                id: randomUUID(),
                ticketTypeId: tt.id,
                price: p.price,
                startsAt: new Date(p.startsAt),
                endsAt: new Date(p.endsAt),
                label: p.label ?? null,
                sortOrder: p.sortOrder ?? i,
              })),
            });
          }
        }
      }
      event = await prisma.event.findUniqueOrThrow({
        where: { id: params.id },
        include: eventInclude,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_UPDATED",
        entityType: "Event",
        entityId: event.id,
        changes: { updates: updateData } as object,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evento actualizado exitosamente",
      data: event,
    });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Error al actualizar evento" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const owns = await userOwnsEvent(user!, params.id);
    if (!owns) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const salesCount = await prisma.sale.count({ where: { eventId: params.id } });
    if (salesCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el evento porque ya tiene ventas registradas" },
        { status: 400 }
      );
    }

    await prisma.event.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_DELETED",
        entityType: "Event",
        entityId: params.id,
        changes: { deleted: true },
      },
    });

    return NextResponse.json({ success: true, message: "Evento eliminado exitosamente" });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Error al eliminar evento" }, { status: 500 });
  }
}
