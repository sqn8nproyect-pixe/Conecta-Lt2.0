# 🗺️ PLAN MEJORAS ESTRUCTURALES — SEO + UX (Sprints 6-8)

> **Creado:** 2026-09-10 · **Estado:** aprobado para implementación · **Origen:** chat sesión restaurada
> **Base:** HEAD `31c40f0` (Auth.js v5 migrado) · Neon verificado E2E (28 negocios)
> **Actualizar tras cada sprint cerrado** — lo lee el boot de sesión vía worklog.
>
> **PROGRESO:** ✅ 6A parcial (descripciones/horarios saneados) · ✅ **6B + 7A implementados 2026-09-11** — rutas `/local` + `/local/[slug]` (SSG+ISR, 33 fichas), sitemap.xml dinámico, robots.txt, JSON-LD LocalBusiness/AggregateRating/BreadcrumbList, URL sync de la SPA. Sitemap registrado en Search Console 2026-09-11. ✅ 7B implementado 2026-09-11 (AgeGate cookie 30d + login contextual + retorno post-login). ✅ **Sprint 8 implementado 2026-09-11** (modelo EditorialPost, `/editorial` + `/editorial/[slug]` SSG+ISR con JSON-LD Article, sitemap 37 URLs, widget "Este fin de semana" en home; post v1 seedeado con datos verificados). ✅ **8.7 portada de flyers implementada 2026-09-11** (modelo BusinessEvent, 12 eventos del 11-13 sep en `/editorial` como muro visual con modal; guía escrita queda como segunda página; widget home apunta a la portada). ✅ **8.8 botón "Acceder" implementado 2026-09-11** (CTA global con glow animado + login contextual 7B conviven: ambos abren el MISMO LoginPromptModal; AccessButton standalone en `/editorial`). ✅ **8.6 ABM admin de eventos implementado 2026-09-12** (tab "Eventos" en AdminDashboard + API `/api/admin/events`: alta/edición/publicar/borrar de flyers sin tocar código; etiquetas y weekOf se derivan solas en horario Caracas). ✅ **E2E con DB real y visual validado 2026-09-12** (13/13 API + ABM visual completo en el panel + móvil 390px). Pendiente: cadencia semanal con el dueño. (6A.1 cifra en layout: verificado 2026-09-11 — ya no existe ninguna cifra hardcodeada de locales, resuelto).

---

## 📊 Orden de prioridad (decisión)

| # | Sprint | Mejora | Por qué en ese orden | Esfuerzo |
|---|--------|--------|---------------------|----------|
| 1 | **6A** | Saneamiento de datos | Cimiento: metadatos, JSON-LD y editorial consumen estos datos. Garbage in → garbage out. Incluye quick wins (cifra "21"→"28" ya localizada en `layout.tsx:29`) | 2-4h |
| 2 | **6B** | Rutas dedicadas `/local/[slug]` | Backbone estructural: **hoy Google no indexa ningún local** (todo es client-side, `view === 'detail'` sin URL). Sin URLs no hay sitemap ni JSON-LD que valgan | 4-6h |
| 3 | **7A** | Sitemap.xml dinámico + JSON-LD | Barato una vez que existen las URLs y los datos limpios; multiplica el valor de 6A+6B (rich results) | 2-3h |
| 4 | **7B** | AgeGate cookie 30d + login contextual | Ortogonal al SEO (es UX/conversión). Rápido y desacoplado — cabe entre sprints sin bloquear nada | 2-3h |
| 5 | **8** | Editorial "qué hacer este fin de semana" | Mayor esfuerzo y valor de largo plazo. Necesita 6B (links internos a /local/[slug]) y 6A (datos fiables) para rendir | 8-12h |

**Cadena de dependencias:**

```
6A datos limpios ──► 6B URLs indexables ──► 7A sitemap + JSON-LD ──► 8 editorial
                                                │
7B AgeGate/login (ortogonal — cabe en paralelo) ┘
```

