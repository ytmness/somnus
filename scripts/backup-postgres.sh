#!/usr/bin/env bash
# Backup diario de Postgres local. Añadir a cron:
#   0 3 * * * /var/www/somnus/scripts/backup-postgres.sh >> /var/log/somnus-pg-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/somnus-pg}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "$DATABASE_URL" && -f /var/www/somnus/.env ]]; then
  # shellcheck disable=SC1091
  set -a
  source /var/www/somnus/.env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL no definida"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="${BACKUP_DIR}/somnus_${STAMP}.dump"

pg_dump "$DATABASE_URL" --format=custom --file="$OUT"
find "$BACKUP_DIR" -name 'somnus_*.dump' -mtime +"$RETENTION_DAYS" -delete
echo "Backup OK: $OUT"
