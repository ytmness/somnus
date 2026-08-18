-- Ver todos los eventos con información completa
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
