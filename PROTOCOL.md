# PROTOCOLO CONECTA-LT v2 — Anti-pérdida de contexto y anti-alucinación

> **Para TODO agente** (Super Z, Claude, subagentes) que trabaje en este repo.
> **Leer al inicio de CADA sesión.** El arranque normal es `bash scripts/session-boot.sh`
> (imprime handoff + git + última entrada del worklog); este documento es la Constitución
> que le da prioridad a cada fuente y define lo que NO se puede hacer de memoria.
>
> Última actualización: **2026-09-12** (v2 — reemplaza la "ficha de verificación" del
> 28-Ago, que estaba desactualizada y contenía secrets en texto plano).

---

## 0. Por qué existe este protocolo (evidencia real, no teoría)

El **2026-09-12**, al retomar una sesión compactada, se encontraron 4 fuentes desincronizadas entre sí:

| Fuente | Decía | Realidad (verificada con git/curl ese día) |
|---|---|---|
| Resumen del chat | Sprint 8.11b "aún no implementado" | **Ya desplegado**: commit `444a715`; `DELETE /api/admin/events` → 401 |
| SESSION_HANDOFF.md | Última tarea = 8.6 | Se iba por 8.11b |
| PROTOCOL.md v1 | next-auth v4, "sin dominio propio" | `next-auth@5.0.0-beta.32`; conectalt.com activo (200) |
| CLAUDE.md | `getServerSession` + patch-openid-client.js "crítico" | Export `auth()` (v5); el patch fue eliminado |

**Moraleja: la memoria y los resúmenes NO son fuente de verdad.** La verdad se verifica
con herramientas, en el momento, en esta sesión.

---

## 1. Jerarquía de verdad (si fuentes discrepan, gana la #1)

1. **Git**: `git log --oneline -15`, `git status -s`, `git rev-parse HEAD origin/main`
2. **El código mismo**: Read/Grep del archivo real (schema.prisma es la fuente de los datos)
3. **worklog.md** — solo la COLA; historial viejo en `worklog-archivo-*.md`
4. **SESSION_HANDOFF.md** — estado volátil de la sesión
5. **Producción**: `curl https://conectalt.com/...` citando código HTTP + cuerpo
6. ✗ **PROHIBIDO como fuente**: resúmenes de chat, recuerdos de sesiones anteriores,
   documentos sin fecha de actualización.

---

## 2. Ritual de INICIO de sesión (obligatorio)

```bash
bash scripts/session-boot.sh
git log --oneline -15 && git status -s && git rev-parse HEAD origin/main
```

Después:
- Confirmar al dueño en **1 mensaje**: versión/estado git/tarea en vuelo.
- **Antes de tocar un archivo, LÉELO completo.** Nunca editar a ciegas.
- Si el dueño, el handoff o un resumen contradicen a git → **gana git** y se corrige el doc (§3.7).

---

## 3. Reglas anti-alucinación (duras, sin excepciones)

1. **Nada se afirma sin evidencia de ESTA sesión.** Antes de decir "X existe / funciona":
   un Read, Grep, git o curl que lo demuestre.
2. **Etiqueta siempre**: `VERIFICADO (comando → resultado)` vs `SUPOUESTO (por confirmar)`.
   Los supuestos se declaran explícitamente y nunca se usan para editar código.
3. **Nunca inventar**: rutas de archivos, endpoints, campos de Prisma, nombres de
   componentes, resultados de comandos que no se corrieron, fechas ni cifras.
4. **Producción se verifica, no se asume**: tras cada push, curl de las rutas afectadas
   citando el código HTTP (ej.: `GET /editorial → 200`).
5. **"No lo encontré" es una respuesta válida** — siempre preferible a inventar.
6. **Secrets JAMÁS** en el chat ni en docs del repo (sus lugares: `.env` y Vercel).
   El PROTOCOL.md v1 tuvo credenciales en texto plano — no repetir ese error.
7. **Si un doc contradice la realidad → corregir el doc EN la misma tarea.** Así muere el drift.
8. **Conversación compactada/resumida → re-verificar todo lo que se vaya a usar del resumen**
   antes de actuar sobre él (regla 0 nació de esto).

---

## 4. Ritual de CIERRE (por tarea y por sesión)

**Por tarea, en este orden:**
1. Append al `worklog.md` (formato definido en CLAUDE.md — append-only, nunca sobrescribir)
2. Actualizar `SESSION_HANDOFF.md` (≤ 40 líneas)
3. `bash scripts/session-task.sh` (contador + health check 🟢🟡🔴)
4. Si hubo código: lint/tsc de los archivos tocados → commit `sprint-X.Y-descripción` → push → curl de verificación

