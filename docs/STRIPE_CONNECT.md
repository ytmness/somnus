# Stripe Connect — somnus.live

## Resumen

Pasarela única: **Stripe Connect** (marketplace) con Payment Element, destination charges y webhooks idempotentes.

## Variables de entorno

Copia desde `.env.example`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENTS_ENABLE_OXXO=false
PAYMENTS_ENABLE_INSTALLMENTS_MX=false
NEXT_PUBLIC_APP_URL=https://somnus.live
```

## Instalación local

```bash
npm install
npx prisma generate
npx prisma db push   # o: npx prisma migrate deploy
npm run dev
```

## Stripe CLI — webhooks locales

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copiar el whsec_... impreso a STRIPE_WEBHOOK_SECRET
```

## Casos de prueba obligatorios

| Caso | Tarjeta / acción | Resultado esperado |
|------|------------------|-------------------|
| Éxito | `4242 4242 4242 4242` | Sale COMPLETED, tickets 1x, email enviado |
| Fondos insuficientes | `4000 0000 0000 9995` | Error UI, Sale PENDING, sin tickets |
| 3DS éxito | `4000 0000 0000 3220` | Auth + COMPLETED |
| 3DS rechazo | `4000 0084 0000 1629` | Rechazado, sin tickets |
| Webhook duplicado | Reenviar mismo evento | Sin tickets duplicados |
| Refund | Dashboard Stripe → Refund | Sale REFUNDED, tickets CANCELLED |
| Sin Stripe conectado | Evento con organizador sin onboarding | create-intent bloqueado |
| Comisión global 10% | Boleto $500 | platformFee $50, neto $450 |
| Comisión % + fijo | 10% + $10 en $500 | platformFee $60, neto $440 |

Disparar eventos de prueba:

```bash
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

## Dashboard Stripe (producción)

1. Activar **Connect** en la cuenta del cliente
2. Completar perfil de plataforma
3. Crear webhook endpoint: `https://somnus.live/api/stripe/webhook`
4. Eventos mínimos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `charge.dispute.created`
   - `account.updated`
5. Activar **Cards** en Payment methods (OXXO después, con flag)

## Go-live

1. Configurar claves Stripe en `.env` del servidor
2. Crear webhook en Dashboard apuntando a `https://somnus.live/api/stripe/webhook`
3. Probar compra con tarjeta de test `4242 4242 4242 4242`
4. Monitorear: pagos Stripe vs tickets emitidos vs webhooks

## Onboarding de organizadores

1. Asignar rol `ORGANIZER` al usuario (script o registro)
2. Ir a `/organizador` → **Conectar Stripe**
3. Completar onboarding hospedado de Stripe
4. Asignar `organizerId` al evento desde admin
5. Solo entonces el evento puede vender con split de pagos

## Archivos principales

| Archivo | Función |
|---------|---------|
| `lib/payments/fulfill-sale.ts` | Fulfillment idempotente |
| `lib/payments/commissions.ts` | Cálculo de comisiones |
| `lib/payments/connect.ts` | Stripe Connect onboarding |
| `app/api/payments/stripe/create-intent/route.ts` | PaymentIntent |
| `app/api/stripe/webhook/route.ts` | Webhook firmado |
| `components/payments/StripeCheckoutForm.tsx` | Payment Element |

## Riesgos residuales

- **Destination charges**: la plataforma asume disputas; documentar política de refunds
- **OXXO**: asíncrono — no emitir tickets antes del webhook (flag desactivado por defecto)
- **Eventos legacy sin organizador**: cobran 100% a la cuenta plataforma (sin split)
