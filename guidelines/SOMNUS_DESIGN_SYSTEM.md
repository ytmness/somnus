# SOMNUS — Sistema de Diseño y Guía Visual

## 1. Objetivo del Sitio

Crear una landing/home que:
- **Transmita exclusividad y energía nocturna.**
- **Permita encontrar eventos rápidamente.**
- **Maximice conversión a compra de tickets.**

---

## A) Concepto Visual

### Descripción del estilo general
Estética **nocturna premium**, con atmósfera inmersiva tipo club/experiencia en vivo. Fondos oscuros profundos, acentos sutiles que evocan luces de neón o reflejos en la noche. Minimalismo sofisticado: pocos elementos, alto impacto.

### Mood (emociones que transmite)
- **Exclusividad** — Acceso a experiencias limitadas.
- **Anticipación** — Ganas de estar ahí, countdown, “últimos boletos”.
- **Intensidad nocturna** — Oscuridad controlada, brillos puntuales.
- **Confianza** — Seguridad en la compra, marca seria.

### Personalidad de marca
- **Audaz** pero no ruidosa.
- **Actual** (2026) sin ser efímera.
- **Directa** — mensajes claros, CTAs visibles.
- **Elegante** — sin recargar ni saturar.

---

## B) Paleta de Colores

| Rol | Color | Hex | Uso |
|-----|-------|-----|-----|
| **Fondo principal** | Negro profundo | `#0A0A0A` | Hero, body, cards base |
| **Fondo secundario** | Negro/gris muy oscuro | `#141414` | Secciones alternadas, cards hover |
| **Texto primario** | Blanco puro | `#FFFFFF` | Títulos, texto principal |
| **Texto secundario** | Gris claro | `#A0A0A0` | Descripciones, metadata |
| **Acento principal** | Azul media noche | `#5B8DEF` | CTAs, highlights, links |
| **Acento opcional** | Azul acero claro | `#7BA3E8` | Badges, bordes, detalles |

### Por qué funciona
- **Negro + azul** → Sensación media noche, sereno y moderno; el azul transmite confianza.
- **Blanco sobre negro** → Legibilidad máxima y sensación premium.
- **Azul acero opcional** → Acentúa sin saturar; ideal para badges y detalles secundarios.

---

## C) Tipografía

### Display (títulos)
- **Fuente:** Anton, Druk Wide, o similar (condensed, bold, impact)
- **Uso:** Hero, nombres de eventos, headlines.

### Texto / UI
- **Fuente:** Archivo, Inter o similar (legible, neutra).
- **Uso:** Párrafos, labels, botones, UI general.

### Jerarquía sugerida

| Elemento | Tamaño | Peso | Line-height |
|----------|--------|------|-------------|
| **H1** (Hero) | 3.5rem – 5rem (56–80px) | 700–900 | 1.1 |
| **H2** (Secciones) | 2rem – 2.5rem (32–40px) | 700 | 1.2 |
| **H3** (Cards, subs) | 1.25rem – 1.5rem (20–24px) | 600 | 1.3 |
| **Body** | 1rem (16px) | 400 | 1.5 |
| **Small** | 0.875rem (14px) | 400 | 1.4 |

---

## D) Layout Estructural de la Home

### 1. Hero inmersivo (full-width)
- **Video** o imagen de fondo de un evento real.
- Overlay oscuro (60–80% opacidad) para legibilidad.
- **Contenido:** Nombre SOMNUS + tagline (“AWAKE IN A DREAM”).
- **CTA principal:** “Ver próximos eventos” o “Comprar boletos”.
- Altura: ~100vh en desktop, ~90vh en móvil.

### 2. Barra destacada de próximo evento
- **Contenido:** Nombre del evento, fecha, venue.
- **Countdown** (días, horas, minutos) hasta el evento.
- **CTA:** “Comprar ahora” o “Reservar”.
- Fondo con leve gradiente o borde sutil (acento principal).

### 3. Sección de eventos destacados
- **Grid de cards** (2–4 columnas en desktop, 1–2 en móvil).
- Cada card: imagen, nombre, fecha, precio, badge si aplica.
- Hover con ligera elevación y borde/glow en acento.

### 4. Filtros rápidos
- **Filtros:** Ciudad, Fecha, Categoría.
- Chips o dropdowns compactos.
- Ubicación: debajo del hero o encima del grid.
- Estilo: ghost o outline para no competir con el contenido.

