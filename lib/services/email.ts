import crypto from "crypto";
import { sendMail } from "@/lib/services/mailer";

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
  const subject = "Código de verificación - Somnus";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2a2c30; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Somnus</h1>
          <p>Verificación de Email</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2>Hola ${name},</h2>
          <p>Tu código de verificación:</p>
          <div style="background: #5B8DEF; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px;">
            ${code}
          </div>
          <p>Este código expira en 10 minutos.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Somnus — Hola ${name}, tu código es: ${code}. Expira en 10 minutos.`;
  return sendEmail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "Restablecer contraseña - Somnus";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2a2c30; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Somnus</h1>
          <p>Restablecer contraseña</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2>Hola ${name},</h2>
          <p>Haz clic en el botón para elegir una nueva contraseña:</p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background: #5B8DEF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Restablecer contraseña
            </a>
          </p>
          <p style="font-size: 12px; color: #666;">O copia este enlace:<br>${resetUrl}</p>
          <p>El enlace expira en 1 hora. Si no lo pediste, ignora este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Somnus — Hola ${name}. Restablece tu contraseña aquí: ${resetUrl}`;
  return sendEmail({ to: email, subject, html, text });
}
