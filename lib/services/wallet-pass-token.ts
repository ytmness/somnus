import { SignJWT, jwtVerify } from "jose";

/**
 * Token de un solo uso para descargar un .pkpass fuera del contexto de sesión.
 *
 * En la app nativa el pase se abre con SFSafariViewController (@capacitor/browser),
 * que no comparte la cookie de sesión del WKWebView. La página pide primero un
 * enlace firmado desde el WebView autenticado y luego lo abre en Safari.
 */

const AUDIENCE = "somnus:wallet-pass";
const TTL_SECONDS = 600;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET/JWT_SECRET no configurado");
  }
  return new TextEncoder().encode(secret);
}

export function getWalletPassTokenTtlSeconds(): number {
  return TTL_SECONDS;
}

export async function signWalletPassToken(
  ticketId: string,
  userId: string
): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ticketId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Devuelve el ticketId si el token es válido para ese boleto, o null. */
export async function verifyWalletPassToken(
  token: string,
  ticketId: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      audience: AUDIENCE,
    });
    if (payload.sub !== ticketId) return null;
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}
