// Rutas base en public (sin /assets porque usamos /assets/ en el src)
const PANORAMA_BASE = "/assets/panorama-photo-download-1of1%20(1)";
const SOMNUS1_BASE = "/assets/somnus-1-photo-download-1of1/Highlights";
const SOMNUS2_BASE = "/assets/somnus-photo-download-1of1/Highlights";

const panoramaCinema = [
  "Secuencia01.00_00_20_54.Imagenfija005.jpg",
  "Secuencia01.00_00_22_42.Imagenfija003.jpg",
  "Secuencia01.00_00_26_38.Imagenfija006.jpg",
  "Secuencia01.00_00_28_36.Imagenfija007.jpg",
  "Secuencia01.00_00_31_10.Imagenfija008.jpg",
  "Secuencia01.00_00_39_27.Imagenfija009.jpg",
  "Secuencia01.00_00_55_49.Imagenfija011.jpg",
  "Secuencia01.00_01_00_09.Imagenfija004.jpg",
  "Secuencia01.00_01_07_43.Imagenfija012.jpg",
  "Secuencia01.00_01_29_13.Imagenfija014.jpg",
  "Secuencia01.00_01_36_11.Imagenfija015.jpg",
  "Secuencia01.00_01_44_13.Imagenfija016.jpg",
  "Secuencia01.00_01_53_32.Imagenfija017.jpg",
  "Secuencia01.00_01_56_49.Imagenfija018.jpg",
  "Secuencia01.00_05_41_23.Imagenfija025.jpg",
  "Secuencia01.00_05_42_10.Imagenfija027.jpg",
  "Secuencia01.00_05_46_15.Imagenfija028.jpg",
  "Secuencia01.00_05_51_01.Imagenfija024.jpg",
  "Secuencia01.00_06_03_14.Imagenfija029.jpg",
  "Secuencia01.00_06_04_22.Imagenfija026.jpg",
  "Secuencia01.00_06_14_19.Imagenfija030.jpg",
];

const panoramaHighlights = [
  "DSC00109.jpg", "DSC00122-Enhanced-NR.jpg", "DSC00123.jpg", "DSC00126.jpg",
  "DSC00129.jpg", "DSC00133.jpg", "DSC00141.jpg", "DSC00147.jpg", "DSC00152.jpg",
  "DSC00155.jpg", "DSC00158.jpg", "DSC00160.jpg", "DSC00166.jpg", "DSC00167.jpg",
  "DSC00170.jpg", "DSC00176.jpg", "DSC00179.jpg", "DSC00180.jpg", "DSC00181.jpg",
  "DSC00182.jpg", "DSC00183.jpg", "DSC00184.jpg", "DSC00186.jpg", "DSC00191.jpg",
  "DSC00192.jpg", "DSC00194.jpg",
];

const somnus1Highlights = [
  "ROM00002.jpg", "ROM00003.jpg", "ROM00005.jpg", "ROM00008.jpg", "ROM00010.jpg",
  "ROM00011.jpg", "ROM00017.jpg", "ROM00020.jpg", "ROM00025.jpg", "ROM00029.jpg",
  "ROM00033.jpg", "ROM00036.jpg", "ROM00037.jpg", "ROM00038.jpg", "ROM00039.jpg",
  "ROM00041.jpg", "ROM00043.jpg", "ROM00044.jpg", "ROM00045.jpg", "ROM00046.jpg",
  "ROM00048.jpg", "ROM00050.jpg", "ROM00052.jpg", "ROM00054.jpg", "ROM00055.jpg",
  "ROM00059.jpg", "ROM00060.jpg", "ROM00061.jpg", "ROM00063.jpg", "ROM00065.jpg",
  "ROM00066.jpg", "ROM00068.jpg", "ROM00070.jpg", "ROM00071.jpg", "ROM00074.jpg",
  "ROM00076.jpg", "ROM00077.jpg", "ROM00082.jpg", "ROM00083.jpg", "ROM00084.jpg",
  "ROM00086.jpg", "ROM00087.jpg", "ROM00090.jpg", "ROM00093.jpg", "ROM00094.jpg",
  "ROM00098.jpg", "ROM00103.jpg", "ROM00105.jpg", "ROM00106.jpg", "ROM00108.jpg",
  "ROM00109.jpg", "ROM00112.jpg", "ROM00119.jpg", "ROM00122.jpg", "ROM00125.jpg",
  "ROM00126.jpg", "ROM00127.jpg", "ROM00128.jpg", "ROM00129.jpg", "ROM00132.jpg",
  "ROM00133.jpg", "ROM00134.jpg", "ROM00135.jpg", "ROM00149.jpg", "ROM00153.jpg",
  "ROM00154.jpg", "ROM00155.jpg", "ROM00156.jpg", "ROM00159.jpg", "ROM00160.jpg",
  "ROM00162.jpg", "ROM00163.jpg", "ROM00165.jpg", "ROM00168.jpg", "ROM00169.jpg",
  "ROM00170.jpg", "ROM00171.jpg", "ROM00172.jpg", "ROM00173.jpg", "ROM00174.jpg",
  "ROM00181.jpg", "ROM00182.jpg", "ROM00188.jpg", "ROM00196.jpg", "ROM00201.jpg",
  "ROM00202.jpg", "ROM00204.jpg", "ROM00208.jpg", "ROM00209.jpg", "ROM00217.jpg",
  "ROM00219.jpg", "ROM00224.jpg", "ROM00228.jpg", "ROM00233.jpg", "ROM00236.jpg",
  "ROM00239.jpg", "ROM00252.jpg", "ROM00257.jpg", "ROM00260.jpg", "ROM00263.jpg",
  "ROM00268.jpg", "ROM00274.jpg", "ROM00280.jpg", "ROM00284.jpg", "ROM00290.jpg",
  "ROM00292.jpg", "ROM00303.jpg", "ROM00307.jpg", "ROM00308.jpg", "ROM00309.jpg",
];

