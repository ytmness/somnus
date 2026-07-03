-- =====================================================
-- QUERIES PARA ACTUALIZAR EVENTO DE VÍCTOR MENDIVIL
-- =====================================================

-- 1. ELIMINAR EVENTO DE PAL NORTE
-- ⚠️ CUIDADO: Esto eliminará el evento y todos sus tipos de boletos relacionados
DELETE FROM "Event"
WHERE id = '4c875499-c609-4b11-9bdf-1ce5a9295b5c';

-- 2. ACTUALIZAR INFORMACIÓN DEL EVENTO DE VÍCTOR MENDIVIL
UPDATE "Event"
SET 
  venue = 'Campo La Unión Patriotas',
  "eventDate" = '2026-03-26 21:00:00'::timestamp,
  "eventTime" = '21:00 hrs',
  "updatedAt" = NOW()
WHERE id = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf';

-- 3. ACTUALIZAR TIPOS DE BOLETOS
-- 3.1 General: 2500 boletos
UPDATE "TicketType"
SET 
  "maxQuantity" = 2500,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
  AND name = 'General'
  AND category = 'GENERAL';

-- 3.2 Preferente A: 450 boletos
-- Nota: Si no existe "Preferente A", primero necesitamos crearlo o actualizar el "Preferente" existente
-- Primero verificamos qué tipos de Preferente existen:
-- SELECT id, name, category, "maxQuantity" FROM "TicketType" 
-- WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf' AND category = 'PREFERENTE';

-- Si existe un solo "Preferente", lo dividimos en A y B:
-- Opción A: Actualizar el Preferente existente a Preferente A
UPDATE "TicketType"
SET 
  name = 'Preferente A',
  "maxQuantity" = 450,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
  AND category = 'PREFERENTE'
  AND name = 'Preferente';

-- Opción B: Si ya existe "Preferente A", actualizarlo directamente:
UPDATE "TicketType"
SET 
  "maxQuantity" = 450,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
  AND name = 'Preferente A';

-- 3.3 Preferente B: 450 boletos
-- Si no existe, crearlo:
INSERT INTO "TicketType" (
  id,
  "eventId",
  name,
  description,
  category,
  price,
  "maxQuantity",
  "soldQuantity",
  "isActive",
  "isTable",
  "seatsPerTable",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  'd624f1f1-c67f-4917-8c70-fb195ce62bbf',
  'Preferente B',
  'Asientos numerados, excelente vista (derecha)',
  'PREFERENTE',
  (SELECT price FROM "TicketType" WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf' AND category = 'PREFERENTE' LIMIT 1),
  450,
  0,
  true,
  false,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "TicketType" 
  WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf' 
    AND name = 'Preferente B'
);

-- Si ya existe Preferente B, actualizarlo:
UPDATE "TicketType"
SET 
  "maxQuantity" = 450,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
  AND name = 'Preferente B';

-- 3.4 VIP - Mesa 4 personas: Mantener 162 mesas
UPDATE "TicketType"
SET 
  "maxQuantity" = 162,
  "soldQuantity" = 0,
  "updatedAt" = NOW()
WHERE "eventId" = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
  AND name = 'VIP - Mesa 4 personas'
  AND category = 'VIP';

-- =====================================================
-- VERIFICAR CAMBIOS
-- =====================================================
SELECT 
  e.name as event_name,
  e.venue,
  e."eventDate",
  e."eventTime",
  tt.name as ticket_type,
  tt.category,
  tt.price,
  tt."maxQuantity",
  tt."soldQuantity",
  (tt."maxQuantity" - tt."soldQuantity") as available
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.id = 'd624f1f1-c67f-4917-8c70-fb195ce62bbf'
ORDER BY tt.category, tt.name;
