# PROJECT STATUS — Conecta-LT 2.0

> **ESTE ES EL PRIMER ARCHIVO A LEER AL INICIAR UNA SESIÓN.**
> Contiene el estado actual del proyecto. Para historial detallado ver `worklog.md`.

**Última actualización:** 2026-08-23
**HEAD commit:** `9173cbe` — Push de políticas de privacidad + canonical URL fix a conectalt.com
**Estado general:** ✅ Producción operativa en Vercel + Neon PostgreSQL. Historial git limpio. Dominio custom `conectalt.com` activo y funcionando junto a `conecta-lt2-0.vercel.app`. Políticas de Privacidad y Términos de Uso desplegados.

---

## 🔁 Protocolo de Sesión (LEER PRIMERO)

> **Cada nueva sesión de chat debe empezar con este protocolo para no perder contexto.**

### Paso 1 — Recuperar contexto
El usuario envía como primer mensaje:
```
Lee PROJECT_STATUS.md y la cola de worklog.md para recuperar contexto.
```
El agente DEBE:
1. Leer `/home/z/my-project/PROJECT_STATUS.md` completo
2. Leer las últimas 5-10 entradas de `/home/z/my-project/worklog.md` (cola)
3. Detectar tareas pendientes, decisiones tomadas y gotchas conocidos
4. Confirmar al usuario qué versión del proyecto tiene y qué quedó pendiente

### Paso 2 — Especificar la tarea
Después del mensaje de recuperación, el usuario pega la petición concreta.
- ❌ Mal: "arregla el bug" (sin contexto)
- ✅ Bien: "arregla el bug del rating que muestra muchos decimales en la Licocería Don Sancho"

### Paso 3 — Trabajo
El agente ejecuta la tarea siguiendo las reglas del proyecto (ver "Reglas del agente" abajo).

### Paso 4 — Registro en worklog.md
Al terminar cada tarea, el agente DEBE agregar una entrada a `worklog.md` con el formato:
```markdown
---
Task ID: <identificador-descriptivo-YYYY-MM-DD>
Agent: <nombre>
Task: <qué se pidió>

Work Log:
- paso 1
- paso 2

Stage Summary:
- resultados clave
- artifacts producidos
- pendientes
```
**Importante:** Append (no sobrescribir). Cada sección empieza con `---`.

### Paso 5 — Actualizar PROJECT_STATUS.md
Si la tarea cambia el estado global (nuevo commit, nuevo despliegue, nuevo gotcha, nueva URL), el agente actualiza los campos correspondientes aquí.

### Paso 6 — Push a GitHub (si aplica)
Si la tarea generó commits que deben desplegarse a producción, el usuario provee un PAT temporal y el agente hace push. **Después el usuario revoca el PAT** en https://github.com/settings/tokens.

---

## 🤖 Reglas del agente

- **Nunca** uses `bun run build` (prohibido por spec del sandbox)
- **Nunca** uses colores indigo/blue salvo pedido explícito
- **Nunca** escribas en otras rutas que `/` salvo indicación contraria (SPA con views internas)
- **Siempre** usa `api` routes, no server actions
- **Siempre** frontend primero, luego backend (para que el usuario vea resultados)
- **Siempre** verifica con Agent Browser antes de declarar completada una tarea
- **Siempre** lee `dev.log` al final para detectar errores runtime
- **z-ai-web-dev-sdk** solo en backend, nunca en client side

---

## 🎯 Qué es este proyecto

Plataforma de descubrimiento y conexión para licorerías, tascas y discotecas en **Los Teques, Venezuela**. Guía nocturna con mapa interactivo, fichas de comercios, reservas, promociones, reviews, dashboard para owners y **Night Planner v2** (recomendador inteligente de 6 pasos).

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

- **Producción dominio custom:** https://conectalt.com (apex, principal)
- **Producción dominio www:** https://www.conectalt.com (redirige a conectalt.com)
- **Producción dominio Vercel:** https://conecta-lt2-0.vercel.app
- **Repositorio:** https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0
- **Neon Console:** https://console.neon.tech/app/org-damp-breeze-85043324
- **Neon DB:** 21 businesses, 86 reviews, 42 promos, ~6027 analytics events, ~23 users

### Configuración de dominios en Vercel (estado 2026-08-22)
- `conectalt.com` → dominio principal (sin redirect) ✅
- `www.conectalt.com` → redirect a `conectalt.com` (307)
- `conecta-lt2-0.vercel.app` → dominio original Vercel (sin redirect)
- DNS Hostinger: A `@` → `216.198.79.1`, CNAME `www` → `3e51f3b1cc8ba216.vercel-dns-017.com.`
- Google OAuth: 3 URIs de redirect + 3 orígenes JS configurados

