# Conecta Lt 2.0

Plataforma de descubrimiento y conexión para licorerías, tascas y discotecas en **Los Teques, Venezuela**. Construida con Next.js 16, TypeScript y una experiencia visual cinematográfica en tema oscuro con acentos dorados.

## ✨ Características

- **Verificación de edad** cinematográfica con animaciones Framer Motion
- **Mapa interactivo** (Leaflet + CartoDB Dark Matter) con geolocalización del usuario
- **Geolocalización con radio de cercanía** (1 km) y panel de "Cercanos" con distancia Haversine
- **Fichas de comercios enriquecidas**: galería con lightbox, banner de propuesta de valor, panel de contacto social y badge de promociones activas
- **Matchmaker inteligente** que sugiere establecimientos según preferencias
- **Autenticación** con Google OAuth + Demo fallback (NextAuth v4)
- **Dashboard de Owner** con gestión de info, reservas y promociones
- **Reservas con aforo en tiempo real** y canje de cupones
- **Reviews y ratings** con sistema de favoritos
- **Analytics** de views y eventos
- **RBAC** (USER / BUSINESS_OWNER / ADMIN)
- **Diseño responsivo** mobile-first con soporte de modo claro/oscuro
- **Tema visual**: obsidiana (#090d1a) + dorado (#d4af37) + ámbar (#f59e0b) + púrpura (#c026d3)

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui (New York) |
| Estado cliente | Zustand |
| Estado servidor | TanStack Query (React Query) |
| Mapas | react-leaflet + Leaflet |
| Animación | Framer Motion |
| Iconos | Lucide React |
| Base de datos | PostgreSQL en Neon + Prisma 6 |
| Auth | NextAuth v4 + Prisma Adapter (Google OAuth + Credentials) |
| Deploy | Vercel |
| Runtime | Bun |

## 🌐 Producción

- **App:** https://conecta-lt2-0.vercel.app
- **Repo:** https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0

## 🚀 Inicio rápido

```bash
# Instalar dependencias (ejecuta postinstall: patch openid-client + prisma generate)
bun install

# Iniciar servidor de desarrollo con Neon (puerto 3000)
./start-dev.sh

# Verificar calidad de código
bun run lint

# Verificar conexión Neon + counts de datos
bun run db:verify-neon

# Push del esquema de base de datos a Neon
bun run db:push
```

## 📂 Estructura del proyecto

```
src/
├── app/                      # App Router
│   ├── api/                  # API routes (NO server actions)
│   │   ├── auth/[...nextauth]/
│   │   ├── businesses/
│   │   ├── analytics/
│   │   ├── reservations/
│   │   ├── reviews/
│   │   ├── favorites/
│   │   ├── notifications/
│   │   ├── promotions/
│   │   ├── owner/
│   │   └── admin/
│   ├── page.tsx              # Única ruta visible
│   └── layout.tsx
├── components/
│   ├── conecta/              # AgeGate, HomePage, MapPage, Navbar, etc.
│   ├── establishment/        # Fichas enriquecidas
│   └── ui/                   # shadcn/ui
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── db.ts                 # Prisma client
│   └── hooks/                # use-favorites-sync, use-reservations-sync, etc.
├── server/
│   └── auth.ts               # getServerSession wrappers (requireUser, requireRole)
└── types/
    └── next-auth.d.ts        # Type augmentation para session.user.id + role

prisma/
├── schema.prisma             # provider="postgresql"
├── seed.ts
└── verify-neon.ts

scripts/
└── patch-openid-client.js    # Patch para Google OAuth (CRÍTICO)
```

## 🗺️ Categorías de comercios

- 🥃 **Licorerías** — dorado
- 🍷 **Tascas** — ámbar
- 🎶 **Discotecas** — púrpura

## 📋 Documentación

- **`PROJECT_STATUS.md`** — Estado actual del proyecto (leer primero)
- **`CLAUDE.md`** — Guía para agentes AI
- **`worklog.md`** — Historial detallado de tasks

## 📄 Licencia

Proyecto privado. © Conecta Lt 2.0
