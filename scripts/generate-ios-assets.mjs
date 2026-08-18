/**
 * Genera los assets graficos que necesitan la app iOS y los pases de Apple Wallet
 * a partir del wordmark oficial `public/assets/SOMNUS LOGO BLANCO.png`.
 *
 *   node scripts/generate-ios-assets.mjs
 *
 * Salida:
 *   ios-config/assets/icon.png            (1024x1024, fuente de @capacitor/assets)
 *   ios-config/assets/splash.png          (2732x2732)
 *   ios-config/assets/splash-dark.png     (2732x2732)
 *   assets/wallet-pass/Somnus.pass/icon{,@2x,@3x}.png
 *   assets/wallet-pass/Somnus.pass/logo{,@2x,@3x}.png
 *
 * Reejecutar despues de cambiar el logo de marca.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORDMARK = path.join(ROOT, "public", "assets", "SOMNUS LOGO BLANCO.png");
const IOS_ASSETS = path.join(ROOT, "ios-config", "assets");
const IOS_ICONS = path.join(ROOT, "ios-config", "icons");
const RESOURCES = path.join(ROOT, "resources");
const PASS_DIR = path.join(ROOT, "assets", "wallet-pass", "Somnus.pass");

const BLACK = { r: 10, g: 10, b: 10, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** El wordmark es 1090x177; la "S" inicial cabe en los primeros 152px. */
const GLYPH_CROP = { left: 0, top: 0, width: 152, height: 177 };

async function squareIcon(size) {
  const glyphSize = Math.round(size * 0.5);
  const glyph = await sharp(WORDMARK)
    .extract(GLYPH_CROP)
    .trim({ threshold: 1 })
    .resize(glyphSize, glyphSize, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BLACK },
  })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

async function splash(size) {
  const markWidth = Math.round(size * 0.42);
  const mark = await sharp(WORDMARK)
    .resize({ width: markWidth, fit: "inside" })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BLACK },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/** El logo del pase se muestra sobre el fondo oscuro del pase: fondo transparente. */
async function passLogo(width) {
  return sharp(WORDMARK).resize({ width, fit: "inside" }).png().toBuffer();
}

async function write(dir, name, buffer) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  console.log(`  + ${path.relative(ROOT, path.join(dir, name))}`);
}

async function main() {
  console.log("Generando assets iOS…");
  const icon1024 = await squareIcon(1024);
  const splash2732 = await splash(2732);
  await write(IOS_ASSETS, "icon.png", icon1024);
  await write(IOS_ASSETS, "splash.png", splash2732);
  await write(IOS_ASSETS, "splash-dark.png", splash2732);
  await write(IOS_ICONS, "icon-1024.png", icon1024);
  await write(IOS_ICONS, "splash-2732.png", splash2732);
  await write(RESOURCES, "icon.png", icon1024);
  await write(RESOURCES, "splash.png", splash2732);

  console.log("Generando assets del pase Wallet…");
  // Apple exige icon.png (29pt) y recomienda logo.png (hasta 160x50pt).
  await write(PASS_DIR, "icon.png", await squareIcon(29));
  await write(PASS_DIR, "icon@2x.png", await squareIcon(58));
  await write(PASS_DIR, "icon@3x.png", await squareIcon(87));
  await write(PASS_DIR, "logo.png", await passLogo(160));
  await write(PASS_DIR, "logo@2x.png", await passLogo(320));
  await write(PASS_DIR, "logo@3x.png", await passLogo(480));

  console.log("Listo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
