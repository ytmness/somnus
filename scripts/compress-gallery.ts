/**
 * Comprime las fotos de la galería para que carguen más rápido.
 * Objetivo: < 500 KB por imagen (max 1200px ancho, quality 82).
 *
 * Uso: npx tsx scripts/compress-gallery.ts
 */
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");
const MAX_WIDTH = 1200;
const QUALITY = 82;
const TARGET_KB = 500;

// Carpetas de galería (según lib/gallery-images.ts)
const GALLERY_FOLDERS = [
  "panorama-photo-download-1of1 (1)",
  "panorama-photo-download-1of1",
  "somnus-1-photo-download-1of1",
  "somnus-photo-download-1of1",
];

function findJpegs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...findJpegs(full));
    } else if (/\.(jpe?g|JPE?G)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

async function compressFile(filePath: string): Promise<{ before: number; after: number }> {
  const before = fs.statSync(filePath).size;
  const buffer = await sharp(filePath)
    .resize(MAX_WIDTH, undefined, { withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
  // Escribir a archivo temporal primero (evita bloqueos en Windows)
  const tmpPath = filePath + ".tmp.jpg";
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, filePath);
  const after = buffer.length;
  return { before, after };
}

async function main() {
  console.log("Comprimiendo fotos de galería...\n");
  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const folder of GALLERY_FOLDERS) {
    const base = path.join(ASSETS_DIR, folder);
    const subdirs = fs.existsSync(base)
      ? fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())
      : [];

    const dirsToScan = subdirs.length > 0
      ? subdirs.map((d) => path.join(base, d.name))
      : fs.existsSync(base)
        ? [base]
        : [];

    for (const dir of dirsToScan) {
      const files = findJpegs(dir);
      for (const f of files) {
        try {
          const { before, after } = await compressFile(f);
          totalBefore += before;
          totalAfter += after;
          count++;
          const rel = path.relative(process.cwd(), f);
          const pct = ((1 - after / before) * 100).toFixed(1);
          const status = after > TARGET_KB * 1024 ? " ⚠️ >500KB" : "";
          console.log(`  ${rel}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (-${pct}%)${status}`);
        } catch (err) {
          console.error(`  ❌ ${f}:`, err);
        }
      }
    }
  }

  if (count === 0) {
    console.log("No se encontraron fotos en las carpetas de galería.");
    console.log("Asegúrate de que existan:");
    GALLERY_FOLDERS.forEach((f) => console.log(`  - public/assets/${f}/`));
    process.exit(1);
  }

  const saved = totalBefore - totalAfter;
  const pct = ((saved / totalBefore) * 100).toFixed(1);
  console.log(`\n✅ ${count} fotos comprimidas`);
  console.log(`   Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (ahorro: ${(saved / 1024 / 1024).toFixed(1)}MB, -${pct}%)`);
}

main().catch(console.error);
