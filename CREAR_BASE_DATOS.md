# 🗄️ Crear Base de Datos en Supabase

## 📋 Pasos para Crear el Schema

### Opción 1: Usar Script SQL (RECOMENDADO)

1. **Ve a Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Selecciona el proyecto: `rbcqxxbddvbomwarmjvd`

2. **Abre SQL Editor**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **New query**

3. **Ejecuta el Script**
   - Abre el archivo: `scripts/create-database-schema.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **RUN** o presiona `F5`

4. **Verificar que se creó correctamente**
   ```sql
   -- Ejecuta esto en SQL Editor para verificar
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   
   Deberías ver estas tablas:
   - AuditLog
   - Event
   - Sale
   - SystemConfig
   - Ticket
   - TicketReprint
   - TicketScan
   - TicketType
   - User

---

### Opción 2: Usar Prisma db:push (ALTERNATIVA)

Si prefieres usar Prisma directamente desde el servidor:

```bash
# 1. Conectar al servidor
ssh root@144.202.72.150

# 2. Ir al directorio
cd /var/www/somnus

# 3. Verificar que .env está configurado correctamente
cat .env | grep DATABASE_URL

# 4. Aplicar schema con Prisma
npm run db:push

# 5. Generar cliente Prisma
npm run db:generate
```

**Nota**: Si `db:push` falla por problemas de conexión, usa la Opción 1 primero.

---

## ✅ Verificación Post-Creación

### Verificar Tablas Creadas

Ejecuta en SQL Editor de Supabase:

```sql
-- Listar todas las tablas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Verificar Tipos ENUM

```sql
-- Listar todos los tipos ENUM
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;
```

Deberías ver:
- AuditAction
- SaleChannel
- SaleStatus
- ScanResult
- TicketCategory
- TicketStatus
- UserRole

### Verificar Índices

```sql
-- Listar índices creados
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## 🔧 Troubleshooting

### Error: "relation already exists"
- Las tablas ya existen. Esto está bien.
- El script usa `CREATE TABLE IF NOT EXISTS` para evitar este error.

### Error: "type already exists"
- Los tipos ENUM ya existen. Esto está bien.
- El script usa `DO $$ BEGIN ... EXCEPTION` para evitar este error.

### Error: "permission denied"
- Verifica que estás usando el usuario correcto en Supabase
- Asegúrate de estar en el SQL Editor, no en otro lugar

### Error: "syntax error"
- Verifica que copiaste TODO el script completo
- Asegúrate de que no haya caracteres extraños
- Ejecuta el script en partes si es necesario

---

## 📝 Después de Crear la Base de Datos

1. **Configurar .env en el servidor** (ver `ENV_SERVIDOR_POOLER.md`)
2. **Ejecutar Prisma**:
   ```bash
   npm run db:push
   npm run db:generate
   ```
3. **Build y deploy**:
   ```bash
   npm run build
   pm2 restart somnus
   ```

---

## 🎯 Checklist

- [ ] Script SQL ejecutado en Supabase SQL Editor
- [ ] Todas las tablas creadas (9 tablas)
- [ ] Todos los tipos ENUM creados (7 tipos)
- [ ] Índices creados correctamente
- [ ] Foreign keys configuradas
- [ ] Triggers para updatedAt funcionando
- [ ] `.env` configurado en el servidor
- [ ] `npm run db:push` ejecutado exitosamente
- [ ] `npm run db:generate` ejecutado exitosamente
- [ ] Aplicación funcionando correctamente

---

## 📚 Archivos Relacionados

- `scripts/create-database-schema.sql` - Script SQL completo
- `ENV_SERVIDOR_POOLER.md` - Configuración de conexión
- `COMANDOS_SERVIDOR_SOMNUS.md` - Comandos del servidor
- `prisma/schema.prisma` - Schema de Prisma (referencia)
