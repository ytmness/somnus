export const UPLOAD_IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const UPLOAD_IMAGE_ACCEPTED_MIMES = Object.keys(UPLOAD_IMAGE_MIME_TO_EXT);

export type UploadImageFile = {
  name: string;
  size: number;
  type: string;
};

export function guessUploadImageExt(file: UploadImageFile): string {
  if (file.type && UPLOAD_IMAGE_MIME_TO_EXT[file.type]) {
    return UPLOAD_IMAGE_MIME_TO_EXT[file.type];
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,5}$/i.test(ext)) return ext;
  return "jpg";
}

export function isProbablyUploadImage(file: UploadImageFile): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(file.name);
}

export function validateUploadImage(
  file: UploadImageFile,
  maxBytes: number
): string | null {
  if (file.size > maxBytes) {
    return `La imagen no debe superar ${Math.round(maxBytes / 1024 / 1024)} MB`;
  }
  if (!isProbablyUploadImage(file)) {
    return "Formato no permitido. Usa JPG, PNG, GIF, WebP o HEIC.";
  }
  return null;
}

export function uploadHttpErrorMessage(
  status: number,
  fallback?: string
): string {
  if (status === 413) {
    return "La imagen es demasiado grande para subir. Elige una más pequeña o comprímela.";
  }
  return fallback || "Error al subir la imagen";
}
