/**
 * Backfill Organization.slug before prisma db push on production.
 * Run: npx tsx scripts/backfill-org-slugs.ts
 */
import { PrismaClient } from "@prisma/client";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "org";
}

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Organization' AND column_name = 'slug'`
  );

  if (cols.length === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Organization" ADD COLUMN "slug" TEXT`
    );
    console.log("Added slug column (nullable)");
  }

  const orgs = await prisma.$queryRawUnsafe<
    { id: string; name: string; slug: string | null }[]
  >(`SELECT id, name, slug FROM "Organization"`);

  const used = new Set<string>();
  for (const org of orgs) {
    if (org.slug) {
      used.add(org.slug);
      continue;
    }
    let slug = slugify(org.name);
    let n = 1;
    while (used.has(slug)) slug = `${slugify(org.name)}-${n++}`;
    used.add(slug);
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET slug = $1 WHERE id = $2`,
      slug,
      org.id
    );
    console.log(`Backfilled: ${org.name} → ${slug}`);
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL`
  );
  console.log("Done — slug column ready for db push");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
