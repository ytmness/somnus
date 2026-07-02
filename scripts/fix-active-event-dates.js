const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const active = await prisma.event.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      eventDate: true,
      salesStartDate: true,
      salesEndDate: true,
    },
  });

  if (!active) {
    console.log("no_active_event");
    return;
  }

  console.log("before", active);

  // Fechas coherentes: ventas abiertas ahora, evento el 7 jul 2026
  const updated = await prisma.event.update({
    where: { id: active.id },
    data: {
      eventDate: new Date("2026-07-07T22:00:00.000Z"),
      salesStartDate: new Date("2026-07-02T06:00:00.000Z"),
      salesEndDate: new Date("2026-07-07T21:00:00.000Z"),
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      eventDate: true,
      salesStartDate: true,
      salesEndDate: true,
    },
  });

  console.log("after", updated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
