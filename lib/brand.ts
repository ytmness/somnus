/** Rutas de marca Somnus (archivos en public/assets/). */
export const SOMNUS_LOGO_PATH = "/assets/SOMNUS LOGO BLANCO.png";
/** Imagen OG 1200×630 — generar con `node scripts/generate-og-image.mjs`. */
export const SOMNUS_OG_IMAGE_PATH = "/assets/og-somnus.jpg";
/** Placeholder cuando un evento no tiene imagen propia. */
export const SOMNUS_PLACEHOLDER_IMAGE_PATH = SOMNUS_OG_IMAGE_PATH;

export function somnusAssetUrl(
  assetPath: string,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://somnus.live"
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${encodeURI(assetPath)}`;
}
