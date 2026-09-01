"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle, Lock } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-path";
import { isNativePlatform } from "@/lib/native/platform";
import { useNativeAuthSurface } from "@/lib/native/use-auth-surface";

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect");
  const fromApp = useNativeAuthSurface(searchParams);

  const [formData, setFormData] = useState({
    email: email,
    code: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not verify code");
      }

      toast.success("Email verified!");

      const redirectPath = resolveAuthRedirectPath(
        data.user?.role || "CLIENTE",
        redirectParam,
        data.user?.staffRoles,
        fromApp || isNativePlatform() ? "app" : "web"
      );

      window.location.href = redirectPath;
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not verify code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.email) {
      setEmailError("Enter your email");
      return;
    }
    setEmailError(null);
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not resend code");
      }

      toast.success("Code resent. Check your email.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not resend code"
      );
    } finally {
      setIsResending(false);
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
                <p className="somnus-eyebrow mb-3">Verification</p>
                <h1 className="somnus-display text-4xl md:text-5xl mb-4">
                  Verify your
                </h1>
                <div className="mb-6">
                  <Image
                    src="/assets/SOMNUS LOGO BLANCO.png"
                    alt="Somnus"
                    width={280}
                    height={84}
                    className="w-48 md:w-56 h-auto object-contain"
                  />
                </div>
                <p className="somnus-lede mb-8">
                  Enter the 8-digit code we sent to your email to finish signing
                  in.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      8-digit code
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Check your inbox and spam folder
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Security
                    </h3>
                    <p className="somnus-text-body text-sm">
                      The code expires in 10 minutes for your security
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Quick verification
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Once verified, you can buy tickets and use your account
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
                      Verify your email
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Enter the 8-digit code we sent to your email
                    </p>
                  </div>

                  <div className="hidden lg:block text-center mb-8">
                    <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-[#7BA3E8]" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Verify your email
                    </h1>
                    <p className="somnus-text-body">
                      Enter the 8-digit code we sent to your email
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="verify-email"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="verify-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (emailError) setEmailError(null);
                          }}
                          className="somnus-input pl-10 disabled:opacity-50"
                          placeholder="you@email.com"
                          required
                          disabled={!!email}
                          autoComplete="email"
                          spellCheck={false}
                          aria-invalid={emailError ? true : undefined}
                          aria-describedby={emailError ? "verify-email-error" : undefined}
                        />
                      </div>
                      {emailError && (
                        <p
                          id="verify-email-error"
                          role="alert"
                          className="mt-2 text-sm text-red-400"
                        >
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="verify-code"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Verification code
                      </label>
                      <input
                        id="verify-code"
                        type="text"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.replace(/\D/g, "").slice(0, 8),
                          })
                        }
                        className="somnus-input text-center text-2xl tracking-widest font-mono"
                        placeholder="00000000"
                        required
                        maxLength={8}
                        pattern="[0-9]{8}"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                      <p className="somnus-text-body text-sm mt-2 text-center">
                        Enter the 8-digit code
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || formData.code.length !== 8}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Verifying…
                        </span>
                      ) : (
                        "Verify email"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResending || !formData.email}
                      className="somnus-nav-link text-white hover:text-white/80 font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
                      />
                      {isResending ? "Resending…" : "Resend code"}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="somnus-text-body text-center text-sm">
                      Back to login?{" "}
                      <Link
                        href="/login"
                        className="somnus-nav-link text-white hover:underline transition-colors font-medium"
                      >
                        Sign in
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

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/50 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="somnus-text-body text-xl">Loading…</p>
          </div>
        </div>
      }
    >
      <VerificarEmailContent />
    </Suspense>
  );
}
