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
          // Colores principales - Azul media noche
          black: "#0A0A0A",           // Negro Profundo - Fondo principal
          'gold-old': "#5B8DEF",      // Azul media noche - Botones, detalles
          cream: "#E0E0E0",           // Blanco Crudo - Textos
          'metallic-gray': "#2D2D2D", // Gris Metálico - Tarjetas
          'gold-bright': "#7BA3E8",   // Azul acero - Efectos glow/hover
          
          // Colores legacy (compatibilidad)
          gold: "#5B8DEF",
          dark: "#2a2c30",
          gray: "#49484e",
          cream2: "#f9fbf6", // Mantener como cream2 para no romper código existente
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)', 'Arial Black', 'Impact', 'sans-serif'],
        gothic: ['var(--font-cinzel)', 'serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(244, 208, 63, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(244, 208, 63, 0.8)',
          },
        },
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

