#!/usr/bin/env bash
# Instala/configura Postgres local + DB/usuario somnus en Ubuntu/Debian.
# Uso: sudo bash scripts/setup-local-postgres.sh
set -euo pipefail

DB_NAME="${DB_NAME:-somnus}"
DB_USER="${DB_USER:-somnus_app}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"

echo "==> Instalando PostgreSQL si falta..."
if ! command -v psql >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
fi

systemctl enable --now postgresql

echo "==> Creando rol y base ${DB_NAME}..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo ""
echo "PostgreSQL listo."
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "DIRECT_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo "Guarda la contraseña; no se vuelve a mostrar."
