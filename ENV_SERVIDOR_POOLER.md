# 🔧 Configuración .env para Servidor con Session Pooler

## ⚠️ Problema Resuelto

Tu servidor VPS no tiene IPv6, por lo que **NO puedes usar la conexión directa**. Debes usar el **Session Pooler** de Supabase.

---

## 📝 Archivo .env Completo para el Servidor

Copia esto en `/var/www/somnus/.env`:

```env
# Supabase - Proyecto Somnus
NEXT_PUBLIC_SUPABASE_URL=https://rbcqxxbddvbomwarmjvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODQ4NjksImV4cCI6MjA4NTA2MDg2OX0.gXGvt33WNSxTPThkoJumGt97ipbbSAvkCDty6zC-er4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ4NDg2OSwiZXhwIjoyMDg1MDYwODY5fQ.Cj2FfgTE6VU_Sshv-hwXQ2xNFTvM52043ew6ucwzHPc

# Database - Session Pooler (IPv4 compatible)
# Formato: postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
DATABASE_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Direct URL - Para migraciones (usa Transaction Mode si no funciona)
# Transaction Mode (puerto 6543) - mejor para migraciones
DIRECT_URL=postgres://postgres:5S73wOjVjiSyRvFV@db.rbcqxxbddvbomwarmjvd.supabase.co:6543/postgres

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

## 🔑 Diferencias Clave

### ❌ INCORRECTO (Conexión Directa - requiere IPv6):
```
DATABASE_URL=postgresql://postgres:5S73wOjVjiSyRvFV@db.rbcqxxbddvbomwarmjvd.supabase.co:5432/postgres
```

### ✅ CORRECTO (Session Pooler - funciona con IPv4):
```
DATABASE_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Nota**: El usuario incluye el project ref: `postgres.rbcqxxbddvbomwarmjvd`

---

## 🚀 Comandos para el Servidor

```bash
# 1. Conectar al servidor
ssh root@144.202.72.150

# 2. Ir al directorio
cd /var/www/somnus

# 3. Editar .env
nano .env

# 4. Pegar la configuración completa de arriba
# Guardar: CTRL + O, ENTER, CTRL + X

# 5. Instalar dependencias (si no lo has hecho)
npm install --legacy-peer-deps

# 6. Aplicar schema a la base de datos
npm run db:push

# 7. Generar cliente Prisma
npm run db:generate

# 8. Build
npm run build

# 9. Reiniciar PM2
pm2 restart somnus

# 10. Ver logs
pm2 logs somnus
```

---

## 🔍 Verificar Conexión

Si `db:push` falla, prueba estas alternativas para `DIRECT_URL`:

### Opción 1: Transaction Mode (puerto 6543)
```env
DIRECT_URL=postgres://postgres:5S73wOjVjiSyRvFV@db.rbcqxxbddvbomwarmjvd.supabase.co:6543/postgres
```

### Opción 2: Session Pooler también para DIRECT_URL
```env
DIRECT_URL=postgres://postgres.rbcqxxbddvbomwarmjvd:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## ✅ Checklist

- [x] DATABASE_URL usa Session Pooler con formato correcto
- [x] Usuario incluye project ref: `postgres.rbcqxxbddvbomwarmjvd`
- [x] Password correcta: `5S73wOjVjiSyRvFV`
- [x] Host correcto: `aws-0-us-east-1.pooler.supabase.com`
- [x] Puerto correcto: `5432`
- [x] DIRECT_URL configurado para migraciones

---

## 📚 Referencias

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- Session Mode: Para servidores persistentes con IPv4
- Transaction Mode: Para funciones serverless o migraciones
