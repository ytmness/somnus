import nodemailer from "nodemailer";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function isLocalSmtpHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function resolveFromAddress(): string {
  const emailFrom = process.env.EMAIL_FROM?.trim();
  if (emailFrom) return emailFrom;
  const email =
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "tickets@somnus.live";
  const name = process.env.SMTP_FROM_NAME?.trim() || "Somnus";
  return `${name} <${email}>`;
}

function logSimulated(options: MailOptions, reason: string) {
  console.log("=".repeat(50));
  console.log(`[email] ${reason} — email simulado`);
  console.log("Para:", options.to);
  console.log("Asunto:", options.subject);
  if (options.text) console.log(options.text.slice(0, 200));
  console.log("=".repeat(50));
}

/**
 * Envía correo por SMTP (Postfix local → GoDaddy en producción).
 * En desarrollo sin SMTP_HOST solo registra y no falla.
 * En producción nunca finge éxito.
 */
export async function sendMailOrThrow(options: MailOptions): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (!host) {
    if (isProd) {
      throw new Error("SMTP_HOST no configurado");
    }
    logSimulated(options, "SMTP_HOST no configurada");
    return;
  }

  const local = isLocalSmtpHost(host);
  const port = Number(
    process.env.SMTP_PORT || (local ? 25 : 465)
  );
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const secureFlag = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureFlag === "true" || (secureFlag !== "false" && port === 465);

  if (!local && (!smtpUser || !smtpPass)) {
    throw new Error("SMTP_USER/SMTP_PASS no configurados");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    tls:
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await transporter.sendMail({
    from: resolveFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  try {
    await sendMailOrThrow(options);
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[email] SMTP error:", msg);
    return false;
  }
}
