/**
 * Identificadores de Apple Pay.
 *
 * `APPLE_PAY_MERCHANT_ID` debe coincidir exactamente con el valor de
 * `com.apple.developer.in-app-payments` en ios-config/App.entitlements y con el
 * Merchant ID registrado en Apple Developer y en el dashboard de Stripe.
 */
export const APPLE_PAY_MERCHANT_ID = "merchant.live.somnus";

/** Esquema de URL de la app, declarado en ios-config/Info.plist.patch.plist. */
export const APP_URL_SCHEME = "live.somnus.app";

/** Callback de vuelta a la app tras autenticación 3D Secure. */
export const STRIPE_RETURN_URL = `${APP_URL_SCHEME}://stripe-redirect`;

/** País de la cuenta Stripe de la plataforma (Somnus opera en México). */
export const APPLE_PAY_COUNTRY_CODE = "MX";
