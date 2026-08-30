import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { prisma } from "@/lib/db/prisma";
import { generateQRPayload } from "@/lib/services/qr-generator";
import {
  eventPassRelevantDate,
  formatWalletPassEventDate,
} from "@/lib/utils";

/**
 * Generación de pases .pkpass para Apple Wallet.
 *
 * El pase es estático: se firma bajo demanda con los certificados del Pass Type
 * ID que viven en el VPS (ver docs/IOS_APP_SETUP.md). Si faltan, el módulo se
 * degrada y el endpoint responde 503 en vez de reventar.
 */

const PASS_MODEL_DIR = path.join(
  process.cwd(),
  "assets",
  "wallet-pass",
  "Somnus.pass"
);

export class WalletPassUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletPassUnavailableError";
  }
}

export class WalletPassNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletPassNotFoundError";
  }
}

interface WalletPassConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  wwdr: Buffer;
  signerCert: Buffer;
  signerKey: Buffer;
  signerKeyPassphrase?: string;
}

/** Lee un PEM desde su ruta en disco o desde la variable inline equivalente. */
function readPem(pathEnv: string, inlineEnv: string): Buffer | null {
  const inline = process.env[inlineEnv];
  if (inline && inline.trim()) {
    return Buffer.from(inline.replace(/\\n/g, "\n"), "utf8");
  }

  const filePath = process.env[pathEnv];
  if (!filePath) return null;

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!existsSync(resolved)) return null;

  try {
    return readFileSync(resolved);
  } catch {
    return null;
  }
}

function resolveConfig(): WalletPassConfig | null {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID;
  const teamIdentifier =
    process.env.APPLE_PASS_TEAM_ID || process.env.APPLE_TEAM_ID;

  if (!passTypeIdentifier || !teamIdentifier) return null;
  if (!existsSync(path.join(PASS_MODEL_DIR, "pass.json"))) return null;

  const wwdr = readPem("APPLE_WWDR_CERT_PATH", "APPLE_WWDR_CERT_PEM");
  const signerCert = readPem("APPLE_PASS_CERT_PATH", "APPLE_PASS_CERT_PEM");
  const signerKey = readPem("APPLE_PASS_KEY_PATH", "APPLE_PASS_KEY_PEM");

  if (!wwdr || !signerCert || !signerKey) return null;

  return {
    passTypeIdentifier,
    teamIdentifier,
    wwdr,
    signerCert,
    signerKey,
    signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
  };
}

/** ¿Está el servidor en condiciones de firmar pases? Barato, sirve para feature flags. */
export function isWalletPassEnabled(): boolean {
  return resolveConfig() !== null;
}

export interface TicketPassResult {
  buffer: Buffer;
  fileName: string;
}

/**
 * Construye y firma el .pkpass de un boleto.
 *
 * El código de barras usa exactamente el mismo payload que el QR de la web
 * (`generateQRPayload`), de forma que /api/tickets/scan valida ambos igual.
 */
export async function buildTicketPass(
  ticketId: string
): Promise<TicketPassResult> {
  const config = resolveConfig();
  if (!config) {
    throw new WalletPassUnavailableError(
      "Apple Wallet no está configurado en este servidor"
    );
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: { select: { name: true, validUntil: true } },
      sale: {
        select: {
          id: true,
          buyerName: true,
          buyerEmail: true,
          event: {
            select: {
              name: true,
              artist: true,
              venue: true,
              address: true,
              eventDate: true,
              eventTime: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new WalletPassNotFoundError("Boleto no encontrado");
  }

  const { sale, ticketType } = ticket;
  const { event } = sale;

  const pass = await PKPass.from(
    {
      model: PASS_MODEL_DIR,
      certificates: {
        wwdr: config.wwdr,
        signerCert: config.signerCert,
        signerKey: config.signerKey,
        signerKeyPassphrase: config.signerKeyPassphrase,
      },
    },
    {
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      serialNumber: ticket.id,
      description: `Boleto ${event.name}`,
      organizationName: "Somnus",
    }
  );

  pass.type = "eventTicket";

  pass.headerFields.push({
    key: "ticketNumber",
    label: "FOLIO",
    value: ticket.ticketNumber,
  });

  pass.primaryFields.push({
    key: "event",
    label: "EVENTO",
    value: event.name,
  });

  pass.secondaryFields.push(
    {
      key: "date",
      label: "FECHA",
      value: formatWalletPassEventDate(event.eventDate),
    },
    {
      key: "time",
      label: "HORA",
      value: event.eventTime || "Por confirmar",
    }
  );

  pass.auxiliaryFields.push(
    {
      key: "ticketType",
      label: "ACCESO",
      value: ticketType.name,
    },
    {
      key: "holder",
      label: "A NOMBRE DE",
      value: sale.buyerName,
    }
  );

  if (ticket.tableNumber) {
    pass.auxiliaryFields.push({
      key: "table",
      label: "MESA",
      value: ticket.seatNumber
        ? `${ticket.tableNumber} · Lugar ${ticket.seatNumber}`
        : ticket.tableNumber,
    });
  }

  pass.backFields.push(
    { key: "artist", label: "Artista", value: event.artist },
    { key: "venue", label: "Lugar", value: event.venue },
    ...(event.address
      ? [{ key: "address", label: "Dirección", value: event.address }]
      : []),
    { key: "buyerEmail", label: "Comprador", value: sale.buyerEmail },
    { key: "saleId", label: "Orden", value: sale.id },
    {
      key: "terms",
      label: "Acceso",
      value:
        "Presenta este código en el acceso. El boleto es válido para una sola entrada y se invalida al ser escaneado.",
    }
  );

  pass.setBarcodes({
    message: generateQRPayload(ticket.id, ticket.qrCode),
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
  });

  const relevant = eventPassRelevantDate(event.eventDate, event.eventTime);
  pass.setRelevantDate(relevant);

  if (ticketType.validUntil) {
    pass.setExpirationDate(ticketType.validUntil);
  }

  return {
    buffer: pass.getAsBuffer(),
    fileName: `somnus-${ticket.ticketNumber}.pkpass`,
  };
}
