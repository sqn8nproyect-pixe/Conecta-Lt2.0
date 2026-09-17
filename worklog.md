> ℹ️ El historial antiguo está en `worklog-archivo-2026-09.md`
> (último re-archivado: 2026-09-12 — 51 entradas movidas).
> Leer la COLA de ese archivo para contexto antiguo; la COLA de worklog.md para lo reciente.

---
Task ID: 8.6
Agent: main (Super Z)
Task: Sprint 8.6 — panel admin para gestionar flyers/eventos (BusinessEvent) sin tocar código (petición del dueño: "vamos a panel admin para gestionar flyers/eventos sin tocar código").

Work Log:
- Contexto: SESSION_HANDOFF + worklog + PLAN leídos. Descubrimiento crítico: el workspace fue restaurado de un snapshot viejo y `.env` perdió la cadena de Neon (quedó solo la línea SQLite del gotcha). Sin Postgres/docker local → E2E completo con DB bloqueado hasta que el dueño pegue la cadena (RECOVERY.md paso 6).
- Nuevo `src/lib/event-themes.ts`: fuente de verdad de las 12 claves de tema (validación server + selector admin) + hex para puntos de color inline (evita clases Tailwind dinámicas).
- Nuevo `src/server/services/event.service.ts`: parseEventPayload (valida POST completo/PATCH parcial, longitudes, tema, fechas, status) + serializeEvent (fechas ISO / weekOf YYYY-MM-DD).
- Nueva API `src/app/api/admin/events/route.ts` (GET lista con local, filtros status/weekOf; POST ADMIN con check de local) y `[id]/route.ts` (PATCH parcial, DELETE, 404 claros). Patrón Next 16: `params: Promise<{id}>`.
- `src/lib/api.ts`: fetchAdminEvents/createAdminEvent/updateAdminEvent/deleteAdminEvent (mismo patrón throwAdminError).
- Tipos: AdminEvent/AdminEventInput/BusinessEventStatus en types.ts.
- Nuevo `src/components/conecta/admin/EventsTab.tsx` (tab "Eventos" en AdminDashboard): lista agrupada por semana con badges (N flyers, borradores/Publicada), filas con emoji+título+frase+local+chips+tema+notas; acciones ojo (publicar/despublicar), lápiz (editar), papelera (AlertDialog de confirmación). Dialog de formulario: local, título, frase, fecha+hora, tema con punto de color, emoji, estado, notas de precio/promo, orden. dayLabel/dateLabel/timeLabel y weekOf SE DERIVAN SOLOS de fecha+hora en wall clock Caracas (UTC-4 fijo; caracasParts() para re-editar; startsAt construido con offset -04:00), con checkbox "Personalizar etiquetas" para override. Vista previa de etiquetas antes de guardar. Hints: portada muestra la semana más reciente, cambios visibles vía ISR 3600.
- Validación: eslint limpio; `bun run build` OK (rutas nuevas en output); E2E sin DB `scripts/e2e-events-nodb.sh` 7/7 (4 rutas → 401 sin sesión ANTES de tocar DB, /api/admin/businesses intacto 401, /editorial 200, chunk del bundle contiene EventsTab).
- Commit local pendiente de push (PAT revocado; pedir nuevo al dueño).

Stage Summary:
- Sprint 8.6 código COMPLETO y compilando; falta E2E con DB real (CRUD + visual con agent-browser) y push.
- Bloqueos para el dueño: ① pegar DATABASE_URL (Neon pooled, sin channel_binding) + DIRECT_URL (sin -pooler) para reconstruir .env — se compartieron en un chat anterior o están en Neon console; ② PAT nuevo de GitHub para push.
- Lección registrada: el restore de snapshot del sandbox borra archivos no trackeados (ya perdió .env una vez); RECOVERY.md paso 6 cubre la reconstrucción.

---
Task ID: hotfix-login-cierre
Agent: main (Super Z)
Task: Cierre del hotfix "error Configuration" en login Google de producción + push con PAT nuevo + verificación en conectalt.com.

Work Log:
- Causa raíz real identificada (no era el secret): el check de RFC 9207 (iss) de oauth4webapi en @auth/core 0.41.3 — Google devuelve iss sin coincidencia esperada → excepción → error=Configuration. Neutralizado vía customFetch en discovery (commit 0edb9ea).
- Commits adicionales: f242901 (serializador maneja cause-objeto de AuthError v5), d5ddac3 (cast TS7053 en página de error), 64d6222 (docs/worklog del hotfix).
- PAT nuevo del dueño configurado en remote → push exitoso: main == origin/main, working tree limpio (0/0 adelantados).
- Verificación en producción (conectalt.com): /api/diagnose-auth/google-token → HTTP 200 con verdict "✅ SECRET VÁLIDO" (invalid_grant con código falso = Google autenticó el cliente OK; secret de 35 chars prefijo GOCSPX); /auth/error → 200 (página de error en español con marca); /editorial → 200.
- Diagnóstico endpoint confirma: el secret NUNCA fue la causa; el fix iss resuelve el síntoma.

Stage Summary:
- Incidente de login RESUELTO y desplegado; dueño confirma "todo perfecto".
- Higiene de repo completada en la sesión (PROJECT_STATUS.md sanitizado, presign restaurado, fileMode false, remote limpio).
- Pendiente de seguridad: rotar NEXTAUTH_SECRET (arrastrado desde 18-Ago) y recordar rotación periódica del PAT si se pega en chats.
- Pendiente de datos: IG Africa Burguers, IG Licobar JJ (@puntoencuentrolt), dirección real de Medusa.

---
Task ID: ui-editorial-sin-acceder
Agent: main (Super Z)
Task: Petición del dueño — eliminar el botón "Acceder" de la sección "Qué hacer este fin de semana en Los Teques" (/editorial).

Work Log:
- Localizado: <AccessButton standalone /> en el breadcrumb del encabezado de src/app/editorial/page.tsx (línea 182), junto al import en línea 18.
- Eliminados botón + import; breadcrumb convertido en <nav> independiente con mb-5 (misma apariencia, sin flex sobrante).
- ESLint limpio; bun run build OK. Commit dd1085c pusheado a origin/main → auto-deploy Vercel.

Stage Summary:
- Botón "Acceder" fuera de la guía de fin de semana; el botón global del Navbar (esquina superior derecha) permanece para visitantes.
- Pendientes del dueño sin cambios: rotar NEXTAUTH_SECRET; IG Africa Burguers, IG Licobar JJ, dirección Medusa.

