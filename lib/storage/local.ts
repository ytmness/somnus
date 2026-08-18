import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
}

/** Base pública, ej. /uploads */
export function getUploadPublicBase(): string {
  const base = process.env.UPLOAD_PUBLIC_BASE || "/uploads";
  return base.startsWith("/") ? base.replace(/\/$/, "") || "/uploads" : `/${base}`;
}

export function buildPublicUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, "");
  return `${getUploadPublicBase()}/${clean}`;
}

export async function ensureUploadDirs(...subdirs: string[]): Promise<void> {
  const root = getUploadRoot();
  await fs.mkdir(root, { recursive: true });
  for (const sub of subdirs) {
    await fs.mkdir(path.join(root, sub), { recursive: true });
  }
}

export async function saveUploadBuffer(options: {
  buffer: Buffer;
  subdirectory: string;
  originalName: string;
  contentType?: string;
}): Promise<{ relativePath: string; publicUrl: string; absolutePath: string }> {
  const ext =
    options.originalName.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") ||
    "bin";
  const safeExt = ext.slice(0, 8) || "bin";
  const uniqueName = `${crypto.randomUUID()}.${safeExt}`;
  const relativePath = path.posix.join(
    options.subdirectory.replace(/\\/g, "/"),
    uniqueName
  );
  const absolutePath = path.join(getUploadRoot(), ...relativePath.split("/"));

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, options.buffer);

  return {
    relativePath,
    publicUrl: buildPublicUrl(relativePath),
    absolutePath,
  };
}

export function resolveSafeUploadPath(urlPathParts: string[]): string | null {
  if (!urlPathParts.length) return null;
  if (urlPathParts.some((p) => p === ".." || p.includes("\0"))) return null;
  const absolute = path.join(getUploadRoot(), ...urlPathParts);
  const root = path.resolve(getUploadRoot());
  if (!absolute.startsWith(root)) return null;
  return absolute;
}
