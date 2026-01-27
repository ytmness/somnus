import type { Metadata } from "next";
import { Archivo, Anton, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

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

export const metadata: Metadata = {
  title: "Boletera Regia - Grupo Regia",
  description: "Sistema de venta de boletos para eventos de Grupo Regia",
  keywords: ["boletos", "eventos", "conciertos", "Grupo Regia", "Rico o Muerto"],
  authors: [{ name: "Grupo Regia" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    title: "Boletera Regia - Grupo Regia",
    description: "Sistema de venta de boletos para eventos de Grupo Regia",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${anton.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <body className={`${archivo.className} antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