**Lógica:** cada capa multiplica a la anterior. Los quick wins van primero (momentum + desbloquean medición). Lo ortogonal (7B) se intercala donde no estorbe. La pieza grande (8) se lanza sobre cimientos indexables.

---

## 🔍 Hallazgos del diagnóstico (2026-09-10)

- `src/app/layout.tsx:29` — metadata dice "**las 21** mejores" → corregir a **28**
- `src/lib/data.ts` — **código muerto** (nadie lo importa; 80 IDs string estáticos). Candidato a eliminarse o reubicarse como seed
- **Slugs:** 28/28 únicos, 0 nulls → `/local/[slug]` no requiere migración de datos
- **Descripciones:** 27/28 únicas. Duplicada: "Selección especializada de rones añejos venezolanos..." (2 negocios la comparten)
- **AgeGate:** persiste en `sessionStorage` (cada sesión de navegador). La lógica vive en `src/app/page.tsx` (ageVerifiedInMemory + listeners) con comentario que explica el porqué (no romper OAuth callback)
- **Rutas:** solo `/` y `/r/[code]` — no existe `sitemap.ts` ni `robots.ts`
- **Render:** todo client-side vía store (`view === 'detail'` → `<EstablishmentPage/>`)

---

## Sprint 6A — Saneamiento de datos (2-4h)

**Objetivo:** que cada negocio tenga descripción única, gramática correcta, horarios normalizados y cifras reales. Todo el SEO posterior se alimenta de esto.

| Tarea | Archivo/Dónde | Detalle |
|-------|---------------|---------|
| 6A.1 Cifra "21"→"28" | `src/app/layout.tsx:29` | Metadata description. Corregir y agregar verificación (no hardcodear de nuevo: opcional usar conteo dinámico) |
| 6A.2 Descripción duplicada | DB (Neon) | Negocio con copia de "Selección especializada de rones añejos..." → redactar versión única |
| 6A.3 Gramática | DB | Audit de las 28 descripciones + `valueProposition` + `specialty`: ortografía, tildes, consistencia de tono |
| 6A.4 Horarios | DB + UI | Normalizar formato (`schedule` string libre hoy). ⚠️ **TAREA DEL USUARIO:** proveer horarios reales verificados por negocio — preparar tabla/plantilla para volcado |
| 6A.5 Limpiar data.ts | `src/lib/data.ts` | Confirmar código muerto y eliminar (o mover a `prisma/seed.ts` si sirve como seed) |

**Criterios de done:**
- [ ] Metadata dice 28 (o conteo dinámico)
- [ ] 28/28 descripciones únicas y revisadas
- [ ] Horarios con formato normalizado
- [ ] data.ts eliminado o reubicado
- [ ] smoke-test.sh en verde

---

## Sprint 6B — Rutas dedicadas `/local/[slug]` (4-6h) ✅ IMPLEMENTADO 2026-09-11

**Objetivo:** cada negocio en una URL real, renderizada en servidor, indexable, con metadatos y canonical propios.

**Implementación real:** `src/app/local/[slug]/page.tsx` (Server Component, SSG+ISR `revalidate=3600`, generateStaticParams con fallback sin DB, generateMetadata con canonical/OG/Twitter) · hub `src/app/local/page.tsx` (directorio por categoría, 33 links internos) · URL sync en la SPA (`src/app/page.tsx`: deep-link `/?local=slug` → vista detail, y `replaceState('/local/slug')` en navegación in-app) · la UI interactiva de `EstablishmentPage` se mantiene como vista in-app (6B.3 resuelto vía ficha server + CTA `/?local=slug`, sin refactor riesgoso de 1652 líneas).

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| 6B.1 Ruta dinámica | `src/app/local/[slug]/page.tsx` (nuevo) | Server Component. `generateStaticParams()` con los 28 slugs (SSG) + `revalidate = 3600` (ISR: locales nuevos sin rebuild) |
| 6B.2 Metadatos | idem | `generateMetadata()`: title (`{nombre} — {categoría} en Los Teques`), description (de la data saneada), canonical propio (`/local/{slug}`), OG/Twitter card con coverImage |
| 6B.3 Reutilizar UI | `EstablishmentPage.tsx` | Extraer la vista a componentes server-compatibles; la página de ruta consume la misma UI. Mantener flujo client-side actual como transición interna |
| 6B.4 Links reales | `HomePage.tsx`, `DirectorioPage.tsx`, `MapPage.tsx`, cards | Cambiar `setView('detail')` por `<Link href="/local/[slug]">` en los puntos de entrada (la vista cliente puede seguir para navegación in-app, pero la URL siempre cambia) |
| 6B.5 Noindex en privadas | layouts de admin/owner, `/r/[code]` | `robots: { index: false }` en metadatos de rutas privadas |
| 6B.6 Redirects legados | N/A | No existen URLs legacy de locales — nada que redirigir (documentado para futuro) |

