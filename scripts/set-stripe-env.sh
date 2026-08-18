#!/bin/bash
set -e
cd /var/www/somnus
PK="${STRIPE_PK:?Set STRIPE_PK}"
SK="${STRIPE_SK:?Set STRIPE_SK}"

set_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

set_kv "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$PK"
set_kv "STRIPE_PUBLISHABLE_KEY" "$PK"
set_kv "STRIPE_SECRET_KEY" "$SK"
set_kv "STRIPE_PLATFORM_COUNTRY" "${STRIPE_PLATFORM_COUNTRY:-MX}"
echo "keys_set"
