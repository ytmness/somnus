#!/usr/bin/env bash
# Prepara carpetas de uploads en el VPS y snippet Nginx opcional.
# Uso: sudo bash scripts/setup-local-uploads.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/somnus}"
UPLOAD_DIR="${UPLOAD_DIR:-$APP_DIR/uploads}"

mkdir -p "$UPLOAD_DIR"/{posters,gallery,orgs}
chown -R www-data:www-data "$UPLOAD_DIR" 2>/dev/null || chown -R "$(whoami):$(whoami)" "$UPLOAD_DIR"
chmod -R 755 "$UPLOAD_DIR"

echo "Uploads listos en: $UPLOAD_DIR"
echo ""
echo "Añade a .env:"
echo "UPLOAD_DIR=$UPLOAD_DIR"
echo "UPLOAD_PUBLIC_BASE=/uploads"
echo ""
echo "Opcional Nginx (sirve estático sin pasar por Node):"
cat <<'NGINX'
location /uploads/ {
    alias /var/www/somnus/uploads/;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
NGINX
