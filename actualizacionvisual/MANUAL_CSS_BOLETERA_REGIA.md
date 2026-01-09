# Manual de CSS - Boletera Regia
## Basado en el mockup y guía de estilo de Victoria Ramos Pérez

---

## 📋 Tabla de Contenidos
1. [Paleta de Colores](#paleta-de-colores)
2. [Tipografías](#tipografías)
3. [Componentes Base](#componentes-base)
4. [Actualización del Proyecto](#actualización-del-proyecto)
5. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🎨 Paleta de Colores

### Colores Principales del Mockup

```css
/* Colores base del diseño */
:root {
  /* Negro Profundo - Fondo principal */
  --regia-black: #0A0A0A;
  
  /* Dorado Antiguo - Botones, detalles y jerarquía alta */
  --regia-gold-old: #C5A059;
  
  /* Blanco Crudo - Títulos secundarios y textos */
  --regia-cream: #E0E0E0;
  
  /* Gris Metálico - Tarjetas de boletos y bordes sutiles */
  --regia-metallic-gray: #2D2D2D;
  
  /* Brillo de Oro - Efectos glow y hover de botones */
  --regia-gold-bright: #F4D03F;
  
  /* Colores legacy (mantener para compatibilidad) */
  --regia-gold: #c4a905;
  --regia-dark: #2a2c30;
  --regia-gray: #49484e;
}
```

### Conversión a Tailwind

Actualizar `tailwind.config.ts`:

```typescript
colors: {
  regia: {
    // Nuevos colores principales
    black: "#0A0A0A",           // Negro Profundo
    'gold-old': "#C5A059",      // Dorado Antiguo
    cream: "#E0E0E0",           // Blanco Crudo
    'metallic-gray': "#2D2D2D", // Gris Metálico
    'gold-bright': "#F4D03F",   // Brillo de Oro
    
    // Colores legacy (mantener)
    gold: "#c4a905",
    dark: "#2a2c30",
    gray: "#49484e",
  },
}
```

---

## 📝 Tipografías

### Fuentes del Mockup

Según el mockup, se utilizan dos fuentes principales:

1. **Druk Wide** - Para títulos principales (nombres de artistas, encabezados de gran impacto)
2. **Archivo** - Para títulos secundarios y texto general

### Implementación

**1. Instalar las fuentes en `app/layout.tsx`:**

```typescript
import { Archivo } from 'next/font/google';
// Nota: Druk Wide no está en Google Fonts, usar una alternativa similar

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
});

// Alternativa para Druk Wide: usar una fuente bold y condensada
// Opciones: Anton, Bebas Neue, Oswald (extra bold)
import { Anton } from 'next/font/google';

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
});
```

**2. Actualizar Tailwind config:**

```typescript
fontFamily: {
  sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
  display: ['var(--font-anton)', 'Arial Black', 'sans-serif'], // Para títulos impactantes
},
```

**3. Clases CSS para tipografía:**

```css
/* Títulos principales estilo mockup */
.regia-title-main {
  font-family: var(--font-anton), Arial Black, sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--regia-gold-bright);
}

/* Títulos secundarios */
.regia-title-secondary {
  font-family: var(--font-archivo), sans-serif;
  font-weight: 600;
  color: var(--regia-cream);
}

/* Texto de lectura */
.regia-text-body {
  font-family: var(--font-archivo), sans-serif;
  font-weight: 400;
  color: var(--regia-cream);
  line-height: 1.6;
}
```

---

## 🧩 Componentes Base

### 1. Fondos y Backgrounds

```css
/* Fondo principal oscuro */
.regia-bg-main {
  background-color: var(--regia-black);
}

/* Fondo con textura (similar al mockup) */
.regia-bg-textured {
  background-color: var(--regia-black);
  background-image: 
    radial-gradient(at 20% 30%, rgba(197, 160, 89, 0.05) 0px, transparent 50%),
    radial-gradient(at 80% 70%, rgba(244, 208, 63, 0.05) 0px, transparent 50%);
}

/* Gradiente dorado sutil */
.regia-gold-gradient {
  background: linear-gradient(135deg, 
    var(--regia-gold-old) 0%, 
    var(--regia-gold-bright) 100%);
}
```

### 2. Botones

```css
/* Botón principal dorado (estilo mockup) */
.regia-btn-primary {
  background: linear-gradient(135deg, #C5A059 0%, #F4D03F 100%);
  color: var(--regia-black);
  font-weight: 700;
  font-family: var(--font-archivo), sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.875rem 2rem;
  border-radius: 9999px; /* Completamente redondeado */
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(244, 208, 63, 0.3);
}

.regia-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(244, 208, 63, 0.5);
  filter: brightness(1.1);
}

/* Botón secundario con borde */
.regia-btn-secondary {
  background: transparent;
  color: var(--regia-gold-old);
  font-weight: 600;
  font-family: var(--font-archivo), sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.875rem 2rem;
  border-radius: 9999px;
  border: 2px solid var(--regia-gold-old);
  transition: all 0.3s ease;
}

.regia-btn-secondary:hover {
  background: var(--regia-gold-old);
  color: var(--regia-black);
  border-color: var(--regia-gold-bright);
  box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3);
}
```

### 3. Cards / Tarjetas de Boletos

```css
/* Tarjeta estilo mockup */
.regia-ticket-card {
  background: var(--regia-metallic-gray);
  border: 1px solid var(--regia-gold-old);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.regia-ticket-card:hover {
  border-color: var(--regia-gold-bright);
  box-shadow: 0 8px 30px rgba(197, 160, 89, 0.2);
  transform: translateY(-4px);
}

/* Card con efecto glow dorado */
.regia-card-glow {
  position: relative;
  background: var(--regia-metallic-gray);
  border: 1px solid var(--regia-gold-old);
  border-radius: 1rem;
  overflow: hidden;
}

.regia-card-glow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(244, 208, 63, 0.1) 0%, 
    transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.regia-card-glow:hover::before {
  opacity: 1;
}
```

### 4. Navbar (según mockup)

```css
/* Navbar oscuro con blur */
.regia-navbar {
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(197, 160, 89, 0.2);
  position: sticky;
  top: 0;
  z-index: 50;
}

/* Links del navbar */
.regia-nav-link {
  color: var(--regia-cream);
  font-family: var(--font-archivo), sans-serif;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
  transition: color 0.3s ease;
  position: relative;
}

.regia-nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--regia-gold-bright);
  transition: width 0.3s ease;
}

.regia-nav-link:hover {
  color: var(--regia-gold-bright);
}

.regia-nav-link:hover::after {
  width: 80%;
}
```

### 5. Footer (según mockup)

```css
/* Footer oscuro */
.regia-footer {
  background: var(--regia-metallic-gray);
  border-top: 1px solid rgba(197, 160, 89, 0.2);
  padding: 2rem 0;
}

.regia-footer-text {
  color: rgba(224, 224, 224, 0.6);
  font-family: var(--font-archivo), sans-serif;
  font-size: 0.875rem;
  text-align: center;
}
```

### 6. Hero Section (Sección Principal)

```css
/* Hero con imagen de fondo y overlay */
.regia-hero {
  position: relative;
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--regia-black);
}

/* Overlay oscuro sobre la imagen */
.regia-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 10, 0.3) 0%,
    rgba(10, 10, 10, 0.85) 100%
  );
  z-index: 1;
}

/* Contenido del hero */
.regia-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 2rem;
}

/* Título del artista en hero */
.regia-hero-artist {
  font-family: var(--font-anton), Arial Black, sans-serif;
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 900;
  text-transform: uppercase;
  background: linear-gradient(135deg, 
    var(--regia-gold-bright) 0%, 
    var(--regia-gold-old) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.02em;
  line-height: 1;
  margin-bottom: 1rem;
  text-shadow: 0 0 40px rgba(244, 208, 63, 0.5);
}

/* Subtítulo del hero */
.regia-hero-subtitle {
  font-family: var(--font-archivo), sans-serif;
  font-size: clamp(1rem, 2vw, 1.5rem);
  font-weight: 400;
  color: var(--regia-cream);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}
```

---

## 🔄 Actualización del Proyecto

### Paso 1: Actualizar `globals.css`

Agregar al archivo `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* === NUEVA PALETA BOLETERA REGIA === */
    /* Colores principales del mockup */
    --regia-black: #0A0A0A;
    --regia-gold-old: #C5A059;
    --regia-cream: #E0E0E0;
    --regia-metallic-gray: #2D2D2D;
    --regia-gold-bright: #F4D03F;
    
    /* Colores legacy (mantener compatibilidad) */
    --regia-gold: #c4a905;
    --regia-dark: #2a2c30;
    --regia-gray: #49484e;
    
    /* Variables de fuentes */
    --font-archivo: 'Archivo', system-ui, sans-serif;
    --font-anton: 'Anton', Arial Black, sans-serif;
  }
}

/* === COMPONENTES PERSONALIZADOS === */

@layer components {
  /* FONDOS */
  .regia-bg-main {
    @apply bg-[#0A0A0A];
  }
  
  .regia-bg-textured {
    background-color: #0A0A0A;
    background-image: 
      radial-gradient(at 20% 30%, rgba(197, 160, 89, 0.05) 0px, transparent 50%),
      radial-gradient(at 80% 70%, rgba(244, 208, 63, 0.05) 0px, transparent 50%);
  }
  
  /* BOTONES */
  .regia-btn-primary {
    @apply font-bold uppercase tracking-wider px-8 py-3.5 rounded-full;
    @apply transition-all duration-300 ease-in-out;
    background: linear-gradient(135deg, #C5A059 0%, #F4D03F 100%);
    color: #0A0A0A;
    box-shadow: 0 4px 15px rgba(244, 208, 63, 0.3);
  }
  
  .regia-btn-primary:hover {
    @apply -translate-y-0.5;
    box-shadow: 0 8px 25px rgba(244, 208, 63, 0.5);
    filter: brightness(1.1);
  }
  
  .regia-btn-secondary {
    @apply font-semibold uppercase tracking-wider px-8 py-3.5 rounded-full;
    @apply transition-all duration-300 ease-in-out;
    @apply bg-transparent text-[#C5A059] border-2 border-[#C5A059];
  }
  
  .regia-btn-secondary:hover {
    @apply bg-[#C5A059] text-[#0A0A0A] border-[#F4D03F];
    box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3);
  }
  
  /* TARJETAS */
  .regia-ticket-card {
    @apply bg-[#2D2D2D] border border-[#C5A059] rounded-2xl p-6;
    @apply transition-all duration-300 ease-in-out;
    backdrop-filter: blur(10px);
  }
  
  .regia-ticket-card:hover {
    @apply border-[#F4D03F] -translate-y-1;
    box-shadow: 0 8px 30px rgba(197, 160, 89, 0.2);
  }
  
  /* TIPOGRAFÍA */
  .regia-title-main {
    @apply font-bold uppercase tracking-tight text-[#F4D03F];
    font-family: var(--font-anton, Arial Black, sans-serif);
    text-shadow: 0 0 40px rgba(244, 208, 63, 0.5);
  }
  
  .regia-title-secondary {
    @apply font-semibold text-[#E0E0E0];
    font-family: var(--font-archivo, sans-serif);
  }
  
  .regia-text-body {
    @apply text-[#E0E0E0];
    font-family: var(--font-archivo, sans-serif);
    line-height: 1.6;
  }
  
  /* NAVBAR */
  .regia-navbar {
    @apply sticky top-0 z-50;
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(197, 160, 89, 0.2);
  }
  
  .regia-nav-link {
    @apply text-[#E0E0E0] font-medium uppercase text-sm tracking-wider px-4 py-2;
    @apply transition-colors duration-300 relative;
    font-family: var(--font-archivo, sans-serif);
  }
  
  .regia-nav-link::after {
    @apply absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#F4D03F];
    @apply transition-all duration-300;
    content: '';
  }
  
  .regia-nav-link:hover {
    @apply text-[#F4D03F];
  }
  
  .regia-nav-link:hover::after {
    @apply w-4/5;
  }
  
  /* FOOTER */
  .regia-footer {
    @apply bg-[#2D2D2D] border-t py-8;
    border-top-color: rgba(197, 160, 89, 0.2);
  }
  
  .regia-footer-text {
    @apply text-center text-sm;
    color: rgba(224, 224, 224, 0.6);
    font-family: var(--font-archivo, sans-serif);
  }
  
  /* HERO SECTION */
  .regia-hero {
    @apply relative min-h-[85vh] flex items-center justify-center overflow-hidden;
    @apply bg-[#0A0A0A];
  }
  
  .regia-hero-overlay {
    @apply absolute inset-0 z-[1];
    background: linear-gradient(
      180deg,
      rgba(10, 10, 10, 0.3) 0%,
      rgba(10, 10, 10, 0.85) 100%
    );
  }
  
  .regia-hero-content {
    @apply relative z-[2] text-center px-8;
  }
  
  .regia-hero-artist {
    @apply font-black uppercase leading-none mb-4;
    font-family: var(--font-anton, Arial Black, sans-serif);
    font-size: clamp(3rem, 10vw, 8rem);
    background: linear-gradient(135deg, #F4D03F 0%, #C5A059 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 0.02em;
    text-shadow: 0 0 40px rgba(244, 208, 63, 0.5);
  }
  
  .regia-hero-subtitle {
    @apply uppercase tracking-widest mb-2;
    font-family: var(--font-archivo, sans-serif);
    font-size: clamp(1rem, 2vw, 1.5rem);
    color: #E0E0E0;
  }
}

/* === UTILIDADES === */

@layer utilities {
  /* Efecto glow dorado */
  .glow-gold {
    box-shadow: 0 0 20px rgba(244, 208, 63, 0.4);
  }
  
  .glow-gold-strong {
    box-shadow: 0 0 40px rgba(244, 208, 63, 0.6);
  }
  
  /* Degradado de texto dorado */
  .text-gradient-gold {
    background: linear-gradient(135deg, #F4D03F 0%, #C5A059 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Backdrop blur personalizado */
  .backdrop-blur-regia {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
```

### Paso 2: Actualizar `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === NUEVA PALETA BOLETERA REGIA ===
        regia: {
          // Colores principales del mockup
          black: "#0A0A0A",           // Negro Profundo - Fondo principal
          'gold-old': "#C5A059",      // Dorado Antiguo - Botones, detalles
          cream: "#E0E0E0",           // Blanco Crudo - Textos
          'metallic-gray': "#2D2D2D", // Gris Metálico - Tarjetas
          'gold-bright': "#F4D03F",   // Brillo de Oro - Efectos glow/hover
          
          // Colores legacy (mantener compatibilidad)
          gold: "#c4a905",
          dark: "#2a2c30",
          gray: "#49484e",
        },
        
        // Mantener colores de shadcn/ui
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)', 'Arial Black', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### Paso 3: Actualizar `app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Archivo, Anton } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boletera Regia - Grupo Regia",
  description: "Sistema de venta de boletos para eventos de Grupo Regia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${anton.variable}`}>
      <body className={archivo.className}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Hero Section Estilo Mockup

```tsx
<section className="regia-hero">
  {/* Imagen de fondo */}
  <Image
    src="/path-to-event-image.jpg"
    alt="Event"
    fill
    className="object-cover"
  />
  
  {/* Overlay oscuro */}
  <div className="regia-hero-overlay" />
  
  {/* Contenido */}
  <div className="regia-hero-content">
    <h1 className="regia-hero-artist">
      VICTOR MENDIUM
    </h1>
    <p className="regia-hero-subtitle">
      Saturday May 20th, 2026
    </p>
    <p className="text-regia-cream text-lg mb-8">
      Location: The Temple Stage, Mexico City
    </p>
    <button className="regia-btn-primary">
      Buy Tickets
    </button>
  </div>
</section>
```

### Ejemplo 2: Tarjetas de Boletos

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Tarjeta VIP */}
  <div className="regia-ticket-card">
    <h3 className="regia-title-secondary text-2xl mb-2">
      ULTRA LOUNGE
    </h3>
    <p className="regia-text-body text-sm mb-4">
      Lorem ipsum dolor sit amet consectetur adipiscing elit...
    </p>
    <button className="regia-btn-primary w-full">
      SELECT
    </button>
  </div>
  
  {/* Tarjeta VIP Lookbox */}
  <div className="regia-ticket-card">
    <h3 className="regia-title-secondary text-2xl mb-2">
      VIP LOOKBOX
    </h3>
    <p className="regia-text-body text-sm mb-4">
      Lorem ipsum dolor sit amet consectetur...
    </p>
    <button className="regia-btn-primary w-full">
      SELECT
    </button>
  </div>
</div>
```

### Ejemplo 3: Navbar Actualizado

```tsx
<nav className="regia-navbar">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Image
          src="/logo-rico-muerto.png"
          alt="Rico o Muerto"
          width={80}
          height={40}
        />
      </div>
      
      {/* Links */}
      <div className="hidden md:flex items-center space-x-4">
        <a href="#home" className="regia-nav-link">Home</a>
        <a href="#music" className="regia-nav-link">Music</a>
        <a href="#events" className="regia-nav-link">Event Info</a>
        <a href="#tickets" className="regia-nav-link">Tickets</a>
        <button className="regia-btn-primary ml-4">
          Buy Tickets
        </button>
      </div>
    </div>
  </div>
</nav>
```

### Ejemplo 4: Footer Actualizado

```tsx
<footer className="regia-footer">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      {/* Columna 1 */}
      <div>
        <h4 className="regia-title-secondary text-lg mb-4">
          Sobre Nosotros
        </h4>
        <p className="regia-text-body text-sm">
          Grupo Regia es tu plataforma de confianza para eventos en vivo.
        </p>
      </div>
      
      {/* Columna 2 */}
      <div>
        <h4 className="regia-title-secondary text-lg mb-4">
          Enlaces Rápidos
        </h4>
        <ul className="space-y-2">
          <li>
            <a href="#" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
              Eventos
            </a>
          </li>
          <li>
            <a href="#" className="regia-text-body text-sm hover:text-regia-gold-bright transition-colors">
              Contacto
            </a>
          </li>
        </ul>
      </div>
      
      {/* Columna 3 */}
      <div>
        <h4 className="regia-title-secondary text-lg mb-4">
          Contacto
        </h4>
        <p className="regia-text-body text-sm">
          contacto@grupoRegia.com
        </p>
      </div>
    </div>
    
    {/* Copyright */}
    <div className="border-t border-regia-gold-old/20 pt-6">
      <p className="regia-footer-text">
        © 2025 Grupo Regia. Todos los derechos reservados.
      </p>
      <p className="regia-footer-text mt-2 text-xs">
        PRODUCTION BY: ECHO VISIONS
      </p>
    </div>
  </div>
</footer>
```

### Ejemplo 5: Sección "About the Artist"

```tsx
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    {/* Imagen del artista */}
    <div className="relative aspect-square rounded-2xl overflow-hidden">
      <Image
        src="/artist-photo.jpg"
        alt="Artist"
        fill
        className="object-cover"
      />
    </div>
    
    {/* Información */}
    <div>
      <h2 className="text-3xl md:text-5xl mb-6 regia-title-main">
        About the Artist
      </h2>
      <p className="regia-text-body mb-4">
        Universo visual oscuro, pesado, pesado pesado y cinemático, 
        cafein, confratatsts and comitate la, cad ciromstad texturas...
      </p>
      <div className="flex items-center gap-4 mt-8">
        <Image
          src="/logo-rico-muerto.png"
          alt="Rico o Muerto"
          width={100}
          height={50}
        />
      </div>
    </div>
  </div>
</section>
```

---

## 📦 Checklist de Migración

- [ ] Actualizar `tailwind.config.ts` con nuevos colores
- [ ] Actualizar `globals.css` con clases personalizadas
- [ ] Instalar y configurar fuentes (Archivo + Anton) en `layout.tsx`
- [ ] Actualizar Header/Navbar con nuevos estilos
- [ ] Actualizar Footer con nuevos estilos
- [ ] Actualizar Hero Section con estilo mockup
- [ ] Actualizar tarjetas de boletos con `regia-ticket-card`
- [ ] Actualizar botones con `regia-btn-primary` y `regia-btn-secondary`
- [ ] Revisar y ajustar colores de fondo (usar `regia-bg-main` o `regia-bg-textured`)
- [ ] Testear en diferentes tamaños de pantalla

---

## 🎯 Notas Importantes

1. **Compatibilidad**: Se mantienen los colores legacy (`regia-gold`, `regia-dark`, `regia-gray`) para no romper componentes existentes.

2. **Fuentes**: Anton es una alternativa gratuita a Druk Wide. Si tienes acceso a Druk Wide, reemplaza Anton en el `layout.tsx`.

3. **Responsividad**: Todos los componentes usan `clamp()` y breakpoints de Tailwind para ser responsive.

4. **Performance**: Las fuentes usan `display: swap` para mejorar la carga.

5. **Glow Effects**: Los efectos de brillo dorado están optimizados para no afectar el rendimiento.

6. **Gradientes**: Se usan degradados CSS nativos en lugar de imágenes para mejor performance.

---

## 🚀 Próximos Pasos

1. Implementar el sistema de diseño en componentes existentes
2. Crear componentes reutilizables para tarjetas de eventos
3. Optimizar imágenes con Next.js Image
4. Agregar animaciones sutiles con Framer Motion (opcional)
5. Testear accesibilidad (contraste de colores, ARIA labels)

---

**Creado por**: Sistema Boletera Regia  
**Basado en**: Guía de estilo de Victoria Ramos Pérez  
**Fecha**: Enero 2026  
**Versión**: 1.0