**Criterios de done:**
- [ ] `/local/licoreria-selecta` responde 200 con HTML server-rendered (curl muestra el nombre en el HTML)
- [ ] Cada página tiene `<link rel="canonical">` propio
- [ ] Ver 28 páginas en el build (`next build` lista `/local/[slug]` como estáticas/ISR)
- [ ] Navegación desde directorio y mapa funciona (agent-browser)
- [ ] smoke-test.sh extendido con 2-3 URLs de local en verde

---

## Sprint 7A — Sitemap dinámico + JSON-LD (2-3h) ✅ IMPLEMENTADO 2026-09-11

**Objetivo:** que Google descubra las URLs y muestre rich results.

**Implementación real:** `src/app/sitemap.ts` (35 URLs, ISR 1h, fallback sin DB) · `src/app/robots.ts` (reemplaza public/robots.txt) · JSON-LD en `src/lib/seo.ts` + `src/app/local/[slug]/page.tsx`: un solo bloque `@graph` con LocalBusiness/subtipo (LiquorStore/NightClub/BarOrPub por categoría), AggregateRating solo si `reviewCount>0`, BreadcrumbList (Inicio→Locales→Local), openingHoursSpecification agrupada, geo, sameAs. Validado E2E con `scripts/validate-jsonld.mjs`.

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| 7A.1 Sitemap | `src/app/sitemap.ts` (nuevo) | Estático (`/`, secciones) + dinámico: los 28 `/local/[slug]` desde DB (query a Neon en build/ISR). `lastModified` desde `updatedAt` |
| 7A.2 Robots | `src/app/robots.ts` (nuevo) | Allow todo, disallow `/api/`, admin/owner; host + URL del sitemap |
| 7A.3 JSON-LD LocalBusiness | página del local (6B) | Schema.org `LocalBusiness` (o subtipo por categoría: `Store`/`NightClub`/`BarOrPub`) con name, address, geo, telephone, openingHours (horarios saneados 6A), image, url, priceRange |
| 7A.4 JSON-LD AggregateRating | idem | Solo si `reviewCount > 0` (cumplir políticas de Google: rating sin suficientes reseñas es riesgo de manual action) |
| 7A.5 JSON-LD BreadcrumbList | idem + layout | Inicio → Categoría → Local |
| 7A.6 Search Console | externo | Registrar sitemap cuando esté en producción (conectalt.com) tras el push |

**Criterios de done:**
- [ ] `/sitemap.xml` lista 30+ URLs (locales + secciones)
- [ ] `/robots.txt` correcto
- [ ] Rich Results Test (Google) pasa en 2-3 locales de muestra
- [ ] JSON-LD validado (no duplicar: un solo bloque LocalBusiness por página)

---

## Sprint 7B — AgeGate 30d + login contextual (2-3h)

