-- Actualizar imágenes de eventos misteriosos a NULL (el código mostrará ????)
UPDATE "Event"
SET 
  "imageUrl" = NULL,
  "updatedAt" = NOW()
WHERE artist = 'Artista por Confirmar'
  AND venue = '?????';

-- Verificar cambios
SELECT 
  id,
  name,
  artist,
  venue,
  "imageUrl"
FROM "Event"
WHERE artist = 'Artista por Confirmar'
ORDER BY "eventDate" ASC;
