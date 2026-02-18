# Configurar envío de emails (Resend)

Para que los códigos OTP lleguen por correo, configura Resend:

## 1. Crear cuenta en Resend

1. Entra en [resend.com](https://resend.com)
2. Regístrate
3. Ve a **API Keys** → **Create API Key**
4. Copia la clave (empieza con `re_`)

## 2. Añadir al `.env` del servidor

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```

## 3. Reiniciar la app

```bash
pm2 restart all
```

---

## Producción: verificar tu dominio

Por defecto Resend usa `onboarding@resend.dev`, que en el plan gratis **solo puede enviar al email con el que te registraste**.

Para enviar a cualquier usuario:

1. En Resend Dashboard → **Domains** → **Add Domain**
2. Añade `somnus.live` (o tu dominio)
3. Configura los registros DNS que te indique
4. Una vez verificado, añade al `.env`:
   ```
   RESEND_FROM=Somnus <noreply@somnus.live>
   ```
