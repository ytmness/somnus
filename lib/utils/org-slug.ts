import { prisma } from "@/lib/db/prisma";

export function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "org";
}

export async function generateUniqueOrgSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugifyName(name);
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.organization.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${suffix++}`;
  }
}
