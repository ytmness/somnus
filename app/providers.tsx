"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/cart/CartContext";
import { NativeShell } from "@/components/native/NativeShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider basePath="/api/authjs">
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <RegisterSW />
          <NativeShell />
          {children}
          <Toaster position="top-right" richColors />
        </CartProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
