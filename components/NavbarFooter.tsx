"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShoppingCart } from "lucide-react";

interface NavbarProps {
  logoUrl?: string;
  cartItemsCount?: number;
  onCartClick?: () => void;
}

/**
 * Navbar estilo mockup - Fondo oscuro con blur
 */
export function NavbarMockup({
  logoUrl = "/assets/logo.png",
  cartItemsCount = 0,
  onCartClick,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "HOME" },
    { href: "#music", label: "MUSIC" },
    { href: "#events", label: "EVENT INFO" },
    { href: "#tickets", label: "TICKETS" },
  ];

  return (
    <nav className="regia-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <Image
              src={logoUrl}
              alt="Rico o Muerto"
              width={100}
              height={50}
              className="h-10 md:h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="regia-nav-link"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart Button */}
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="relative text-regia-cream hover:text-regia-gold-bright transition-colors p-2"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-regia-gold-bright text-regia-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            )}

            {/* Buy Tickets Button */}
            <Link href="#tickets">
              <button className="regia-btn-primary text-sm px-6 py-2.5">
                BUY TICKETS
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-regia-cream hover:text-regia-gold-bright transition-colors p-2"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-regia-gold-old/20 bg-regia-black/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-regia-cream hover:text-regia-gold-bright font-medium uppercase text-sm tracking-wider py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Cart & Buy Tickets */}
            <div className="pt-4 border-t border-regia-gold-old/20 space-y-3">
              {onCartClick && (
                <button
                  onClick={() => {
                    onCartClick();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full text-regia-cream hover:text-regia-gold-bright transition-colors py-2"
                >
                  <span className="font-medium uppercase text-sm tracking-wider">CART</span>
                  {cartItemsCount > 0 && (
                    <span className="bg-regia-gold-bright text-regia-black text-xs font-bold rounded-full px-2 py-1">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              )}
              
              <Link href="#tickets">
                <button
                  className="regia-btn-primary w-full text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  BUY TICKETS
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/**
 * Footer estilo mockup - Oscuro con información organizada
 */
interface FooterProps {
  logoUrl?: string;
}

export function FooterMockup({
  logoUrl = "/assets/logo.png",
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    about: {
      title: "Sobre Nosotros",
      content: "Grupo Regia es tu plataforma de confianza para eventos en vivo. Ofrecemos una experiencia única de compra de boletos.",
    },
    quickLinks: [
      { label: "Eventos", href: "#eventos" },
      { label: "Nosotros", href: "#nosotros" },
      { label: "Contacto", href: "#contacto" },
      { label: "Términos y Condiciones", href: "#terminos" },
      { label: "Política de Privacidad", href: "#privacidad" },
    ],
    contact: {
      title: "Contacto",
      email: "contacto@grupoRegia.com",
      phone: "+52 (81) 1234-5678",
      hours: "Lunes a Viernes: 9:00 AM - 8:00 PM",
    },
  };

  return (
    <footer className="regia-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Logo & About */}
          <div className="lg:col-span-2">
            <Image
              src={logoUrl}
              alt="Rico o Muerto"
              width={120}
              height={60}
              className="mb-6 opacity-90"
            />
            <p className="regia-text-body text-sm leading-relaxed max-w-md">
              {footerSections.about.content}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="regia-title-secondary text-lg mb-4">
              Enlaces Rápidos
            </h4>
            <ul className="space-y-2">
              {footerSections.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="regia-title-secondary text-lg mb-4">
              {footerSections.contact.title}
            </h4>
            <ul className="space-y-3 regia-text-body text-sm">
              <li>
                <a
                  href={`mailto:${footerSections.contact.email}`}
                  className="hover:text-regia-gold-bright transition-colors"
                >
                  {footerSections.contact.email}
                </a>
              </li>
              <li>{footerSections.contact.phone}</li>
              <li className="text-xs opacity-80">
                {footerSections.contact.hours}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-regia-gold-old/20 pt-8 pb-6">
          <div className="flex flex-col items-center gap-4">
            {/* Copyright */}
            <p className="regia-footer-text text-center">
              © {currentYear} Grupo Regia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Layout completo con Navbar y Footer
 */
interface LayoutMockupProps {
  children: React.ReactNode;
  cartItemsCount?: number;
  onCartClick?: () => void;
}

export function LayoutMockup({
  children,
  cartItemsCount,
  onCartClick,
}: LayoutMockupProps) {
  return (
    <div className="min-h-screen flex flex-col regia-bg-textured">
      <NavbarMockup
        cartItemsCount={cartItemsCount}
        onCartClick={onCartClick}
      />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <FooterMockup />
    </div>
  );
}
