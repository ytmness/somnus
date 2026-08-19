import { registerPlugin } from "@capacitor/core";

/**
 * Plugin nativo `Stripe` (Capacitor). No importamos
 * `@capacitor-community/stripe` para no cargar el stub web, que en WKWebView
 * puede resolver sin abrir Wallet.
 */
export type NativeStripePlugin = {
  initialize(options: { publishableKey: string }): Promise<void>;
  createApplePay(options: {
    paymentIntentClientSecret: string;
    merchantIdentifier: string;
    countryCode: string;
    currency: string;
    paymentSummaryItems: Array<{ label: string; amount: string }>;
  }): Promise<void>;
  presentApplePay(): Promise<{ paymentResult?: string }>;
};

export const NativeStripe = registerPlugin<NativeStripePlugin>("Stripe");

export const ApplePayResult = {
  Completed: "applePayCompleted",
  Canceled: "applePayCanceled",
  Failed: "applePayFailed",
} as const;