## 🔑 Credenciales (dónde están, NO los valores)

- **`.env`** y **`.env.local`** (gitignored): `DATABASE_URL` (Neon pooler), `DIRECT_URL` (Neon direct), `NEXTAUTH_SECRET`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Vercel Dashboard:** Las env vars ya están configuradas desde Etapa 2
- **`~/.git-credentials`**: NO existe en este sandbox. Push a GitHub requiere PAT inline temporal.

## 🚨 INCIDENTE DE SEGURIDAD 2026-08-18 (RESUELTO)

**Qué pasó:** En commits del 10-Ago se filtraron en `worklog.md` (repo público) los siguientes secretos reales:
- Neon DATABASE_URL (con password `[REDACTED-NEON-PWD-ROTATED]`)
- NEXTAUTH_SECRET (`Uoj1bf69E+BRo5Q...`)
- GOOGLE_CLIENT_SECRET (`GOCSPX-BQ9GVBvh2l10...`)
- NEXT_PUBLIC_GOOGLE_CLIENT_ID (`673840348282-...`)
- Vercel API token (`vcp_7tRx...`, truncado)
- GitHub PAT prefix (`ghp_uhK...`, truncado)

**Resolución aplicada:**
1. ✅ Neon DB password rotado por el usuario (Vercel redeployado, app funcional)
2. ✅ Historial git reescrito con `git filter-repo --replace-text` (94 commits procesados)
3. ✅ Force push a `origin/main` (commit `47fdc38`)
4. ✅ Branch `origin/dev` verificado limpio (3 commits del 10-Ago, no contenían secretos)
5. ✅ Backup del historial viejo en `/home/z/my-project-backup-git-history.bundle` (16M)
6. ✅ Backup completo del proyecto en `/home/z/my-project-backup-20260818-212126` (1.6G)

**Rotaciones PENDIENTES (a verificar con el usuario):**
- ⏳ `NEXTAUTH_SECRET` — generar nuevo (`openssl rand -base64 32`), actualizar en Vercel + redeploy
- ⏳ `GOOGLE_CLIENT_SECRET` — Reset en Google Cloud Console (opcional, decisión del usuario)
- ⏳ GitHub PAT `ghp_uhK...` — verificar si sigue activo y revocarlo
- ✅ GitHub PAT `[REDACTED-GITHUB-PAT-DEL-CHAT-REVOCAR]` (18-Ago) — REVOCADO por el usuario
- ✅ Vercel token `vcp_7tRx...` — REVOCADO por el usuario
- ✅ Vercel token `vcp_7yJf...` (22-Ago, usado para configurar dominio) — REVOCADO por el usuario
- ⏳ **Contactar a GitHub Support** para purge de commits viejos en cached views/forks (los commits antiguos siguen accesibles por SHA en GitHub hasta que hagan GC)

**Estado actual del historial git:** 100% limpio. Búsqueda de los 7 patrones de secretos en todos los commits y mensajes → 0 coincidencias. Solo quedan las versiones redactadas (`[REDACTED-NEON-PWD-ROTATED]`, etc.).

## ✅ Features funcionales (verificadas en producción)

- ✅ AgeGate (verificación de edad cinematográfica)
- ✅ Home con 21 comercios + populares con view counts reales
- ✅ Detalle de comercio (10 fotos, promos, reviews, social, WhatsApp)
- ✅ Mapa interactivo con geolocalización
- ✅ Login Demo (Ana Rodríguez, BUSINESS_OWNER) → funciona en Vercel
- ✅ **Login Google OAuth** → funciona en Vercel (ver gotcha abajo)
  - ✅ Funciona en `conecta-lt2-0.vercel.app`
  - ✅ Funciona en `conectalt.com` (apex, dominio principal)
  - ⚠️ NO funciona en `www.conectalt.com` directamente — Vercel redirige al apex antes del POST signin, lo que rompe cookies OAuth. Solución: usar siempre `conectalt.com` (el redirect de www al apex es 307, no problemático para navegación normal).