**Por sesión:** push ritual (PAT temporal → push → el dueño lo revoca) y avisar
"abrir chat nuevo y decir *boot*". Si el chat se traba: plan de rescate en `RECOVERY.md`
(probado el 10-Sep: recuperación completa en ~30 min).

---

## 5. Definición de TERMINADO (DoD de toda tarea con código)

Una tarea está cerrada SOLO cuando:
- [ ] Archivos leídos antes de editar (sin excepciones)
- [ ] Lint/tsc limpio en los archivos tocados
- [ ] Commit descriptivo + push a `main`
- [ ] **Verificación en producción con curl citando evidencia** (~2 min tras push)
- [ ] worklog + SESSION_HANDOFF + `session-task.sh`
- [ ] Aviso final al dueño en **español llano** (no técnico)

**Ruido pre-existente que NO bloquea:** 19 errores de lint en `scripts/*.js`; el build
local puede fallar si el `.env` del sandbox no tiene la cadena Neon (Vercel sí construye
con sus env vars). Validar con tsc sobre los archivos tocados.

---

## 6. Ficha técnica VERIFICADA (2026-09-12 — si pasan >2 semanas, re-verificar antes de confiar)

### Identidad
- **Producto**: Conecta Los Teques — directorio de vida nocturna de Los Teques, Venezuela
- **Dominio producción**: `https://conectalt.com` (200; `/api/auth/providers` responde google + demo — verificado hoy)
- **Repo**: github.com/sqn8nproyect-pixe/Conecta-Lt2.0 (branch `main`)
- **Deploy**: Vercel (proyecto conecta-lt2-0, región iad1) — auto-deploy ~2 min tras push a main; build `prisma generate && next build`; postinstall solo `prisma generate`

### Stack real (leído de package.json hoy)
- `next@^16.1.1` (App Router, `src/app/`) · `next-auth@^5.0.0-beta.32` (**Auth.js v5**)
- `@auth/prisma-adapter@^2.11.3` · `prisma@^6.11.1` + PostgreSQL **Neon**
- `tailwindcss@4` + shadcn/ui (New York) + Framer Motion + Zustand + Leaflet · runtime **bun**
- Auth export en `src/lib/auth.ts`: `{ handlers, auth, signIn, signOut }`; fix del check
  RFC 9207 (`iss`) de Google vía `customFetch` que borra
  `authorization_response_iss_parameter_supported` del discovery (líneas 35–72);
  `trustHost: true` (tipo oficial en v5)

### Auth y RBAC
- Google OAuth + Credentials demo (fallback)
- Roles USER / BUSINESS_OWNER / ADMIN; allowlist `ADMIN_EMAILS` en `src/lib/admin-config.ts`
  (override en JWT + re-verificación en cada request); `requireRole()` en `src/server/auth.ts`
- **Nunca pegar emails/secrets de cuentas en docs** — referenciar el archivo

### Flujo de flyers (BusinessEvent) — ciclo completo en producción
1. Dueño propone: `POST /api/owner/businesses/[slug]/events` (estado `PENDING_REVIEW`),
   imagen opcional vía presign EVENT → R2 `events/<slug>/<uuid>.<ext>`,
   `imageUrl=/api/images/events/<slug>/<uuid>` (validado server-side por slug)
2. Admin revisa: tab Eventos de `AdminDashboard` → miniatura → `FlyerReviewDialog`
   (arte en grande + Aprobar y publicar / Rechazar con nota)
3. Publicado: aparece en portada `/editorial` y en guía `/editorial/[slug]`
   (sección "Los flyers de este fin de semana") — **al instante**, porque cada
   POST/PATCH/DELETE admin llama `revalidateWeekendPages()` =
   `revalidatePath('/editorial')` + `revalidatePath('/editorial/[slug]', 'page')` (desde 8.11b)
4. Limpieza: botón **"Limpiar semana"** (solo semanas vencidas, guard server-side en
   wall clock Caracas) → `DELETE /api/admin/events?weekOf=YYYY-MM-DD` → borra DB +
   purga arte R2 (`purgeEventImage`) + revalida
- Estados: `DRAFT | PUBLISHED | PENDING_REVIEW | REJECTED` (enum `BusinessEventStatus`)
- ISR base de las páginas editoriales: 3600 (la revalidación explícita es lo que da la instantaneidad)
- Proxy de imágenes `GET /api/images/[...key]`: `ALLOWED_PREFIXES = ['businesses/','promotions/','events/']`
  (fix `d42f88e` — sin `events/` el dueño "no podía subir la imagen")

