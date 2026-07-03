#!/bin/bash
set -euo pipefail
cd /var/www/somnus

git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -m "Migrar flujo Stripe a destination charge MX y scripts de migracion"
  git push origin main
fi

NODE_OPTIONS=--max-old-space-size=4096 npm run build
pm2 restart somnus --update-env

RESET_ORGANIZERS_STRIPE=1 bash scripts/deploy-mx-stripe-migration.sh 2>/dev/null || true

if [ -f scripts/reset-organizers-stripe-migration.ts ]; then
  echo "==> reset organizadores"
  npx tsx scripts/reset-organizers-stripe-migration.ts || true
fi

grep -E '^STRIPE_PLATFORM_COUNTRY=' .env 2>/dev/null || echo "STRIPE_PLATFORM_COUNTRY=MX" >> .env

ACCOUNT_COUNTRY=$(curl -s -u "${STRIPE_SECRET_KEY}:" https://api.stripe.com/v1/account | python3 -c "import sys,json; print(json.load(sys.stdin).get('country',''))" 2>/dev/null || true)
echo "stripe_account_country=$ACCOUNT_COUNTRY"
