"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  OrganizationProfileHeader,
  type PublicOrgProfile,
} from "@/components/organizaciones/OrganizationProfileHeader";
import { OrganizationFeed } from "@/components/organizaciones/OrganizationFeed";

interface OrganizationProfileClientProps {
  slug: string;
}

export default function OrganizationProfileClient({ slug }: OrganizationProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicOrgProfile | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "events">("posts");

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/public/${slug}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfile(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleMessage = async () => {
    if (!user) {
      toast.info("Inicia sesión para enviar mensajes");
      router.push("/login");
      return;
    }
    if (!profile) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId: profile.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/mensajes?conversation=${json.data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al abrir conversación");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen somnus-bg-main text-white flex flex-col items-center justify-center gap-4">
        <p>Organización no encontrada</p>
        <Link href="/organizaciones" className="text-white/60 hover:text-white underline">
          Ver organizaciones
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" onUserChange={(u) => setUser(u)} />
      </div>

      <main className="somnus-page-under-header max-w-3xl mx-auto px-4 pb-16 space-y-6">
        <OrganizationProfileHeader
          profile={profile}
          isLoggedIn={!!user}
          onMessage={handleMessage}
        />

        <div className="flex gap-2 border-b border-white/10">
          {(["posts", "events"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t === "posts" ? "Publicaciones" : "Eventos"}
            </button>
          ))}
        </div>

        <OrganizationFeed organizationId={profile.id} activeTab={tab} />
      </main>
    </div>
  );
}
