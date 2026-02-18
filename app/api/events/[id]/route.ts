import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { updateEventSchema } from "@/lib/validations/schemas";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]
 * Obtener un evento específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        ticketTypes: {
          orderBy: { price: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json(
      { error: "Error al obtener evento" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 * Actualizar un evento (solo ADMIN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Caso simple: solo toggle isActive
    if (Object.keys(body).length === 1 && typeof body.isActive === "boolean") {
      if (body.isActive) {
        await prisma.event.updateMany({
          where: { id: { not: params.id } },
          data: { isActive: false },
        });
      }
      const event = await prisma.event.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
        include: { ticketTypes: true },
      });
      return NextResponse.json({ success: true, data: event });
    }

    // Validar datos completos
    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { ticketTypes, ...eventData } = result.data;

    // Si activamos este evento, desactivar los demás
    if (eventData.isActive === true) {
      await prisma.event.updateMany({
        where: { id: { not: params.id } },
        data: { isActive: false },
      });
    }

    // Convertir fechas si existen
    const updateData: any = { ...eventData };
    if (eventData.eventDate) {
      updateData.eventDate = new Date(eventData.eventDate);
    }
    if (eventData.salesStartDate) {
      updateData.salesStartDate = new Date(eventData.salesStartDate);
    }
    if (eventData.salesEndDate) {
      updateData.salesEndDate = new Date(eventData.salesEndDate);
    }

    // Actualizar evento
    let event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ticketTypes: true,
      },
    });

    // Actualizar tipos de boleto si se enviaron
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
          await prisma.ticketType.update({
            where: { id: tt.id },
            data: ttData,
          });
        }
      }
      event = await prisma.event.findUniqueOrThrow({
        where: { id: params.id },
        include: { ticketTypes: true },
      });
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_UPDATED",
        entityType: "Event",
        entityId: event.id,
        changes: { updates: updateData },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evento actualizado exitosamente",
      data: event,
    });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { error: "Error al actualizar evento" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Eliminar un evento (solo ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Verificar que no haya ventas
    const salesCount = await prisma.sale.count({
      where: { eventId: params.id },
    });

    if (salesCount > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el evento porque ya tiene ventas registradas",
        },
        { status: 400 }
      );
    }

    // Eliminar evento (y sus ticketTypes por cascada)
    await prisma.event.delete({
      where: { id: params.id },
    });

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_DELETED",
        entityType: "Event",
        entityId: params.id,
        changes: { deleted: true },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evento eliminado exitosamente",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: "Error al eliminar evento" },
      { status: 500 }
    );
  }
}