- ✅ Dashboard de Owner (3 tabs: Info/Reservas/Promociones)
- ✅ Reservas con AFORO EN TIEMPO REAL
- ✅ Promociones con códigos de canje
- ✅ Reviews y ratings
- ✅ Favorites
- ✅ Notifications
- ✅ Analytics events (6027 registrados)
- ✅ RBAC (USER / BUSINESS_OWNER / ADMIN)
- ✅ **Night Planner v2** (Sprint 1-5 completados 12-15 Ago, ver abajo)
- ✅ **Dominio custom `conectalt.com` configurado** (22-Ago, ver worklog Task ID `domain-setup-1`)

## 🆕 Night Planner v2 (Sprint 1-5, 12-15 Ago)

Reemplazo del Matchmaker legacy. Flujo progresivo de 6 pasos que recomienda locales según preferencias del usuario.

**Archivos principales:**
- `src/components/planner/NightPlanner.tsx` (557 líneas) — wrapper principal, drop-in replacement del Matchmaker
- `src/components/planner/PlannerSteps.tsx` (438 líneas) — 6 step components + OptionCard compartido
- `src/components/planner/PlannerProgress.tsx` — indicador de pasos (6 dots)
- `src/components/planner/PlannerBusinessCard.tsx` — card con score ring SVG, rank medals, availability badges
- `src/components/planner/PlannerResults.tsx` — dispatcher loading/error/empty/success

**Backend:**
- `src/app/api/planner/recommend/route.ts` — endpoint POST que recibe `NightPlannerPreferences`
- `src/server/planner/` — 7 archivos:
  - `planner.service.ts` — orquestación
  - `planner.scoring.ts` — algoritmo de scoring 0-100
  - `planner.distance.ts` — cálculo de distancia
  - `planner.availability.ts` — 4 estados (AVAILABLE/LIKELY_AVAILABLE/CHECK_REQUIRED/UNAVAILABLE)
  - `planner.reasons.ts` — generador de razones (max 5 por recomendación)
  - `planner.repository.ts` — acceso DB
  - `planner.schema.ts` — validación Zod

**Tipos:**
- `PlannerPreferences` (draft, nullable) — UX validation
- `NightPlannerPreferences` (strict, no nullables) — para API call

**Matchmaker eliminado en Sprint 5:**
- `src/components/conecta/Matchmaker.tsx` — borrado
- `calculateMatch()` y `getRecommendedDrink()` en `src/lib/store.ts` — borrados
- `MatchAnswers` interface en `src/lib/types.ts` — borrado
- `HomePage.tsx` ahora importa `NightPlanner` en vez de `Matchmaker`

**4 estados terminales del planner:**
1. `loading` → skeleton cards
2. `error` → retry/back
3. `empty` → 5 reason codes con iconos específicos
4. `success` → ranked cards con score ring

**Analytics events del planner:**
- `PLANNER_OPENED`, `PLANNER_STEP_COMPLETED`, `PLANNER_SEARCH_STARTED`, `PLANNER_RESULTS_SHOWN`, `PLANNER_RECOMMENDATION_VIEWED`, `PLANNER_RECOMMENDATION_SELECTED`, `PLANNER_DISMISSED`

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

### 8. Login Demo ( signIn con redirect:false + reload )
`Navbar.tsx` `handleLogin` usa `signIn('demo-credentials', { redirect:false })` y luego `window.location.reload()`. **NO** usar `window.location.href = res.url` porque `res.url` puede ser cross-origin y perder la cookie de sesión.

