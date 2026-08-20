import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession, hasRole } from "@/lib/auth/session";
import { updateEventSchema } from "@/lib/validations/schemas";
import { userOwnsEvent } from "@/lib/auth/event-access";
import { hashTicketPassword, optionalDate } from "@/lib/ticket-access";
import {
  mapTicketTypeCreateData,
  ticketTypeInclude,
} from "@/lib/ticket-type-persist";

export const dynamic = "force-dynamic";

class TicketSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketSyncError";
  }
}

const eventInclude = {
  ticketTypes: {
    orderBy: { price: "asc" as const },
    include: ticketTypeInclude,
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

    const sanitized = {
      ...event,
      ticketTypes: event.ticketTypes.map((tt) => {
        const { passwordHash, ...rest } = tt as typeof tt & {
          passwordHash?: string | null;
        };
        return {
          ...rest,
          hasPassword: Boolean(passwordHash),
          passwordHash: undefined,
        };
      }),
    };

    return NextResponse.json({ success: true, data: sanitized });
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

    let event;

    try {
      event = await prisma.$transaction(async (tx) => {
        let current = await tx.event.update({
          where: { id: params.id },
          data: updateData,
          include: eventInclude,
        });

        if (!ticketTypes || ticketTypes.length === 0) {
          return current;
        }

        // IDs from the payload plus any tiers we create in this transaction.
        // New tiers have no id yet; if we omit them here, the cleanup below
        // deletes them immediately after insert.
        const keptIds = new Set(
          ticketTypes.map((tt) => tt.id).filter((id): id is string => Boolean(id))
        );

        for (const tt of ticketTypes) {
          if (!tt.id) {
            const name = (tt.name || "").trim();
            const price = Number(tt.price);
            const maxQuantity = Number(tt.maxQuantity);
            if (
              !name ||
              !Number.isFinite(price) ||
              price <= 0 ||
              !Number.isFinite(maxQuantity) ||
              maxQuantity < 1
            ) {
              throw new TicketSyncError(
                "Cada entrada nueva necesita nombre, precio mayor a 0 y cantidad mayor a 0"
              );
            }
            const created = await tx.ticketType.create({
              data: {
                eventId: params.id,
                ...(await mapTicketTypeCreateData({
                  name,
                  description: tt.description,
                  category: tt.category || "GENERAL",
                  price,
                  maxQuantity,
                  isTable: tt.isTable ?? false,
                  seatsPerTable: tt.seatsPerTable,
                  pricePhases: tt.pricePhases,
                  kind: tt.kind ?? "STANDARD",
                  isHidden: tt.isHidden ?? false,
                  manualSoldOut: tt.manualSoldOut ?? false,
                  salesStartDate: tt.salesStartDate,
                  salesEndDate: tt.salesEndDate,
                  validUntil: tt.validUntil,
                  minPurchaseQty: tt.minPurchaseQty ?? 1,
                  maxPurchaseQty: tt.maxPurchaseQty,
                  requiresApproval: tt.requiresApproval ?? false,
                  password: tt.password,
                  clearPassword: tt.clearPassword,
                  linkedTicketTypeId: tt.linkedTicketTypeId || null,
                  tableCapacity: tt.tableCapacity,
                  depositEnabled: tt.depositEnabled ?? false,
                  depositPercent: tt.depositPercent,
                  variablePricingEnabled: tt.variablePricingEnabled ?? false,
                  groupPriceRows: tt.groupPriceRows,
                })),
              },
            });
            keptIds.add(created.id);
            continue;
          }

          const existing = current.ticketTypes.find((t) => t.id === tt.id);
          if (!existing) continue;

          const ttData: Record<string, unknown> = {};
          if (tt.name !== undefined) ttData.name = tt.name;
          if (tt.description !== undefined) ttData.description = tt.description;
          if (tt.category !== undefined) ttData.category = tt.category;
          if (tt.price !== undefined) ttData.price = tt.price;
          if (tt.isTable !== undefined) ttData.isTable = tt.isTable;
          if (tt.seatsPerTable !== undefined) ttData.seatsPerTable = tt.seatsPerTable;
          if (tt.kind !== undefined) ttData.kind = tt.kind;
          if (tt.isHidden !== undefined) ttData.isHidden = tt.isHidden;
          if (tt.manualSoldOut !== undefined)
            ttData.manualSoldOut = tt.manualSoldOut;
          if (tt.salesStartDate !== undefined)
            ttData.salesStartDate = optionalDate(tt.salesStartDate);
          if (tt.salesEndDate !== undefined)
            ttData.salesEndDate = optionalDate(tt.salesEndDate);
          if (tt.validUntil !== undefined)
            ttData.validUntil = optionalDate(tt.validUntil);
          if (tt.minPurchaseQty !== undefined)
            ttData.minPurchaseQty = tt.minPurchaseQty;
          if (tt.maxPurchaseQty !== undefined)
            ttData.maxPurchaseQty = tt.maxPurchaseQty;
          if (tt.requiresApproval !== undefined)
            ttData.requiresApproval = tt.requiresApproval;
          if (tt.linkedTicketTypeId !== undefined)
            ttData.linkedTicketTypeId = tt.linkedTicketTypeId || null;
          if (tt.tableCapacity !== undefined)
            ttData.tableCapacity = tt.tableCapacity;
          if (tt.depositEnabled !== undefined)
            ttData.depositEnabled = tt.depositEnabled;
          if (tt.depositPercent !== undefined)
            ttData.depositPercent = tt.depositPercent;
          if (tt.variablePricingEnabled !== undefined)
            ttData.variablePricingEnabled = tt.variablePricingEnabled;
          if (tt.clearPassword) ttData.passwordHash = null;
          else if (tt.password && tt.password.trim()) {
            ttData.passwordHash = await hashTicketPassword(tt.password.trim());
          }
          if (tt.maxQuantity !== undefined) {
            if (tt.maxQuantity < existing.soldQuantity) {
              throw new TicketSyncError(
                `"${existing.name}": la cantidad máxima no puede ser menor que los vendidos (${existing.soldQuantity})`
              );
            }
            ttData.maxQuantity = tt.maxQuantity;
          }

          if (Object.keys(ttData).length > 0) {
            await tx.ticketType.update({ where: { id: tt.id }, data: ttData });
          }

          if (tt.pricePhases !== undefined) {
            await tx.ticketPricePhase.deleteMany({ where: { ticketTypeId: tt.id } });
            if (tt.pricePhases.length > 0) {
              await tx.ticketPricePhase.createMany({
                data: tt.pricePhases.map((p, i) => ({
                  id: randomUUID(),
                  ticketTypeId: tt.id!,
                  price: p.price,
                  startsAt: new Date(p.startsAt),
                  endsAt: new Date(p.endsAt),
                  label: p.label ?? null,
                  sortOrder: p.sortOrder ?? i,
                })),
              });
            }
          }

          if (tt.groupPriceRows !== undefined) {
            await tx.tableGroupPriceRow.deleteMany({
              where: { ticketTypeId: tt.id },
            });
            if (tt.groupPriceRows.length > 0) {
              await tx.tableGroupPriceRow.createMany({
                data: tt.groupPriceRows.map((r, i) => ({
                  id: randomUUID(),
                  ticketTypeId: tt.id!,
                  minGuests: r.minGuests,
                  maxGuests: r.maxGuests,
                  price: r.price,
                  sortOrder: r.sortOrder ?? i,
                })),
              });
            }
          }
        }

        const existingTiers = await tx.ticketType.findMany({
          where: { eventId: params.id },
        });

        for (const existing of existingTiers) {
          if (keptIds.has(existing.id)) continue;
          if (existing.soldQuantity > 0) {
            throw new TicketSyncError(
              `"${existing.name}" tiene ventas registradas y no se puede eliminar`
            );
          }
          await tx.ticketType.updateMany({
            where: { linkedTicketTypeId: existing.id },
            data: { linkedTicketTypeId: null },
          });
          await tx.ticketPricePhase.deleteMany({
            where: { ticketTypeId: existing.id },
          });
          await tx.tableGroupPriceRow.deleteMany({
            where: { ticketTypeId: existing.id },
          });
          await tx.ticketType.delete({ where: { id: existing.id } });
        }

        const remainingCount = await tx.ticketType.count({
          where: { eventId: params.id },
        });
        if (remainingCount === 0) {
          throw new TicketSyncError("Debe existir al menos un tipo de entrada");
        }

        return tx.event.findUniqueOrThrow({
          where: { id: params.id },
          include: eventInclude,
        });
      });
    } catch (error) {
      if (error instanceof TicketSyncError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
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
    const msg = error instanceof Error ? error.message : "Error al actualizar evento";
    return NextResponse.json(
      { error: msg || "Error al actualizar evento" },
      { status: 500 }
    );
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
