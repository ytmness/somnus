export type GalleryEvent = {
  id: string;
  artist: string;
  date: string;
  venue: string;
  image: string;
  galleryUrl: string;
};

/** Sin eventos placeholder de galería en el carrusel de la home. */
export const GALLERY_EVENTS: GalleryEvent[] = [];
