#!/bin/bash
set -euo pipefail
cd /var/www/somnus
grep -q '^STRIPE_PLATFORM_COUNTRY=' .env || echo 'STRIPE_PLATFORM_COUNTRY=MX' >> .env
source .env
curl -s -u "${STRIPE_SECRET_KEY}:" https://api.stripe.com/v1/account | python3 -c "import sys,json; d=json.load(sys.stdin); print('country='+str(d.get('country'))); print('id='+str(d.get('id')))"
