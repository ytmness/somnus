"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";

interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  _count: { followers: number; events: number; posts: number };
}

export default function OrganizacionesPage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/organizations/public?${params}`);
        const json = await res.json();
        if (res.ok) setOrgs(json.data || []);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader eventsHref="/" />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-2">Organizaciones</h1>
        <p className="text-white/60 mb-8">Descubre y sigue a tus organizadores favoritos</p>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar organizaciones..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : orgs.length === 0 ? (
          <p className="text-center text-white/50 py-16">No se encontraron organizaciones.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/organizaciones/${org.slug}`}
                className="somnus-card p-5 flex gap-4 hover:border-white/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {org.logoUrl ? (
                    <Image
                      src={org.logoUrl}
                      alt={org.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white/50">
                      {org.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{org.name}</h2>
                  {org.description && (
                    <p className="text-white/50 text-sm line-clamp-2 mt-1">{org.description}</p>
                  )}
                  <p className="text-white/40 text-xs mt-2">
                    {org._count.followers} seguidores · {org._count.events} eventos
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