**Objetivo:** reducir fricción sin perder cumplimiento; el login aparece en el momento de la acción, no como muro global.

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| 7B.1 Cookie 30 días | `src/app/page.tsx` + `AgeGate.tsx` | Migrar de `sessionStorage` a cookie propia (`ageVerified=1; Max-Age=2592000; SameSite=Lax; Secure`). ⚠️ Mantener el patrón anti-hydration-mismatch documentado en page.tsx (getServerSnapshot=false) |
| 7B.2 Nota regulatoria | idem | Documentar en el comentario: cookie 30d sigue cumpliendo "verificación razonable de edad" para alcohol (criterio del dueño) |
| 7B.3 Login contextual | `Navbar.tsx`, `use-favorite-actions.ts`, `use-reservation-actions.ts`, `use-redemption-actions.ts` | Quitar CTA global de login del navbar (dejar avatar/solo si hay sesión). Al intentar favoritar/reservar/canjear sin sesión → abrir modal de login con mensaje contextual ("Inicia sesión para guardar este local") |
| 7B.4 Retorno post-login | idem | Tras signIn exitoso, completar la acción original (deep-linking de intención) |

**Criterios de done:**
- [ ] Confirmar edad una vez → no reaparece en 30 días (verificado con agent-browser, cookie visible en DevTools)
- [ ] OAuth callback no re-muestra el gate (la cookie sobrevive el reload)
- [ ] Favorito sin sesión → modal contextual → login → favorito guardado
- [ ] Navbar sin CTA de login para visitantes (solo acciones contextuales)

---

## Sprint 8 — Editorial "Qué hacer este fin de semana" (8-12h) — ✅ IMPLEMENTADO 2026-09-11 (8.1-8.5 + 8.7 flyers)

**Objetivo:** contenido fresco de long-tail SEO que enlace internamente a los locales (el formato exacto del título captura búsquedas locales semanales). **Refinamiento 8.7:** la gente no lee — la primera pantalla es un muro de 12 flyers visuales con los eventos de los dueños; la guía escrita queda como segunda página.

**Fases (entregable incremental):**

| Fase | Qué | Detalle |
|------|-----|---------|
| 8.1 Modelo | `prisma/schema.prisma` | `EditorialPost`: id, slug, título, excerpt, body (markdown), publishedAt, weekOf (fecha), status (DRAFT/PUBLISHED), `businessIds[]` (refs a locales mencionados) |
| 8.2 Ruta sección | `src/app/editorial/page.tsx` | Listado de posts publicados (server-rendered) |
| 8.3 Ruta post | `src/app/editorial/[slug]/page.tsx` | SSR + generateMetadata + JSON-LD `Article` + links internos `<Link href="/local/[slug]">` a los locales mencionados + sitemap inclusion |
| 8.4 Post v1 curado | seed | Primer post real: "Qué hacer este fin de semana en Los Teques (18-19 sep)" — **requiere datos del usuario** (eventos/promos reales de la semana) |
| 8.5 Widget home | `HomePage.tsx` | Card "Este fin de semana" enlazando al post activo (frescura + internal linking desde la home) |
| 8.6 ✅ Admin ABM eventos | `EventsTab.tsx` + `/api/admin/events` | Alta/edición/publicar/despublicar/borrar flyers desde el panel (tab "Eventos"). Etiquetas `dayLabel/dateLabel/timeLabel` y `weekOf` se derivan automáticamente de fecha+hora (wall clock Caracas UTC-4, con override manual opcional). Selector de local reusa `fetchAdminBusinesses`; temas validados contra `event-themes.ts`. GET ADMIN/MODERATOR · mutaciones ADMIN |
| 8.7 ✅ Portada de flyers | `BusinessEvent` + `WeekendFlyersGrid` | 12 eventos de los dueños como flyers (grid 2/3/4 cols, 12 themes de color, modal con promo/WhatsApp/ficha). 7 de 12 anclados a promos vigentes reales (códigos en DB). `prisma/seed-weekend-events.ts` idempotente |
| 8.8 ✅ CTA global "Acceder" | `AccessButton.tsx` + `Navbar.tsx` | Botón dorado siempre visible para visitantes (glow pulsante respeta reduced-motion + shine al hover) que abre el MISMO LoginPromptModal del login contextual 7B (`store.requestLogin`). Prop `standalone` para `/editorial` (páginas server sin SPA). Petición del dueño: "podemos usar las 2 maneras" |

