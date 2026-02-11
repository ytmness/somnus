-- Eliminar los 3 eventos duplicados con "Por Confirmar"
DELETE FROM "Event"
WHERE id IN (
  '08abae4c-2fbb-4cdd-a0d9-e2d702f57700',
  '556dccf2-4fe0-449d-8095-b00d0f217faa',
  '500a446a-bca6-49bf-8d54-2312a6894a3d'
);

-- Verificar que se eliminaron
SELECT 
  id,
  name,
  artist,
  venue,
  "eventDate"
FROM "Event"
WHERE artist = 'Artista por Confirmar'
ORDER BY "eventDate" ASC;
