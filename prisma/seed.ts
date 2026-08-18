import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@somnus.com" },
    update: {},
    create: {
      email: "admin@somnus.com",
      password: adminPassword,
      name: "Admin Somnus",
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });
  console.log("Admin:", admin.email);

  const vendedorPassword = await bcrypt.hash("vendedor123", 10);
  const vendedor = await prisma.user.upsert({
    where: { email: "vendedor@somnus.com" },
    update: {},
    create: {
      email: "vendedor@somnus.com",
      password: vendedorPassword,
      name: "Vendedor Somnus",
      role: "VENDEDOR",
      isActive: true,
      emailVerified: true,
    },
  });
  console.log("Vendedor:", vendedor.email);

  const existingEvent = await prisma.event.findFirst({
    where: { name: "Víctor Mendivil en Concierto" },
  });

  if (!existingEvent) {
    const event = await prisma.event.create({
      data: {
        name: "Víctor Mendivil en Concierto",
        description: "Gran concierto de Víctor Mendivil en Arena Monterrey",
        artist: "Víctor Mendivil",
        tour: "Gira 2025",
        venue: "Arena Monterrey",
        address: "Av. Fundidora, Monterrey, NL",
        eventDate: new Date("2025-03-15T21:00:00"),
        eventTime: "21:00 hrs",
        imageUrl:
          "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
        maxCapacity: 5000,
        salesStartDate: new Date(),
        salesEndDate: new Date("2025-03-15T18:00:00"),
        isActive: true,
        ticketTypes: {
          create: [
            {
              name: "VIP - Mesa 4 personas",
              description: "Mesa VIP con 4 asientos, acceso preferente",
              category: "VIP",
              price: 2500,
              maxQuantity: 162,
              soldQuantity: 0,
              isTable: true,
              seatsPerTable: 4,
            },
            {
              name: "Preferente",
              description: "Asientos numerados, excelente vista",
              category: "PREFERENTE",
              price: 1500,
              maxQuantity: 120,
              soldQuantity: 0,
            },
            {
              name: "General",
              description: "De pie, cerca del escenario",
              category: "GENERAL",
              price: 850,
              maxQuantity: 350,
              soldQuantity: 0,
            },
          ],
        },
      },
    });
    console.log("Evento:", event.name);
  }

  console.log("\nCredenciales:");
  console.log("  admin@somnus.com / admin123");
  console.log("  vendedor@somnus.com / vendedor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
