/**
 * Borra todas las secciones e imágenes de la galería en la base de datos.
 * Uso: npx tsx scripts/clear-gallery.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const beforeImages = await prisma.galleryImage.count();
  const beforeSections = await prisma.gallerySection.count();

  await prisma.galleryImage.deleteMany();
  await prisma.gallerySection.deleteMany();

  console.log(
    `Gallery cleared: ${beforeSections} section(s), ${beforeImages} image(s) removed.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
