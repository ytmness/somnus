"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { sanitizeRedirectPath } from "@/lib/auth/redirect-path";
import { isNativePlatform } from "@/lib/native/platform";

type Provider = "google" | "apple";

interface SocialLoginButtonsProps {
  redirectTo?: string | null;
  /** If true, post-login sends ORGANIZER to /organizador (app). On web goes to landing. */
  fromApp?: boolean;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function SocialLoginButtons({
  redirectTo,
  fromApp = false,
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [enabled, setEnabled] = useState<{ google: boolean; apple: boolean }>({
    google: false,
    apple: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProviders() {
      try {
        const res = await fetch("/api/authjs/providers", { cache: "no-store" });
        const data = (await res.json()) as Record<string, unknown>;
        if (!cancelled) {
          setEnabled({
            google: !!data.google,
            apple: !!data.apple,
          });
        }
      } catch {
        if (!cancelled) {
          setEnabled({ google: false, apple: false });
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void loadProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOAuth = async (provider: Provider) => {
    if (!enabled[provider]) {
      toast.error(
        `${provider === "google" ? "Google" : "Apple"} is not configured on the server.`
      );
      return;
    }
    setLoadingProvider(provider);
    try {
      const safeRedirect = sanitizeRedirectPath(redirectTo ?? null);
      const params = new URLSearchParams();
      if (safeRedirect) params.set("redirect", safeRedirect);
      if (fromApp || isNativePlatform()) params.set("app", "1");
      const qs = params.toString();
      const callbackUrl = qs ? `/auth/post-login?${qs}` : "/auth/post-login";
      await signIn(provider, { callbackUrl });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not sign in";
      toast.error(message);
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;
  const anyEnabled = enabled.google || enabled.apple;

  if (loaded && !anyEnabled) {
    return (
      <p className="text-center text-sm text-white/50">
        Social login is unavailable right now. Use email and password.
      </p>
    );
  }

  if (!loaded) {
    return (
      <div className="space-y-3 opacity-50">
        <div className="w-full h-12 rounded-lg bg-white/10 animate-pulse" />
        <div className="w-full h-12 rounded-lg bg-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enabled.google && (
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-gray-900 font-medium hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7BA3E8]"
        >
          {loadingProvider === "google" ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>
      )}

      {enabled.apple && (
        <button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-black border border-white/20 text-white font-medium hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7BA3E8]"
        >
          {loadingProvider === "apple" ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <AppleIcon />
          )}
          Continue with Apple
        </button>
      )}
    </div>
  );
}
