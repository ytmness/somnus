"use client";

import { useEffect, useState } from "react";
import { isNativePlatform } from "@/lib/native/platform";

/** Query `?app=1` o shell Capacitor (detectado tras montar, sin mismatch de hidratación). */
export function useNativeAuthSurface(searchParams: {
  get(name: string): string | null;
}): boolean {
  const queryNative =
    searchParams.get("app") === "1" || searchParams.get("client") === "app";
  const [nativeShell, setNativeShell] = useState(false);

  useEffect(() => {
    setNativeShell(isNativePlatform());
  }, []);

  return queryNative || nativeShell;
}
