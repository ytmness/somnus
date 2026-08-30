import type { Metadata, Viewport } from "next";
import { Archivo, Anton, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { NativeShell } from "@/components/native/NativeShell";

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

export const metadata: Metadata = {
  title: "Somnus Ticket Platform",
  description: "Ticket sales platform for Somnus events",
  keywords: ["tickets", "events", "concerts", "Somnus"],
  authors: [{ name: "Somnus" }],
  manifest: "/manifest.json",
  themeColor: "#5B8DEF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Somnus",
  },
  openGraph: {
    title: "Somnus Ticket Platform",
    description: "Ticket sales platform for Somnus events",
    type: "website",
  },
  icons: {
    icon: "/assets/logo.png",
    apple: "/assets/logo.png",
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

