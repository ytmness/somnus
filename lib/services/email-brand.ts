import { getAppUrl } from "@/lib/payments/config";

export const SOMNUS_FROM_NAME = "Somnus";
export const SOMNUS_SUPPORT_EMAIL = "tickets@somnus.live";

const BG = "#0A0A0A";
const SURFACE = "#121212";
const BORDER = "#2C2C2C";
const INK = "#F4F4F4";
const MUTED = "#C8C8C8";
const ACCENT = "#5B8DEF";

export function somnusLogoUrl(appUrl = getAppUrl()): string {
  return `${appUrl.replace(/\/$/, "")}/assets/SOMNUS%20LOGO%20BLANCO.png`;
}

export function wrapSomnusEmail(params: {
  preheader: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  cta?: { href: string; label: string };
  footerNote?: string;
  appUrl?: string;
}): string {
  const appUrl = (params.appUrl || getAppUrl()).replace(/\/$/, "");
  const logoUrl = somnusLogoUrl(appUrl);
  const year = new Date().getFullYear();
  const cta = params.cta
    ? `
      <tr>
        <td align="center" style="padding:8px 28px 28px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="${ACCENT}" style="border-radius:8px;">
                <a href="${params.cta.href}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;">
                  ${params.cta.label}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>SOMNUS</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};">
      ${params.preheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 24px 0;">
                <img src="${logoUrl}" alt="SOMNUS" width="176" style="display:block;width:176px;max-width:70%;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td bgcolor="${SURFACE}" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="height:3px;background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 28px 8px 28px;">
                      <div style="font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:24px;font-weight:700;line-height:1.25;">
                        ${params.heading}
                      </div>
                      ${
                        params.subheading
                          ? `<div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;color:${MUTED};font-size:14px;line-height:1.5;">${params.subheading}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 28px 8px 28px;">
                      ${params.bodyHtml}
                    </td>
                  </tr>
                  ${cta}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 12px 0 12px;">
                ${
                  params.footerNote
                    ? `<div style="font-family:Arial,Helvetica,sans-serif;color:${MUTED};font-size:12px;line-height:1.6;padding-bottom:10px;">${params.footerNote}</div>`
                    : ""
                }
                <div style="font-family:Arial,Helvetica,sans-serif;color:#8A8A8A;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">
                  © ${year} SOMNUS
                </div>
                <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
                  <a href="${appUrl}" style="color:${ACCENT};text-decoration:none;">somnus.live</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
