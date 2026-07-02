#!/bin/bash
# Despliega migración Stripe MX: sube código, build, reset organizadores (opcional), push main.
set -euo pipefail
cd /var/www/somnus

echo "==> git pull"
git pull origin main

echo "==> build"
NODE_OPTIONS=--max-old-space-size=4096 npm run build

echo "==> pm2 restart"
pm2 restart somnus --update-env

if [ "${RESET_ORGANIZERS_STRIPE:-}" = "1" ]; then
  echo "==> reset organizadores Stripe"
  npx tsx scripts/reset-organizers-stripe-migration.ts
fi

echo "DONE"
