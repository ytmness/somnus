declare global {
  interface Window {
    ClipSDK: new (apiKey: string) => ClipSDKInstance;
  }
}

export interface ClipSDKInstance {
  element: {
    create: (
      type: "Card",
      options: { paymentAmount: number; [key: string]: unknown }
    ) => ClipCardElement;
  };
}

export interface ClipCardElement {
  mount: (selector: string) => Promise<void>;
  cardToken: () => Promise<{ id: string }>;
}
