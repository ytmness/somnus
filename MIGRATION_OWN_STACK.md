# Migración fuera de Supabase

Somnus ya no depende de Supabase. Stack actual:

| Antes | Ahora |
|-------|--------|
| Supabase Postgres | Postgres en tu VPS (`DATABASE_URL`) |
| Supabase Auth | Auth.js en `/api/authjs` + rutas `/api/auth/*` |
| Supabase Storage | Disco local `UPLOAD_DIR` servido en `/uploads` |
| SQL Editor dashboard | Tab **SQL** en `/admin` |

## Checklist de despliegue

1. **DB:** sigue [MIGRATE_DB_OWN_SERVER.md](./MIGRATE_DB_OWN_SERVER.md)
2. **Schema:** `npx prisma db push` (añade `OtpCode`, `PasswordResetToken`, `SQL_EXECUTED`)
3. **Env:** copia `.env.example` → actualiza `.env` del servidor:
   - Quita `NEXT_PUBLIC_SUPABASE_*` y `SUPABASE_SERVICE_ROLE_KEY`
   - Pon `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `UPLOAD_DIR`, `RESEND_API_KEY`
   - OAuth: `GOOGLE_*`, `APPLE_*` con redirects:
     - `https://tu-dominio/api/authjs/callback/google`
     - `https://tu-dominio/api/authjs/callback/apple`
4. **Uploads:** `sudo bash scripts/setup-local-uploads.sh`
5. **Migrar imágenes:** `npx tsx scripts/migrate-storage-to-local.ts`
6. `npm run build && pm2 restart somnus`

## Auth

- Login/register/logout/session: `/api/auth/*` (formato SessionUser de la app)
- Auth.js handlers: `/api/authjs/*`
- OTP: `/api/auth/otp/send` + `/verify` vía Resend
- Reset password: `/api/auth/forgot-password` → `/reset-password`

## SQL Editor

Tab Admin → SQL. Lectura y escritura con confirmación y `AuditLog`.
