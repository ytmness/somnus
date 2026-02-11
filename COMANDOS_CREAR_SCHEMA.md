# 🗄️ Comandos para Crear Schema en Supabase

## 📋 Opción 1: Usar Prisma (Recomendado)

Si logras conectar con Prisma, simplemente ejecuta:

```bash
cd /var/www/somnus
npm run db:push
```

Esto creará automáticamente todas las tablas basándose en `prisma/schema.prisma`.

---

## 📋 Opción 2: Ejecutar SQL Manualmente

Si Prisma no funciona, puedes ejecutar el SQL directamente en Supabase:

### Paso 1: Ir al SQL Editor de Supabase

1. Ve a: https://supabase.com/dashboard/project/rbcqxxbddvbomwarmjvd
2. Haz clic en **"SQL Editor"** en el menú lateral
3. Haz clic en **"New query"**

### Paso 2: Copiar y Pegar el SQL

Copia todo el contenido del archivo `scripts/create-schema-somnus.sql` y pégalo en el SQL Editor.

### Paso 3: Ejecutar

Haz clic en **"Run"** o presiona `Ctrl + Enter`.

---

## 🔧 Opción 3: Desde el Servidor (si tienes acceso a psql)

```bash
# Conectar a la base de datos usando el connection string
psql "postgres://postgres:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# O si tienes el archivo SQL en el servidor
psql "postgres://postgres:5S73wOjVjiSyRvFV@aws-0-us-east-1.pooler.supabase.com:5432/postgres" -f /var/www/somnus/scripts/create-schema-somnus.sql
```

---

## ✅ Verificar que las Tablas se Crearon

Después de ejecutar el SQL, verifica en Supabase:

1. Ve a **"Table Editor"** en el dashboard
2. Deberías ver estas tablas:
   - User
   - Event
   - TicketType
   - Sale
   - Ticket
   - TicketScan
   - TicketReprint
   - AuditLog
   - SystemConfig

---

## 🔐 Crear Usuarios Iniciales

Después de crear las tablas, crea los usuarios admin y vendedor:

```sql
-- Primero necesitas hashear las contraseñas con bcrypt
-- Puedes usar Node.js para esto:

-- En el servidor:
cd /var/www/somnus
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('admin123', 10));"
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('vendedor123', 10));"

-- Luego inserta en la base de datos con los hashes generados
```

O usa el script de seed de Prisma:

```bash
npm run db:seed
```

---

## 🐛 Si Prisma Aún No Funciona

El problema del "Tenant or user not found" sugiere que el formato del connection string está mal. 

**Solución**: Obtén el connection string exacto desde Supabase Dashboard:

1. Ve a: https://supabase.com/dashboard/project/rbcqxxbddvbomwarmjvd
2. Haz clic en **"Connect"** (botón en la parte superior)
3. Selecciona **"Session mode"**
4. Copia el connection string completo
5. Úsalo exactamente como aparece (solo reemplaza `[YOUR-PASSWORD]` con `5S73wOjVjiSyRvFV`)

---

## 📝 Nota Importante

El script SQL crea:
- ✅ Todos los ENUMs necesarios
- ✅ Todas las tablas con sus constraints
- ✅ Todos los índices
- ✅ Triggers para actualizar `updatedAt` automáticamente
- ✅ Foreign keys y relaciones

**NO crea datos iniciales** - eso lo harás después con el seed o manualmente.

---

¡Ejecuta el SQL en Supabase Dashboard y luego prueba `npm run db:push` de nuevo! 🚀
