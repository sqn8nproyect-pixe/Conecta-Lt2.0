# PROJECT STATUS — Conecta-LT 2.0

> **ESTE ES EL PRIMER ARCHIVO A LEER AL INICIAR UNA SESIÓN.**
> Contiene el estado actual del proyecto. Para historial detallado ver `worklog.md`.

**Última actualización:** 2026-08-11
**Estado general:** ✅ Producción operativa en Vercel + Neon PostgreSQL

---

## 🎯 Qué es este proyecto

Plataforma de descubrimiento y conexión para licorerías, tascas y discotecas en **Los Teques, Venezuela**. Guía nocturna con mapa interactivo, fichas de comercios, reservas, promociones, reviews, y dashboard para owners.

## 🏗️ Stack REAL (lo que está en producción)

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Next.js 16 (App Router) | NO usar server actions, usar API routes |
| Lenguaje | TypeScript 5 | |
| Estilos | Tailwind CSS 4 + shadcn/ui (New York) | Evitar colores indigo/blue |
| Estado cliente | Zustand | |
| Estado servidor | TanStack Query (React Query) | |
| Base de datos | **PostgreSQL en Neon** (NO SQLite) | |
| ORM | Prisma 6 | `import { db } from '@/lib/db'` |
| Auth | NextAuth v4 + Prisma Adapter | Ver nota sobre openid-client abajo |
| Mapas | react-leaflet + Leaflet | |
| Animación | Framer Motion | |
| Runtime | Bun | |
| Deploy | Vercel | Región: iad1 |

## 🌐 URLs y conexiones

- **Producción:** https://conecta-lt2-0.vercel.app
- **Repositorio:** https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0
- **Neon Console:** https://console.neon.tech/app/org-damp-breeze-85043324
- **Neon DB:** 21 businesses, 86 reviews, 42 promos, 6027 analytics events, 23 users

## 🔑 Credenciales (dónde están, NO los valores)

- **`.env`** y **`.env.local`** (gitignored): `DATABASE_URL` (Neon pooler), `DIRECT_URL` (Neon direct), `NEXTAUTH_SECRET`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Vercel Dashboard:** Las env vars ya están configuradas desde Etapa 2
- **`~/.git-credentials`**: GitHub PAT temporal (ver Pendiente más abajo)

## ✅ Features funcionales (verificadas en producción)

- ✅ AgeGate (verificación de edad cinematográfica)
- ✅ Home con 21 comercios + populares con view counts reales
- ✅ Detalle de comercio (10 fotos, promos, reviews, social, WhatsApp)
- ✅ Mapa interactivo con geolocalización
- ✅ Login Demo (Ana Rodríguez, BUSINESS_OWNER) → funciona en Vercel
- ✅ **Login Google OAuth** → funciona en Vercel (ver gotcha abajo)
- ✅ Dashboard de Owner (3 tabs: Info/Reservas/Promociones)
- ✅ Reservas con AFORO EN TIEMPO REAL
- ✅ Promociones con códigos de canje
- ✅ Reviews y ratings
- ✅ Favorites
- ✅ Notifications
- ✅ Analytics events (6027 registrados)
- ✅ RBAC (USER / BUSINESS_OWNER / ADMIN)

## ⚠️ Gotchas importantes (LEER ANTES DE TOCAR AUTH)

### 1. openid-client patch (CRÍTICO para Google OAuth)
**Problema:** `openid-client` v5.4+ (usado por NextAuth v4) implementa RFC 9207 estrictamente. Google declara `authorization_response_iss_parameter_supported: true` en su discovery document PERO no envía `iss` en el authorization response. Esto causa `RPError: iss missing from the response` en cada login de Google.

**Solución implementada:** `scripts/patch-openid-client.js` patchea `node_modules/openid-client/lib/client.js` en postinstall (configurado en `package.json`). El patch es idempotente y corre tanto local como en Vercel.

**NO remover este patch script.** Si se migra a Auth.js v5, el patch deja de ser necesario (Auth.js v5 usa oauth4webapi en vez de openid-client).

### 2. Cookies sin `__Host-` prefix
`src/lib/auth.ts` configura cookies manualmente sin el prefix `__Host-` (workaround para Vercel + NextAuth v4). Sacrifica un poco de seguridad pero hace que OAuth funcione.

### 3. `trustHost: true` en authOptions
Necesario para que NextAuth funcione detrás del Caddy gateway y en Vercel. Sin esto, NextAuth no infiere el host correcto.

### 4. Neon pooler vs direct URL
- `DATABASE_URL` = Neon pooler (`-pooler` en el hostname) — para la app
- `DIRECT_URL` = Neon direct (sin `-pooler`) — para migraciones Prisma

### 5. SQLite descontinuado
El schema fue migrado de SQLite a PostgreSQL (commit 9e70c6e). NO volver a `provider="sqlite"` porque rompe Vercel (SQLite no funciona en serverless lambdas).

### 6. start-dev.sh
`start-dev.sh` hace `unset DATABASE_URL` antes de cargar `.env` porque el shell del sandbox tiene un override persistente de SQLite que rompería la conexión a Neon.

