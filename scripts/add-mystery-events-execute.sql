-- Evento 1: Evento Especial
WITH evento1 AS (
  INSERT INTO "Event" (
    id, name, description, artist, tour, venue, address,
    "eventDate", "eventTime", "imageUrl", "maxCapacity",
    "isActive", "salesStartDate", "salesEndDate", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'Evento Especial',
    'Próximamente anunciaremos todos los detalles de este increíble evento. ¡Mantente al tanto!',
    'Artista por Confirmar',
    'Gira 2026',
    '?????',
    NULL,
    '2026-06-15 20:00:00'::timestamp,
    '?????',
    'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
    5000,
    true,
    NOW(),
    '2026-06-15 18:00:00'::timestamp,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO "TicketType" (
  id, "eventId", name, description, category, price,
  "maxQuantity", "soldQuantity", "isActive", "isTable", "seatsPerTable",
  "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  evento1.id,
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
FROM evento1;

-- Evento 2: Concierto Exclusivo
WITH evento2 AS (
  INSERT INTO "Event" (
    id, name, description, artist, tour, venue, address,
    "eventDate", "eventTime", "imageUrl", "maxCapacity",
    "isActive", "salesStartDate", "salesEndDate", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'Concierto Exclusivo',
    'Un evento único que no te puedes perder. Próximamente más información.',
    'Artista por Confirmar',
    'Gira 2026',
    '?????',
    NULL,
    '2026-07-20 21:00:00'::timestamp,
    '?????',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
    3000,
    true,
    NOW(),
    '2026-07-20 19:00:00'::timestamp,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO "TicketType" (
  id, "eventId", name, description, category, price,
  "maxQuantity", "soldQuantity", "isActive", "isTable", "seatsPerTable",
  "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  evento2.id,
  'General',
  'Zona general',
  'GENERAL',
  600,
  800,
  0,
  true,
  false,
  NULL,
  NOW(),
  NOW()
FROM evento2;

-- Evento 3: Festival Especial
WITH evento3 AS (
  INSERT INTO "Event" (
    id, name, description, artist, tour, venue, address,
    "eventDate", "eventTime", "imageUrl", "maxCapacity",
    "isActive", "salesStartDate", "salesEndDate", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'Festival Especial',
    'Detalles próximamente. Prepárate para una experiencia inolvidable.',
    'Artista por Confirmar',
    'Gira 2026',
    '?????',
    NULL,
    '2026-08-10 19:00:00'::timestamp,
    '?????',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
    4000,
    true,
    NOW(),
    '2026-08-10 17:00:00'::timestamp,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO "TicketType" (
  id, "eventId", name, description, category, price,
  "maxQuantity", "soldQuantity", "isActive", "isTable", "seatsPerTable",
  "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  evento3.id,
  'General',
  'Zona general',
  'GENERAL',
  550,
  1200,
  0,
  true,
  false,
  NULL,
  NOW(),
  NOW()
FROM evento3;
