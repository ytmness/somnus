"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Instagram, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cn } from "@/lib/utils";
import { uploadHttpErrorMessage } from "@/lib/storage/upload-image-validation";
import type { PrivateProfile } from "@/lib/profile-types";

export function SettingsPageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<PrivateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<
    null | "name" | "bio" | "instagram" | "phone" | "sms"
  >(null);

  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftIg, setDraftIg] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftSms, setDraftSms] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/me", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/login?next=/configuracion");
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setProfile(json.data as PrivateProfile);
      setDraftName(json.data.name || "");
      setDraftBio(json.data.bio || "");
      setDraftIg(json.data.instagramUsername || "");
      setDraftPhone(json.data.phone || "");
      setDraftSms(Boolean(json.data.smsOptIn));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setProfile(json.data);
      toast.success("Guardado");
      setEditField(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, kind: "avatar" | "background") => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", kind);
      const up = await fetch("/api/upload/profile-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const upJson = await up.json();
      if (!up.ok) {
        throw new Error(uploadHttpErrorMessage(up.status, upJson.error));
      }
      const field = kind === "avatar" ? "avatarUrl" : "backgroundUrl";
      await patch({ [field]: upJson.data.url });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#050505] text-white/60 flex items-center justify-center">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteHeader eventsHref="/" />
      <main className="mx-auto w-full max-w-xl px-4 sm:px-6 pt-28 pb-24">
        <h1 className="text-center text-sm font-semibold uppercase tracking-[0.25em] mb-10">
          Settings
        </h1>

        {/* Personal Details */}
        <section className="mb-10">
          <h2 className="text-base font-semibold">Personal Details</h2>
          <p className="text-sm text-white/50 mt-1 mb-4">
            This information is publicly visible on your profile.
          </p>
          <div className="divide-y divide-white/10 border-y border-white/10">
            <SettingsRow
              title="Profile Picture"
              description="Profile picture displayed on your public profile"
              onClick={() => avatarInputRef.current?.click()}
              trailing={
                profile.avatarUrl ? (
                  <span className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20">
                    <Image
                      src={profile.avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </span>
                ) : undefined
              }
            />
            <SettingsRow
              title="Background Image"
              description="Background image of your public profile"
              onClick={() => bgInputRef.current?.click()}
            />
            <SettingsRow
              title="Name"
              description="Your name on purchases and your profile"
              onClick={() => {
                setDraftName(profile.name);
                setEditField("name");
              }}
              trailing={
                <span className="text-sm text-white/50 max-w-[8rem] truncate">
                  {profile.name}
                </span>
              }
            />
            <SettingsRow
              title="Bio"
              description="Displayed on your profile"
              onClick={() => {
                setDraftBio(profile.bio || "");
                setEditField("bio");
              }}
            />
            <SettingsRow
              title="Instagram"
              description="Your Instagram username displayed on your profile"
              icon={<Instagram className="w-4 h-4 text-white/70" aria-hidden />}
              onClick={() => {
                setDraftIg(profile.instagramUsername || "");
                setEditField("instagram");
              }}
              trailing={
                profile.instagramUsername ? (
                  <span className="text-sm text-white/50">
                    @{profile.instagramUsername}
                  </span>
                ) : undefined
              }
            />
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10" id="contact">
          <h2 className="text-base font-semibold">Contact Information</h2>
          <p className="text-sm text-white/50 mt-1 mb-4">
            Private information used for your purchases and authentication.
          </p>
          <div className="divide-y divide-white/10 border-y border-white/10">
            <div className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-white/45 mt-0.5">
                  This is email linked to your account
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-white/70 max-w-[12rem] truncate">
                  {profile.email}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {profile.emailVerified ? "Verified" : "Not verified"}
                </p>
                {!profile.emailVerified && (
                  <Link
                    href="/verificar-email"
                    className="text-xs text-[#9BB8F0] hover:text-white mt-1 inline-block"
                  >
                    Verify email
                  </Link>
                )}
              </div>
            </div>
            <SettingsRow
              title="Phone Number"
              description={
                profile.phone
                  ? "Used for purchases and SMS preferences"
                  : "Add a phone number for purchases"
              }
              onClick={() => {
                setDraftPhone(profile.phone || "");
                setEditField("phone");
              }}
              trailing={
                <span className="text-sm text-white/50">
                  {profile.phone || "No Phone Number"}
                </span>
              }
            />
          </div>
        </section>

        {/* Marketing */}
        <section className="mb-12">
          <h2 className="text-base font-semibold">Marketing Preferences</h2>
          <p className="text-sm text-white/50 mt-1 mb-4">
            Manage your marketing preferences.
          </p>
          <div className="divide-y divide-white/10 border-y border-white/10">
            <SettingsRow
              title="SMS Opt-in"
              description="Manage your SMS opt-in status across communities"
              onClick={() => {
                setDraftSms(profile.smsOptIn);
                setEditField("sms");
              }}
              trailing={
                <span className="text-sm text-white/50">
                  {profile.smsOptIn ? "On" : "Off"}
                </span>
              }
            />
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Go Back
          </Link>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f, "avatar");
            e.target.value = "";
          }}
        />
        <input
          ref={bgInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f, "background");
            e.target.value = "";
          }}
        />

        {editField && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0c0c0c] p-5 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                {editField === "name" && "Name"}
                {editField === "bio" && "Bio"}
                {editField === "instagram" && "Instagram"}
                {editField === "phone" && "Phone"}
                {editField === "sms" && "SMS Opt-in"}
              </h3>

              {editField === "name" && (
                <input
                  className="somnus-input w-full"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoFocus
                />
              )}
              {editField === "bio" && (
                <textarea
                  className="somnus-input w-full min-h-[7rem] resize-y"
                  value={draftBio}
                  maxLength={500}
                  onChange={(e) => setDraftBio(e.target.value)}
                  autoFocus
                />
              )}
              {editField === "instagram" && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    @
                  </span>
                  <input
                    className="somnus-input w-full !pl-8"
                    value={draftIg}
                    onChange={(e) => setDraftIg(e.target.value)}
                    placeholder="username"
                    autoFocus
                  />
                </div>
              )}
              {editField === "phone" && (
                <input
                  className="somnus-input w-full"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  placeholder="+52…"
                  autoFocus
                />
              )}
              {editField === "sms" && (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-3 cursor-pointer">
                  <span className="text-sm text-white/80">
                    Receive SMS from communities
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftSms}
                    onClick={() => setDraftSms((v) => !v)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      draftSms ? "bg-[#7BA3E8]" : "bg-white/20"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                        draftSms && "translate-x-4"
                      )}
                    />
                  </button>
                </label>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setEditField(null)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-white/60 hover:text-white"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (editField === "name") void patch({ name: draftName });
                    if (editField === "bio") void patch({ bio: draftBio || null });
                    if (editField === "instagram")
                      void patch({ instagramUsername: draftIg || null });
                    if (editField === "phone")
                      void patch({ phone: draftPhone || null });
                    if (editField === "sms") void patch({ smsOptIn: draftSms });
                  }}
                  className="somnus-btn inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SettingsRow({
  title,
  description,
  onClick,
  trailing,
  icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  trailing?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-4 text-left hover:bg-white/[0.02] transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-xs text-white/45 mt-0.5 text-pretty">{description}</p>
      </div>
      {trailing}
      <ChevronRight className="w-4 h-4 text-white/35 shrink-0" aria-hidden />
    </button>
  );
}
