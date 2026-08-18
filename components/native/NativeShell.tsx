"use client";

import { useEffect } from "react";
import { isNativeIOS, isNativePlatform } from "@/lib/native/platform";

/**
 * Puente de ciclo de vida del shell nativo: oculta el splash, pinta la status
 * bar y marca el documento para CSS (safe areas, bounce, ocultar PWA).
 */
export function NativeShell() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const root = document.documentElement;
    root.dataset.native = isNativeIOS() ? "ios" : "app";
    root.classList.add("native-app");
    if (isNativeIOS()) {
      root.classList.add("native-ios");
    }

    void hideSplash();
    void styleStatusBar();
  }, []);

  return null;
}

async function hideSplash() {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    // Fuera del shell nativo no hay plugin.
  }
}

async function styleStatusBar() {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Android-only APIs o plugin ausente: ignorar.
  }
}
