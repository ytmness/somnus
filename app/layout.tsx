import type { Metadata, Viewport } from "next";
import { Archivo, Anton, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { NativeShell } from "@/components/native/NativeShell";
import { SOMNUS_LOGO_PATH, SOMNUS_OG_IMAGE_PATH } from "@/lib/brand";
import { getAppUrl } from "@/lib/payments/config";

// Fuente principal para texto (según mockup)
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

// Fuente para títulos impactantes (alternativa a Druk Wide)
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

// Fuente gótica/vintage para hero dramático
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Necesario para que env(safe-area-inset-*) devuelva valores reales
  // bajo el notch y la home indicator dentro de la app iOS.
  viewportFit: "cover",
  themeColor: "#5B8DEF",
};

const siteUrl = getAppUrl().startsWith("http")
  ? getAppUrl()
  : "https://somnus.live";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Somnus",
    template: "%s | Somnus",
  },
  description: "Boletos y eventos Somnus — compra entradas en línea.",
  keywords: ["boletos", "eventos", "Somnus", "tickets"],
  authors: [{ name: "Somnus" }],
  manifest: "/manifest.json",
  themeColor: "#5B8DEF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Somnus",
  },
  openGraph: {
    title: "Somnus",
    description: "Boletos y eventos Somnus — compra entradas en línea.",
    type: "website",
    siteName: "Somnus",
    locale: "es_MX",
    url: "/",
    images: [
      {
        url: SOMNUS_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Somnus — eventos y boletos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Somnus",
    description: "Boletos y eventos Somnus — compra entradas en línea.",
    images: [SOMNUS_OG_IMAGE_PATH],
  },
  icons: {
    icon: SOMNUS_LOGO_PATH,
    apple: SOMNUS_LOGO_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${anton.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <body className={`${archivo.className} antialiased`}>
        <Providers>
          <NativeShell />
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

