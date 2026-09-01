/** Rutas de marca Somnus (archivos en public/assets/). */
export const SOMNUS_LOGO_PATH = "/assets/SOMNUS LOGO BLANCO.png";
export const SOMNUS_OG_IMAGE_PATH = "/assets/hero-cuernavaca.jpg";

export function somnusAssetUrl(
  assetPath: string,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://somnus.live"
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${encodeURI(assetPath)}`;
}
