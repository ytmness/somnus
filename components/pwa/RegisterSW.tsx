"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de Somnus solo en el navegador (no en Capacitor nativo).
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Evitar SW dentro del WebView nativo (la app ya es “instalada”).
    const capacitor = (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    if (capacitor?.isNativePlatform?.()) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] SW registration failed:", err);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