### Archivos clave (existencia verificada hoy en el árbol)
- `src/components/conecta/admin/EventsTab.tsx` — panel admin de eventos (bandejas por semana, revisión, limpiar semana)
- `src/components/conecta/owner/EventsOwnerTab.tsx` — formulario del dueño (presign → R2)
- `src/components/conecta/WeekendFlyersGrid.tsx` — grid público (exporta `FlyerEvent`)
- `src/app/editorial/page.tsx` (portada) · `src/app/editorial/[slug]/page.tsx` (guía)
- `src/app/api/admin/events/route.ts` (GET/POST/DELETE?weekOf) · `[id]/route.ts` (PATCH/DELETE)
- `src/app/api/owner/businesses/[slug]/events/…` · `src/server/services/event.service.ts`
- `src/app/api/upload/presign/route.ts` · `src/app/api/images/[...key]/route.ts`
- `src/lib/event-labels.ts` (wall clock Caracas: caracasParts/deriveFrom/weekHeader)
- `src/lib/auth.ts` · `src/server/auth.ts` · `src/lib/admin-config.ts` · `prisma/schema.prisma`

### Gotchas activos (lista completa operativa en SESSION_HANDOFF.md)
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI (el shell pisa `.env` con SQLite)
- Sandbox mata procesos background entre tool calls (server + test en la MISMA llamada bash)
- `bun -e` falla con Prisma → usar archivos (`bun scripts/x.ts`)
- AgeGate (cookie 30d) bloquea browser headless: aceptarlo antes de probar
- `NEXT_PUBLIC_*` se hornean en build → cambiarlas en Vercel exige Redeploy
- Restore de snapshot borra archivos NO trackeados (`.env` perdido ×2 → RECOVERY.md paso 6)
- No usar server actions (backend = API routes en `src/app/api/`); no usar SQLite

---

## 7. Índice de sprints recientes (fuente: worklog; verificado hasta 8.11b)

| Sprint | Qué | Commit |
|---|---|---|
| 8.6 | Panel admin ABM de eventos/flyers | (ver worklog) |
| 8.7–8.8 | Muro editorial + botón Acceder animado | `638a8a3` |
| 8.9 | Dueños proponen flyers + aprobación admin (PENDING_REVIEW) | `bac3020` |
| 8.10 | Flyer con imagen (R2 presign EVENT) | `0ae04c6` |
| 8.10-hotfix | Proxy `events/` permitido (fix "no sube la imagen") | `d42f88e` |
| 8.11 | Vista ampliada del arte + flyers en guía + sin Acceder en guía | `30a56da` |
| 8.11b | "Limpiar semana" + revalidación instantánea + purga R2 | `444a715` ✅ en producción (verificado 2026-09-12) |

Detalle completo de cada uno: cola de `worklog.md`; historial antiguo en `worklog-archivo-2026-09.md`.

---

## 8. Tareas pendientes (sección VIVA — actualizar al cerrar cada tarea)

1. **(Dueño)** Rotar `NEXTAUTH_SECRET`/`AUTH_SECRET` en Vercel + Redeploy (arrastrado desde 18-Ago)
2. **(Dueño, recomendado)** Rotar contraseña de Neon y llaves R2 — quedaron en texto plano
   en el PROTOCOL.md v1 (dentro del historial git)
3. **(Dueño)** Datos pendientes: IG de Africa Burguers · IG de Licobar JJ (@puntoencuentrolt) · dirección real de Medusa
4. **(Opcional)** Purgar objetos huérfanos en R2 (flyers borrados antes del 8.11b — inofensivos)
5. **(Dueño)** Revocar el PAT de GitHub al cerrar cada sesión que lo use (patrón PAT temporal)

---

## 9. Mantenimiento de este protocolo

- Cualquier agente que descubra drift (doc ≠ realidad) **corrige el doc en la misma tarea**
  y deja evidencia en el worklog.
- Mantener este archivo: ficha + reglas. Sin secrets, con fecha. Si crece demasiado, podar
  historial (eso vive en worklog), nunca las reglas de §1–§5.
- `SESSION_HANDOFF.md` es la RAM (≤40 líneas); `worklog.md` es la cinta histórica (append-only);
  este archivo es la Constitución. Los tres se actualizan en cada cierre de tarea.
