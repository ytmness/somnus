export type GallerySection = {
  id: string;
  title: string;
  images: string[];
};

/** Galería vacía: el contenido se gestiona desde Admin → Gallery. */
export const gallerySections: GallerySection[] = [];
