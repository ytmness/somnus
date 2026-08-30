import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import { createEventSchema } from "@/lib/validations/schemas";
import {
  assertOrganizerCanCreateEvents,
  userOwnsOrganization,
} from "@/lib/auth/event-access";
import { notifyOrganizationFollowers } from "@/lib/services/notifications";
import {
  mapTicketTypeCreateData,
  ticketTypeInclude,
} from "@/lib/ticket-type-persist";
import {
  emptyToNullField,
  eventArtistsInclude,
  syncEventArtists,
} from "@/lib/events/artists";

export const dynamic = "force-dynamic";

const eventInclude = {
  ticketTypes: {
    where: { isActive: true },
    orderBy: { price: "asc" as const },
    include: ticketTypeInclude,
  },
  organizer: { select: { id: true, businessName: true } },
  organization: { select: { id: true, name: true } },
  ...eventArtistsInclude,
};

async function buildTicketTypesCreate(
  ticketTypes: ReturnType<typeof createEventSchema.parse>["ticketTypes"]
) {
  return Promise.all(ticketTypes.map((tt) => mapTicketTypeCreateData(tt)));
}

function resolveStatusAndActive(input: {
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED";
  isActive?: boolean;
}) {
  const status = input.status ?? "PUBLISHED";
  if (status === "DRAFT") {
    return { status, isActive: false };
  }
  return {
    status,
    isActive: input.isActive ?? true,
  };
}

/**
 * GET /api/events
 * Obtener eventos (público con filtros opcionales)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const organizerId = searchParams.get("organizerId");
    const organizationId = searchParams.get("organizationId");
    const mine = searchParams.get("mine") === "true";

    let where: Record<string, unknown> = {};

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }
    if (organizerId) {
      where.organizerId = organizerId;
    }
    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (mine) {
      const user = await getSession();
      if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      if (user.role === "ADMIN") {
        // Admin ve todos
      } else {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer) {
          return NextResponse.json({ success: true, data: [] });
        }
        where.organizerId = organizer.id;
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Get events error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Crear evento (ADMIN o ORGANIZER con Stripe + organización)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!hasRole(user, ["ADMIN", "ORGANIZER"])) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const result = createEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.errors },
        { status: 400 }
      );
    }

    const {
      ticketTypes,
      organizationId,
      organizerId: bodyOrganizerId,
      artists,
      ...eventData
    } = result.data;

    const eventDate = new Date(eventData.eventDate);
    const salesStartDate = new Date(eventData.salesStartDate);
    const salesEndDate = new Date(eventData.salesEndDate);
    const { status, isActive } = resolveStatusAndActive({
      status: eventData.status,
      isActive: eventData.isActive,
    });

    let finalOrganizerId: string | null = null;
    let finalOrganizationId: string | null = null;

    if (user!.role === "ORGANIZER") {
      const gate = await assertOrganizerCanCreateEvents(user!.id);
      if (!gate.ok) {
        return NextResponse.json(
          { error: gate.message, code: gate.code },
          { status: 403 }
        );
      }

      if (!organizationId) {
        return NextResponse.json(
          {
            error: "Debes seleccionar una organización para el evento.",
            code: "ORG_REQUIRED",
          },
          { status: 400 }
        );
      }

      const ownsOrg = await userOwnsOrganization(user!, organizationId);
      if (!ownsOrg) {
        return NextResponse.json({ error: "Organización no válida" }, { status: 403 });
      }

      finalOrganizerId = gate.organizer.id;
      finalOrganizationId = organizationId;
    } else {
      // ADMIN: puede asignar organizador/organización o crear evento de plataforma
      finalOrganizerId = bodyOrganizerId || null;
      finalOrganizationId = organizationId || null;

      if (finalOrganizationId && finalOrganizerId) {
        const org = await prisma.organization.findFirst({
          where: { id: finalOrganizationId, organizerId: finalOrganizerId },
        });
        if (!org) {
          return NextResponse.json(
            { error: "La organización no pertenece al organizador indicado" },
            { status: 400 }
          );
        }
      }
    }

    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        description: emptyToNullField(eventData.description) ?? null,
        artist: eventData.artist,
        tour: emptyToNullField(eventData.tour) ?? null,
        venue: eventData.venue,
        address: emptyToNullField(eventData.address) ?? null,
        city: emptyToNullField(eventData.city) ?? null,
        eventDate,
        eventTime: eventData.eventTime,
        endDate: eventData.endDate ? new Date(eventData.endDate) : null,
        endTime: emptyToNullField(eventData.endTime) ?? null,
        timezone: eventData.timezone || "America/Mexico_City",
        currency: eventData.currency || "MXN",
        externalUrl: emptyToNullField(eventData.externalUrl) ?? null,
        videoUrl: emptyToNullField(eventData.videoUrl) ?? null,
        songId: emptyToNullField(eventData.songId) ?? null,
        songTitle: emptyToNullField(eventData.songTitle) ?? null,
        songArtist: emptyToNullField(eventData.songArtist) ?? null,
        songPreviewUrl: emptyToNullField(eventData.songPreviewUrl) ?? null,
        status,
        membersOnly: eventData.membersOnly ?? false,
        imageUrl: emptyToNullField(eventData.imageUrl) ?? null,
        imagePosX: eventData.imagePosX,
        imagePosY: eventData.imagePosY,
        imageZoom: eventData.imageZoom,
        maxCapacity: eventData.maxCapacity,
        salesStartDate,
        salesEndDate,
        organizerId: finalOrganizerId,
        organizationId: finalOrganizationId,
        isActive,
        ticketTypes: {
          create: await buildTicketTypesCreate(ticketTypes),
        },
      },
      include: {
        ticketTypes: { include: ticketTypeInclude },
        organizer: { select: { id: true, businessName: true } },
        organization: { select: { id: true, name: true } },
        ...eventArtistsInclude,
      },
    });

    if (artists && artists.length > 0) {
      await syncEventArtists(event.id, artists);
    }

    const withArtists = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        ticketTypes: { include: ticketTypeInclude },
        organizer: { select: { id: true, businessName: true } },
        organization: { select: { id: true, name: true } },
        ...eventArtistsInclude,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user!.id,
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: event.id,
        changes: { event: withArtists },
      },
    });

    if (finalOrganizationId && withArtists.organization && status === "PUBLISHED") {
      await notifyOrganizationFollowers({
        organizationId: finalOrganizationId,
        type: "NEW_EVENT",
        title: `Nuevo evento: ${withArtists.name}`,
        body: `${withArtists.artist} · ${withArtists.venue}`,
        linkUrl: `/eventos/${withArtists.id}/boletos`,
        metadata: { organizationId: finalOrganizationId, eventId: withArtists.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Evento creado exitosamente",
      data: withArtists,
    });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 }
    );
  }
}
