import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Actualizando cantidades de boletos...");

  // Buscar el evento de Víctor Mendivil
  const event = await prisma.event.findFirst({
    where: {
      artist: "Víctor Mendivil",
      isActive: true,
    },
    include: {
      ticketTypes: true,
    },
  });

  if (!event) {
    console.log("❌ No se encontró el evento de Víctor Mendivil");
    return;
  }

  console.log(`✅ Evento encontrado: ${event.name}`);

  // Actualizar cada tipo de boleto
  for (const ticketType of event.ticketTypes) {
    let updateData: any = {};

    if (ticketType.name === "VIP - Mesa 4 personas") {
      updateData = {
        maxQuantity: 162,
        soldQuantity: 0,
      };
    } else if (ticketType.name === "Preferente") {
      updateData = {
        maxQuantity: 120,
        soldQuantity: 0,
      };
    } else if (ticketType.name === "General") {
      updateData = {
        maxQuantity: 350,
        soldQuantity: 0,
      };
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.ticketType.update({
        where: { id: ticketType.id },
        data: updateData,
      });

      console.log(`✅ Actualizado: ${ticketType.name}`);
      console.log(`   - maxQuantity: ${updateData.maxQuantity}`);
      console.log(`   - soldQuantity: ${updateData.soldQuantity}`);
      console.log(`   - Disponibles: ${updateData.maxQuantity - updateData.soldQuantity}`);
    }
  }

  console.log("\n🎉 Actualización completada!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
