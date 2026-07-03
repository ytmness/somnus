#!/bin/bash
cd /var/www/somnus
git commit -F - <<'EOF'
Stripe Connect marketplace, auth fixes y UX comprador primero

Migra pagos de Clip a Stripe Connect con webhooks, comisiones y onboarding Express.
Corrige sesion OTP, simplifica registro y panel organizador opt-in.
Incluye scripts de despliegue Stripe en produccion.
EOF

git push origin main
