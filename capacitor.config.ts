import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Somnus se distribuye como shell nativo sobre la web de producción.
 * `server.url` apunta al dominio real: no hay export estático porque la app
 * es SSR con Next.js App Router.
 */
const config: CapacitorConfig = {
  appId: "live.somnus.app",
  appName: "Somnus",
  webDir: "capacitor/www",
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    backgroundColor: "#0A0A0A",
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    url: "https://somnus.live",
    cleartext: false,
    allowNavigation: [
      "somnus.live",
      "*.somnus.live",
      "js.stripe.com",
      "hooks.stripe.com",
      "checkout.stripe.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0A0A0A",
      showSpinner: false,
    },
  },
};

export default config;
