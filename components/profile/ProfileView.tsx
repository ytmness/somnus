"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Images,
  Instagram,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cn } from "@/lib/utils";

export type ProfileViewData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  instagramUsername: string | null;
  emailVerified: boolean;
  stats: {
    communities: number;
    pastEvents: number;
    completedPurchases: number;
  };
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }>;
  pastEvents: Array<{
    id: string;
    name: string;
    eventDate: string;
    imageUrl: string | null;
    organizationLogo: string | null;
  }>;
  email?: string;
  isOwn?: boolean;
};

function formatEventDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

interface ProfileViewProps {
  profile: ProfileViewData;
  isOwn: boolean;
}

export function ProfileView({ profile, isOwn }: ProfileViewProps) {
  const [tab, setTab] = useState<"calendar" | "gallery">("calendar");

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="relative">
        <div
          className="absolute inset-x-0 top-0 h-56 sm:h-72 overflow-hidden"
          aria-hidden
        >
          {profile.backgroundUrl ? (
            <Image
              src={profile.backgroundUrl}
              alt=""
              fill
              className="object-cover opacity-50"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-[#1a2438] via-[#0c1018] to-[#050505]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#050505]/40 to-[#050505]" />
        </div>

        <SiteHeader eventsHref="/" />

        <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
          <section className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-full overflow-hidden border border-white/20 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  sizes="144px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl sm:text-3xl font-semibold tracking-wide text-white/70">
                  {initials(profile.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  {profile.name}
                </h1>
                {profile.emailVerified && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#9BB8F0]"
                    title="Email verified"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-sm text-white/65">
                <span className="tabular-nums text-white/90">
                  {profile.stats.completedPurchases}
                </span>{" "}
                {profile.stats.completedPurchases === 1
                  ? "purchase"
                  : "purchases"}
                <span className="mx-2 text-white/25">·</span>
                <span className="tabular-nums text-white/90">
                  {profile.stats.communities}
                </span>{" "}
                {profile.stats.communities === 1
                  ? "community"
                  : "communities"}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
                {profile.instagramUsername ? (
                  <a
                    href={`https://instagram.com/${profile.instagramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Instagram className="w-4 h-4" aria-hidden />
                    @{profile.instagramUsername}
                  </a>
                ) : isOwn ? (
                  <Link
                    href="/configuracion"
                    className="inline-flex items-center gap-1.5 text-white/45 hover:text-white/80"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden />
                    Instagram
                  </Link>
                ) : null}

                {profile.bio ? (
                  <p className="text-pretty max-w-xl text-white/65">
                    {profile.bio}
                  </p>
                ) : isOwn ? (
                  <Link
                    href="/configuracion"
                    className="inline-flex items-center gap-1.5 text-white/45 hover:text-white/80"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden />
                    Bio
                  </Link>
                ) : null}
              </div>

              {isOwn && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/configuracion"
                    className="inline-flex items-center justify-center rounded-full border border-white/35 px-4 py-2 text-xs uppercase tracking-wider text-white/90 hover:bg-white/10 transition-colors"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/configuracion#contact"
                    className="inline-flex items-center justify-center rounded-full border border-white/35 px-4 py-2 text-xs uppercase tracking-wider text-white/90 hover:bg-white/10 transition-colors"
                  >
                    Link Email
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {profile.communities.map((c) => (
                <Link
                  key={c.id}
                  href={`/organizaciones/${c.slug}`}
                  className="group shrink-0 w-[7.5rem]"
                >
                  <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] mb-2">
                    {c.logoUrl ? (
                      <Image
                        src={c.logoUrl}
                        alt=""
                        width={120}
                        height={120}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/50">
                        {c.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-white/90 truncate">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-white/45 truncate">Community</p>
                </Link>
              ))}
              {isOwn && (
                <Link href="/organizaciones" className="shrink-0 w-[7.5rem]">
                  <div className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/[0.02] mb-2 flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white/80 hover:border-white/35 transition-colors">
                    <Plus className="w-5 h-5" aria-hidden />
                    <span className="text-[11px] uppercase tracking-wider">
                      New
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </section>

          <div className="mt-10 border-t border-white/10">
            <div className="flex items-center justify-center gap-10 pt-3">
              <button
                type="button"
                onClick={() => setTab("calendar")}
                aria-pressed={tab === "calendar"}
                className={cn(
                  "pb-3 text-white/50 hover:text-white transition-colors border-b-2 border-transparent",
                  tab === "calendar" && "text-white border-white"
                )}
                aria-label="Past events"
              >
                <Calendar className="w-5 h-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setTab("gallery")}
                aria-pressed={tab === "gallery"}
                className={cn(
                  "pb-3 text-white/50 hover:text-white transition-colors border-b-2 border-transparent",
                  tab === "gallery" && "text-white border-white"
                )}
                aria-label="Gallery"
              >
                <Images className="w-5 h-5" aria-hidden />
              </button>
            </div>
          </div>

          {tab === "calendar" ? (
            <section className="mt-8">
              <h2 className="text-lg font-medium mb-4">Past Events</h2>
              {profile.pastEvents.length === 0 ? (
                <p className="text-sm text-white/50 py-10 text-center">
                  No past events yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {profile.pastEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/eventos/${ev.id}`}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]"
                    >
                      {ev.imageUrl ? (
                        <Image
                          src={ev.imageUrl}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width:640px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2438] to-[#0a0a0a]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      {ev.organizationLogo && (
                        <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-md overflow-hidden border border-white/20 bg-black/40">
                          <Image
                            src={ev.organizationLogo}
                            alt=""
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide line-clamp-2">
                          {ev.name}
                        </p>
                        <p className="text-[10px] text-white/65 mt-0.5">
                          {formatEventDate(ev.eventDate)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="mt-8 py-16 text-center">
              <Images className="w-8 h-8 mx-auto text-white/35 mb-3" aria-hidden />
              <p className="text-sm text-white/50">Gallery coming soon.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export function ProfilePageClient({ userId }: { userId?: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileViewData | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!userId) {
        const res = await fetch("/api/profile/me", { credentials: "include" });
        if (res.status === 401) {
          router.replace("/login?next=/perfil");
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error");
        setProfile(json.data);
        setIsOwn(true);
      } else {
        const [pubRes, meRes] = await Promise.all([
          fetch(`/api/profile/${userId}`),
          fetch("/api/profile/me", { credentials: "include" }),
        ]);
        const pub = await pubRes.json();
        if (!pubRes.ok) throw new Error(pub.error || "Perfil no encontrado");
        setProfile(pub.data);
        if (meRes.ok) {
          const me = await meRes.json();
          setIsOwn(me?.data?.id === userId);
        } else {
          setIsOwn(false);
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white/60 flex items-center justify-center">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <SiteHeader eventsHref="/" />
        <div className="pt-32 text-center text-white/60">Profile not found.</div>
      </div>
    );
  }

  return <ProfileView profile={profile} isOwn={isOwn} />;
}
