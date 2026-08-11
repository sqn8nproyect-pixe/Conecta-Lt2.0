# CLAUDE.md — Guía para el agente AI

> **Instrucciones para cualquier agente AI que trabaje en este proyecto.**
> **Lee esto ANTES de hacer cualquier cambio.**

## 🔄 Recuperación de contexto (OBLIGATORIO al inicio)

Al iniciar una sesión nueva, SIEMPRE:

1. **Lee `PROJECT_STATUS.md`** completo — estado actual del proyecto
2. **Lee el tail de `worklog.md`** (últimas 3 secciones separadas por `---`) — historial reciente
3. **Ejecuta `git log --oneline -10`** — commits recientes
4. **Health check:** `curl -sS -o /dev/null -w "%{http_code}" https://conecta-lt2-0.vercel.app/api/auth/providers` — debe dar 200
5. **Solo entonces**, procede con la tarea del usuario

**NUNCA asumas el estado del proyecto sin verificar.** Usa los archivos y comandos de arriba.

## 🚫 Lo que NO debes hacer

- **NO uses server actions** — toda la lógica backend va en `src/app/api/` como API routes
- **NO uses SQLite** — el proyecto está en PostgreSQL (Neon). El schema `provider="postgresql"`
- **NO remuevas `scripts/patch-openid-client.js`** — es crítico para Google OAuth
- **NO uses `bun run build`** — el dev server con `bun run dev` (puerto 3000) es suficiente
- **NO uses z-ai-web-dev-sdk en client side** — solo backend
- **NO uses colores indigo o blue** salvo que el usuario los pida explícitamente
- **NO escribas tests** salvo que el usuario los pida
- **NO crees archivos de documentación** (*.md) salvo que el usuario los pida o sean necesarios para el contexto
- **NO alucines features o estado** — verifica con `worklog.md`, `PROJECT_STATUS.md`, o `git log`

## ✅ Lo que SÍ debes hacer

- **Usa shadcn/ui** de `src/components/ui/` (ya están todos los componentes instalados)
- **Usa API routes** para backend (`src/app/api/...`)
- **Usa `import { db } from '@/lib/db'`** para Prisma client
- **Usa `getServerSession(authOptions)`** o los wrappers en `src/server/auth.ts`
- **Usa `'use client'` y `'use server'`** explícitos
- **Usa Bun** como runtime (`bun run dev`, `bun install`)
- **Footer sticky al bottom** (`min-h-screen flex flex-col` + `mt-auto`)
- **Mobile-first responsive** (`sm:`, `md:`, `lg:`, `xl:`)
- **Apega una sección a `worklog.md`** después de cada task (formato abajo)

## 📝 Formato de worklog (OBLIGATORIO)

Después de completar un task, appendear a `/home/z/my-project/worklog.md`:

```markdown
---
Task ID: <id, e.g. fix-google-oauth-5>
Agent: <main | subagent-name>
Task: <descripción corta de la tarea>

Work Log:
- <paso concreto 1>
- <paso concreto 2>
- ...

Stage Summary:
- <resultados clave / decisiones / artefactos producidos>
```

Usa `append` mode (NO sobrescribir el archivo).

## 🏗️ Arquitectura

- **Next.js 16 App Router** con `src/app/`
- **PostgreSQL en Neon** vía Prisma 6
- **NextAuth v4** con Prisma Adapter (JWT strategy)
- **Providers:** Google OAuth + Credentials (demo fallback)
- **RBAC:** USER / BUSINESS_OWNER / ADMIN (leído del JWT, seteado en sign-in)
- **Deploy:** Vercel (región iad1), auto-redeploy en push a `main`

## ⚠️ Gotchas críticos

1. **openid-client patch** (`scripts/patch-openid-client.js`): arregla Google OAuth en Vercel. Corre en postinstall. NO remover.
2. **Cookies sin `__Host-` prefix** en `authOptions`: workaround para Vercel + NextAuth v4.
3. **`trustHost: true`** en `authOptions`: necesario para Caddy gateway + Vercel.
4. **Neon pooler vs direct URL**: `DATABASE_URL` = pooler (app), `DIRECT_URL` = direct (migraciones).
5. **`start-dev.sh`** hace `unset DATABASE_URL` para limpiar override de SQLite del shell del sandbox.
6. **Error TS pre-existente** `trustHost does not exist in type AuthOptions` — no rompe runtime, es de NextAuth v4 types incompletos.

## 🎨 Stack de UI

- **Tailwind CSS 4** + **shadcn/ui (New York)** + **Lucide icons**
- **Framer Motion** para animaciones
- **react-leaflet** para mapas (CartoDB Dark Matter tiles)
- **Tema:** obsidiana `#090d1a` + dorado `#d4af37` + ámbar `#f59e0b` + púrpura `#c026d3`
- **Light/dark mode** con next-themes

## 🚀 Comandos

```bash
./start-dev.sh           # Dev server con Neon (NO usar bun run dev directo)
bun run lint             # ESLint
bun run db:verify-neon   # Verificar Neon + counts
bun run db:push          # Push schema a Neon
tail -50 dev.log         # Logs del dev server
```

## 📦 Deploy

- **Push a `main`** → Vercel auto-redeploy
- **Build command:** `prisma generate && next build` (ver `vercel.json`)
- **Postinstall:** `node scripts/patch-openid-client.js && prisma generate`
- **Región:** iad1

## 🔍 Verificación post-cambios

Después de cualquier cambio en auth/api/db:

1. `bun run lint` — debe pasar limpio
2. Verificar dev server: `tail -20 dev.log` — no debe tener errores
3. Si se pusheó a main, esperar ~60s y verificar producción:
   ```bash
   curl -sS -o /dev/null -w "%{http_code}" https://conecta-lt2-0.vercel.app/api/auth/providers
   ```
4. Usar **Agent Browser** para verificar interactividad end-to-end (especialmente para auth flows)

## 🆘 Si algo se rompe

1. **Lee `dev.log`** para errores de runtime
2. **Lee `worklog.md`** (últimas secciones) para ver qué cambió recientemente
3. **`git log --oneline -20`** + **`git diff HEAD~3`** para ver cambios recientes
4. **Verifica env vars** con `curl https://conecta-lt2-0.vercel.app/api/diagnose-auth` (404 = endpoint eliminado, pero el debug code está documentado en worklog)
5. **No alucines** — si no sabes algo, dilo y pregunta al usuario

## 🎯 Prioridad del usuario

El usuario prefiere:
- **Soluciones definitivas** sobre workarounds temporales
- **Verificación end-to-end** con Agent Browser antes de declarar done
- **Worklog detallado** para no perder contexto entre sesiones
- **Honestidad** — si algo no funciona, decirlo explícitamente
- **Español** para comunicación con el usuario
