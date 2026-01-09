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

    // Validar datos
    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { ticketTypes, ...eventData } = result.data;

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
    const event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ticketTypes: true,
      },
    });

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

