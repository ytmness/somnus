import QRCode from "qrcode";
import { createHash, randomBytes } from "crypto";

/**
 * Genera un hash único para el código QR del boleto
 */
export function generateQRHash(ticketId: string, secretKey?: string): string {
  const secret = secretKey || process.env.QR_SECRET_KEY || "default-secret-key-change-in-production";
  const timestamp = Date.now().toString();
  const random = randomBytes(16).toString("hex");
  
  const data = `${ticketId}-${timestamp}-${random}`;
  const hash = createHash("sha256")
    .update(data + secret)
    .digest("hex");
  
  return hash;
}

/**
 * Genera una imagen QR en formato base64
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Valida que un hash QR sea válido para un ticketId
 */
export function validateQRHash(ticketId: string, qrHash: string): boolean {
  // En producción, implementar validación más robusta
  // Por ahora solo verificamos que exista y tenga formato válido
  return !!qrHash && qrHash.length === 64; // SHA-256 produce 64 caracteres hex
}

/**
 * Genera el contenido JSON que se codifica en el QR
 */
export function generateQRPayload(ticketId: string, qrHash: string): string {
  const payload = {
    ticketId,
    qrHash,
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}

/**
 * Parsea el payload del QR escaneado
 */
export function parseQRPayload(qrData: string): { ticketId: string; qrHash: string; timestamp: number } | null {
  try {
    const payload = JSON.parse(qrData);
    if (payload.ticketId && payload.qrHash && payload.timestamp) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}
