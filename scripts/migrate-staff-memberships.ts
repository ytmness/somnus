/**
 * Migrar usuarios con roles operativos legacy a StaffMembership PLATFORM
 * y opcionalmente crear Venues desde Event.venue texto.
 *
 * Ejecutar: npx tsx scripts/migrate-staff-memberships.ts
 */

import { prisma } from "../lib/db/prisma";
import type { StaffRole, MembershipScope } from "@prisma/client";

const LEGACY_STAFF_ROLES = ["VENDEDOR", "SUPERVISOR", "ACCESOS"] as const;

const ROLE_MAP: Record<string, StaffRole> = {
  VENDEDOR: "VENDEDOR",
  SUPERVISOR: "SUPERVISOR",
  ACCESOS: "ACCESOS",
};

async function migrateLegacyStaffRoles() {
  const users = await prisma.user.findMany({
    where: { role: { in: [...LEGACY_STAFF_ROLES] } },
  });

  console.log(`\n📋 Usuarios con rol operativo legacy: ${users.length}`);

  for (const user of users) {
    const staffRole = ROLE_MAP[user.role];
    if (!staffRole) continue;

    const existing = await prisma.staffMembership.findFirst({
      where: {
        userId: user.id,
        role: staffRole,
        scope: "PLATFORM",
      },
    });

    if (!existing) {
      await prisma.staffMembership.create({
        data: {
          userId: user.id,
          role: staffRole,
          scope: "PLATFORM" as MembershipScope,
        },
      });
      console.log(`  ✅ Membresía PLATFORM/${staffRole} para ${user.email}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "CLIENTE" },
    });
    console.log(`  🔄 Rol de ${user.email} → CLIENTE`);
  }
}

async function migrateVenuesFromEvents() {
  const events = await prisma.event.findMany({
    where: {
      organizerId: { not: null },
      venueId: null,
    },
    select: {
      id: true,
      venue: true,
      address: true,
      organizerId: true,
    },
  });

  console.log(`\n🏟️  Eventos con venue texto sin venueId: ${events.length}`);

  const venueCache = new Map<string, string>(); // key: organizerId|venueName -> venueId

  for (const event of events) {
    if (!event.organizerId || !event.venue?.trim()) continue;

    const cacheKey = `${event.organizerId}|${event.venue.trim().toLowerCase()}`;
    let venueId = venueCache.get(cacheKey);

    if (!venueId) {
      const existing = await prisma.venue.findFirst({
        where: {
          organizerId: event.organizerId,
          name: { equals: event.venue.trim(), mode: "insensitive" },
        },
      });

      if (existing) {
        venueId = existing.id;
      } else {
        const created = await prisma.venue.create({
          data: {
            organizerId: event.organizerId,
            name: event.venue.trim(),
            address: event.address ?? undefined,
          },
        });
        venueId = created.id;
        console.log(`  ➕ Venue creado: ${created.name}`);
      }
      venueCache.set(cacheKey, venueId);
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { venueId },
    });
  }

  console.log(`  ✅ ${events.length} eventos procesados`);
}

async function main() {
  console.log("🚀 Migración de staff memberships y venues\n");

  try {
    await migrateLegacyStaffRoles();
    await migrateVenuesFromEvents();
    console.log("\n✅ Migración completada");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