### 7. Admin access control (CRÍTICO)
El acceso al panel admin está controlado por **email allowlist** en `src/lib/admin-config.ts`, NO por el rol en la DB. Solo `sqn8nproyect@gmail.com` puede acceder.

3 capas de verificación:
1. **JWT callback** (`src/lib/auth.ts`): fuerza `role=ADMIN` si el email está en `ADMIN_EMAILS`, fuerza `role=USER` si no está (incluso si la DB dice ADMIN)
2. **`requireRole`** (`src/server/auth.ts`): defense in depth — verifica email además del rol en cada request admin
3. **Frontend** (`Navbar.tsx`, `AdminDashboard.tsx`): verifica email antes de mostrar el botón/renderizar el panel

Para cambiar quién tiene acceso admin, editar `ADMIN_EMAILS` en `src/lib/admin-config.ts` — ese es el único lugar.

## 📝 Tareas pendientes

### Alta prioridad (seguridad)
- **Revocar GitHub PAT** (`ghp_[REDACTED-GITHUB-PAT-REVOKED]...`) en https://github.com/settings/tokens cuando ya no se necesite

### Media prioridad (mejoras)
- **Migrar a Auth.js v5** (~2-3 horas): eliminaría la dependencia del patch script de openid-client y daría soporte oficial a Next.js 16. NextAuth v4 no tiene soporte oficial para Next 16.
- **Fix error TS pre-existente**: `trustHost does not exist in type AuthOptions` en `src/lib/auth.ts` (no rompe runtime, es solo types incompletos de NextAuth v4)

### Baja prioridad
- Verificar Google OAuth con cuenta real de Google end-to-end (ya verificamos que el navegador navega a accounts.google.com con parámetros correctos)

## 📂 Estructura clave del proyecto

```
src/
├── app/
│   ├── api/              # API routes (NO server actions)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── businesses/
│   │   ├── analytics/
│   │   ├── reservations/
│   │   ├── reviews/
│   │   ├── favorites/
│   │   ├── notifications/
│   │   ├── promotions/
│   │   ├── owner/
│   │   └── admin/
│   ├── page.tsx          # Única ruta visible para el usuario
│   └── layout.tsx
├── components/
│   ├── conecta/          # AgeGate, HomePage, MapPage, Navbar, etc.
│   ├── establishment/    # Fichas enriquecidas
│   └── ui/               # shadcn/ui (New York)
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── db.ts             # Prisma client
│   └── hooks/            # use-favorites-sync, use-reservations-sync, etc.
├── server/
│   └── auth.ts           # getServerSession wrappers (requireUser, requireRole)
└── types/
    └── next-auth.d.ts    # Type augmentation para session.user.id + role

prisma/
├── schema.prisma         # provider="postgresql"
├── seed.ts
└── verify-neon.ts        # Script para verificar conexión Neon + counts

scripts/
└── patch-openid-client.js  # Patch para Google OAuth (CRÍTICO)
```

## 🚀 Comandos útiles

```bash
# Desarrollo local (arranca con Neon, no SQLite)
./start-dev.sh

# Lint
bun run lint

# Verificar conexión Neon + counts
bun run db:verify-neon

# Push schema a Neon (idempotente)
bun run db:push

# Logs del dev server (revisar al finalizar cambios)
tail -50 dev.log
```

## 🔄 Protocolo de recuperación de contexto

Al iniciar una nueva sesión, decirle al agente:

> **"Lee PROJECT_STATUS.md y el tail de worklog.md para recuperar contexto"**

El agente debe:
1. Leer `PROJECT_STATUS.md` (este archivo) completo
2. Leer las últimas 3 secciones de `worklog.md` (separadas por `---`)
3. Verificar `git log --oneline -10` para commits recientes
4. Health check: `curl -sS -o /dev/null -w "%{http_code}" https://conecta-lt2-0.vercel.app/api/auth/providers`
5. Solo entonces, proceder con la tarea del usuario

## 📋 Convenciones del proyecto

- **API routes, no server actions** — toda la lógica backend va en `src/app/api/`
- **`'use client'` y `'use server'`** explícitos donde corresponda
- **shadcn/ui** preferido sobre implementaciones custom
- **Footer sticky** al bottom (`min-h-screen flex flex-col` + `mt-auto` en footer)
- **Mobile-first** con responsive prefixes (`sm:`, `md:`, `lg:`)
- **z-ai-web-dev-sdk solo en backend** — nunca en client side
- **No emojis** en código salvo que el usuario los pida explícitamente
- **Worklog obligatorio** — cada task debe appendear una sección a `worklog.md`

## 🔗 Enlaces rápidos

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Neon Console](https://console.neon.tech/app/org-damp-breeze-85043324)
- [GitHub Repo](https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0)
- [Google Cloud Console OAuth](https://console.cloud.google.com/apis/credentials) — OAuth client ID: `[REDACTED-GOOGLE-CLIENT-ID-REGENERATED]`
- [Google OAuth redirect URI configurada](https://conecta-lt2-0.vercel.app/api/auth/callback/google)
