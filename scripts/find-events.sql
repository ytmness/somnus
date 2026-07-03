-- =====================================================
-- QUERY PARA ENCONTRAR TODOS LOS EVENTOS
-- =====================================================

-- Ver todos los eventos con información básica
SELECT 
  id,
  name,
  artist,
  venue,
  "eventDate",
  "eventTime",
  "isActive",
  "maxCapacity",
  "createdAt"
FROM "Event"
ORDER BY "eventDate" DESC;

-- =====================================================
-- VERSIÓN DETALLADA (con tipos de boletos)
-- =====================================================

SELECT 
  e.id,
  e.name as event_name,
  e.artist,
  e.venue,
  e."eventDate",
  e."eventTime",
  e."isActive",
  COUNT(tt.id) as ticket_types_count,
  SUM(tt."maxQuantity") as total_capacity,
  SUM(tt."soldQuantity") as total_sold
FROM "Event" e
LEFT JOIN "TicketType" tt ON e.id = tt."eventId"
GROUP BY e.id, e.name, e.artist, e.venue, e."eventDate", e."eventTime", e."isActive"
ORDER BY e."eventDate" DESC;
