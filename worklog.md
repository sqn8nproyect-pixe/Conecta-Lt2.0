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
