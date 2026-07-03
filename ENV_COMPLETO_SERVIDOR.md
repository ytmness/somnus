# 📝 Configuración .env Completa para Servidor Somnus

## 🔐 Archivo .env para el Servidor

Copia y pega esto en `/var/www/somnus/.env`:

```env
# Supabase - Proyecto Somnus
NEXT_PUBLIC_SUPABASE_URL=https://rbcqxxbddvbomwarmjvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODQ4NjksImV4cCI6MjA4NTA2MDg2OX0.gXGvt33WNSxTPThkoJumGt97ipbbSAvkCDty6zC-er4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ4NDg2OSwiZXhwIjoyMDg1MDYwODY5fQ.Cj2FfgTE6VU_Sshv-hwXQ2xNFTvM52043ew6ucwzHPc

# Database - Reemplazar [TU-PASSWORD] con tu contraseña real
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.rbcqxxbddvbomwarmjvd.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[TU-PASSWORD]@db.rbcqxxbddvbomwarmjvd.supabase.co:5432/postgres

# Next.js
NEXT_PUBLIC_APP_URL=https://somnus.live
NEXT_PUBLIC_APP_NAME=Somnus - Boletera

# Secrets
QR_SECRET_KEY=somnus-qr-secret-2025-cambiar-en-produccion
JWT_SECRET=8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a

# Environment
NODE_ENV=production
```

---

## ⚠️ Valor que AÚN Necesitas Obtener

### Database Password

1. Ve a: Settings → Database
2. Busca "Database password" o "Reset database password"
3. Si no la conoces, resetea y copia la nueva

---

## 🚀 Comandos para Configurar en el Servidor

```bash
# Conectar al servidor
ssh root@144.202.72.150

# Ir al directorio
cd /var/www/somnus

# Editar .env
nano .env
```

**Pega la configuración completa** reemplazando:
- `[TU-PASSWORD]` → Tu contraseña de PostgreSQL

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

```bash
# Aplicar schema a la base de datos
npm run db:push

# Build
npm run build

# Reiniciar
pm2 restart somnus

# Ver logs
pm2 logs somnus
```

---

## ✅ Checklist

- [x] NEXT_PUBLIC_SUPABASE_URL: `https://rbcqxxbddvbomwarmjvd.supabase.co`
- [x] NEXT_PUBLIC_SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [x] SUPABASE_SERVICE_ROLE_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [ ] DATABASE_URL: (necesitas la contraseña)
- [ ] DIRECT_URL: (igual que DATABASE_URL)

---

## 📋 Resumen de Valores Actuales

✅ **Ya configurados:**
- Project URL: `https://rbcqxxbddvbomwarmjvd.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODQ4NjksImV4cCI6MjA4NTA2MDg2OX0.gXGvt33WNSxTPThkoJumGt97ipbbSAvkCDty6zC-er4`
- Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ4NDg2OSwiZXhwIjoyMDg1MDYwODY5fQ.Cj2FfgTE6VU_Sshv-hwXQ2xNFTvM52043ew6ucwzHPc`

⏳ **Pendiente:**
- Database Password

---

¡Una vez que tengas esos dos valores, pega todo en el `.env` del servidor y ejecuta los comandos! 🎉