**Criterios de done:**
- [x] Post v1 publicado en `/editorial/[slug]`, indexable, con 3+ links a /local/[slug] — **15 links internos** (body markdown + sección "Locales mencionados")
- [x] Sitemap incluye el post (37 URLs: 3 estáticas + 33 fichas + 1 post)
- [x] JSON-LD Article válido (validado E2E: scripts/validate-editorial.mjs 25/25)
- [x] 8.7: portada `/editorial` = 12 flyers con modal (validate-weekend-flyers.mjs 27/27; E2E visual desktop/móvil; widget home → `/editorial`)
- [x] 8.8: doble vía de login verificada E2E — navbar muestra "Acceder" a visitantes; click abre 1 solo dialog (sin duplicar el modal global); móvil 390px sin solapamientos; consola sin errores
- [x] 8.6: eslint limpio + build OK + E2E sin DB 7/7 + **E2E con DB real 13/13** (`scripts/e2e-events-db.ts`: login admin→401 anónimo→GET 12→filtros status/weekOf→POST 201→400s→PATCH publish→DELETE→404) + **E2E visual completo** (`scripts/e2e-events-visual.sh`: crear flyer con tema/estado vía Radix Select y etiquetas auto Caracas, publicar, editar, eliminar con confirmación; contadores 12→13→12; móvil 390px; consola sin errores). DB sin leftovers de test (`scripts/cleanup-e2e-event.ts`)
- [ ] Cadencia semanal definida con el dueño (quién escribe, cuándo) — **pendiente decisión del dueño**; mientras tanto, `prisma/seed-editorial.ts` es la plantilla: se cambia el contenido y `weekOf`, se re-ejecuta (`bun run db:seed-editorial`)

**Notas de implementación (2026-09-11):**
- Post v1: "Qué hacer este fin de semana en Los Teques (12 y 13 de septiembre)" — seedeado SOLO con datos verificados de la DB (7 promos vigentes con endDate ≥ 12-sep, horarios de BusinessHours, ratings con reviewCount real). Las promos vencidas (endDate < hoy) NO se citan aunque sigan status=ACTIVE en la DB.
- Los slugs de los links se resuelven en runtime desde la DB (si un local no existe, el nombre queda sin link) — el seed es idempotente (upsert por slug).
- Widget home: client-side via `/api/editorial/active` (staleTime 10 min); se oculta si no hay post — la home nunca muestra un widget vacío.
- react-markdown renderiza el body; links internos (`/local/...`) → `<Link>`, externos → `<a target=_blank>`.
- 8.6 (ABM de posts en AdminDashboard) diferido a sprint posterior; editar posts = editar `prisma/seed-editorial.ts` y re-seede.

---

## ⚠️ Riesgos y notas de implementación

1. **Sin PAT → sin push.** Cada sprint cierra con commit local. Push cuando el usuario cree PAT nuevo; deploy Vercel posterior. Verificar conectalt.com después de cada deploy (es producción real con usuarios).
2. **Horarios reales:** bloqueante parcial de 6A.4 — el dueño debe proveerlos (plantilla: nombre / horario semanal / festivos). Yo normalizo el formato; la verdad la pone el dueño.
3. **SSG vs ISR:** con `revalidate`, alta/edición de negocio en admin se refleja en ≤1h sin rebuild. Si el dueño quiere instantáneo: `revalidatePath('/local/[slug]')` en los handlers de admin (tarea opcional de 6B).
4. **AggregateRating:** solo con reviewCount ≥ razonable; si un local no tiene, omitir el bloque (política de Google).
5. **Métricas de éxito (2-4 semanas post-deploy):** indexación de los 28 locales en Search Console, impresiones de queries locales ("licorería los teques", "discoteca los teques"), CTR del sitemap. Baseline actual: 0 URLs indexables.

## 📌 Protocolo por sprint

Al cerrar cada sprint: smoke-test.sh + auth-e2e-test.js en verde → build → commit local → worklog + SESSION_HANDOFF → siguiente sprint. (El ritual completo de push/chat-nuevo queda para el cierre de sesión del dueño.)