const somnus2Highlights = [
  "ROM00002.jpg", "ROM00007.jpg", "ROM00010.jpg", "ROM00011.jpg", "ROM00012.jpg",
  "ROM00013.jpg", "ROM00014.jpg", "ROM00015.jpg", "ROM00016.jpg", "ROM00019.jpg",
  "ROM00021.jpg", "ROM00023.jpg", "ROM00024.jpg", "ROM00025.jpg", "ROM00026.jpg",
  "ROM00027.jpg", "ROM00030.jpg", "ROM00031.jpg", "ROM00033.jpg", "ROM00035.jpg",
  "ROM00038.jpg", "ROM00039.jpg", "ROM00040.jpg", "ROM00041.jpg", "ROM00042.jpg",
  "ROM00043.jpg", "ROM00045.jpg", "ROM00046.jpg", "ROM00048.jpg", "ROM00049.jpg",
  "ROM00052.jpg", "ROM00054.jpg", "ROM00055.jpg", "ROM00056.jpg", "ROM00059.jpg",
  "ROM00063.jpg", "ROM00064.jpg", "ROM00066.jpg", "ROM00068.jpg", "ROM00070.jpg",
  "ROM00071.jpg", "ROM00072.jpg", "ROM00073.jpg", "ROM00076.jpg", "ROM00081.jpg",
  "ROM00083.jpg", "ROM00088.jpg", "ROM00095.jpg", "ROM00096.jpg", "ROM00097.jpg",
  "ROM00098.jpg", "ROM00099.jpg", "ROM00101.jpg", "ROM00103.jpg", "ROM00106.jpg",
  "ROM00114.jpg", "ROM00117.jpg", "ROM00119.jpg", "ROM00122.jpg", "ROM00123.jpg",
  "ROM00124.jpg", "ROM00125.jpg", "ROM00130.jpg", "ROM00131.jpg", "ROM00132.jpg",
  "ROM00134.jpg", "ROM00136.jpg", "ROM00138.jpg", "ROM00140.jpg", "ROM00141.jpg",
  "ROM00144.jpg", "ROM00145.jpg", "ROM00146.jpg", "ROM00148.jpg", "ROM00149.jpg",
  "ROM00150.jpg", "ROM00151.jpg", "ROM00155.jpg", "ROM00166.jpg", "ROM00167.jpg",
  "ROM00170.jpg", "ROM00171.jpg", "ROM00172.jpg", "ROM00174.jpg", "ROM00176.jpg",
  "ROM00179.jpg", "ROM00182.jpg", "ROM00183.jpg", "ROM00184.jpg", "ROM00191.jpg",
  "ROM00192.jpg", "ROM00193.jpg", "ROM00197.jpg", "ROM00199.jpg", "ROM00201.jpg",
  "ROM00206.jpg", "ROM00207.jpg", "ROM00216.jpg", "ROM00219.jpg", "ROM00221.jpg",
  "ROM00225.jpg", "ROM00226.jpg", "ROM00230.jpg", "ROM00239.jpg", "ROM00240.jpg",
  "ROM00243.jpg", "ROM00245.jpg", "ROM00247.jpg", "ROM00248.jpg", "ROM00249.jpg",
  "ROM00251.jpg", "ROM00252.jpg", "ROM00256.jpg", "ROM00258.jpg", "ROM00259.jpg",
  "ROM00260.jpg", "ROM00264.jpg", "ROM00271.jpg", "ROM00276.jpg", "ROM00278.jpg",
  "ROM00280.jpg", "ROM00282.jpg", "ROM00290.jpg", "ROM00303.jpg", "ROM00304.jpg",
  "ROM00305.jpg", "ROM00309.jpg", "ROM00310.jpg", "ROM00315.jpg", "ROM00316.jpg",
];

export type GallerySection = {
  id: string;
  title: string;
  images: string[];
};

function buildPanoramaImages(): string[] {
  const cinema = panoramaCinema.map((f) => `${PANORAMA_BASE}/CINEMA_pics/${f}`);
  const highlights = panoramaHighlights.map((f) => `${PANORAMA_BASE}/Highlights/${f}`);
  return [...cinema, ...highlights];
}

export const gallerySections: GallerySection[] = [
  {
    id: "panorama",
    title: "Panorama",
    images: buildPanoramaImages(),
  },
  {
    id: "somnus-1",
    title: "Somnus 1",
    images: somnus1Highlights.map((f) => `${SOMNUS1_BASE}/${f}`),
  },
  {
    id: "somnus-2",
    title: "Somnus 2",
    images: somnus2Highlights.map((f) => `${SOMNUS2_BASE}/${f}`),
  },
];