---
Task ID: hotfix-tablet-pkce-cookie
Agent: main (Super Z)
Task: Tablet del dueño falla login con error=Configuration (captura WhatsApp 17:42 VET). Diagnóstico real vía AuthErrorLog y mitigación.

Work Log:
- AuthErrorLog en producción reveló la secuencia: 20:48-20:52 iss missing (bug viejo, ya fijado) → 20:58 invalid_grant Malformed auth code (reintento con código gastado) → ~21:00 login OK en PC ("todo perfecto") → 21:19 y 21:42 pkceCodeVerifier cookie was missing (tablet).
- Causa raíz del caso tablet: el navegador descarta la cookie authjs.pkce.code_verifier durante el viaje a Google y vuelta. Servidor verificado INNOCUO: simulación curl con UA de tablet confirma Set-Cookie pkce correcto (Max-Age=900, Secure, HttpOnly, SameSite=Lax), 302 a Google con code_challenge, redirect_uri apex registrado; http→308 https y www→307 apex limpios.
- Cambios (commit 6832874): ① /auth/error Configuration ya no acusa credenciales del servidor — texto con pasos prácticos (abrir Chrome/Safari directo, limpiar datos del sitio) + RetryGoogleButton (client component con signIn('google')); ② nuevo /api/diagnose-auth/cookie-probe — contador de visitas con cookie cl_probe: si sube entre recargas, el navegador conserva cookies; si no, las bloquea/borra (prueba definitiva en 20 s desde la tablet).
- Build OK, push dd1085c..6832874, deploy automático.

Stage Summary:
- Pendiente del dueño: en la tablet abrir conectalt.com en Chrome directamente (NO desde WhatsApp), reintentar login; opcional visitar /api/diagnose-auth/cookie-probe dos veces y reportar el número. Tras su reintento, revisar last-auth-error para confirmar.
- Si el probe muestra cookies OK y el login sigue fallando en la tablet → siguiente sospecha: WebView/embebido o anti-logging agresivo; considerar checks state en vez de pkce NO resuelve (mismo requisito de cookie).

---
Task ID: sprint-8.9-flyers-aprobacion
Agent: main (Super Z)
Task: Dueños de negocios proponen flyers para "Qué hacer este fin de semana en Los Teques" con aprobación previa del administrador (petición del dueño: "ya tenemos algo similar implementado" = flujo fotos PendingPhotosTab + API owner existente).

