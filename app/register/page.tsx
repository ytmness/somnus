"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, User, Phone, Ticket, Shield, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { resolveAuthRedirectPath } from "@/lib/auth/redirect-path";
import { useNativeAuthSurface } from "@/lib/native/use-auth-surface";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect");
  const fromApp = useNativeAuthSurface(searchParams);
  const authSurface = fromApp ? "app" : "web";

  const [formData, setFormData] = useState({
    name: "",
    email: emailParam,
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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
          data.user.role || "ORGANIZER",
          redirectParam,
          data.user.staffRoles,
          authSurface
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError(null);

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_EXISTS") {
          toast.error(data.error);
          const loginQs = new URLSearchParams({ email: formData.email });
          if (fromApp) loginQs.set("app", "1");
          if (redirectParam) loginQs.set("redirect", redirectParam);
          router.push(`/login?${loginQs.toString()}`);
          return;
        }
        if (data.requiresVerification || data.code === "OTP_SEND_FAILED") {
          toast.error(
            data.error ||
              "We could not send the code. You can resend it on the next screen."
          );
          const verifyQs = new URLSearchParams({
            email: formData.email.trim().toLowerCase(),
          });
          if (fromApp) verifyQs.set("app", "1");
          if (redirectParam) verifyQs.set("redirect", redirectParam);
          window.location.href = `/verificar-email?${verifyQs.toString()}`;
          return;
        }
        throw new Error(data.error || "Could not create account");
      }

      if (data.requiresVerification) {
        toast.success("Account created. Check your email and enter the code.");
        const verifyQs = new URLSearchParams({
          email: formData.email.trim().toLowerCase(),
        });
        if (fromApp) verifyQs.set("app", "1");
        if (redirectParam) verifyQs.set("redirect", redirectParam);
        window.location.href = `/verificar-email?${verifyQs.toString()}`;
        return;
      }

      toast.success("Account created! Welcome to Somnus");
      const redirectPath = resolveAuthRedirectPath(
        data.user?.role || "ORGANIZER",
        redirectParam,
        undefined,
        authSurface
      );
      window.location.href = redirectPath;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />

      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-12">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="hidden lg:flex flex-col justify-center space-y-8">
              <div>
                <p className="somnus-eyebrow mb-3">Join</p>
                <h1 className="somnus-display text-4xl md:text-5xl mb-4">
                  Join
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
                  Create your account to buy tickets, save your entries, and
                  never miss the best live events.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Fast signup
                    </h3>
                    <p className="somnus-text-body text-sm">
                      With Google, Apple, or email and password
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Your tickets
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Open My Tickets with the same email you used at checkout
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-[#7BA3E8]" />
                  </div>
                  <div>
                    <h3 className="somnus-title-secondary text-lg mb-2 uppercase">
                      Secure account
                    </h3>
                    <p className="somnus-text-body text-sm">
                      Your data protected with high security standards
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="somnus-card p-6 sm:p-8 lg:p-10">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-[#7BA3E8]" />
                    </div>
                    <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                      Create account
                    </h1>
                    <p className="somnus-text-body text-sm">
                      Fill in your details to start buying tickets
                    </p>
                  </div>

                  <SocialLoginButtons
                    fromApp={fromApp}
                    redirectTo={redirectParam}
                  />

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 somnus-text-body bg-transparent text-white/60">
                        or sign up with email
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="register-name"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Full name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="register-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="somnus-input pl-10"
                          placeholder="Your name"
                          required
                          minLength={2}
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-email"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="register-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="somnus-input pl-10"
                          placeholder="you@email.com"
                          required
                          autoComplete="email"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-phone"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Phone{" "}
                        <span className="text-white/40 normal-case">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="register-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="somnus-input pl-10"
                          placeholder="+1 555 123 4567"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-password"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (confirmError) setConfirmError(null);
                          }}
                          className="somnus-input pl-10 pr-12"
                          placeholder="At least 8 characters"
                          required
                          minLength={8}
                          autoComplete="new-password"
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

                    <div>
                      <label
                        htmlFor="register-confirm-password"
                        className="block somnus-title-secondary text-sm mb-2 uppercase"
                      >
                        Confirm password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                        <input
                          id="register-confirm-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            });
                            if (confirmError) setConfirmError(null);
                          }}
                          className="somnus-input pl-10"
                          placeholder="Repeat your password"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          aria-invalid={confirmError ? true : undefined}
                          aria-describedby={
                            confirmError ? "confirm-password-error" : undefined
                          }
                        />
                      </div>
                      {confirmError && (
                        <p
                          id="confirm-password-error"
                          role="alert"
                          className="mt-2 text-sm text-red-400"
                        >
                          {confirmError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Creating account…
                        </span>
                      ) : (
                        "Create account"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <p className="somnus-text-body text-center text-sm">
                      Already have an account?{" "}
                      <Link
                        href={`/login${
                          redirectParam
                            ? `?redirect=${encodeURIComponent(redirectParam)}${
                                fromApp ? "&app=1" : ""
                              }`
                            : fromApp
                              ? "?app=1"
                              : ""
                        }`}
                        className="somnus-nav-link text-white hover:underline font-medium"
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
