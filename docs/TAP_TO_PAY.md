# Stripe Terminal — Tap to Pay (iOS)

Tap to Pay on iPhone permite cobrar con NFC sin hardware externo, usando el
iPhone del vendedor como lector. Somnus aún no lo integra; este doc resume
requisitos para cuando se active desde `/vendedor`.

## Requisitos Stripe

1. Cuenta Stripe con **Stripe Terminal** habilitado (soporte MX / región del account).
2. Location + ConnectionToken API en el backend (`/api/terminal/...`).
3. App nativa (Capacitor iOS) con el SDK de Terminal — **no** funciona solo en Safari/PWA.
4. Merchant Category y onboarding Tap to Pay aprobados por Stripe/Apple.

## Requisitos Apple / iOS

- iPhone XS o posterior, iOS 16.4+ (verificar docs actuales de Stripe).
- App firmada con el entitlement de Tap to Pay / NFC reader (vía Apple Developer).
- Bundle ID alineado con `live.somnus.app` (ver `docs/IOS_APP_SETUP.md`).
- Dispositivo físico; no hay Tap to Pay en simulador.

## Código stub en Somnus

- `lib/payments/tap-to-pay.ts` — `isTapToPayAvailable()` siempre `false`;
  `startTapToPayCollect()` lanza “not implemented”.
- En `/vendedor` hay un botón deshabilitado: “Tap to Pay próximamente”.

Cuando se implemente: ConnectionToken → discover/connect reader (TapToPay) →
collectPaymentMethod → confirm PaymentIntent → `fulfillSale`.
