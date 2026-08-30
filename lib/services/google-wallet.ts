/**
 * Stub de Google Wallet (Save to Google Pay / passes).
 *
 * Cuando `GOOGLE_WALLET_ISSUER_ID` (y credenciales de servicio) estén en el
 * entorno, `createGoogleWalletObject` firmará un JWT real. Mientras tanto
 * devuelve null / estructura stub sin romper Apple Wallet.
 */

export interface GoogleWalletTicketInput {
  id: string;
  ticketNumber: string;
  qrCode: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
}

export interface GoogleWalletObjectStub {
  /** JWT firmado para “Save to Google Wallet”; vacío en stub. */
  jwt: string;
  issuerId: string | null;
  classId: string | null;
  objectId: string | null;
  configured: boolean;
}

export function isGoogleWalletConfigured(): boolean {
  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID?.trim());
}

/**
 * Crea (o stub) el objeto de pase para Google Wallet.
 * Sin issuer ID → null (la UI no muestra el botón).
 */
export async function createGoogleWalletObject(
  ticket: GoogleWalletTicketInput
): Promise<GoogleWalletObjectStub | null> {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim() || null;
  if (!issuerId) return null;

  const classId =
    process.env.GOOGLE_WALLET_CLASS_ID?.trim() ||
    `${issuerId}.somnus_ticket`;
  const objectId = `${issuerId}.${ticket.id}`;

  // Stub: estructura lista para firmar con la service account cuando exista.
  return {
    jwt: "",
    issuerId,
    classId,
    objectId,
    configured: true,
  };
}
