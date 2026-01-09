/**
 * Servicio de envío de emails
 * Por ahora simulado, en producción integrar con Resend, SendGrid, etc.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envía un email (simulado por ahora)
 * TODO: Integrar con servicio real (Resend, SendGrid, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Por ahora solo logueamos el email
    // En producción, aquí iría la integración con el servicio de email
    console.log("=".repeat(50));
    console.log("📧 EMAIL ENVIADO (SIMULADO)");
    console.log("Para:", options.to);
    console.log("Asunto:", options.subject);
    console.log("Contenido:", options.text || options.html);
    console.log("=".repeat(50));

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 500));

    return true;
  } catch (error) {
    console.error("Error al enviar email:", error);
    return false;
  }
}

/**
 * Genera un código de verificación de 6 dígitos
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envía código de verificación por email
 */
export async function sendVerificationCode(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = "Código de verificación - Grupo Regia";
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
        .code { background: #c4a905; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Grupo Regia</h1>
          <p>Verificación de Email</p>
        </div>
        <div class="content">
          <h2>Hola ${name},</h2>
          <p>Gracias por registrarte en Grupo Regia. Para completar tu registro, por favor ingresa el siguiente código de verificación:</p>
          <div class="code">${code}</div>
          <p>Este código expira en 24 horas.</p>
          <p>Si no solicitaste este código, puedes ignorar este email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Grupo Regia. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `
    Grupo Regia - Código de Verificación
    
    Hola ${name},
    
    Gracias por registrarte en Grupo Regia. Tu código de verificación es:
    
    ${code}
    
    Este código expira en 24 horas.
    
    Si no solicitaste este código, puedes ignorar este email.
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

