/**
 * Migra URLs de Supabase Storage → disco local y actualiza la DB.
 *
 * Uso:
 *   npx tsx scripts/migrate-storage-to-local.ts
 *
 * Requiere DATABASE_URL y (opcional) UPLOAD_DIR.
 */
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/db/prisma";
import { saveUploadBuffer, getUploadRoot } from "../lib/storage/local";

function isSupabaseStorageUrl(url: string): boolean {
  return /supabase\.co\/storage\//i.test(url);
}

async function download(url: string): Promise<{ buffer: Buffer; name: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const name =
    url.split("?")[0].split("/").pop() || `file-${Date.now()}.jpg`;
  return { buffer: buf, name };
}

async function migrateUrl(
  url: string | null | undefined,
  subdirectory: string
): Promise<string | null> {
  if (!url || !isSupabaseStorageUrl(url)) return null;
  const { buffer, name } = await download(url);
  const saved = await saveUploadBuffer({
    buffer,
    subdirectory,
    originalName: name,
  });
  return saved.publicUrl;
}

async function main() {
  await fs.mkdir(getUploadRoot(), { recursive: true });
  let updated = 0;

  const events = await prisma.event.findMany({
    where: { imageUrl: { contains: "supabase.co" } },
    select: { id: true, imageUrl: true },
  });
  for (const ev of events) {
    try {
      const next = await migrateUrl(ev.imageUrl, "posters");
      if (next) {
        await prisma.event.update({
          where: { id: ev.id },
          data: { imageUrl: next },
        });
        updated++;
        console.log("[event]", ev.id, "→", next);
      }
    } catch (e) {
      console.error("[event fail]", ev.id, e);
    }
  }

  const images = await prisma.galleryImage.findMany({
    where: { url: { contains: "supabase.co" } },
  });
  for (const img of images) {
    try {
      const next = await migrateUrl(img.url, "gallery");
      if (next) {
        await prisma.galleryImage.update({
          where: { id: img.id },
          data: { url: next },
        });
        updated++;
        console.log("[gallery]", img.id, "→", next);
      }
    } catch (e) {
      console.error("[gallery fail]", img.id, e);
    }
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, logoUrl: true, bannerUrl: true },
  });
  for (const org of orgs) {
    for (const field of ["logoUrl", "bannerUrl"] as const) {
      const current = org[field];
      if (!current || !isSupabaseStorageUrl(current)) continue;
      try {
        const next = await migrateUrl(current, `orgs/${org.id}`);
        if (next) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { [field]: next },
          });
          updated++;
          console.log(`[org ${field}]`, org.id, "→", next);
        }
      } catch (e) {
        console.error(`[org ${field} fail]`, org.id, e);
      }
    }
  }

  // Posts con imageUrl si existe
  try {
    const posts = await prisma.organizationPost.findMany({
      where: { imageUrl: { contains: "supabase.co" } },
      select: { id: true, imageUrl: true, organizationId: true },
    });
    for (const post of posts) {
      try {
        const next = await migrateUrl(
          post.imageUrl,
          `orgs/${post.organizationId}`
        );
        if (next) {
          await prisma.organizationPost.update({
            where: { id: post.id },
            data: { imageUrl: next },
          });
          updated++;
          console.log("[post]", post.id, "→", next);
        }
      } catch (e) {
        console.error("[post fail]", post.id, e);
      }
    }
  } catch {
    // campo puede no existir en versiones antiguas
  }

  console.log(`Done. Updated ${updated} URLs. Root: ${getUploadRoot()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
