import crypto from "crypto";
import { sendMail } from "@/lib/services/mailer";
import { wrapSomnusEmail, SOMNUS_SUPPORT_EMAIL } from "@/lib/services/email-brand";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  return sendMail(options);
}

export function generateVerificationCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function sendVerificationCode(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = "Tu código Somnus";
  const html = wrapSomnusEmail({
    preheader: `Tu código de verificación es ${code}`,
    heading: `Hola, ${name}.`,
    subheading: "Usa este código para continuar. Caduca en 10 minutos.",
    bodyHtml: `
      <div style="margin:8px 0 4px 0;padding:22px 12px;background:#1A1A1A;border:1px solid #2C2C2C;border-radius:8px;text-align:center;">
        <div style="font-family:Arial,Helvetica,sans-serif;color:#7BA3E8;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
          Código
        </div>
        <div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;color:#F4F4F4;font-size:32px;font-weight:700;letter-spacing:0.28em;">
          ${code}
        </div>
      </div>
    `,
    footerNote: `Si no pediste este código, ignora el correo. ${SOMNUS_SUPPORT_EMAIL}`,
  });
  const text = `SOMNUS — Hola ${name}, tu código es: ${code}. Expira en 10 minutos.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "Restablecer contraseña · Somnus";
  const html = wrapSomnusEmail({
    preheader: "Elige una nueva contraseña para tu cuenta Somnus",
    heading: `Hola, ${name}.`,
    subheading: "Este enlace caduca en 1 hora. Si no lo pediste, ignora el correo.",
    bodyHtml: `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>`,
    cta: { href: resetUrl, label: "Restablecer contraseña" },
    footerNote: `O copia este enlace:<br>${resetUrl}`,
  });
  const text = `SOMNUS — Hola ${name}. Restablece tu contraseña aquí: ${resetUrl}`;
  return sendEmail({ to: email, subject, html, text });
}
