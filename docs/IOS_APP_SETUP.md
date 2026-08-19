# App iOS Somnus — trámites Apple y Codemagic

La app es un shell de Capacitor que carga `https://somnus.live`. El sitio sigue
viviendo en el VPS. Esta guía cubre lo que hay que hacer **una sola vez** en
Apple Developer, Stripe, el VPS y Codemagic para firmar la app, activar Apple
Pay y emitir pases de Apple Wallet.

Identificadores:

| Qué | Valor |
| --- | --- |
| Bundle ID | `live.somnus.app` |
| Merchant ID (Apple Pay) | `merchant.live.somnus` |
| Pass Type ID (Wallet) | `pass.live.somnus.ticket` |

La carpeta `ios/` **no se versiona**. Codemagic la genera con `npx cap add ios`
y aplica el overlay de `ios-config/` (`scripts/ios-postadd.sh`).

## 1. App ID

1. En [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) crea un App ID explícito `live.somnus.app`.
2. Activa las capabilities:
   - **Apple Pay** (asocia `merchant.live.somnus` cuando exista).
   - **Associated Domains** solo si más adelante se añaden universal links.
3. Crea la app en [App Store Connect](https://appstoreconnect.apple.com/) con el mismo bundle.

## 1b. Sign in with Apple (nombre “Somnus”, no Dev Control)

El OAuth web usa el Services ID `live.somnus.web` (`APPLE_ID` en el VPS). Si Apple pide crear una cuenta para **Dev Control**, el Services ID está agrupado con el App ID de esa otra app.

1. En [Identifiers](https://developer.apple.com/account/resources/identifiers/list) abre el App ID `live.somnus.app` y activa **Sign in with Apple**.
2. Abre el Services ID `live.somnus.web` → **Sign in with Apple** → **Configure**:
   - **Primary App ID:** `live.somnus.app` (Somnus), no Dev Control.
   - **Domains:** `somnus.live`
   - **Return URLs:** `https://somnus.live/api/authjs/callback/apple`
3. El nombre que muestra Apple al usuario debe ser **Somnus**.
4. La key `.p8` de equipo (`APPLE_KEY_ID` / `APPLE_TEAM_ID` en el VPS) no hace falta regenerarla.

Google Cloud Console: redirect autorizado `https://somnus.live/api/authjs/callback/google` y pantalla de consentimiento con nombre Somnus.

### Apple Pay: botón que “no hace nada”

En iOS 17+ el plugin `@capacitor-community/stripe` a veces no encuentra el
`rootViewController` y `presentApplePay` cuelga sin error. Codemagic aplica
[`scripts/ios-patch-stripe-apple-pay.cjs`](../scripts/ios-patch-stripe-apple-pay.cjs)
en cada build. Si el sheet no abre, instala el **IPA nuevo** de TestFlight.

## 2. Apple Pay

1. Crea el Merchant ID `merchant.live.somnus`.
2. En el [Dashboard de Stripe](https://dashboard.stripe.com/settings/payments/apple_pay) genera el certificado de procesamiento de Apple Pay. Stripe produce el CSR; súbelo en Apple Developer y regresa el certificado a Stripe.
3. Ese certificado **no entra al repo ni al VPS**. Vive solo en Stripe.
4. El merchant ID sí está en [`ios-config/App.entitlements`](../ios-config/App.entitlements).

Hasta que el Merchant ID exista y esté ligado al App ID, `xcode-project use-profiles` en Codemagic fallará al pedir la capability de Apple Pay.

## 3. Apple Wallet (Pass Type ID)

1. Crea un Pass Type ID `pass.live.somnus.ticket`.
2. Genera un certificado, descárgalo y expórtalo desde Keychain Access como `.p12` (con contraseña).
3. En una Mac (o en el runner, una sola vez) conviértelo a PEM:

```bash
openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out signerCert.pem
openssl pkcs12 -in Certificates.p12 -nocerts -nodes -out signerKey.pem
```

4. Descarga el WWDR: [AppleWWDRCAG4.pem](https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer) y conviértelo a PEM si hace falta (`openssl x509 -inform der -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem`).
5. En el VPS:

```bash
sudo mkdir -p /etc/somnus/wallet
sudo mv signerCert.pem signerKey.pem AppleWWDRCAG4.pem /etc/somnus/wallet/
sudo chown $(ps -o user= -p $(pgrep -n node) || echo www-data) /etc/somnus/wallet/*.pem
sudo chmod 600 /etc/somnus/wallet/*.pem
```

6. Añade al `.env` de producción las variables de la sección "Apple Wallet" de [`.env.example`](../.env.example) y reinicia: `pm2 restart somnus --update-env`.

Sin estos PEM el endpoint `/api/tickets/:id/pkpass` responde **503** (no 500) y el botón "Agregar a Apple Wallet" no se muestra.

Los PNG del pase (`icon.png`, `logo.png` y sus densidades) se generan con `npm run assets:ios` y **sí van en el repo**.

## 4. App Store Connect API Key (Codemagic)

1. En App Store Connect → Users and Access → Integrations → App Store Connect API, crea una key con rol Admin o App Manager.
2. Guarda el `.p8`, el Issuer ID y el Key ID.
3. En Codemagic → Teams → Integrations, súbela como `somnus_asc_key` (el nombre que usa [`codemagic.yaml`](../codemagic.yaml)).
4. Crea el grupo de TestFlight **Somnus Internos**.
5. Anota el App Store Connect app id numérico en el grupo de variables `somnus_ios` como `APP_STORE_APP_ID`.

## 5. Repositorio y primer build

Este proyecto se commitea en git local. Codemagic necesita un remoto. Cuando quieras publicarlo:

```bash
gh repo create somnus-live/somnus --private --source=. --remote=origin
git push -u origin main
```

Luego conecta el repo en Codemagic (GitHub App) y dispara el workflow `ios-release`.

Variables de equipo en Codemagic (grupo `somnus_ios`, no secretas):

- `APP_STORE_APP_ID`
- `BUNDLE_ID=live.somnus.app` (ya está en el yaml)
- `MARKETING_VERSION=1.0.0`

## 6. Capturas, privacy y envío

Antes de Review:

- Privacy nutrition labels (pagos, identificadores de dispositivo, cámara para el escáner QR).
- Capturas de iPhone 6.7" y 6.1".
- Descripción que mencione compra de boletos, Apple Pay y Apple Wallet — no "acceso a un sitio web".
- `ITSAppUsesNonExemptEncryption = false` ya va en el overlay del plist.

## 7. Qué no va en el repo

- Certificados `.p12` / `.pem` / `.p8` (`.gitignore` bloquea `*.pem`).
- La carpeta `ios/` generada.
- Claves de Stripe (siguen en el `.env` del VPS).
