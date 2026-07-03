# Guía de Queries para Supabase

## 📋 Queries para Editar Eventos

### 1. Ver todos los eventos
```sql
SELECT id, name, artist, venue, eventDate, isActive
FROM "Event"
ORDER BY eventDate DESC;
```

### 2. Ver evento específico con tipos de boletos
```sql
SELECT 
  e.name as event_name,
  tt.name as ticket_type,
  tt.price,
  tt."maxQuantity",
  tt."soldQuantity",
  (tt."maxQuantity" - tt."soldQuantity") as available
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.artist = 'Víctor Mendivil';
```

### 3. Actualizar cantidades de boletos VIP
```sql
UPDATE "TicketType"
SET 
  "maxQuantity" = 162,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE name = 'VIP - Mesa 4 personas'
  AND "eventId" = (
    SELECT id FROM "Event" 
    WHERE artist = 'Víctor Mendivil' 
    LIMIT 1
  );
```

### 4. Actualizar todos los tipos de boletos de un evento
```sql
UPDATE "TicketType"
SET 
  "maxQuantity" = CASE 
    WHEN name = 'VIP - Mesa 4 personas' THEN 162
    WHEN name = 'Preferente' THEN 120
    WHEN name = 'General' THEN 350
    ELSE "maxQuantity"
  END,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = (
  SELECT id FROM "Event" 
  WHERE artist = 'Víctor Mendivil' 
  LIMIT 1
);
```

### 5. Actualizar información del evento
```sql
UPDATE "Event"
SET 
  name = 'Víctor Mendivil en Concierto',
  venue = 'Arena Monterrey',
  "eventDate" = '2025-03-15 21:00:00'::timestamp,
  "eventTime" = '21:00 hrs',
  "updatedAt" = NOW()
WHERE artist = 'Víctor Mendivil';
```

## 🔒 Row Level Security (RLS)

### ¿Debo habilitar RLS?

**SÍ, si:**
- Usas la API REST de Supabase
- Expones las tablas públicamente
- Quieres seguridad adicional

**NO es necesario si:**
- Solo usas Prisma directamente
- No expones las tablas vía API REST
- Ya tienes autenticación en tu aplicación

### Cómo habilitar RLS

1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `enable-rls.sql`
3. Ejecuta el script

**⚠️ IMPORTANTE:** Después de habilitar RLS, necesitarás ajustar las políticas según tus necesidades de seguridad.

## 📝 Cómo usar los scripts

1. **Abrir Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com
   - Click en "SQL Editor" en el menú lateral

2. **Ejecutar queries**
   - Copia cualquier query de `supabase-queries.sql`
   - Pégala en el editor SQL
   - Click en "Run" o presiona `Ctrl+Enter`

3. **Ver resultados**
   - Los resultados aparecerán en la parte inferior
   - Puedes exportar los datos si es necesario

## 🎯 Query Rápida: Actualizar Mesas VIP

Si solo quieres actualizar las mesas VIP a 162 disponibles:

```sql
UPDATE "TicketType"
SET 
  "maxQuantity" = 162,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE name = 'VIP - Mesa 4 personas'
  AND "eventId" = (
    SELECT id FROM "Event" 
    WHERE artist = 'Víctor Mendivil' 
    LIMIT 1
  );
```

## 🔍 Verificar cambios

Después de actualizar, verifica con:

```sql
SELECT 
  name,
  "maxQuantity",
  "soldQuantity",
  ("maxQuantity" - "soldQuantity") as available
FROM "TicketType"
WHERE "eventId" = (
  SELECT id FROM "Event" 
  WHERE artist = 'Víctor Mendivil' 
  LIMIT 1
);
```

