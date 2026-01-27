"use client";

import Image from "next/image";
import { useState } from "react";

interface HeroExampleProps {
  artist: string;
  date: string;
  venue: string;
  imageUrl: string;
  logoUrl?: string;
  onBuyTickets?: () => void;
}

/**
 * Hero Section estilo mockup de Boletera Regia
 * Basado en el diseño de Victor Mendium
 */
export function HeroExample({
  artist,
  date,
  venue,
  imageUrl,
  logoUrl,
  onBuyTickets,
}: HeroExampleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section className="regia-hero">
      {/* Imagen de fondo del artista */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageUrl}
          alt={artist}
          fill
          className={`object-cover transition-opacity duration-700 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          priority
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Overlay oscuro */}
      <div className="regia-hero-overlay" />

      {/* Contenido principal */}
      <div className="regia-hero-content max-w-5xl mx-auto">
        {/* Nombre del artista - Título principal */}
        <h1 className="regia-hero-artist mb-6">
          {artist}
        </h1>

        {/* Subtítulo - Fecha */}
        <p className="regia-hero-subtitle mb-3">
          {date}
        </p>

        {/* Venue / Ubicación */}
        <p className="text-regia-cream text-lg md:text-xl mb-8 font-light tracking-wide">
          Location: {venue}
        </p>

        {/* Botón de compra */}
        <button
          onClick={onBuyTickets}
          className="regia-btn-primary text-lg"
        >
          Buy Tickets
        </button>

        {/* Logo (opcional, como "Somnus" en el mockup) */}
        {logoUrl && (
          <div className="mt-12 flex justify-center">
            <Image
              src={logoUrl}
              alt="Event Logo"
              width={120}
              height={60}
              className="opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>

      {/* Decoración de luces estilo mockup (opcional) */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/50 to-transparent z-[1] pointer-events-none" />
    </section>
  );
}

/**
 * Sección "About the Artist" estilo mockup
 */
interface AboutArtistProps {
  title?: string;
  description: string;
  artistImage: string;
  logoUrl?: string;
}

export function AboutArtistSection({
  title = "ABOUT THE ARTIST",
  description,
  artistImage,
  logoUrl,
}: AboutArtistProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Imagen del artista */}
        <div className="order-2 lg:order-1">
          <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-regia-gold-old/30 shadow-2xl">
            <Image
              src={artistImage}
              alt="Artist"
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
            
            {/* Overlay con logo en la imagen */}
            {logoUrl && (
              <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-sm px-4 py-3 rounded-lg">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={80}
                  height={40}
                  className="opacity-90"
                />
              </div>
            )}
          </div>
        </div>

        {/* Información */}
        <div className="order-1 lg:order-2">
          <h2 className="text-4xl md:text-6xl mb-8 regia-title-main">
            {title}
          </h2>
          
          <div className="space-y-4 regia-text-body text-base md:text-lg leading-relaxed">
            {description.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Decoración dorada */}
          <div className="mt-8 w-24 h-1 bg-gradient-to-r from-regia-gold-old to-regia-gold-bright rounded-full" />
        </div>
      </div>
    </section>
  );
}

/**
 * Tarjetas de tipos de boletos estilo mockup
 */
interface TicketTypeCardProps {
  title: string;
  description: string;
  onSelect: () => void;
  highlighted?: boolean;
}

export function TicketTypeCard({
  title,
  description,
  onSelect,
  highlighted = false,
}: TicketTypeCardProps) {
  return (
    <div className={`regia-ticket-card ${highlighted ? 'ring-2 ring-regia-gold-bright' : ''}`}>
      <h3 className="regia-title-secondary text-2xl md:text-3xl mb-4 uppercase tracking-wide">
        {title}
      </h3>
      
      <p className="regia-text-body text-sm md:text-base mb-6 leading-relaxed">
        {description}
      </p>
      
      <button
        onClick={onSelect}
        className="regia-btn-primary w-full"
      >
        SELECT
      </button>
    </div>
  );
}

/**
 * Sección de tipos de boletos con diseño de grid
 */
interface TicketTiersProps {
  ticketTypes: Array<{
    id: string;
    name: string;
    description: string;
    highlighted?: boolean;
  }>;
  onSelectTicket: (ticketId: string) => void;
}

export function TicketTiersSection({
  ticketTypes,
  onSelectTicket,
}: TicketTiersProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl md:text-5xl mb-12 text-center regia-title-main">
        TICKET TIERS
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ticketTypes.map((ticket) => (
          <TicketTypeCard
            key={ticket.id}
            title={ticket.name}
            description={ticket.description}
            highlighted={ticket.highlighted}
            onSelect={() => onSelectTicket(ticket.id)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Ejemplo de uso completo
 */
export function EventPageExample() {
  const handleBuyTickets = () => {
    console.log("Redirigiendo a compra de boletos...");
  };

  const handleSelectTicket = (ticketId: string) => {
    console.log("Ticket seleccionado:", ticketId);
  };

  return (
    <div className="regia-bg-textured min-h-screen">
      {/* Hero Section */}
      <HeroExample
        artist="VICTOR MENDIUM"
        date="SATURDAY MAY 20TH, 2026"
        venue="THE TEMPLE STAGE, MEXICO CITY"
        imageUrl="/path-to-artist-image.jpg"
        logoUrl="/assets/logo.png"
        onBuyTickets={handleBuyTickets}
      />

      {/* About the Artist */}
      <AboutArtistSection
        description="Universo visual oscuro, pesado, pesado pesado y cinemático, cafein, confratatsts and comitate la, cad ciromstad texturas sucia, canceriices lar niagua ad and autios tea qura nted atmosfera casi ritual."
        artistImage="/path-to-artist-photo.jpg"
        logoUrl="/assets/logo.png"
      />

      {/* Ticket Tiers */}
      <TicketTiersSection
        ticketTypes={[
          {
            id: "1",
            name: "ULTRA LOUNGE",
            description: "Lorem Bpsum pretace lanstque ranciobannaseicic earorace maagos diosisoc",
            highlighted: true,
          },
          {
            id: "2",
            name: "VIP LOOKBOX",
            description: "Lorem Rpdpoa tinced elit ala occinnoncle ariet doetroisos adjarga euserers",
          },
          {
            id: "3",
            name: "GENERAL ADMISSION",
            description: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod",
          },
        ]}
        onSelectTicket={handleSelectTicket}
      />
    </div>
  );
}

