#!/bin/bash
# Crea o actualiza el webhook de producción (no requiere Connect activo).
set -euo pipefail
cd /var/www/somnus
source .env 2>/dev/null || true
SK="${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY no configurado}"
WEBHOOK_URL="${STRIPE_WEBHOOK_URL:-https://somnus.live/api/stripe/webhook}"

set_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

EXISTING=$(curl -s -u "${SK}:" "https://api.stripe.com/v1/webhook_endpoints?limit=20")
WEBHOOK_ID=$(echo "$EXISTING" | python3 -c "
import sys, json
url = '${WEBHOOK_URL}'
for w in json.load(sys.stdin).get('data', []):
    if w.get('url') == url:
        print(w['id'])
        break
")

if [ -z "$WEBHOOK_ID" ]; then
  RESP=$(curl -s -u "${SK}:" https://api.stripe.com/v1/webhook_endpoints \
    -d "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=payment_intent.succeeded" \
    -d "enabled_events[]=payment_intent.payment_failed" \
    -d "enabled_events[]=payment_intent.canceled" \
    -d "enabled_events[]=charge.refunded" \
    -d "enabled_events[]=charge.dispute.created" \
    -d "enabled_events[]=account.updated")
  WEBHOOK_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
  WHSEC=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))")
  if [ -z "$WEBHOOK_ID" ]; then
    echo "ERROR:"; echo "$RESP"; exit 1
  fi
  echo "created:$WEBHOOK_ID"
else
  echo "exists:$WEBHOOK_ID"
  WHSEC=""
fi

if [ -z "$WHSEC" ] && grep -q '^STRIPE_WEBHOOK_SECRET=whsec_' .env 2>/dev/null; then
  echo "whsec_unchanged"
elif [ -n "$WHSEC" ]; then
  set_kv "STRIPE_WEBHOOK_SECRET" "$WHSEC"
  echo "whsec_set"
else
  echo "whsec_missing: copia el signing secret desde Stripe Dashboard → Webhooks"
  exit 1
fi