### 9. Sandbox: DATABASE_URL override + .env en SQLite
**Estado real tras el incidente de seguridad del 18-Ago:**
- `.env` local contiene `DATABASE_URL=file:/home/z/my-project/db/custom.db` (SQLite)
- `.env.local` (que tenía Neon URL con el password rotado) se perdió del sandbox
- `schema.prisma` tiene `provider="postgresql"` (gotcha #5)
- **Consecuencia**: el dev server arranca OK (HTTP 200 en `/`), pero TODOS los endpoints que tocan la DB retornan 503/500 (Prisma no puede usar SQLite con schema postgresql)

**Workaround para verificar UI en sandbox:**
1. Cambiar temporalmente `prisma/schema.prisma` de `provider="postgresql"` a `provider="sqlite"` (SIN commitear)
2. `bun run db:push` (crea tablas en SQLite local)
3. `bun run db:seed` (siembra 21 negocios desde `src/lib/data.ts`)
4. Reiniciar dev server
5. Revertir el cambio antes de cualquier commit/push (sino rompe Vercel)

**Para producción real**: la app corre en Vercel con Neon (el `.env` de Vercel tiene las credenciales correctas, sin relación con el sandbox local).

### 10. Dominio custom + OAuth: redirect apex vs www (CRÍTICO)
**Problema:** Cuando se usa un dominio custom con Vercel, por defecto Vercel configura `apex → www` (ej: `conectalt.com` redirige 308 a `www.conectalt.com`). Esto rompe Google OAuth:

1. Usuario entra a `conectalt.com` (sin www)
2. Hace clic en "Continuar con Google"
3. Navbar.tsx hace POST a `conectalt.com/api/auth/signin/google` (porque el navegador está en `conectalt.com`)
4. Vercel responde con 308 redirect a `www.conectalt.com/api/auth/signin/google`
5. El navegador sigue el redirect, pero las cookies OAuth (state, pkce) se setean en `conectalt.com` (sin www)
6. Google vuelve a `www.conectalt.com/api/auth/callback/google` (URL registrada en Google Console)
7. El navegador busca las cookies en `www.conectalt.com` → **NO las encuentra** → error OAuth

**Solución aplicada (22-Ago):** invertir la configuración en Vercel:
- `conectalt.com` → dominio principal (sin redirect)
- `www.conectalt.com` → redirect 307 a `conectalt.com`

Así el dominio principal es el apex y no hay redirects problemáticos en el flujo OAuth. Ver `worklog.md` Task ID `domain-setup-1` para detalles.

### 11. Detección de entorno en Navbar.tsx (commit 8075a39)
**Problema:** El código original en `Navbar.tsx` detectaba producción con `hostname.includes('vercel.app')`, lo que rompía el flujo OAuth en dominios custom (`conectalt.com`).

**Fix aplicado (commit `8075a39`, 21-Ago):**
```typescript
const isProduction = typeof window !== 'undefined'
  && !window.location.hostname.includes('localhost')
  && !window.location.hostname.startsWith('127.0.0.1')
```

Esto funciona para: `conectalt.com`, `*.vercel.app`, y localhost. Ver commit `8075a39` en git log.

## 📝 Tareas pendientes

### Alta prioridad (seguridad)
- **Rotar** `NEXTAUTH_SECRET` en Vercel (ver "Cómo rotar NEXTAUTH_SECRET" abajo) — pendiente desde el incidente del 18-Ago
- **Verificar y revocar** GitHub PAT `ghp_uhK...` si sigue activo
- **Contactar a GitHub Support** para purge de commits viejos en cached views/forks (los commits antiguos siguen accesibles por SHA en GitHub hasta que hagan GC)
- ✅ ~~REVOCAR GitHub PAT del 18-Ago~~ — Hecho
- ✅ ~~REVOCAR Vercel token `vcp_7tRx...`~~ — Hecho
- ✅ ~~REVOCAR Vercel token `vcp_7yJf...` (22-Ago)~~ — Hecho

### Media prioridad (mejoras)
- **Migrar a Auth.js v5** (~2-3 horas): eliminaría la dependencia del patch script de openid-client y daría soporte oficial a Next.js 16. NextAuth v4 no tiene soporte oficial para Next 16.
- **Fix error TS pre-existente**: `trustHost does not exist in type AuthOptions` en `src/lib/auth.ts` (no rompe runtime, es solo types incompletos de NextAuth v4)
- **Sprint 6 (opcional): Night Route multi-stop** — FASE 15 del blueprint. `wantsRoute` ya defaultea a false en el schema, tipos definidos pero UI no implementada.

### Baja prioridad
- **Google OAuth end-to-end**: ya verificado que funciona en `conectalt.com` y `conecta-lt2-0.vercel.app`. Falta verificar con cuentas reales de Google de usuarios finales.
- **Opcional**: Fix 5 preexisting tsc errors en `Navbar.tsx`, `AdminMetricsTab.tsx`, `auth.ts` (debt técnico, no blocking — `next.config.ts` tiene `ignoreBuildErrors: true`)

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
│   │   ├── admin/
│   │   └── planner/recommend/    # NEW: Night Planner v2 endpoint
│   ├── page.tsx          # Única ruta visible para el usuario
│   └── layout.tsx
├── components/
│   ├── conecta/          # AgeGate, HomePage, MapPage, Navbar, etc.
│   ├── planner/          # NEW: NightPlanner, PlannerSteps, PlannerResults, etc.
│   ├── establishment/    # Fichas enriquecidas
│   └── ui/               # shadcn/ui (New York)
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── db.ts             # Prisma client
│   ├── store.ts          # Zustand store
│   ├── types.ts          # Types (sin MatchAnswers — eliminado en Sprint 5)
│   └── hooks/            # use-favorites-sync, use-reservations-sync, etc.
├── server/
│   ├── auth.ts           # getServerSession wrappers (requireUser, requireRole)
│   └── planner/          # NEW: planner.service, scoring, distance, availability, reasons
└── types/
    └── next-auth.d.ts    # Type augmentation para session.user.id + role

prisma/
├── schema.prisma         # provider="postgresql"
├── seed.ts               # 21 negocios, 42 promos, 16 users, 84 reviews
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

# Sembrar DB local SQLite (sandbox) con datos de data.ts
bun run db:seed
```

## 🔧 Cómo rotar NEXTAUTH_SECRET

1. **Generar nuevo secret** (en tu PC, NO en este chat):
   ```bash
   openssl rand -base64 32
   ```
2. **Vercel** → Settings → Environment Variables → editar `NEXTAUTH_SECRET` → pegar nuevo valor → Save
3. **Vercel** → editar `AUTH_SECRET` → pegar el MISMO valor que `NEXTAUTH_SECRET` → Save
4. **Deployments** → último deploy → "..." → Redeploy
5. **Verificar**: abrir https://conecta-lt2-0.vercel.app y loguearse

⚠️ Efecto: todos los usuarios logueados serán desconectados (cookies firmadas con el secret viejo no se pueden desencriptar).

## 🔄 Protocolo de recuperación de contexto

Al iniciar una nueva sesión, decirle al agente:

> **"Lee PROJECT_STATUS.md y el tail de worklog.md para recuperar contexto"**

El agente debe:
1. Leer `PROJECT_STATUS.md` (este archivo) completo
2. Leer las últimas 3 secciones de `worklog.md` (separadas por `---`)
3. Verificar `git log --oneline -10` para commits recientes
4. Verificar `git status -s` (working tree debe estar clean)
5. Health check: `curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/` (debe dar 200)
6. Solo entonces, proceder con la tarea del usuario

**Si algo del documento no coincide con la realidad (archivo mencionado no existe, feature marcada como ✅ pero falla), CORREGIR el documento antes de proceder.** Esto es prioritario para mantener este archivo como fuente de verdad.

## 📋 Convenciones del proyecto

- **API routes, no server actions** — toda la lógica backend va en `src/app/api/`
- **`'use client'` y `'use server'`** explícitos donde corresponda
- **shadcn/ui** preferido sobre implementaciones custom
- **Footer sticky** al bottom (`min-h-screen flex flex-col` + `mt-auto` en footer)
- **Mobile-first** con responsive prefixes (`sm:`, `md:`, `lg:`)
- **z-ai-web-dev-sdk solo en backend** — nunca en client side
- **No emojis** en código salvo que el usuario los pida explícitamente
- **Worklog obligatorio** — cada task debe appendear una sección a `worklog.md`
- **NO commitear secretos reales** en `worklog.md`, `PROJECT_STATUS.md`, ni ningún archivo tracked. Si necesitas referenciar un secreto, usar el formato `[REDACTED — descripción]`.

## 🔗 Enlaces rápidos

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel env vars](https://vercel.com/sqn8nproyect-pixe/Conecta-Lt2.0/settings/environment-variables)
- [Vercel tokens (revocar)](https://vercel.com/account/tokens)
- [Neon Console](https://console.neon.tech/app/org-damp-breeze-85043324)
- [GitHub Repo](https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0)
- [GitHub Tokens (revocar)](https://github.com/settings/tokens)
- [Google Cloud Console OAuth](https://console.cloud.google.com/apis/credentials) — OAuth client ID: `[REDACTED — Client ID filtrado, regenerar si es necesario]`
- [Google OAuth redirect URI configurada](https://conecta-lt2-0.vercel.app/api/auth/callback/google)

## 📂 Backups locales (crear antes de operaciones destructivas)

Estos backups se crearon el 18-Ago antes de la reescritura del historial git. **NO subirlos a ningún sitio público** (contienen el historial viejo con secretos). Borrarlos cuando se confirme que la app funciona bien sin necesidad de restaurar.

- `/home/z/my-project-backup-20260818-212126` (1.6G) — copia completa del proyecto
- `/home/z/my-project-backup-git-history.bundle` (16M) — historial git puro (restaurable con `git clone /home/z/my-project-backup-git-history.bundle`)
- `/home/z/secrets-to-redact.txt` — archivo de patrones usado por `git filter-repo` (referencia de qué se redactó)