### 5. Sección editorial/manifiesto + estadísticas
- **Manifiesto:** 2–4 líneas sobre la marca, experiencia, exclusividad.
- **Estadísticas:** Eventos realizados, boletos vendidos, ciudades, etc.
- Números grandes, texto breve; refuerza credibilidad.

### 6. Eventos por ciudad
- Lista o mini-grid por ciudad.
- Permite explorar por ubicación de forma rápida.

### 7. Footer minimal
- Logo, enlaces (Eventos, Galería, Contacto, Términos).
- Email o formulario de contacto.
- Redes sociales (si aplica).
- Copyright.
- Fondo oscuro, texto discreto.

---

## E) Sistema de Componentes

### Botón primario
- **Fondo:** Color acento (`#5B8DEF`).
- **Texto:** Blanco, uppercase, tracking 0.05em.
- **Border radius:** 50px (pill) o 8px.
- **Padding:** 14px 28px.
- **Sombra:** `0 4px 14px rgba(91, 141, 239, 0.4)`.
- **Hover:** Más brillante, `transform: translateY(-2px)`.
- **Focus:** Ring 2px del acento.

### Botón secundario
- **Fondo:** Transparente.
- **Borde:** 1px solid acento o blanco.
- **Texto:** Blanco o acento.
- **Hover:** Fondo acento con opacidad baja (10–20%).
- Border radius y padding igual que primario.

### Botón ghost
- **Fondo:** Transparente.
- **Texto:** Gris claro o blanco.
- **Hover:** Fondo blanco/negro 5–10%.
- Sin borde por defecto.

### Card de evento
- **Fondo:** `#141414`, borde `1px solid rgba(255,255,255,0.08)`.
- **Border radius:** 12px.
- **Imagen:** Aspect ratio 16:9, `object-fit: cover`.
- **Sombra:** `0 4px 24px rgba(0,0,0,0.3)`.
- **Hover:** `scale(1.02)`, borde más visible, `transition 0.3s`.
- **Contenido:** Título, fecha, precio, CTA pequeño.

### Badge de estado
- **Sold out:** Fondo gris oscuro, texto gris.
- **Early bird:** Fondo azul acero opaco, texto claro.
- **Last tickets:** Fondo azul más intenso suave, texto blanco.
- **Border radius:** 4–6px.
- **Padding:** 4px 10px.
- **Fuente:** Small, 700.

### Navbar (desktop)
- Fondo: `transparent` o `rgba(10,10,10,0.9)` con blur.
- Altura: 64–72px.
- Logo a la izquierda.
- Links centrados o a la derecha (Eventos, Galería, Login).
- CTA destacado a la derecha.
- Border bottom sutil o sin borde.

### Navbar (mobile)
- Mismo estilo reducido.
- Hamburger que abre drawer/modal.
- Links apilados.
- CTA visible en el menú.

### Modal de compra
- **Fondo overlay:** `rgba(0,0,0,0.85)`.
- **Contenido:** Card centrada, max-width 480px.
- **Border radius:** 16px.
- **Sombra:** `0 24px 64px rgba(0,0,0,0.5)`.
- Campos, resumen, botón “Completar compra”.

### Espaciado base
- **Base:** 4px.
- **Escala:** 4, 8, 12, 16, 24, 32, 48, 64.
- **Entre secciones:** 64–96px (desktop), 48–64px (móvil).

---

## F) Sistema de Motion

### Tipo principal
- **Fade + slide** suave (e.g. `opacity` + `translateY`).
- Evitar movimientos bruscos.

### Duración sugerida
- **Micro:** 150–200ms (hover, focus).
- **Estándar:** 300–400ms (transiciones de sección, modals).
- **Entrada de página:** 400–600ms (hero, cards en scroll).

### Elementos a animar
- Entrada de cards al hacer scroll (stagger ligero).
- Hover en botones y cards.
- Apertura/cierre de modals y menús.
- Countdown (si se actualiza cada segundo).

### Elementos que NO animar
- Texto largo o body.
- Imágenes muy grandes del hero (evitar parpadeos).
- Elementos que cambian muy rápido (evitar fatiga visual).

---

## 3. Reglas Estrictas (Checklist)

- [ ] Coherencia visual en todo el sistema
- [ ] Máximo 2 colores acento (azul media noche + azul acero)
- [ ] Prioridad a conversión (CTAs claros, countdown)
- [ ] Estética moderna 2026
- [ ] **Dark-first** en fondos y componentes
- [ ] **Mobile-first** en layout y componentes
