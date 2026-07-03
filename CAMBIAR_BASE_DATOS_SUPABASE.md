# 🔄 Cambiar Base de Datos Supabase

## 📋 Valores que Ya Tienes

- **Project URL**: `https://rbcqxxbddvbomwarmjvd.supabase.co`
- **Publishable API Key**: `sb_publishable_WrpvzovRy3XZM4R1jBazSw_2oXS7o2o`

---

## 🔍 Valores que Necesitas Obtener

### 1. Service Role Key (Secret Key)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona el proyecto: `rbcqxxbddvbomwarmjvd`
3. Ve a **Settings** → **API**
4. En la sección **Project API keys**, busca **`service_role`** (secret)
5. Haz clic en **Reveal** o **Show** para verla
6. **Copia esa clave** (es muy larga, asegúrate de copiarla completa)

### 2. Database Password

1. Ve a **Settings** → **Database**
2. Busca la sección **Connection string** o **Connection pooling**
3. Necesitas la contraseña de la base de datos PostgreSQL
4. Si no la tienes, puedes resetearla en **Settings** → **Database** → **Reset database password**

### 3. Database URL (Connection String)

Una vez que tengas la contraseña, el formato será:

```
postgresql://postgres:[TU-PASSWORD]@db.rbcqxxbddvbomwarmjvd.supabase.co:5432/postgres
```

O si usas Connection Pooling:

```
postgresql://postgres:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## 📝 Configuración Completa del .env

Una vez que tengas todos los valores, tu `.env` debería verse así:

```env
# Supabase - Project URL
NEXT_PUBLIC_SUPABASE_URL=https://rbcqxxbddvbomwarmjvd.supabase.co

# Supabase - Anon Key (Publishable API Key)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_WrpvzovRy3XZM4R1jBazSw_2oXS7o2o

# Supabase - Service Role Key (Secret Key - OBTENER DE SETTINGS → API)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3F4eGJkZHZib213YXJtanZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTQ2NDI1NywiZXhwIjoyMDUxMDQwMjU3fQ.[TU-SERVICE-ROLE-KEY-AQUI]

# Database - Connection String (con tu contraseña)
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.rbcqxxbddvbomwarmjvd.supabase.co:5432/postgres

# Database - Direct URL (igual que DATABASE_URL)
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

## 🚀 Pasos para Actualizar en el Servidor

### Opción 1: Editar .env en el Servidor

```bash
# Conectar al servidor
ssh root@144.202.72.150

# Ir al directorio de la aplicación
cd /var/www/somnus

# Editar .env
nano .env
```

Pega la configuración completa con todos los valores reales.

**Guardar**: `CTRL + O`, `ENTER`, `CTRL + X`

```bash
# Aplicar cambios
npm run db:push
npm run build
pm2 restart somnus
pm2 logs somnus
```

### Opción 2: Actualizar desde tu Computadora

Si prefieres actualizar el `.env.example` y hacer commit:

1. Actualiza `.env.example` con los nuevos valores
2. Haz commit y push
3. En el servidor:
   ```bash
   cd /var/www/somnus
   git pull origin main
   cp .env.example .env
   nano .env  # Editar con valores reales (contraseñas, etc.)
   npm run db:push
   npm run build
   pm2 restart somnus
   ```

---

## 🔐 Cómo Obtener Service Role Key (Paso a Paso)

1. **Inicia sesión en Supabase**: https://supabase.com/dashboard
2. **Selecciona tu proyecto**: `rbcqxxbddvbomwarmjvd`
3. **Ve a Settings** (icono de engranaje en la barra lateral izquierda)
4. **Haz clic en "API"** en el menú de Settings
5. **Busca la sección "Project API keys"**
6. **Encuentra "service_role"** (debería estar marcada como "secret")
7. **Haz clic en el ícono de ojo** o **"Reveal"** para mostrarla
8. **Copia toda la clave** (es muy larga, tipo JWT)

---

## 🔐 Cómo Obtener Database Password

### Si NO conoces la contraseña:

1. Ve a **Settings** → **Database**
2. Busca **"Database password"** o **"Reset database password"**
3. Haz clic en **"Reset database password"**
4. Copia la nueva contraseña que te muestre
5. **Guárdala en un lugar seguro** (no la compartas)

### Si YA conoces la contraseña:

Solo úsala directamente en el `DATABASE_URL`.

---

## 📋 Checklist de Valores Necesarios

- [ ] **NEXT_PUBLIC_SUPABASE_URL**: `https://rbcqxxbddvbomwarmjvd.supabase.co` ✅
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY**: `sb_publishable_WrpvzovRy3XZM4R1jBazSw_2oXS7o2o` ✅
- [ ] **SUPABASE_SERVICE_ROLE_KEY**: (obtener de Settings → API → service_role)
- [ ] **DATABASE_URL**: (necesitas la contraseña de PostgreSQL)
- [ ] **DIRECT_URL**: (igual que DATABASE_URL)

---

## ⚠️ Importante

1. **Service Role Key es SECRETA**: No la compartas ni la subas a GitHub
2. **Database Password es SECRETA**: No la compartas
3. **Nunca hagas commit del archivo `.env`** con valores reales
4. Solo actualiza `.env.example` con valores de ejemplo (sin contraseñas reales)

---

## 🐛 Troubleshooting

### Error: "Missing env.NEXT_PUBLIC_SUPABASE_URL"

- Verifica que el `.env` esté en el directorio correcto (`/var/www/somnus`)
- Verifica que no tenga espacios extra o comillas mal cerradas

### Error: "Invalid API key"

- Verifica que copiaste la Service Role Key completa (es muy larga)
- Asegúrate de que no tenga espacios al inicio o final

### Error de conexión a la base de datos

- Verifica que la contraseña sea correcta
- Verifica que el formato del `DATABASE_URL` sea correcto
- Asegúrate de que el proyecto esté activo en Supabase

---

## ✅ Después de Actualizar

```bash
# Verificar que las variables están cargadas
cd /var/www/somnus
npm run db:push  # Esto aplicará el schema a la nueva BD

# Si hay errores, verifica los logs
pm2 logs somnus

# Rebuild y reiniciar
npm run build
pm2 restart somnus
```

---

¡Listo! Una vez que tengas todos los valores, actualiza el `.env` y reinicia la aplicación. 🎉
