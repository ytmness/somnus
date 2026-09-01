"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Shield, Mail, Lock, Ticket, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-path";
import { isNativePlatform } from "@/lib/native/platform";
import { useNativeAuthSurface } from "@/lib/native/use-auth-surface";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const resetParam = searchParams.get("reset");
  const fromApp = useNativeAuthSurface(searchParams);
  const authSurface = fromApp ? "app" : "web";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!errorParam) return;
    if (errorParam === "auth_failed") {
      toast.error("Could not complete sign-in. Please try again.");
    } else if (errorParam === "account_inactive") {
      toast.error("Your account is deactivated. Contact support.");
    } else if (
      errorParam === "OAuthSignin" ||
      errorParam === "OAuthCallback" ||
      errorParam === "OAuthCreateAccount" ||
      errorParam === "Callback" ||
      errorParam === "InvalidCheck"
    ) {
      toast.error("Could not complete sign-in. Please try again.");
    } else if (errorParam === "Configuration") {
      toast.error(
        "Sign-in is temporarily unavailable. Try email and password or contact support."
      );
    } else if (errorParam === "AccessDenied") {
      toast.error("Access denied. Try a different account.");
    }
  }, [errorParam]);

  useEffect(() => {
    if (resetParam === "sent") {
      toast.success("We sent you a link to reset your password.");
    }
  }, [resetParam]);

  useEffect(() => {
    let cancelled = false;
    async function redirectIfLoggedIn() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled || !data?.user) return;
        const path = resolveAuthRedirectPath(
          data.user.role || "CLIENTE",
          redirectParam,
          data.user.staffRoles,
          fromApp || isNativePlatform() ? "app" : "web"
        );
        window.location.replace(path);
      } catch {
        // ignore
      }
    }
    void redirectIfLoggedIn();
    return () => {
      cancelled = true;
    };
  }, [redirectParam, authSurface]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, surface: authSurface }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "USER_NOT_FOUND") {
          toast.error(data.error);
          const loginQs = new URLSearchParams({ email });
          if (fromApp) loginQs.set("app", "1");
          if (redirectParam) loginQs.set("redirect", redirectParam);
          router.push(`/register?${loginQs.toString()}`);
          return;
        }
        if (data.code === "EMAIL_NOT_VERIFIED") {
          toast.error(data.error || "Verify your email to continue");
          const verifyQs = new URLSearchParams({
            email: email.trim().toLowerCase(),
          });
          if (fromApp) verifyQs.set("app", "1");
          if (redirectParam) verifyQs.set("redirect", redirectParam);
          window.location.href = `/verificar-email?${verifyQs.toString()}`;
          return;
        }
        throw new Error(data.error || "Could not sign in");
      }

      toast.success("Welcome back!");
      const redirectPath =
        redirectParam != null
          ? resolveAuthRedirectPath(
              data.user?.role || "CLIENTE",
              redirectParam,
              undefined,
              authSurface
            )
          : (data.redirectPath ??
            resolveAuthRedirectPath(
              data.user?.role || "CLIENTE",
              null,
              undefined,
              authSurface
            ));
      window.location.href = redirectPath;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError("Enter your email to reset your password");
      return;
    }
    setEmailError(null);

    setIsResetting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not send reset link");
      }
      toast.success("Check your email to reset your password");
      router.replace("/login?reset=sent");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not send reset link"
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 somnus-page-under-header">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <p className="somnus-eyebrow mb-3">Account</p>
                <h1 className="somnus-display text-4xl md:text-5xl mb-4">
                  Welcome to
                </h1>
                <div className="mb-6">
                  <Image
                    src="/assets/SOMNUS LOGO BLANCO.png"
                    alt="SOMNUS"
                    width={280}
                    height={84}
                    className="w-48 md:w-56 h-auto object-contain"
                    priority
                  />
                </div>
                <p className="somnus-lede mb-8">
                  Sign in to manage your tickets, browse upcoming events, and
                  unlock exclusive experiences.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Your tickets
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Access every ticket you bought and download them anytime
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Exclusive events
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Discover and book tickets for the best live experiences
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Built-in security
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Your data is protected with high security standards
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  <div className="lg:hidden text-center mb-8">
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Sign in
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Choose how you want to access your account
                    </p>
                  </div>

                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-[#7BA3E8]" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Sign in
                    </h1>
                    <p className="somnus-text-body">
                      Choose how you want to access your account
                    </p>
                  </div>

                  {emailParam && (
                    <p className="text-[#7BA3E8] text-sm text-center bg-[#5B8DEF]/10 border border-[#5B8DEF]/25 rounded-lg py-2 px-3 mb-6">
                      Sign in with your checkout email to view your tickets
                    </p>
                  )}

                  <SocialLoginButtons
                    redirectTo={redirectParam}
                    fromApp={fromApp}
                  />

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 somnus-text-body bg-transparent text-white/60">
                        or continue with email
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError(null);
                          }}
                          required
                          autoComplete="email"
                          spellCheck={false}
                          aria-invalid={emailError ? true : undefined}
                          aria-describedby={emailError ? "email-error" : undefined}
                          className="somnus-input pl-10"
                          placeholder="you@email.com"
                        />
                      </div>
                      {emailError && (
                        <p
                          id="email-error"
                          role="alert"
                          className="mt-2 text-sm text-red-400"
                        >
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="password"
                          className="block somnus-title-secondary text-sm uppercase"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={isResetting}
                          className="somnus-nav-link text-xs text-white/60 hover:text-white disabled:opacity-50"
                        >
                          {isResetting ? "Sending…" : "Forgot password?"}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          autoComplete="current-password"
                          className="somnus-input pl-10 pr-12"
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="somnus-nav-link absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Signing in…
                        </span>
                      ) : (
                        "Sign in"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      New to Somnus?{" "}
                      <Link
                        href={`/register${
                          redirectParam
                            ? `?redirect=${encodeURIComponent(redirectParam)}${
                                fromApp ? "&app=1" : ""
                              }`
                            : fromApp
                              ? "?app=1"
                              : ""
                        }`}
                        className="somnus-nav-link text-white hover:underline transition-colors font-medium"
                      >
                        Create a free account
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
