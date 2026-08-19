/**
 * Detección del shell nativo de Capacitor.
 *
 * La web es la misma en Safari y dentro de la app: estas funciones permiten
 * activar rutas nativas (Apple Pay, Wallet) sin romper el render en servidor.
 *
 * No importamos `@capacitor/core` aquí a propósito: el bridge nativo inyecta
 * `window.Capacitor` antes de cargar la página, así que la detección es
 * síncrona y no arrastra el paquete al bundle del servidor.
 */

type CapacitorGlobal = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

/** ¿Estamos dentro de la app nativa (iOS o Android) y no en un navegador? */
export function isNativePlatform(): boolean {
  const capacitor = getCapacitor();
  return capacitor?.isNativePlatform?.() === true;
}

/** Login/registro: query `?app=1` o shell Capacitor (WKWebView). */
export function isNativeAuthSurface(searchParams: {
  get(name: string): string | null;
}): boolean {
  if (
    searchParams.get("app") === "1" ||
    searchParams.get("client") === "app"
  ) {
    return true;
  }
  return isNativePlatform();
}

/** ¿Estamos dentro de la app iOS? Único caso donde Apple Pay nativo aplica. */
export function isNativeIOS(): boolean {
  const capacitor = getCapacitor();
  return (
    capacitor?.isNativePlatform?.() === true &&
    capacitor?.getPlatform?.() === "ios"
  );
}

/** iOS en cualquier contexto (Safari o app): usado para ofrecer Apple Wallet. */
export function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isNativeIOS()) return true;

  const ua = navigator.userAgent;
  const isIOSUserAgent = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac con soporte táctil.
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

  return isIOSUserAgent || isIPadOS;
}