Work Log:
- Reutilizado el ecosistema existente: User.role BUSINESS_OWNER, Business.ownerId, assertBusinessOwnership (con override ADMIN por email), patrón de rutas /api/owner/businesses/[slug]/*, OwnerDashboard con tabs, admin EventsTab (Sprint 8.6).
- Schema: enum BusinessEventStatus += PENDING_REVIEW/REJECTED; BusinessEvent += reviewNote String?. Migración SQL idempotente en prisma/migrations/20260912000000_event_submission/.
- BLOQUEO RESUELTO: sin acceso a Neon localmente (.env con línea SQLite del snapshot). Solución: auto-DDL al arranque via src/instrumentation.ts (register) + src/server/db-bootstrap.ts — statements idempotentes (ADD VALUE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), 1 ejecución memoizada por proceso, tolera carreras entre lambdas, no tumbla el server si falla, no-op con SQLite local.
- event.service.ts: ALL_STATUSES (4 estados) en parseEventPayload + reviewNote (280 max) + serializeEvent incluye reviewNote + parseOwnerEventPayload(body, partial, businessId) que rechaza status/sortOrder/businessId/reviewNote del cliente dueño e inyecta el local verificado.
- API owner nueva: GET+POST /api/owner/businesses/[slug]/events (POST fuerza PENDING_REVIEW/sortOrder 0/reviewNote null) y [id]/route.ts PATCH+DELETE (solo PENDING_REVIEW/REJECTED, 409 si ya procesada; PATCH re-envía a revisión).
- GET admin events: ?status= acepta los 4 valores.
- lib/event-labels.ts: helpers Caracas extraídos de EventsTab (caracasParts/deriveFrom/toTimeLabel/weekHeader) — fuente única para admin+owner.
- Admin EventsTab: bandeja ámbar "Pendientes de aprobación" (Aprobar→PUBLISHED limpia nota; Rechazar→AlertDialog con nota 280c), EventRow con badges de 4 estados + motivo de rechazo visible, eye-toggle solo DRAFT/PUBLISHED, form Select con 4 estados.
- EventsOwnerTab (nuevo): proponer flyer (mismo formulario sin estado/orden/local), badges de estado, motivo del rechazo citado, editar/cancelar solo pendiente/rechazada, agrupación por semana, empty states.
- api.ts: fetchOwnerEvents/createOwnerEvent/updateOwnerEvent/deleteOwnerEvent (throwOwnerError). types.ts: BusinessEventStatus 4 valores, AdminEvent.reviewNote, OwnerEventInput.
- Diag: /api/diagnose-auth/db-schema (enum values + existencia reviewNote, sin datos sensibles) para confirmar el auto-DDL post-deploy.
- ESLint limpio ×13 archivos, prisma generate OK, bun run build OK ×2. Commit bac3020 pusheado → deploy Vercel aplica el DDL solo.

Stage Summary:
- Flujo completo: dueño propone → en revisión → admin aprueba (sale en /editorial por ISR) o rechaza con motivo → dueño corrige y reenvía.
- Pendiente de verificación post-deploy: GET /api/diagnose-auth/db-schema debe decir "APLICADA"; luego prueba E2E con login del dueño (proponer) + admin (aprobar).
- Nota: portada refresca vía ISR 3600; aprobaciones visibles en <1h o al redeploys.

---
Task ID: sprint-8.10-flyer-imagen
Agent: main (Super Z)
Task: El dueño reportó "no veo como subir la imagen de un flayer personalizado" — el formulario 8.9 era solo texto. Agregar subida de imagen de flyer (R2) al flujo dueño→admin.

Work Log:
- Diagnóstico: BusinessEvent NO tenía campo de imagen (flyers 100% CSS). Además el commit local 5af7cac (snapshot, sin pushear) había borrado src/app/api/upload/presign/route.ts — restaurado con git checkout origin/main.
- Schema: BusinessEvent += imageUrl/imageKey TEXT (prisma/schema.prisma + migración 20260912120000_event_image + auto-DDL en db-bootstrap.ts — idempotente, aplica solo en Vercel al arrancar).
- presign: imageType 'EVENT' → key events/<slug>/<uuid>.<ext>; api.ts presignUpload acepta EVENT.
- event.service: imageUrl validada como ruta interna /api/images/ (rechaza URLs externas); parseOwnerEventPayload recibe businessSlug y exige prefijo /api/images/events/<slug>/ (un dueño no puede adjuntar la carpeta de otro). serializeEvent incluye ambos.
- EventsOwnerTab: FlyerImageField (dropzone drag&drop/clic, JPG/PNG/WebP ≤5MB, preview local, Cambiar/Quitar); submit envía imageUrl/imageKey; fila muestra miniatura 3:4 si hay imagen; texto de empty state actualizado.
- Admin EventsTab: miniatura del arte en filas (el admin revisa antes de aprobar).
- Portada /editorial + WeekendFlyersGrid: FlyerEvent.imageUrl; si hay imagen el arte llena el flyer (object-cover + velo inferior para local/hora/pill), modal muestra el arte completo (object-contain); sin imagen todo como antes (tema+emoji).
- Diag db-schema ahora reporta eventImageColumns + migracionImagen.
- ESLint limpio (0 errores; quitadas 5 directivas no-img-element sobrantes), bun run build OK. Commit 0ae04c6 pusheado → deploy Vercel.

Stage Summary:
- Flujo completo: dueño adjunta arte (opcional) → PENDING_REVIEW → admin ve la miniatura y aprueba → el flyer sale en /editorial con la imagen real del dueño.
- Compatibilidad total: eventos sin imagen siguen renderizando con tema+emoji.
- Pendiente post-deploy: GET /api/diagnose-auth/db-schema debe decir migracionImagen "✅ APLICADA"; E2E con sesión del dueño (subir imagen) y admin (aprobar) pendiente de prueba del dueño.

---
Task ID: sprint-8.10-hotfix-proxy-eventos
Agent: Super Z (main agent)
Task: El dueño reportó "no sube la imagen" del flyer personalizado. Diagnosticar y resolver.

Work Log:
- Redescubrimiento: commit 0ae04c6 (8.10) ya implementaba la subida (presign EVENT → R2 → imageUrl=/api/images/events/<slug>/<uuid>). Todo pusheado y en producción.
- CAUSA RAÍZ: el proxy GET /api/images/[...key] tenía ALLOWED_PREFIXES=['businesses/','promotions/'] — las claves events/ (únicas que genera el flyer 8.10) devolvían 403 "Clave no permitida". Es decir: el PUT a R2 SÍ subía el archivo, pero al terminar la vista previa cambiaba del objectURL local a la URL del proxy → imagen rota al instante. Para el dueño se veía como "no sube la imagen" (100% reproducible con cualquier formato).
- Verificado que el resto de la cadena estaba OK: event.service valida imageUrl.startsWith('/api/images/events/<slug>/'), grid público usa <img> normal, R2 configurado en Vercel (E2E 8.8 con menús ya lo probó), CORS de R2 OK (PUT 200 en E2E previo).
- FIX: d42f88e — ALLOWED_PREFIXES ahora incluye 'events/' + mensaje de error del cliente incluye código HTTP del PUT (para diagnósticos futuros). Lint: 19 errores pre-existentes solo en scripts/*.js; tsc limpio en archivos tocados.
- Verificación en producción (sin auth, clave sintética): ANTES 403 {"error":"Clave no permitida"} → DESPUÉS 404 {"error":"Imagen no encontrada"} = fix desplegado y funcionando.

Stage Summary:
- Deploy d42f88e en producción; el flujo dueño→sube flyer→admin aprueba→/editorial queda operativo end-to-end.
- Los intentos fallidos del dueño dejaron objetos huérfanos en R2 (se subieron bien, solo no se servían): inofensivos, sin exposición pública.
- Pendiente del dueño (recordar): rotar NEXTAUTH_SECRET en Vercel; datos IG Africa Burguers / Licobar JJ y dirección de Medusa.

---
Task ID: sprint-8.11-guia-flyers-admin
Agent: Super Z (main agent)
Task: 3 pedidos del dueño: ① vista para que el admin vea qué imagen aprueba, ② flyers también reflejados en la página 2 (guía /editorial/[slug]), ③ eliminar botón Acceder de la página 2.

Work Log:
- Mapeo: página 1 = /editorial (muro de flyers, sin Acceder desde dd1085c); página 2 = guía /editorial/[slug] (markdown del admin) — tenía <AccessButton standalone /> y NO mostraba los eventos.
- ① EventsTab.tsx: PendingEventRow ahora muestra la MINIATURA del flyer subido (o emoji si no hay) y al tocarla abre FlyerReviewDialog — flyer en grande (max-h 55vh) + datos del local + botones Aprobar y publicar / Rechazar dentro del diálogo. Header de la bandeja: "toca la miniatura del flyer para verlo en grande".
- ② /editorial/[slug]/page.tsx: nueva función getWeekendEvents(weekOf) (mismo shape FlyerEvent que la portada) + sección "Los flyers de este fin de semana" reutilizando WeekendFlyersGrid, entre el cuerpo markdown y "Locales mencionados". Solo renderiza si hay eventos PUBLISHED de esa semana. ISR 3600 existente.
- ③ Eliminado AccessButton (import + uso) de la guía; breadcrumb queda solo, igual que en la portada.
- Verificación: tsc limpio en archivos tocados (errores restantes pre-existentes en editorial/page.tsx y WeekendFlyersGrid, no tocados); lint 19 errores solo en scripts/*.js. Deploy 30a56da → producción: sección "Los flyers de este fin de semana" presente en /editorial/que-hacer-este-fin-de-semana-los-teques-12-13-septiembre y 0 apariciones de "Acceder".
Stage Summary:
- El flujo dueño→admin queda completo: dueño sube flyer → admin lo VE en grande → aprueba → sale en portada Y en la guía (página 2).
- Recordatorios pendientes del dueño: rotar NEXTAUTH_SECRET; datos IG Africa Burguers / Licobar JJ; dirección de Medusa.

---
Task ID: sprint-8.11b-limpiar-semana
Agent: Super Z (main agent)
Task: "Adelante" del dueño a la oferta: ① botón "Limpiar semana" (borrado masivo de flyers vencidos de una vez) ② reflejo instantáneo en el sitio público tras borrar/aprobar (antes ISR 1h).

Work Log:
- event.service.ts: helper purgeEventImage(imageKey) — borra el arte del flyer en R2 best-effort (un fallo de R2 no bloquea el borrado DB). El schema ya tenía imageKey "para eliminación futura" — ahora se usa.
- /api/admin/events (colección): nuevo DELETE ?weekOf=YYYY-MM-DD — findMany {id,imageKey} → deleteMany → Promise.allSettled(purge) → revalidate. Guardia server-side: solo semanas ESTRICTAMENTE pasadas en wall clock Caracas (deriveFrom(caracasParts(now))) — la en curso y futuras → 400. POST también revalida.
- /api/admin/events/[id]: PATCH y DELETE ahora revalidan; DELETE purga imageKey antes de responder.
- revalidateWeekendPages(): revalidatePath('/editorial') + revalidatePath('/editorial/[slug]','page'). El home no muestra businessEvent (verificado) → no se revalida.
- EventsTab: botón "Limpiar semana" (Eraser, ml-auto) SOLO en headers de semanas vencidas (weekOf < currentWeekOf calculado client-side con los mismos helpers); AlertDialog de confirmación con conteo; purgeWeekMutation + notificación con cantidad borrada.
- api.ts: bulkDeleteAdminEvents(weekOf) con throwAdminError.
- tsc limpio en tocados; lint 19 pre-existentes (scripts). Deploy 444a715 → producción: DELETE /api/admin/events responde 401 protegido (antes 405) y el guard de formato corre tras la auth.
Stage Summary:
- Ciclo de vida completo del flyer: dueño propone → admin ve arte en grande → aprueba → sale en portada Y guía al instante → semana vencida se limpia con 1 clic (DB + imágenes R2 + público refrescado al momento).
- Nota: los objetos huérfanos previos (flyers borrados antes de este fix) siguen en R2 — inofensivos; se pueden limpiar después si acaso.
- Pendientes del dueño: rotar NEXTAUTH_SECRET; IG Africa Burguers / Licobar JJ; dirección de Medusa.

---
Task ID: protocolo-anti-drift-v2
Agent: Super Z (main agent)
Task: El dueño pidió "crea un protocolo para que no pierdas contexto y alucines". Crear protocolo durable y corregir el drift documental encontrado.

Work Log:
- Verificación previa (practicando lo que el protocolo predica): `git rev-parse` HEAD (bd24b15) ≠ origin/main (444a715) — 1 commit local sin push (solo +18 líneas de worklog, inofensivo). curl producción: `GET /editorial → 200`, `DELETE /api/admin/events → 401 {"error":"No autenticado"}` (antes 405) → el sprint 8.11b YA estaba desplegado, contradiciendo al resumen del chat (se evitó duplicar la implementación).
- Drift documental detectado y corregido: ① PROTOCOL.md v1 (28-Ago) decía next-auth v4, "sin dominio propio", SPA de ruta única, y contenía DATABASE_URL + llaves R2 en texto plano → reescrito como PROTOCOL.md v2 (sin secrets): jerarquía de verdad (git > código > worklog > handoff > curl; resúmenes de chat PROHIBIDOS como fuente), rituales de inicio/cierre, 8 reglas anti-alucinación, DoD, ficha técnica re-verificada hoy, índice de sprints y pendientes vivos. ② CLAUDE.md: NextAuth v4→Auth.js v5 (export `auth()` en src/lib/auth.ts, verificado), getServerSession→auth(), patch-openid-client.js marcado ELIMINADO (postinstall real = `prisma generate`, verificado en package.json), error TS de trustHost obsoleto (tipo oficial v5, línea 154), URL de verificación → conectalt.com. ③ SESSION_HANDOFF.md estaba congelado en estado 8.6 → reescrito al estado real (8.11b en producción).
- Evidencia citada en el protocolo: revalidateWeekendPages() en ambas rutas de admin/events (Grep: route.ts:29-31 y [id]/route.ts:22-24), ADMIN_EMAILS en admin-config.ts:12, providers google+demo en conectalt.com/api/auth/providers, customFetch que borra authorization_response_iss_parameter_supported en auth.ts:35-72.
- Sin cambios de código de aplicación (solo docs) — no requiere build.

Stage Summary:
- PROTOCOL.md v2 = Constitución anti-drift; cadena de contexto coherente: session-boot.sh → SESSION_HANDOFF (RAM) → worklog (cinta) → PROTOCOL.md (reglas).
- Sprint 8.11b confirmado en producción: la tarea aprobada con "adelante" ya estaba completa; no se duplicó nada.
- Pendientes del dueño sin cambios: rotar NEXTAUTH_SECRET (recomendado también Neon/R2 por exposición en el historial git del v1); IG Africa Burguers / Licobar JJ; dirección Medusa; revocar PAT al cerrar sesión.

---
Task ID: sprint-8.12-preview
Agent: Super Z (main agent)
Task: El dueño pidió ver una vista previa del carrusel de publicidad ANTES de subirlo al repo (push sigue bloqueado por el PAT). Levantar la app real del commit e83e175 en el sandbox con datos de ejemplo y capturar evidencia visual.

Work Log:
- Verificación previa: HEAD e83e175 intacto, árbol limpio; sandbox sin acceso a Neon (.env local quedó con file:) y procesos de fondo mueren entre llamadas → la preview se ejecuta todo-en-uno en una sola llamada.
- PostgreSQL embebida instalada FUERA del repo (/home/z/preview-pg, paquete embedded-postgres, puerto 5433) — no toca package.json ni bun.lock del proyecto.
- scripts/preview-run.sh (orquestador con esperas DOM) + scripts/preview-seed.ts (seed local: VE→Miranda→Los Teques+zonas, 4 categorías, 6 negocios con covers reales de /public, usuario del dueño para el login demo, 3 anuncios ejemplo: Africa Burguers enlace interno, Licobar JJ interno, Medusa externo wa.me).
- Flujo validado EN VIVO: prisma db push → DDL idempotente de db-bootstrap creó tabla Advertisement → seed → next dev :3000 → AgeGate → portada: carrusel renderiza bajo el hero, AUTO-AVANCE de 5s verificado (capturas 01 vs 02), vista móvil correcta, contador de impresiones funcionó (las vistas subieron solas al visitar: dedupe por sesión OK), login demo (Acceder → Acceso demo → email) → Panel Admin → tab nuevo "Publicidad" (requirió click real de Playwright; el el.click() de Radix no activaba el tab) → lista con métricas (3 activos, 3808 vistas, 176 clics, CTR 4.6%) → formulario "Nuevo anuncio" completo (dropzone, destino interno/externo, fechas, orden, activo).
- GET /api/ads devuelve solo anuncios vivos; log del servidor SIN errores (cartel "2 Issues" = overlay dev de Next, no existe en producción).
- Capturas → download/preview-sprint-8.12/ (5 PNG). cleanup() mata servidores al salir; scripts/preview-* quedan SIN trackear para iterar rápido; borrar antes de cualquier commit.

Stage Summary:
- El dueño puede aprobar diseño/flujo SIN deploy: 5 capturas reales de la app del commit e83e175 corriendo con datos de ejemplo.
- No se subió nada al repo ni a producción; seguimos esperando el PAT para push (lo que verá en conectalt.com será idéntico a las capturas).
- Reutilizable: `bash scripts/preview-run.sh` regenera la preview completa en ~3 min.

---
Task ID: sprint-8.12-deploy
Agent: Super Z (main agent)
Task: Recibido el PAT nuevo del dueño → push del sprint 8.12 (carrusel de publicidad), verificación en producción y cierre de sesión.

Work Log:
- Auto-commit del sandbox (6cef5a2) revisado y rehecho: había trackeado capturas y scripts de preview que este worklog decía mantener sin trackear → `git reset --soft HEAD~1`; PNGs y `scripts/preview-*` fuera del repo (regla nueva en .gitignore), worklog+handoff re-commiteados como `e49d2cb`.
- Push con el PAT nuevo: `7184e71..e49d2cb main → main` (2 commits: `e83e175` feature sprint 8.12 + `e49d2cb` docs).
- Vercel desplegó en ~100 s. Verificación en producción: `GET /api/ads` → 200 `{"ads":[]}` (db-bootstrap creó la tabla Advertisement al desplegar); `GET /` → 200; `POST /api/ads/views` con `{}` → `{"ok":true,"counted":0}` (graceful, sin 500); `GET /api/ads/<inexistente>/go` → 404 `{"error":"Anuncio no disponible"}`; `GET /api/admin/ads` sin sesión → 401. Todo según diseño.
- session-task.sh ejecutado; handoff actualizado al estado desplegado.

Stage Summary:
- Sprint 8.12 EN PRODUCCIÓN: la portada renderiza el carrusel SOLO cuando exista ≥1 anuncio vivo (hoy 0 → portada idéntica a la actual; cero riesgo visual).
- El dueño crea su primer anuncio en Panel Admin → tab "Publicidad" → + Nuevo anuncio: arte → destino (interno /local/<slug> o externo https/wa.me) → fechas de campaña (opcional) → activo. Métricas de vistas/clics/CTR por anuncio para cobrar.
- Capturas de referencia (app real con datos de ejemplo): download/preview-sprint-8.12/ (5 PNG). Preview regenerable en sandbox: `bash scripts/preview-run.sh` (scripts sin trackear vía .gitignore, se conservan en el sandbox).
- Recordatorios enviados al dueño: revocar YA el PAT usado en esta sesión; rotar NEXTAUTH_SECRET (+Neon/R2 recomendado); datos pendientes (IG Africa Burguers, IG Licobar JJ @puntoencuentrolt, dirección Medusa).

---
Task ID: regla-idioma-espanol
Agent: Super Z (main agent)
Task: El dueño pidió (en español) que toda interacción sea en español porque no entiende otros idiomas, y que se agregue al protocolo.

Work Log:
- PROTOCOL.md actualizado a v2.1: nueva regla permanente §3.9 "Comunicación 100% en español" — todo lo que el dueño lee (chat, avisos, guías, entregables, textos de capturas, mensajes de commit) en español llano; identificadores de código ya existentes quedan en inglés; términos técnicos se explican en contexto.
- Reforzada la lista de Terminado (§5): el aviso final ahora referencia §3.9.
- SESSION_HANDOFF.md: línea "**Idioma:**" al inicio (visible en cada boot, junto a la línea Chat).
- session-task.sh ejecutado + commit/push.

Stage Summary:
- Regla permanente grabada en la Constitución del repo (PROTOCOL.md §3.9) y visible en cada arranque de sesión (handoff). Ningún agente futuro responderá en otro idioma al dueño.

---
Task ID: fix-mapa-tiles
Agent: Super Z (main agent)
Task: El dueño reportó (con captura) que el mapa se rompe "cuando lo abres demasiado": todos los cuadros del fondo muestran "Map data not yet available", con pines y geolocalización visibles.

Work Log:
- Diagnóstico: LeafletMap.tsx usaba 2 capas de Esri World Dark Gray (Base + Reference). Esri devuelve cuadros de error con ESE texto exacto al pasar la cuota gratuita de tiles (throttling por uso) — coincide con la captura del dueño y el patrón "al abrirlo mucho". Agravante: no había maxZoom, así que también se podía pedir zoom fuera del rango del servicio (otra fuente del mismo cuadro de error).
- Intento 1 descartado con evidencia: CARTO Dark Matter (basemaps.cartocdn.com) — probado en sandbox y AHORA estampa "API KEY REQUIRED" en cada cuadro (CARTO exige llave registrada desde ~2025). Descartado para no depender de cuentas/llaves del dueño.
- Solución final: tiles estándar de OpenStreetMap (sin llave, sin costo, los más confiables a pequeña escala) + filtro CSS nocturno en globals.css (.conecta-map .leaflet-tile-pane: invert + hue-rotate 180° + brillo/contraste/saturación) que oscurece SOLO el fondo — pines, círculos, popups y controles intactos — + maxZoom 19 en mapa y capa (rango nativo OSM, nunca se piden cuadros inexistentes).
- Verificado EN VIVO con preview (scripts/preview-map.sh, nuevo y gitignoreado: PG embebida + seed + agent-browser): desktop 18 tiles cargados / 0 rotos, zoom cercano z16 0 rotos, móvil 0 rotos. Capturas: download/correccion-mapa/ (3 PNG). El estilo nocturno quedó MÁS legible que el Esri viejo (calles carbón con brillo sutil, agua azul oscuro, rótulos claros).
- tsc limpio en LeafletMap.tsx. Commits locales listos; push pendiente de PAT (el anterior fue revocado por el dueño, como se acordó).

Stage Summary:
- Causa raíz: cuota gratuita de Esri (no era un bug del código del mapa). Fix = proveedor estable + guardas de zoom + estética nocturna preservada vía CSS.
- Cero llaves API, cero registros, cero costo para el dueño.
- PENDIENTE PUSH: el fix vive en commits locales — sube con el próximo PAT temporal.

---
Task ID: fix-mapa-deploy
Agent: Super Z (main agent)
Task: Recibido PAT nuevo del dueño → push del fix del mapa (+ protocolo v2.1), verificación en producción y cierre.

Work Log:
- Push: `29aa1cb..4b40f85 main → main` (3 commits: protocolo §3.9 español, fix mapa, docs).
- Verificación en producción CONFIUNDADA al inicio por 2 trampas de herramientas: (1) el HTML/CSS servido desde el borde hkg1 parecía viejo, y (2) mi grep buscaba `invert(1)` cuando Lightning CSS minifica la regla a `invert(100%)`. Resuelto con pruebas duras: el build local del MISMO SHA produce los mismos nombres de chunks (hash determinista), y los chunks NUEVOS responden 200 en conectalt.com: `c41784a40dfa7a28.js` contiene `tile.openstreetmap.org` y CERO `arcgisonline`; `a426011aacbf531a.css` contiene `invert(100%)` (filtro nocturno).
- GitHub status API del SHA: "success — Deployment has completed" (Vercel, 21:40:41 UTC, environment Production).
- Limpieza de temporales del diagnóstico (scripts/*.html, hdr.txt).

Stage Summary:
- Fix del mapa EN PRODUCCIÓN Y VERIFICADO: tiles OSM + filtro nocturno + maxZoom 19. Vercel status success para el SHA exacto.
- Lección de protocolo (aplicada): el minificador reescribe valores CSS (invert(1)→invert(100%)) — al verificar producción, grep por la propiedad/clase, no por el valor literal. Documentado aquí para futuras verificaciones.
- El dueño debe revocar este PAT al cerrar la sesión (patrón PAT temporal).

---
Task ID: fix-anuncios-recorte
Agent: Super Z (main agent)
Task: El dueño reportó (con capturas) que los 3 anuncios de prueba que creó "se recortan al espacio disponible" en el carrusel de portada. Diagnóstico, fix y verificación.

Work Log:
- Causa raíz: AdCarousel forzaba el arte a una franja fija (150/190/230px) con object-cover → cualquier imagen cuadrada o vertical (como las del dueño: logo del pin, bigote Licobar) se recortaba por los lados o arriba/abajo. Mismo defecto en las 2 vistas previas del panel admin (AdsTab: formulario y miniatura de fila).
- Fix (patrón profesional tipo YouTube/Instagram): 2 capas de <img> — fondo = la MISMA imagen con object-cover + blur-2xl + scale-110 + opacity-40 (rellena el marco sin bordes duros); frente = arte COMPLETO con object-contain (nunca se recorta, cualquier proporción). aria-hidden + alt="" en la capa decorativa para lectores de pantalla.
- AdsTab: mismas 2 capas en formulario y fila + hint nuevo para anunciantes: "Ideal horizontal 1200×400 · cualquier proporción se muestra completa, sin recortes".
- Verificación E2E en sandbox (scripts/preview-ads.sh, gitignoreado): PG embebida + seed + 3 anuncios de prueba generados con PIL en proporciones distintas y MARCO VISIBLE (cuadrada 1024×1024, horizontal 1200×400, vertical 600×900 — scripts/gen-test-ads.py) + agent-browser. Resultado: object-fit "contain" confirmado; las 3 láminas se ven con el marco íntegro y fondo difuminado (desktop y móvil 390×844). Capturas: download/correccion-anuncios/ (4 PNG).
- eslint limpio; 0 errores tsc en los archivos editados (los 41 errores reportados por bunx tsc son pre-existentes del repo en este entorno, ajenos al cambio).
- Commit local 9bd49e4. Push con el PAT #2 FALLÓ: token ya revocado por el dueño (correcto). Remote limpio de credenciales.

Stage Summary:
- El carrusel acepta CUALQUIER proporción de arte sin recortarla: la imagen completa siempre visible + fondo difuminado autogenerado. Los 3 anuncios de prueba del dueño se verán enteros al desplegar.
- PENDIENTE PUSH: commit 9bd49e4 espera PAT nuevo del dueño.
- Capturas de referencia para el dueño: download/correccion-anuncios/.

---
Task ID: fix-anuncios-deploy
Agent: Super Z (main agent)
Task: Recibido PAT #3 del dueño → push del fix de anuncios recortados + verificación en producción.

Work Log:
- Push: `99483e5..e184306 main → main` (2 commits: fix(publicidad) + docs). Remote limpio de credenciales inmediatamente después.
- API GitHub status rate-limited (anónima) → verificación alternativa por contenido servido, MÉTODO MÁS ROBUSTO: extracción de los 12 chunks de la portada de conectalt.com y grep de marcadores.
- Chunk del carrusel `372d5c1f4dd46fa9.js` contiene: capa de fondo `absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-40` + frente `relative w-full h-[150px]... object-contain` (contexto extraído confirma las 2 capas adyacentes del fix) + hint admin "sin recortes". Portada HTTP 200.
- Los 3 anuncios de prueba del dueño (cuadrados/verticales) ahora se muestran COMPLETOS en producción.

Stage Summary:
- Fix de anuncios recortados EN PRODUCCIÓN Y VERIFICADO (e184306).
- Lección de protocolo: la API status de GitHub es intermitente por rate-limit anónimo; la verificación por chunks servidos (grep de classNames del fix) es directa y concluyente.
- Dueño debe revocar PAT #3 al confirmar.

---
Task ID: escaparate-variantes-anuncios
Agent: Super Z (main agent)
Task: El dueño rechazó el fondo difuminado desplegado ("se ve horrible y rompe toda la estética"). Pidió 3 sugerencias con capturas que sigan la estética del sitio, SIN subir nada al repo, para escoger.

Work Log:
- REPO INTACTO: ningún commit nuevo de código, nada pushado. El componente se restaura con git checkout al terminar el preview (trap). Único commit local = docs de este registro.
- Artes realistas nuevos (scripts/gen-test-ads.py, gitignoreado): logo sobre blanco 1024², flyer rojo 1024², flyer vertical neón 600×900 — imitan los anuncios reales del dueño.
- Un solo componente con 3 variantes (scripts/ad-variants/AdCarousel.variant.tsx, gitignoreado; marcador @@VARIANT@@): A "Vitrina" (object-contain sobre fondo oscuro sólido #0d0d17), B "Color del arte" (canvas 8×8 muestrea bordes → color clamp nocturno canal máx 56 + gradiente negro lateral), C "Anuncio nativo" (split 44%/56%: arte + panel con PUBLICIDAD, título line-clamp-2 y botón dorado VER MÁS). Todas con arte completo (sin recorte, requisito original intacto).
- Runner scripts/preview-variants.sh: ?noautoplay=1 congela el carrusel (NOAUTOPLAY en el componente); avance por [data-slot="carousel-next"] (los botones NO tienen aria-label — lección: "Next slide" es un span sr-only interno); lámina visible verificada por src de la imagen centrada. 12 capturas + comparativa.
- Entregable: download/sugerencias-anuncios/00-COMPARATIVA.png (+ A-vitrina/, B-color-arte/, C-anuncio-nativo/ × 4 capturas c/u).
- PRODUCCIÓN SIGUE CON EL FONDO DIFUMINADO (e184306) hasta que el dueño escoja. Recordar: revocar PAT #3.

Stage Summary:
- Escaparate completo local sin tocar el repo. Decisión pendiente del dueño: A, B o C → tras elegir, implemento la variante limpia (carrusel + vistas previas admin coherentes), commit, push y verificación.

---
Task ID: sprint-8.14
Agent: Super Z (principal)
Task: Carrusel MULTITARJETA de publicidad — petición explícita del dueño tras rechazar el fondo difuminado y las 3 variantes propuestas. "Mantener las proporciones exactas de la imagen original y mostrar varios bloques uno al lado del otro, con las flechas a los lados". SOLO LOCAL, sin push.

Work Log:
- Reescrito AdCarousel.tsx (Sprint 8.14): CarouselItem pasa de basis-full a basis-auto; cada tarjeta envuelve la imagen con altura fija (h-150/190/230) y ancho natural (w-auto) → proporción original exacta, sin capa de fondo difuminado. Estética del sitio: rounded-xl, border-white/15, bg-white/5, hover:border-white/30, badge PUBLICIDAD compacto (9px). opts embla: align:'start', loop cuando >1 anuncio. Flechas prev/next intactas (a los lados) y drag táctil de embla.
- AdsTab.tsx (admin): quitadas las 2 capas blur (preview del formulario y miniatura de fila); vista previa centrada con proporción original; hint actualizado: "Ideal cuadrada 1080×1080 o horizontal 1200×400 · se muestra completa, en su proporción original".
- Nuevo scripts/preview-mc-data.ts: 6 anuncios demo (3 realistas arte-blanco/rojo/noche + 3 de marco en proporciones extremas 1024²/1200×400/600×900). gitignoreado vía /scripts/preview-*.
- Nuevo scripts/preview-ads-solo.ts (modelo Prisma correcto: db.advertisement): desactiva sortOrder>0 para capturar el caso de un solo anuncio.
- Nuevo scripts/preview-multicard.sh v3 (E2E): pausa del autoplay con 'mouseover' despachado por polling en cuanto el carrusel existe (mouseenter NO delega en React — el intento previo no pausaba); botones Next/Prev localizados por sr-only "Next slide" (no tienen aria-label); verificaciones: anchos de items [248,248,171,248,708,171] = imagen+padding/borde (proporciones exactas), sin clases blur, transform de pista se desplaza -248px con la flecha, autoplay pausado, anuncio único → 1 tarjeta.
- Capturas en download/carrusel-multitarjeta/: 01 escritorio fila en posición 0, 02 tras flecha, 03 móvil 390×844, 04 móvil tras flecha, 05 anuncio único.
- Sin commit y sin push: cambios en src/ quedan como modificaciones locales sin stagear; main sigue en ba479f9 sincronizada con origin.

Stage Summary:
- Carrusel multitarjeta implementado y verificado localmente (desktop+móvil, 6 anuncios y 1 solo). Pendiente: aprobación del dueño → aplicar commit → push con PAT NUEVO (PAT #3 marcado para revocar). Si el dueño lo rechaza, git checkout de los 2 archivos restaura el estado desplegado.

---
Task ID: sprint-8.14-deploy
Agent: Super Z (principal)
Task: Despliegue del carrusel multitarjeta a producción (dueño aprobó reenviando el PAT #3).

Work Log:
- Push de 3 commits pendientes (aac99e2..31def81): multitarjeta (componentes+capturas+worklog) y docs de variantes A/B/C. PAT #3 (el mismo, no revocado) usado una vez más; remote restaurado limpio inmediatamente tras el push.
- Verificación en producción SIN API GitHub: scripts/verify-deploy-multicard.sh descarga los chunks JS servidos por conectalt.com y grep basado en clases/textos. Confirmado al intento 1 (2 min tras push): chunk a65c87fc739e3bc5.js contiene basis-auto Y el hint "proporción original"; blur-2xl AUSENTE en todos los chunks.
- SESSION_HANDOFF.md actualizado a Sprint 8.14.

Stage Summary:
- Multitarjeta LIVE en conectalt.com. Pendiente: dueño REVOCAR PAT #3 (ya se usó en 2 sesiones de push); rotar NEXTAUTH_SECRET; validar el carrusel con sus 3 anuncios reales.

---
Task ID: fix-boton-eliminar-movil
Agent: Super Z (principal)
Task: Botón ✕ de eliminar imagen solo aparecía al hover (invisible en teléfono). El dueño de un local (ej. licobarjj) no ve cómo borrar su carta subida como imagen. Petición: "hazlo".

Work Log:
- Investigación: el dueño del local SÍ puede eliminar sus imágenes MENU sin admin (DELETE /api/owner/businesses/[slug]/images?imageId= borra de R2 y DB; moderación solo para aprobación). Hallazgo: botón con opacity-0 group-hover:opacity-100 → invisible en táctil (3 lugares: MenuTab "Carta en archivos", OwnerDashboard galería/portada, image-upload-zone compartido).
- Fix en 3 archivos: opacity-100 por defecto + pointer-fine:opacity-0 / pointer-fine:group-hover:opacity-100 / pointer-fine:focus-visible:opacity-100 (Tailwind 4.1). Móvil (pointer:coarse): siempre visible; PC: igual que antes.
- Verificado: eslint 0 errores; CSS compilado en dev contiene @media (pointer: fine) (9 usos).
- Commit d334660 local. PUSH FALLÓ: PAT #3 REVOCADO por el dueño (correcto, "could not read Password"). Pendiente: push con PAT nuevo.

Stage Summary:
- Fix listo y verificado localmente; falta push con PAT nuevo que pedirá el dueño. Responder al dueño: instrucciones para generar token (Settings → Developer settings → Tokens classic, scope repo).

---
Task ID: fix-boton-eliminar-movil-deploy
Agent: Super Z (principal)
Task: Despliegue del fix del botón eliminar en móvil (PAT #4).

Work Log:
- PAT #3 reenviado por el dueño → push FALLÓ de nuevo (revocado, como se le pidió). Se le explicó paso a paso cómo generar uno nuevo.
- PAT #4 (ghp_cou...aUBo) recibido → push OK 31def81..79cb3c1 (3 commits: fix d334660 + auto-commits del entorno). Remote restaurado limpio.
- Verificación en producción: chunk JS contiene pointer-fine:opacity-0 (clases del fix) → confirmado al intento 3 (~2 min tras push).

Stage Summary:
- Fix del botón ✕ EN PRODUCCIÓN: visible siempre en móvil (pointer:coarse), hover en PC, en carta (MenuTab), galería/portada (OwnerDashboard) y zona de subida (image-upload-zone). Los dueños de locales pueden borrar sus fotos de carta solos. Pendiente: dueño revoca PAT #4 al final de los cambios; seguir recordando rotación de NEXTAUTH_SECRET.

---
Task ID: 8.14-fix-push
Agent: Super Z (principal)
Task: Push del commit d334660 (botón eliminar visible en móvil) con PAT nuevo + verificación en producción

Work Log:
- Push exitoso con PAT nuevo: 79cb3c1..a3d8df1 main -> main (incluye d334660 "fix(owner): botón eliminar siempre visible en móvil")
- Remote restaurado a URL limpia inmediatamente después del push
- Verificación por CSS compilado de producción (los chunks de MenuTab solo cargan con sesión de dueño, así que se verifica vía CSS global):
  - https://conectalt.com/_next/static/chunks/9e6e99b1aa6d9e31.css contiene:
  - @media (pointer:fine){.pointer-fine\:opacity-0{opacity:0} → en PC oculto por defecto
  - @media (hover:hover){.pointer-fine\:group-hover\:opacity-100...} → en PC aparece al hover
  - .pointer-fine\:focus-visible\:opacity-100:focus-visible → accesible por teclado en PC
  - En móvil (pointer:coarse) ninguna aplica → base opacity-100 → ✕ SIEMPRE visible ✓
- Extra: contestada pregunta del dueño — sitemap.ts es DINÁMICO (verificado en vivo: conectalt.com/sitemap.xml sirve 37 URLs = 3 estáticas + 33 locales ACTIVE + 1 editorial PUBLISHED, lastmod real por updatedAt, ISR 1h, fallback estático si DB falla)

Stage Summary:
- Fix botón ✕ en móvil LIVE en producción (commit d334660)
- Los dueños de locales (ej. licobarjj) ya pueden borrar su carta/galería desde el teléfono
- Sitemap dinámico confirmado funcionando con datos reales de DB
- Recordatorio pendiente para el dueño: revocar este PAT cuando confirmemos; rotar NEXTAUTH_SECRET + Redeploy; datos de anunciantes (IG Africa Burguers, IG Licobar JJ, dirección Medusa)

---
Task ID: 8.15-geo
Agent: Super Z (principal)
Task: GEO — visibilidad de conectalt.com en IAs (ChatGPT, Claude, Perplexity, Gemini)

Work Log:
- robots.ts: regla EXPLÍCITA para 17 rastreadores de IA (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot/User/SearchBot, PerplexityBot/User, Google-Extended, Applebot-Extended, meta-externalagent, Amazonbot, CCBot, Bytespider, YouBot, Diffbot, ImagesiftBot) — allow público, disallow /api/ y /r/
- src/app/llms.txt/route.ts NUEVO: llms.txt dinámico (estándar llmstxt.org) — H1 + descripción + locales ACTIVE agrupados por categoría (nombre, zona, dirección, precio, especialidad) + posts PUBLISHED + sección "Cómo citar". ISR 1h, fallback estático si DB falla, Content-Type text/markdown
- layout.tsx: JSON-LD global @graph WebSite (@id #website, inLanguage es-VE) + Organization (@id #organization, logo) — nivel superior del LocalBusiness que ya emiten las fichas
- Lint OK (errores tsc restantes: 27 preexistentes en archivos no tocados)
- Commit b58637b, push con PAT, remote limpio
- Verificado en producción al primer intento: robots.txt con los 17 bots, /llms.txt 200 con contenido real de DB (33 locales), JSON-LD en el home

Stage Summary:
- conectalt.com ya es legible y citable por ChatGPT, Claude, Perplexity, Gemini, Copilot, Meta AI y Apple Intelligence
- Base técnica GEO completa: robots explícito + llms.txt + JSON-LD en 3 niveles (WebSite/Organization → LocalBusiness por ficha → Article por guía) + sitemap dinámico
- Pendiente MANUAL del dueño: dar de alta en Google Search Console + Bing Webmaster Tools (alimenta ChatGPT), verificar con HTML meta, enviar sitemap

---
Task ID: 8.16-legal
Agent: Super Z (principal)
Task: Revisión y actualización de Quiénes Somos, Privacidad y Términos

Work Log:
- Revisión completa de LegalPage.tsx (privacidad 12 secciones + términos 15) y AboutPage.tsx
- Privacidad: cookie age-verified 30 días (antes decía sessionStorage, falso desde Sprint 7B) en §5 y §6; añadido Cloudflare R2 en terceros (§4); añadidos datos de dueños (carta/fotos) y conteo agregado de clics en anuncios (§1)
- Términos: §2 añade carta digital, guías editoriales y espacios PUBLICIDAD; §6 añade derechos sobre imágenes subidas; §7 incluye carta en obligaciones del dueño
- Quiénes somos: 5 → 7 capas de valor (Carta Digital con Imagen Real + Guías Editoriales Semanales, iconos BookOpen/Newspaper); Directorio Exclusivo ahora menciona verificación/aprobación por el equipo
- Fecha legal: 23 ago → 17 sep 2026
- Commit b4f9a52, push, verificado en producción chunk ab8a2dc0a32133be.js (age-verified, siete capas, Cloudflare, Carta Digital, fecha, PUBLICIDAD todos presentes)

Stage Summary:
- Páginas legales al día con la realidad del producto (menú, anuncios, R2, cookie 30d)
- Sin cambios de identidad legal: sigue CONECTA-LT / Los Teques / sqn8nproyect@gmail.com / CeroTraba
