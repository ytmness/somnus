import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function secret() {
  return (
    process.env.TICKET_PASSWORD_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "somnus-dev-ticket-password"
  );
}

export async function hashTicketPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyTicketPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Short-lived HMAC token proving password was verified for a ticket type. */
export function signTicketPasswordToken(ticketTypeId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${ticketTypeId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyTicketPasswordToken(
  token: string,
  ticketTypeId: string
): boolean {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return false;
    const [id, expStr, sig] = parts;
    if (id !== ticketTypeId) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${id}.${expStr}`;
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function newBalancePayToken(): string {
  return randomBytes(16).toString("hex");
}

export function optionalDate(v: string | Date | null | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
