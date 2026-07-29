# Conecta Lt 2.0

Plataforma de descubrimiento y conexión para licorerías, tascas y discotecas en **Los Teques, Venezuela**. Construida con Next.js 16, TypeScript y una experiencia visual cinematográfica en tema oscuro con acentos dorados.

## ✨ Características

- **Verificación de edad** cinematográfica con animaciones Framer Motion
- **Mapa interactivo** (Leaflet + CartoDB Dark Matter) con geolocalización del usuario
- **Geolocalización con radio de cercanía** (1 km) y panel de "Cercanos" con distancia Haversine
- **Fichas de comercios enriquecidas**: galería con lightbox, banner de propuesta de valor, panel de contacto social y badge de promociones activas
- **Matchmaker inteligente** que sugiere establecimientos según preferencias
- **Autenticación simulada con Google** (Zustand store)
- **Diseño responsivo** mobile-first con soporte de modo claro/oscuro
- **Tema visual**: obsidiana (#090d1a) + dorado (#d4af37) + ámbar (#f59e0b) + púrpura (#c026d3)

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui (New York) |
| Estado | Zustand (cliente) |
| Mapas | react-leaflet + Leaflet |
| Animación | Framer Motion |
| Iconos | Lucide React |
| Base de datos | Prisma ORM (SQLite) |
| Runtime | Bun |

## 🚀 Inicio rápido

```bash
# Instalar dependencias
bun install

# Iniciar servidor de desarrollo (puerto 3000)
bun run dev

# Verificar calidad de código
bun run lint

# Push del esquema de base de datos
bun run db:push
```

## 📂 Estructura del proyecto

```
src/
├── app/                      # App Router (layout, page, globals.css)
├── components/
│   ├── conecta/              # Componentes de la app (AgeGate, HomePage, MapPage, etc.)
│   ├── establishment/        # Componentes de fichas enriquecidas
│   └── ui/                   # Componentes shadcn/ui
├── hooks/                    # Hooks personalizados
└── lib/                      # Store, datos, tipos, utilidades, db
```

## 🗺️ Categorías de comercios

- 🥃 **Licorerías** — dorado
- 🍷 **Tascas** — ámbar
- 🎶 **Discotecas** — púrpura

## 📄 Licencia

Proyecto privado. © Conecta Lt 2.0
