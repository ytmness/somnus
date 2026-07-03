// Eventos estáticos que corresponden a las 3 secciones de la galería
// Se muestran cuando no hay eventos activos desde la API

const PANORAMA_BASE = "/assets/panorama-photo-download-1of1%20(1)";
const SOMNUS1_BASE = "/assets/somnus-1-photo-download-1of1/Highlights";
const SOMNUS2_BASE = "/assets/somnus-photo-download-1of1/Highlights";

export type GalleryEvent = {
  id: string;
  artist: string;
  date: string;
  venue: string;
  image: string;
  galleryUrl: string;
};

export const GALLERY_EVENTS: GalleryEvent[] = [
  {
    id: "panorama",
    artist: "Panorama Somnus Nights",
    date: "Past edition",
    venue: "Monterrey",
    image: `${PANORAMA_BASE}/CINEMA_pics/Secuencia01.00_00_20_54.Imagenfija005.jpg`,
    galleryUrl: "/galeria?section=panorama",
  },
  {
    id: "somnus-1",
    artist: "Somnus 1",
    date: "Past edition",
    venue: "Monterrey",
    image: `${SOMNUS1_BASE}/ROM00002.jpg`,
    galleryUrl: "/galeria?section=somnus-1",
  },
  {
    id: "somnus-2",
    artist: "Somnus 2",
    date: "Past edition",
    venue: "Monterrey",
    image: `${SOMNUS2_BASE}/ROM00002.jpg`,
    galleryUrl: "/galeria?section=somnus-2",
  },
];
