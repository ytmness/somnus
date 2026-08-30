import { prisma } from "@/lib/db/prisma";
import { slugifyName } from "@/lib/utils/org-slug";

export type ArtistInput = {
  name: string;
  instagramUrl?: string | null;
  spotifyUrl?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

type DbClient = {
  artist: typeof prisma.artist;
  eventArtist: typeof prisma.eventArtist;
};

function emptyToNull(v?: string | null): string | null {
  if (v == null || v.trim() === "") return null;
  return v.trim();
}

/** Find or create Artist by slugified name; refresh optional profile fields. */
export async function findOrCreateArtist(
  input: ArtistInput,
  db: DbClient = prisma
) {
  const name = input.name.trim();
  const baseSlug = slugifyName(name) || "artist";
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.artist.findUnique({ where: { slug } });
    if (!existing) {
      return db.artist.create({
        data: {
          name,
          slug,
          imageUrl: emptyToNull(input.imageUrl),
          instagramUrl: emptyToNull(input.instagramUrl),
          spotifyUrl: emptyToNull(input.spotifyUrl),
        },
      });
    }
    if (existing.name.toLowerCase() === name.toLowerCase()) {
      return db.artist.update({
        where: { id: existing.id },
        data: {
          imageUrl: emptyToNull(input.imageUrl) ?? existing.imageUrl,
          instagramUrl:
            emptyToNull(input.instagramUrl) ?? existing.instagramUrl,
          spotifyUrl: emptyToNull(input.spotifyUrl) ?? existing.spotifyUrl,
        },
      });
    }
    slug = `${baseSlug}-${suffix++}`;
  }
}

export async function syncEventArtists(
  eventId: string,
  artists: ArtistInput[] | undefined,
  db: DbClient = prisma
) {
  if (artists === undefined) return;

  await db.eventArtist.deleteMany({ where: { eventId } });

  for (let i = 0; i < artists.length; i++) {
    const a = artists[i];
    if (!a.name?.trim()) continue;
    const artist = await findOrCreateArtist(a, db);
    await db.eventArtist.create({
      data: {
        eventId,
        artistId: artist.id,
        sortOrder: a.sortOrder ?? i,
      },
    });
  }
}

export const eventArtistsInclude = {
  artists: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          instagramUrl: true,
          spotifyUrl: true,
        },
      },
    },
  },
};

/** Normalize optional empty strings from form payloads to null for Prisma. */
export function emptyToNullField(v?: string | null): string | null | undefined {
  if (v === undefined) return undefined;
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}
