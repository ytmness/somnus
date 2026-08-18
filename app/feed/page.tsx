"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { OrganizationPostCard, type OrgPost } from "@/components/organizaciones/OrganizationPostCard";
import { formatEventCalendarDate } from "@/lib/utils";

type FeedItem =
  | { kind: "post"; id: string; createdAt: string; post: OrgPost }
  | {
      kind: "event";
      id: string;
      createdAt: string;
      event: {
        id: string;
        name: string;
        artist: string;
        venue: string;
        eventDate: string;
        eventTime: string;
        imageUrl: string | null;
        organization: { id: string; name: string; slug: string; logoUrl: string | null } | null;
      };
    };

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/feed/following", { credentials: "include" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (res.ok) setItems(json.data || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router]);

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-2xl font-bold mb-2">Tu feed</h1>
        <p className="text-white/60 text-sm mb-8">
          Publicaciones y eventos de organizaciones que sigues
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-white/50">
              Sigue organizaciones para ver su actividad aquí.
            </p>
            <Link
              href="/organizaciones"
              className="inline-block px-6 py-2.5 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90"
            >
              Explorar organizaciones
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) =>
              item.kind === "post" ? (
                <OrganizationPostCard key={item.id} post={item.post} showOrgLink />
              ) : (
                <Link
                  key={item.id}
                  href={`/eventos/${item.event.id}`}
                  className="somnus-card overflow-hidden block hover:border-white/30 transition-colors"
                >
                  <div className="flex gap-4 p-4">
                    {item.event.imageUrl && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <Image
                          src={item.event.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      {item.event.organization && (
                        <p className="text-white/50 text-xs mb-1">
                          {item.event.organization.name}
                        </p>
                      )}
                      <p className="font-semibold">{item.event.name}</p>
                      <p className="text-white/60 text-sm">{item.event.artist}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-white/50 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatEventCalendarDate(item.event.eventDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.event.venue}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
