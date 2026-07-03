#!/bin/bash
set -euo pipefail
cd /var/www/somnus
source .env
echo "pk_len=${#STRIPE_PUBLISHABLE_KEY}"
echo "sk_len=${#STRIPE_SECRET_KEY}"
echo "whsec_len=${#STRIPE_WEBHOOK_SECRET}"
echo "platform_country=${STRIPE_PLATFORM_COUNTRY:-unset}"
bash scripts/check-stripe-country.sh
