/**
 * Servicio de envío de emails
 * Usa Resend cuando RESEND_API_KEY está configurado
 */

import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getFromEmail(): string {
  // Resend: verifica tu dominio para usar noreply@somnus.live
  // Sin dominio verificado, usa onboarding@resend.dev (solo para pruebas)
  return process.env.RESEND_FROM || "Somnus <onboarding@resend.dev>";
}

/**
 * Envía un email (Resend en producción, simulador si no hay API key)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: getFromEmail(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error("[EMAIL] Resend error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[EMAIL] Error enviando email:", err);
      return false;
    }
  }

  // Sin API key: solo log (desarrollo)
  console.log("=".repeat(50));
  console.log("📧 EMAIL (SIMULADO - falta RESEND_API_KEY)");
  console.log("Para:", options.to);
  console.log("Asunto:", options.subject);
  console.log("Código/cuerpo:", options.text || options.html?.substring(0, 100) + "...");
  console.log("=".repeat(50));
  return true;
}

/**
 * Genera un código de verificación de 8 dígitos
 */
export function generateVerificationCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Envía código de verificación por email
 */
export async function sendVerificationCode(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = "Código de verificación - Somnus";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2a2c30 0%, #49484e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .code { background: #5B8DEF; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Somnus</h1>
          <p>Verificación de Email</p>
        </div>
        <div class="content">
          <h2>Hola ${name},</h2>
          <p>Tu código de verificación para iniciar sesión en Somnus:</p>
          <div class="code">${code}</div>
          <p>Este código expira en 10 minutos.</p>
          <p>Si no solicitaste este código, puedes ignorar este email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Somnus. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `
Somnus - Código de Verificación

Hola ${name},

Tu código de verificación es: ${code}

Este código expira en 10 minutos.

Si no solicitaste este código, ignora este email.
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
