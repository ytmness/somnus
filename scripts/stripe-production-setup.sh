#!/bin/bash
# Configura Stripe Connect en producción: claves, webhook, verificación y reinicio PM2.
# Uso en VPS:
#   export STRIPE_PK="pk_live_..."
#   export STRIPE_SK="sk_live_..."
#   bash scripts/stripe-production-setup.sh
set -euo pipefail

cd /var/www/somnus

PK="${STRIPE_PK:?Set STRIPE_PK (pk_live_...)}"
SK="${STRIPE_SK:?Set STRIPE_SK (sk_live_...)}"
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

echo "==> 1/5 Actualizando claves Stripe en .env"
set_kv "NEXT_PUBLIC_APP_URL" "https://somnus.live"
set_kv "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$PK"
set_kv "STRIPE_PUBLISHABLE_KEY" "$PK"
set_kv "STRIPE_SECRET_KEY" "$SK"

echo "==> 2/5 Verificando cuenta Stripe"
ACCOUNT_JSON=$(curl -s -u "${SK}:" https://api.stripe.com/v1/account)
ACCOUNT_ID=$(echo "$ACCOUNT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
ACCOUNT_EMAIL=$(echo "$ACCOUNT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('email',''))" 2>/dev/null || true)
if [ -z "$ACCOUNT_ID" ]; then
  echo "ERROR: No se pudo leer la cuenta Stripe. Revisa STRIPE_SK."
  echo "$ACCOUNT_JSON" | head -c 500
  exit 1
fi
echo "Cuenta: $ACCOUNT_ID ($ACCOUNT_EMAIL)"

echo "==> 3/5 Verificando Stripe Connect"
CONNECT_TEST=$(curl -s -u "${SK}:" -X POST https://api.stripe.com/v1/accounts \
  -d type=express \
  -d country=MX \
  -d "capabilities[card_payments][requested]=true" \
  -d "capabilities[transfers][requested]=true")
TEST_ACCT=$(echo "$CONNECT_TEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || true)
if [ -z "$TEST_ACCT" ]; then
  CONNECT_ERR=$(echo "$CONNECT_TEST" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message','unknown'))" 2>/dev/null || true)
  echo "ERROR: Connect no activo — $CONNECT_ERR"
  echo "Activa Connect en dashboard.stripe.com/connect (Marketplace + Express) y vuelve a ejecutar."
  exit 1
fi
echo "Connect OK (cuenta prueba: $TEST_ACCT)"
curl -s -u "${SK}:" -X DELETE "https://api.stripe.com/v1/accounts/${TEST_ACCT}" >/dev/null || true

echo "==> 4/5 Configurando webhook"
EXISTING=$(curl -s -u "${SK}:" "https://api.stripe.com/v1/webhook_endpoints?limit=20")
WEBHOOK_ID=$(echo "$EXISTING" | python3 -c "
import sys, json
url = '${WEBHOOK_URL}'
data = json.load(sys.stdin).get('data', [])
for w in data:
    if w.get('url') == url:
        print(w['id'])
        break
" 2>/dev/null || true)

if [ -n "$WEBHOOK_ID" ]; then
  echo "Webhook existente: $WEBHOOK_ID"
  WEBHOOK_RESP=$(curl -s -u "${SK}:" "https://api.stripe.com/v1/webhook_endpoints/${WEBHOOK_ID}")
else
  WEBHOOK_RESP=$(curl -s -u "${SK}:" https://api.stripe.com/v1/webhook_endpoints \
    -d "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=payment_intent.succeeded" \
    -d "enabled_events[]=payment_intent.payment_failed" \
    -d "enabled_events[]=payment_intent.canceled" \
    -d "enabled_events[]=charge.refunded" \
    -d "enabled_events[]=charge.dispute.created" \
    -d "enabled_events[]=account.updated")
  WEBHOOK_ID=$(echo "$WEBHOOK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
  if [ -z "$WEBHOOK_ID" ]; then
    echo "ERROR creando webhook:"
    echo "$WEBHOOK_RESP" | head -c 800
    exit 1
  fi
  echo "Webhook creado: $WEBHOOK_ID"
fi

WHSEC=$(echo "$WEBHOOK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))" 2>/dev/null || true)

if [ -z "$WHSEC" ] && [ -f .env ] && grep -q '^STRIPE_WEBHOOK_SECRET=whsec_' .env; then
  echo "STRIPE_WEBHOOK_SECRET: se mantiene el valor actual en .env (Stripe no devuelve el secret de webhooks existentes)."
elif [ -z "$WHSEC" ]; then
  echo "AVISO: Falta whsec_ en .env. Copialo desde Stripe Dashboard → Webhooks → $WEBHOOK_ID"
  exit 1
else
  set_kv "STRIPE_WEBHOOK_SECRET" "$WHSEC"
  echo "STRIPE_WEBHOOK_SECRET actualizado"
fi

echo "==> 5/5 Reiniciando PM2"
pm2 restart somnus --update-env
sleep 2
PUBLIC=$(curl -s https://somnus.live/api/payments/stripe/public-config)
echo "public-config: $PUBLIC"
echo "DONE"
