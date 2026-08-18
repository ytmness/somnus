"use client";

import Image from "next/image";
import Link from "next/link";
import { Megaphone } from "lucide-react";

export interface OrgPost {
  id: string;
  content: string;
  imageUrl: string | null;
  type: "POST" | "ANNOUNCEMENT";
  createdAt: string;
  author: { id: string; name: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

interface OrganizationPostCardProps {
  post: OrgPost;
  showOrgLink?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrganizationPostCard({ post, showOrgLink = false }: OrganizationPostCardProps) {
  return (
    <article className="somnus-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {post.organization.logoUrl ? (
            <Image
              src={post.organization.logoUrl}
              alt={post.organization.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/60 text-sm font-bold">
              {post.organization.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showOrgLink ? (
              <Link
                href={`/organizaciones/${post.organization.slug}`}
                className="font-semibold hover:underline"
              >
                {post.organization.name}
              </Link>
            ) : (
              <span className="font-semibold">{post.organization.name}</span>
            )}
            {post.type === "ANNOUNCEMENT" && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
                <Megaphone className="w-3 h-3" />
                Anuncio
              </span>
            )}
          </div>
          <p className="text-white/50 text-xs">{formatDate(post.createdAt)}</p>
        </div>
      </div>

      <p className="text-white/90 whitespace-pre-wrap">{post.content}</p>

      {post.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-white/10">
          <Image
            src={post.imageUrl}
            alt=""
            width={800}
            height={450}
            className="w-full h-auto object-cover max-h-96"
          />
        </div>
      )}
    </article>
  );
}
