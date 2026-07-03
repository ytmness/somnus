-- =====================================================
-- QUERIES ÚTILES PARA EDITAR EVENTOS EN SUPABASE
-- =====================================================

-- 1. VER TODOS LOS EVENTOS
SELECT 
  id,
  name,
  artist,
  venue,
  eventDate,
  eventTime,
  isActive,
  maxCapacity
FROM "Event"
ORDER BY eventDate DESC;

-- 2. VER UN EVENTO ESPECÍFICO CON SUS TIPOS DE BOLETOS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.artist,
  e.venue,
  e.eventDate,
  e.eventTime,
  tt.id as ticket_type_id,
  tt.name as ticket_type_name,
  tt.category,
  tt.price,
  tt.maxQuantity,
  tt.soldQuantity,
  (tt.maxQuantity - tt.soldQuantity) as available
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.artist = 'Víctor Mendivil'  -- Cambia por el artista que busques
ORDER BY tt.category, tt.name;

-- 3. ACTUALIZAR CANTIDADES DE UN TIPO DE BOLETO ESPECÍFICO
-- Ejemplo: Actualizar VIP - Mesa 4 personas a 162 disponibles
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

-- 4. ACTUALIZAR TODOS LOS TIPOS DE BOLETO DE UN EVENTO
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

-- 5. ACTUALIZAR INFORMACIÓN DEL EVENTO
UPDATE "Event"
SET 
  name = 'Víctor Mendivil en Concierto',
  description = 'Gran concierto de Víctor Mendivil en Arena Monterrey',
  artist = 'Víctor Mendivil',
  venue = 'Arena Monterrey',
  address = 'Av. Fundidora, Monterrey, NL',
  "eventDate" = '2025-03-15 21:00:00'::timestamp,
  "eventTime" = '21:00 hrs',
  "maxCapacity" = 5000,
  "updatedAt" = NOW()
WHERE artist = 'Víctor Mendivil';

-- 6. ACTUALIZAR PRECIO DE UN TIPO DE BOLETO
UPDATE "TicketType"
SET 
  price = 2500,
  "updatedAt" = NOW()
WHERE name = 'VIP - Mesa 4 personas'
  AND "eventId" = (
    SELECT id FROM "Event" 
    WHERE artist = 'Víctor Mendivil' 
    LIMIT 1
  );

-- 7. VER ESTADÍSTICAS DE VENTAS POR EVENTO
SELECT 
  e.name as event_name,
  tt.name as ticket_type,
  tt."maxQuantity",
  tt."soldQuantity",
  (tt."maxQuantity" - tt."soldQuantity") as available,
  ROUND((tt."soldQuantity"::numeric / NULLIF(tt."maxQuantity", 0) * 100), 2) as sold_percentage
FROM "Event" e
JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.artist = 'Víctor Mendivil'
ORDER BY tt.category, tt.name;

-- 8. RESETEAR VENTAS DE UN EVENTO (CUIDADO: Esto borra todas las ventas)
-- Primero verifica cuántas ventas hay:
SELECT COUNT(*) as total_sales
FROM "Sale"
WHERE "eventId" = (
  SELECT id FROM "Event" 
  WHERE artist = 'Víctor Mendivil' 
  LIMIT 1
);

-- Si quieres resetear (EJECUTAR CON PRECAUCIÓN):
-- UPDATE "TicketType"
-- SET "soldQuantity" = 0, "updatedAt" = NOW()
-- WHERE "eventId" = (
--   SELECT id FROM "Event" 
--   WHERE artist = 'Víctor Mendivil' 
--   LIMIT 1
-- );

-- 9. BUSCAR EVENTO POR ID ESPECÍFICO
SELECT 
  e.*,
  json_agg(
    json_build_object(
      'id', tt.id,
      'name', tt.name,
      'category', tt.category,
      'price', tt.price,
      'maxQuantity', tt."maxQuantity",
      'soldQuantity', tt."soldQuantity",
      'available', (tt."maxQuantity" - tt."soldQuantity")
    )
  ) as ticket_types
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.id = 'TU_EVENT_ID_AQUI'  -- Reemplaza con el ID real
GROUP BY e.id;

-- 10. CREAR NUEVO TIPO DE BOLETO PARA UN EVENTO EXISTENTE
-- INSERT INTO "TicketType" (
--   id,
--   "eventId",
--   name,
--   description,
--   category,
--   price,
--   "maxQuantity",
--   "soldQuantity",
--   "isActive",
--   "isTable",
--   "seatsPerTable",
--   "createdAt",
--   "updatedAt"
-- )
-- VALUES (
--   gen_random_uuid()::text,
--   (SELECT id FROM "Event" WHERE artist = 'Víctor Mendivil' LIMIT 1),
--   'Nuevo Tipo de Boleto',
--   'Descripción del nuevo tipo',
--   'GENERAL',
--   1000,
--   100,
--   0,
--   true,
--   false,
--   NULL,
--   NOW(),
--   NOW()
-- );
