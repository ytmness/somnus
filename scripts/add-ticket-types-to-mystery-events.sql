-- =====================================================
-- AGREGAR TIPOS DE BOLETOS A EVENTOS MISTERIOSOS EXISTENTES
-- Usa este query si ya creaste los eventos pero no tienen tipos de boletos
-- =====================================================

-- Agregar tipo de boleto "General" a eventos que no lo tengan
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
  e.id,
  'General',
  'Zona general',
  'GENERAL',
  500,
  1000,
  0,
  true,
  false,
  NULL,
  NOW(),
  NOW()
FROM "Event" e
WHERE e.artist = 'Artista por Confirmar'
  AND NOT EXISTS (
    SELECT 1 FROM "TicketType" tt 
    WHERE tt."eventId" = e.id
  );

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================
SELECT 
  e.name as event_name,
  e.artist,
  COUNT(tt.id) as ticket_types_count,
  STRING_AGG(tt.name, ', ') as ticket_types
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
WHERE e.artist = 'Artista por Confirmar'
GROUP BY e.id, e.name, e.artist
ORDER BY e."eventDate" ASC;
