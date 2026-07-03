"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe, Instagram, MessageCircle } from "lucide-react";
import { FollowButton } from "./FollowButton";

export interface PublicOrgProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  isFollowing: boolean;
  organizer: { businessName: string };
  _count: { followers: number; posts: number; events: number };
}

interface OrganizationProfileHeaderProps {
  profile: PublicOrgProfile;
  isLoggedIn: boolean;
  onFollowChange?: (following: boolean, count?: number) => void;
  onMessage?: () => void;
}

export function OrganizationProfileHeader({
  profile,
  isLoggedIn,
  onFollowChange,
  onMessage,
}: OrganizationProfileHeaderProps) {
  const [followersCount, setFollowersCount] = useState(profile._count.followers);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="h-40 sm:h-52 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 relative">
        {profile.bannerUrl && (
          <Image
            src={profile.bannerUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="px-5 sm:px-8 pb-6 -mt-12 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-24 h-24 rounded-2xl border-4 border-[#0a0a12] bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt={profile.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white/60">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.name}</h1>
            <p className="text-white/50 text-sm">{profile.organizer.businessName}</p>
          </div>

          <div className="flex flex-wrap gap-2 sm:pb-1">
            <FollowButton
              organizationId={profile.id}
              initialFollowing={profile.isFollowing}
              isLoggedIn={isLoggedIn}
              onFollowChange={(f, count) => {
                if (count !== undefined) setFollowersCount(count);
                onFollowChange?.(f, count);
              }}
            />
            {onMessage && (
              <button
                type="button"
                onClick={onMessage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Mensaje
              </button>
            )}
          </div>
        </div>

        {profile.description && (
          <p className="mt-4 text-white/70 text-sm sm:text-base max-w-2xl">
            {profile.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
          <span>
            <strong className="text-white">{followersCount}</strong> seguidores
          </span>
          <span>
            <strong className="text-white">{profile._count.posts}</strong> publicaciones
          </span>
          <span>
            <strong className="text-white">{profile._count.events}</strong> eventos
          </span>
        </div>

        {(profile.websiteUrl || profile.instagramUrl) && (
          <div className="mt-3 flex gap-3">
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Sitio web"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
            {profile.instagramUrl && (
              <a
                href={profile.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
