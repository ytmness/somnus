import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/supabase-auth";
import { createEventSchema } from "@/lib/validations/schemas";

// Marcar como dinámica porque usa cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/events
 * Obtener todos los eventos (público)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const events = await prisma.event.findMany({
      where: {
        ...(isActive !== null && { isActive: isActive === "true" }),
      },
      include: {
        ticketTypes: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Crear un nuevo evento (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol
    const user = await getSession();
    if (!hasRole(user, ["ADMIN"])) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar datos
    const result = createEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const { ticketTypes, ...eventData } = result.data;

    // Convertir fechas a Date
    const eventDate = new Date(eventData.eventDate);
    const salesStartDate = new Date(eventData.salesStartDate);
    const salesEndDate = new Date(eventData.salesEndDate);

    // Solo un evento activo a la vez: desactivar los demás
    await prisma.event.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Crear evento con tipos de boleto
    const event = await prisma.event.create({
      data: {
        ...eventData,
        eventDate,
        salesStartDate,
        salesEndDate,
        ticketTypes: {
          create: ticketTypes.map((tt) => ({
            name: tt.name,
            description: tt.description,
            category: tt.category,
            price: tt.price,
            maxQuantity: tt.maxQuantity,
            isTable: tt.isTable || false,
            seatsPerTable: tt.seatsPerTable,
          })),
        },
      },
      include: {
        ticketTypes: true,
      },
    });

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: event.id,
        changes: { event },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evento creado exitosamente",
      data: event,
    });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 }
    );
  }
}


