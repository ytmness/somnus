#!/bin/bash
set -e
cd /var/www/somnus
source .env 2>/dev/null || true
SK="${STRIPE_SECRET_KEY}"
if [ -z "$SK" ]; then echo "no secret key"; exit 1; fi

# List existing webhooks for somnus.live
curl -s -u "${SK}:" "https://api.stripe.com/v1/webhook_endpoints?limit=10" | head -c 2000
