"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(
    token ? null : "Missing token. Request a new link from sign in."
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setConfirmError(null);

    if (!token) {
      setTokenError("Missing token. Request a new link from sign in.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setConfirmError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      toast.success(data.message || "Password updated");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen somnus-bg-main overflow-x-hidden">
      <SiteHeader eventsHref="/" />
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 somnus-page-under-header">
        <div className="w-full max-w-md">
          <div className="somnus-card p-6 sm:p-8 lg:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#7BA3E8]" />
              </div>
              <p className="somnus-eyebrow mb-2">Security</p>
              <h1 className="somnus-title-secondary text-3xl mb-2 uppercase">
                New password
              </h1>
              <p className="somnus-text-body text-sm">
                Choose a strong password for your Somnus account
              </p>
            </div>

            {tokenError && (
              <p
                id="token-error"
                role="alert"
                className="mb-6 text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3"
              >
                {tokenError}{" "}
                <Link href="/login" className="somnus-nav-link underline text-white">
                  Sign in
                </Link>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="reset-password"
                  className="block somnus-title-secondary text-sm mb-2 uppercase"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="somnus-input pl-10"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby={
                      passwordError ? "reset-password-error" : undefined
                    }
                    disabled={!token}
                  />
                </div>
                {passwordError && (
                  <p
                    id="reset-password-error"
                    role="alert"
                    className="mt-2 text-sm text-red-400"
                  >
                    {passwordError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reset-confirm"
                  className="block somnus-title-secondary text-sm mb-2 uppercase"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (confirmError) setConfirmError(null);
                    }}
                    className="somnus-input pl-10"
                    placeholder="Repeat your password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-invalid={confirmError ? true : undefined}
                    aria-describedby={
                      confirmError ? "reset-confirm-error" : undefined
                    }
                    disabled={!token}
                  />
                </div>
                {confirmError && (
                  <p
                    id="reset-confirm-error"
                    role="alert"
                    className="mt-2 text-sm text-red-400"
                  >
                    {confirmError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full somnus-btn text-base py-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save password"
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="somnus-text-body text-center text-sm">
                Remember your password?{" "}
                <Link
                  href="/login"
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
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen somnus-bg-main flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
