# Configurar plantilla OTP en Supabase (solo código, sin magic link)

Supabase envía el OTP por defecto con un **magic link**. Para mostrar solo el **código de 6 dígitos** (sin link):

## 1. Editar plantilla Magic Link

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Authentication** → **Email Templates**
3. Elige **Magic Link**
4. Reemplaza el contenido por algo así:

### Subject

```
Tu código de acceso - Somnus
```

### Body (HTML) – Estilo blanco (igual que login)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background-color: #FFFFFF;
      color: #0A0A0A;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .header {
      text-align: center;
      padding: 24px 0;
      border-bottom: 1px solid #E5E5E5;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0A0A0A;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #666;
    }
    .content {
      padding: 32px 0;
    }
    .content h2 {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 600;
      color: #0A0A0A;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 15px;
      color: #333;
    }
    .code {
      display: inline-block;
      background: #0A0A0A;
      color: #FFFFFF;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 8px;
      padding: 20px 28px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
      border: 2px solid #E5E5E5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #E5E5E5;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SOMNUS</h1>
      <p>Verificación de Email</p>
    </div>
    <div class="content">
      <h2>Tu código de verificación</h2>
      <p>Usa este código para iniciar sesión en Somnus:</p>
      <div class="code">{{ .Token }}</div>
      <p>El código expira en 1 hora.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    </div>
    <div class="footer">
      <p>© 2025 Somnus. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
```

**Versión reducida** (si Supabase limita el tamaño, usa solo esto en el Body):

```html
<div style="max-width:600px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif;background:#FFFFFF;color:#0A0A0A;">
  <div style="text-align:center;padding:24px 0;border-bottom:1px solid #E5E5E5;">
    <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0A0A0A;">SOMNUS</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#666;">Verificación de Email</p>
  </div>
  <div style="padding:32px 0;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#0A0A0A;">Tu código de verificación</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#333;">Usa este código para iniciar sesión en Somnus:</p>
    <div style="background:#0A0A0A;color:#FFF;font-size:28px;font-weight:800;letter-spacing:8px;padding:20px;margin:20px 0;border-radius:8px;text-align:center;">{{ .Token }}</div>
    <p style="margin:0;font-size:14px;color:#666;">Expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>
  </div>
  <p style="text-align:center;margin-top:24px;font-size:12px;color:#999;">© 2025 Somnus</p>
</div>
```

**Importante:** usa solo `{{ .Token }}`. No incluyas `{{ .ConfirmationURL }}` (ese es el magic link).

---

## 2. Site URL

En **Authentication** → **URL Configuration**:
- **Site URL:** `https://somnus.live`
- **Redirect URLs:** `https://somnus.live/**` y `https://somnus.live/auth/callback`

---

## Nota sobre los dígitos

Supabase genera siempre un **OTP de 6 dígitos**. No se puede configurar a 8 en el panel ni en la API.
