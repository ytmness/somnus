-- Ejecutar en Supabase → SQL Editor (una sola vez).
-- Borra los dos eventos SOMNUS + PANORAMA (28 feb / 26 mar 2026) y ventas/boletos ligados.

-- 1) Revisa qué se va a borrar (opcional; comenta el resto y ejecuta solo esto si quieres verificar)
-- SELECT id, name, artist, venue, "eventDate"
-- FROM "Event"
-- WHERE venue ILIKE '%PANORAMA%'
--   AND artist ILIKE '%SOMNUS%'
--   AND (
--     (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
--     OR
--     (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
--   );

DELETE FROM "TicketScan"
WHERE "ticketId" IN (
  SELECT t.id
  FROM "Ticket" t
  INNER JOIN "Sale" s ON s.id = t."saleId"
  WHERE s."eventId" IN (
    SELECT id
    FROM "Event"
    WHERE venue ILIKE '%PANORAMA%'
      AND artist ILIKE '%SOMNUS%'
      AND (
        (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
        OR
        (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
      )
  )
);

DELETE FROM "TicketReprint"
WHERE "ticketId" IN (
  SELECT t.id
  FROM "Ticket" t
  INNER JOIN "Sale" s ON s.id = t."saleId"
  WHERE s."eventId" IN (
    SELECT id
    FROM "Event"
    WHERE venue ILIKE '%PANORAMA%'
      AND artist ILIKE '%SOMNUS%'
      AND (
        (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
        OR
        (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
      )
  )
);

UPDATE "Sale"
SET "tableSlotInviteId" = NULL
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE venue ILIKE '%PANORAMA%'
    AND artist ILIKE '%SOMNUS%'
    AND (
      (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
      OR
      (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
    )
);

DELETE FROM "Sale"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE venue ILIKE '%PANORAMA%'
    AND artist ILIKE '%SOMNUS%'
    AND (
      (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
      OR
      (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
    )
);

DELETE FROM "TableSlotInvite"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE venue ILIKE '%PANORAMA%'
    AND artist ILIKE '%SOMNUS%'
    AND (
      (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
      OR
      (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
    )
);

DELETE FROM "TableInvitePool"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE venue ILIKE '%PANORAMA%'
    AND artist ILIKE '%SOMNUS%'
    AND (
      (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
      OR
      (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
    )
);

DELETE FROM "Event"
WHERE venue ILIKE '%PANORAMA%'
  AND artist ILIKE '%SOMNUS%'
  AND (
    (name ILIKE '%28%' AND name ILIKE '%FEBRERO%' AND "eventDate" >= '2026-02-01' AND "eventDate" < '2026-03-01')
    OR
    (name ILIKE '%26%' AND name ILIKE '%MARZO%' AND "eventDate" >= '2026-03-01' AND "eventDate" < '2026-04-01')
  );
