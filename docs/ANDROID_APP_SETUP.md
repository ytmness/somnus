# App Android Somnus — Capacitor

La app es un shell de Capacitor que carga `https://somnus.live`, igual que iOS
(`docs/IOS_APP_SETUP.md`). El sitio sigue en el VPS; Android solo empaqueta el WebView.

Identificadores previstos:

| Qué | Valor |
| --- | --- |
| Application ID | `live.somnus.app` |
| Dominio | `https://somnus.live` |

La carpeta `android/` **no se versiona** (igual que `ios/`). Se genera en CI o local.

## 1. Añadir la plataforma

Desde la raíz del repo (con Node y Java/Android SDK instalados):

```bash
npm run cap:android
# o: npx cap add android
npx cap sync android
```

`@capacitor/android` no está en `package.json` aún (solo `@capacitor/ios`) para
evitar churn del lockfile. Al añadir Android, instálalo:

```bash
npm install @capacitor/android@^8.5.0
```

`capacitor.config.ts` ya apunta `server.url` a `https://somnus.live`.

## 2. Google Pay / Stripe

- En web, Google Pay sale en el **Payment Element** si el dominio está verificado
  en [Stripe → Payment method domains](https://dashboard.stripe.com/settings/payment_method_domains).
- Nativo: stub en `components/payments/NativeGooglePayCheckout.tsx` hasta cablear
  Payment Sheet del plugin Capacitor Stripe.

## 3. Google Wallet

Stub en `lib/services/google-wallet.ts`. Variables futuras:

```
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_CLASS_ID=
```

Sin issuer ID el botón no se muestra en mis-boletos (Apple Wallet no se afecta).

## 4. Build local

```bash
npx cap open android
```

Abre Android Studio → Run en emulador o dispositivo. Para Play Store hará falta
keystore, `google-services` si se usan push nativos, y políticas de privacidad.
