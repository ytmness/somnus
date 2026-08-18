#!/usr/bin/env bash
# Migrar schema public de Supabase Postgres → Postgres local en el VPS.
# Uso (en el VPS, con vars exportadas):
#   export SUPABASE_DIRECT_URL='postgres://postgres.[ref]:[pass]@db.[ref].supabase.co:5432/postgres'
#   export LOCAL_DB_URL='postgresql://somnus_app:PASS@localhost:5432/somnus'
#   bash scripts/migrate-db-to-vps.sh
set -euo pipefail

DUMP_DIR="${DUMP_DIR:-/tmp/somnus-db-migrate}"
DUMP_FILE="${DUMP_DIR}/public.dump"
mkdir -p "$DUMP_DIR"

if [[ -z "${SUPABASE_DIRECT_URL:-}" ]]; then
  echo "ERROR: define SUPABASE_DIRECT_URL (directa, sin pooler)"
  exit 1
fi
if [[ -z "${LOCAL_DB_URL:-}" ]]; then
  echo "ERROR: define LOCAL_DB_URL (postgres local)"
  exit 1
fi

echo "==> Verificando PostgreSQL local..."
if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL client no encontrado. Instala postgres (14–16)."
  exit 1
fi

echo "==> Dump schema public desde Supabase..."
pg_dump "$SUPABASE_DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=public \
  --file="$DUMP_FILE"

echo "==> Restore en Postgres local..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname="$LOCAL_DB_URL" \
  "$DUMP_FILE" || true

echo "==> Conteos de filas (smoke)..."
psql "$LOCAL_DB_URL" -c "
SELECT 'User' AS t, COUNT(*) FROM \"User\"
UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\"
UNION ALL SELECT 'Ticket', COUNT(*) FROM \"Ticket\"
UNION ALL SELECT 'Sale', COUNT(*) FROM \"Sale\"
ORDER BY 1;
"

echo "Listo. Actualiza DATABASE_URL y DIRECT_URL en .env a LOCAL_DB_URL y reinicia PM2."
echo "Mantén el proyecto Supabase intacto como rollback."
