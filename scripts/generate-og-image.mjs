/**
 * Genera la imagen Open Graph de Somnus (1200×630) para previews al compartir links.
 *
 *   node scripts/generate-og-image.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORDMARK = path.join(ROOT, "public", "assets", "SOMNUS LOGO BLANCO.png");
const OUT = path.join(ROOT, "public", "assets", "og-somnus.jpg");

const WIDTH = 1200;
const HEIGHT = 630;
const BG = { r: 42, g: 44, b: 48, alpha: 1 };

async function main() {
  const markWidth = 520;
  const mark = await sharp(WORDMARK)
    .resize({ width: markWidth, fit: "inside" })
    .toBuffer();
  const markMeta = await sharp(mark).metadata();

  const subtitleSvg = Buffer.from(
    `<svg width="${WIDTH}" height="48" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#b8c8e8">
        Eventos y boletos en línea
      </text>
    </svg>`
  );

  const blockHeight = markMeta.height + 48 + 24;
  const yLogo = Math.round((HEIGHT - blockHeight) / 2);
  const ySub = yLogo + markMeta.height + 24;
  const xLogo = Math.round((WIDTH - markMeta.width) / 2);

  await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG },
  })
    .composite([
      { input: mark, left: xLogo, top: yLogo },
      { input: subtitleSvg, left: 0, top: ySub },
    ])
    .jpeg({ quality: 92 })
    .toFile(OUT);

  console.log(`+ ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
