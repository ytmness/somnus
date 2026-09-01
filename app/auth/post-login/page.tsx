"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-path";
import { isNativePlatform } from "@/lib/native/platform";
import { useNativeAuthSurface } from "@/lib/native/use-auth-surface";

function PostLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const fromApp = useNativeAuthSurface(searchParams);
  const [message, setMessage] = useState("Completando inicio de sesión...");

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();
        const user = data?.user;

        if (!user) {
          if (!cancelled) {
            setMessage("No se encontró sesión. Redirigiendo...");
            router.replace("/login?error=auth_failed");
          }
          return;
        }

        const redirectPath = resolveAuthRedirectPath(
          user.role || "CLIENTE",
          requestedRedirect,
          user.staffRoles,
          fromApp || isNativePlatform() ? "app" : "web"
        );

        if (!cancelled) {
          window.location.href = redirectPath;
        }
      } catch {
        if (!cancelled) {
          setMessage("Error al completar el inicio de sesión.");
          router.replace("/login?error=auth_failed");
        }
      }
    }

    void finishLogin();
    return () => {
      cancelled = true;
    };
  }, [requestedRedirect, fromApp, router]);

  return (
    <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="somnus-text-body text-sm">{message}</p>
      </div>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <PostLoginContent />
    </Suspense>
  );
}
