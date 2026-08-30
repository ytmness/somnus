import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type ExploreType = "events" | "artists" | "organizations" | "all";

/**
 * GET /api/explore
 * Query: q, city, from, to, type (events|artists|organizations|all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const typeParam = (searchParams.get("type") || "all").toLowerCase();
    const type: ExploreType = (
      ["events", "artists", "organizations", "all"] as const
    ).includes(typeParam as ExploreType)
      ? (typeParam as ExploreType)
      : "all";

    const wantEvents = type === "all" || type === "events";
    const wantArtists = type === "all" || type === "artists";
    const wantOrgs = type === "all" || type === "organizations";

    const eventWhere: Prisma.EventWhereInput = {
      isActive: true,
      status: "PUBLISHED",
    };

    if (q) {
      eventWhere.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        {
          artists: {
            some: { artist: { name: { contains: q, mode: "insensitive" } } },
          },
        },
      ];
    }

    if (city) {
      eventWhere.city = { contains: city, mode: "insensitive" };
    }

    if (from || to) {
      eventWhere.eventDate = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          eventWhere.eventDate.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          eventWhere.eventDate.lte = toDate;
        }
      }
    }

    const [events, artists, organizations, cities] = await Promise.all([
      wantEvents
        ? prisma.event.findMany({
            where: eventWhere,
            select: {
              id: true,
              name: true,
              artist: true,
              venue: true,
              city: true,
              eventDate: true,
              eventTime: true,
              imageUrl: true,
              organization: {
                select: { id: true, name: true, slug: true, logoUrl: true },
              },
            },
            orderBy: { eventDate: "asc" },
            take: 40,
          })
        : Promise.resolve([]),
      wantArtists
        ? prisma.artist.findMany({
            where: q
              ? { name: { contains: q, mode: "insensitive" } }
              : undefined,
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              bio: true,
              _count: { select: { events: true } },
            },
            orderBy: { name: "asc" },
            take: 40,
          })
        : Promise.resolve([]),
      wantOrgs
        ? prisma.organization.findMany({
            where: {
              isActive: true,
              ...(city
                ? { city: { contains: city, mode: "insensitive" as const } }
                : {}),
              ...(q
                ? {
                    OR: [
                      { name: { contains: q, mode: "insensitive" as const } },
                      { slug: { contains: q, mode: "insensitive" as const } },
                      { city: { contains: q, mode: "insensitive" as const } },
                    ],
                  }
                : {}),
            },
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              city: true,
              isVerified: true,
              description: true,
              _count: { select: { followers: true, events: true } },
            },
            orderBy: { name: "asc" },
            take: 40,
          })
        : Promise.resolve([]),
      prisma.event.findMany({
        where: {
          isActive: true,
          status: "PUBLISHED",
          city: { not: null },
        },
        select: { city: true },
        distinct: ["city"],
        take: 100,
      }),
    ]);

    const distinctCities = Array.from(
      new Set(
        cities
          .map((c) => c.city)
          .filter((c): c is string => !!c && c.trim().length > 0)
          .map((c) => c.trim())
      )
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      data: {
        events,
        artists,
        organizations,
        cities: distinctCities,
      },
    });
  } catch (error) {
    console.error("GET /api/explore error:", error);
    return NextResponse.json(
      { error: "Error al buscar" },
      { status: 500 }
    );
  }
}
