"use client";

import Image from "next/image";

const BRAND_LOGOS = [
  "/assets/logos%20marcas%20pagina%20web-1.png",
  "/assets/logos%20marcas%20pagina%20web-2.png",
  "/assets/logos%20marcas%20pagina%20web-3.png",
  "/assets/logos%20marcas%20pagina%20web-4.png",
  "/assets/logos%20marcas%20pagina%20web-5.png",
  "/assets/logos%20marcas%20pagina%20web-6.png",
  "/assets/logos%20marcas%20pagina%20web-7.png",
  "/assets/logos%20marcas%20pagina%20web-8.png",
  "/assets/logos%20marcas%20pagina%20web-9.png",
];

export function BrandPresenceCarousel() {
  return (
    <section className="py-16 sm:py-24 border-t border-white/10 overflow-hidden bg-[#0a0a0a]">
      <h2 className="somnus-title-secondary text-center text-2xl sm:text-3xl md:text-4xl mb-12 uppercase tracking-widest font-bold">
        Brand Presence
      </h2>
      <div className="relative">
        <div className="flex brand-scroll-animate">
          {/* Primera ronda */}
          {BRAND_LOGOS.map((src, i) => (
            <div
              key={`a-${i}`}
              className="flex-shrink-0 mx-6 sm:mx-10 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex items-center justify-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={src}
                alt={`Partner ${i + 1}`}
                width={160}
                height={160}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>
          ))}
          {/* Duplicado para loop infinito */}
          {BRAND_LOGOS.map((src, i) => (
            <div
              key={`b-${i}`}
              className="flex-shrink-0 mx-6 sm:mx-10 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex items-center justify-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={src}
                alt={`Partner ${i + 1}`}
                width={160}
                height={160}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
