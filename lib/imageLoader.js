/**
 * Custom next/image loader.
 * With `images.loader: 'custom'`, the built-in `/_next/image` optimizer is
 * disabled — returning `/_next/image?...` yields 404. Serve local public and
 * upload paths as-is; only remote URLs go through a passthrough query if needed.
 */
export default function somnusImageLoader({ src, width, quality }) {
  if (typeof src !== "string") {
    return String(src);
  }

  // Absolute remote URL — keep as-is (CDN / external)
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  // Local public/ or uploads paths — no optimizer available with custom loader
  if (
    src.startsWith("/assets/") ||
    src.startsWith("/uploads/") ||
    src.startsWith("/images/") ||
    src.startsWith("/")
  ) {
    return src;
  }

  const q = quality || 75;
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${q}`;
}
