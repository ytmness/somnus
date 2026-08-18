#!/bin/bash
set -euo pipefail
cd /var/www/somnus
source .env
bash scripts/check-stripe-country.sh
bash scripts/create-stripe-webhook.sh || true
NODE_OPTIONS=--max-old-space-size=4096 npm run build
pm2 restart somnus --update-env
curl -s https://somnus.live/api/payments/stripe/public-config
echo ""
pm2 status somnus | tail -3
