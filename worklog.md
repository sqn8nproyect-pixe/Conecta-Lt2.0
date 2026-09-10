> ℹ️ El historial antiguo (123 entradas hasta el 2026-09-09) está en
> `worklog-archivo-2026-09.md`. Leer la COLA de este archivo para contexto reciente.

---
Task ID: 5-profile-qr-reservations
Agent: conecta-frontend (Z.ai Code)
Task: Añadir QR real a cada reserva en la sección "Mis Reservas" del ProfilePage (cliente) para que pueda mostrarlo en la entrada del local en cualquier momento, no solo tras reservar.

Work Log:
- Leído worklog.md (contexto: el componente `QRCode` ya existe en `src/components/ui/qrcode.tsx` — usa la librería `qrcode` para generar un dataURL real que codifica la URL pública `${window.location.origin}/r/${confirmationCode}`. Ya estaba integrado en el modal de confirmación de reserva de `EstablishmentPage.tsx` — esta tarea replica esa integración en la sección "Mis Reservas" del cliente.)
- Leído `ProfilePage.tsx` (986 líneas antes de la edición, 1124 después). Estructura:
  * `ProfilePage` (wrapper) — fetches vía React Query (`fetchMyReservations`) y pasa `reservations: Reservation[]` a `ProfileContent`.
  * `ProfileContent` — renderiza la sección "MIS RESERVAS" (~línea 640) que mapea cada `Reservation` a un `<article>` con: top row (código + badge de estado), nombre del negocio (clickable), fecha/hora/personas, motivo del rechazo (solo REJECTED), cupón vinculado, notas, y bottom row (countdown + botón Cancelar).
  * `canCancel = status === 'PENDING' || status === 'CONFIRMED'` — reutilizado como condición para mostrar el QR (mismos estados no terminales útiles).
- **Imports** (4 ediciones vía MultiEdit):
  1. Añadido `QrCode` al bloque de iconos de `lucide-react` (al final, después de `XCircle`).
  2. Añadido `import { QRCode } from '@/components/ui/qrcode';` y `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';` después del `import type {...}` existente.
- **Estado** (en `ProfileContent`):
  * Añadido `const [qrReservation, setQrReservation] = useState<Reservation | null>(null);` junto al `copiedCode` existente. Documentado que solo se setea para PENDING/CONFIRMED.
- **Card de reserva** — insertada nueva sección "QR access row" entre el bloque de Notes y el bottom row existente (countdown + cancelar). Render condicional `{(status === 'PENDING' || status === 'CONFIRMED') && (...)}`:
  * Layout `flex items-center justify-between gap-3` con `mt-3 pt-3 border-t border-white/10` (mismo separador que las otras secciones del card).
  * Izquierda: QR inline 64×64 dentro de `p-1.5 rounded-lg bg-white border border-white/10 shrink-0` (fondo blanco para scannability), + label "Muestra este QR / en la entrada del local" en dos líneas (mono tracking-widest uppercase + blanco/60).
  * Derecha: botón "AMPLIAR" con icono `QrCode` — `border-gold/30 bg-gold/5 text-gold hover:bg-gold/15 hover:border-gold/60`, `aria-label="Ampliar QR de la reserva {code}"`. Al hacer clic setea `qrReservation=r` (abre el Dialog).
- **Dialog de QR ampliado** (al final de `ProfileContent`, después de `</section>` de Mis Reservas, antes de `</motion.div>`):
  * `Dialog` controlado por `open={qrReservation !== null}` + `onOpenChange` que limpia el estado al cerrar.
  * `DialogContent` dark theme: `bg-zinc-950 border-white/10 text-white sm:max-w-md`.
  * `DialogHeader`: título "Tu QR de entrada" con icono `QrCode` gold + descripción "Muestra este código al personal del local para validar tu reserva."
  * Body (condicional `{qrReservation && (...)}`):
    - QR 200×200 dentro de `p-3 rounded-2xl bg-white border border-white/10 glow-gold` (fondo blanco + glow para destacar).
    - Label "Muestra este QR en la entrada" + código de confirmación en `text-gold font-bold font-mono tracking-wider`.
    - Grid 3 col con resumen de la reserva: Local (truncate), Fecha (es-VE 2-digit/short/numeric), Hora (HH:mm).
    - Botón "ENTENDIDO" para cerrar (setea `qrReservation=null`): `bg-white text-obsidian hover:bg-gold hover:text-obsidian`, `h-11 rounded-xl`.
- Verificación:
  * `bun run lint` → exit 0, 0 errores, 0 warnings.
  * Dev server recompila OK (`✓ Compiled in 1118ms` y subsecuentes). Sin warnings nuevos. Los errores `prisma:error` y warnings de next-auth son pre-existentes (cold-start de Neon + DEBUG_ENABLED, no relacionados con esta tarea).
  * TypeScript: `Reservation` ya incluye `confirmationCode`, `business.name`, `business.slug`, `date`, `time`, `guests` — todos los campos usados en el Dialog ya existían en `src/lib/types.ts`. Sin errores de tipos.
- Archivos modificados:
  * ~ `src/components/conecta/ProfilePage.tsx` (4 ediciones quirúrgicas vía MultiEdit: imports × 2, estado, card row, Dialog)
- Sin tocar: APIs, schema.prisma, prisma, backend, `qrcode.tsx`, `dialog.tsx`. Solo frontend como pedía la tarea.

Stage Summary:
- ✅ QR real (64px) inline en cada card de reserva PENDING/CONFIRMED en "Mis Reservas" — el cliente puede verlo sin abrir nada
- ✅ Botón "AMPLIAR" abre Dialog con QR grande (200px) + código + resumen (local/fecha/hora) para mostrar cómodamente al entrar al local
- ✅ Estados terminales (CANCELLED, REJECTED, COMPLETED, NO_SHOW) no muestran QR — el cliente no va a asistir o ya asistió
- ✅ Fondo blanco alrededor del QR (inline y dialog) para scannability con flash/cámara de móvil de noche
- ✅ Estética consistente con CONECTA-LT: dark theme (`bg-zinc-950`), gold accents (`text-gold`, `border-gold/30`), mono uppercase tracking-widest para labels
- ✅ Labels en español: "Muestra este QR en la entrada", "AMPLIAR", "Tu QR de entrada", "ENTENDIDO"
- ✅ ESLint limpio; dev server compila sin errores

---
Task ID: 4-owner-reservation-lookup-ui
Agent: conecta-frontend (Z.ai Code)
Task: Buscador de reservas en ReservasTab del OwnerDashboard (validar llegada por código LT-XXXX-X o nombre)

Work Log:
- Leído worklog.md (contexto: el endpoint `GET /api/reservations/lookup/[code]` ya existe y devuelve info pública para callers anónimos + datos del cliente (id, name, phone, email, notes, rejectionReason) solo cuando el caller es BUSINESS_OWNER con ownership o ADMIN). El ReservasTab ya tenía tabla con filtros de status/date, dropdown de acciones (Confirmar/Rechazar/Marcar completada/Marcar no asistió), dialog de rechazo con motivo, polling 30s.
- Leído `src/app/api/reservations/lookup/[code]/route.ts` para entender el contrato exacto: 400 si no empieza con "LT-", 404 si no se encuentra, 200 con `{ reservation, authenticated, hasOwnership? }`. La `reservation` puede tener campos privados opcionales (id, name, phone, email, notes, rejectionReason) según ownership.
- Editado `src/lib/api.ts` — añadidos 2 exports nuevos entre `cancelReservation` y el bloque de Analytics:
  * `ReservationLookupResult` (interface) — tipo del resultado. Campos públicos obligatorios (confirmationCode, status, date, time, guests, business.name/address/coverImage). Campos privados opcionales (id, notes, rejectionReason, name, phone, email, business.id/slug) — refleja el contrato del API sin forzar casting inseguro.
  * `lookupReservation(code: string): Promise<ReservationLookupResult | null>` — wrapper de fetch. Normaliza a mayúsculas + URL-encode. Devuelve `null` para 404 (no lanza) para que la UI distinga "no encontrado" de "error real". Lanza Error con el mensaje del backend para 400/500. Extrae `data.reservation` de la envoltura del API.
- Editado `src/components/conecta/owner/OwnerDashboard.tsx`:
  1. **Imports**: añadidos `Search`, `QrCode` a lucide-react. Añadido `lookupReservation` al import block de `@/lib/api`. Añadido `import type { ReservationLookupResult } from '@/lib/api'` como statement separado.
  2. **Helper `isCodeFormat`** (antes de LookupResultCard): `const RESERVATION_CODE_RE = /^LT-[A-Z0-9]+-[A-Z0-9]+$/;` + función que hace `.trim().toUpperCase()` antes de testear — acepta "lt-abcd-1" o "  LT-ABCD-1  ".
  3. **Componente `LookupResultCard`** (nuevo, ~130 líneas): tarjeta destacada gold (`bg-gold/5 border-gold/30 rounded-xl p-4 sm:p-5 shadow-lg shadow-gold/5`) con motion.div initial opacity 0 → 1. Header con icono Search + label "RESERVA ENCONTRADA" + botón "Cerrar" (ghost, X). Grid 2 columnas: izq (código gold mono bold, status badge, local + dirección), der (fecha/hora/comensales en sub-grid + cliente nombre/phone — solo si están presentes). Footer con botón "Confirmar llegada" (verde `bg-emerald-500`, icon CheckCircle2) — SOLO visible si `status === 'CONFIRMED' && !!reservation.id` (gating doble: API devuelve id solo con ownership + transición válida CONFIRMED → COMPLETED). Spinner CSS mientras `isPending`.
  4. **Estado + query en ReservasTab**: añadidos `searchQuery` (input value), `lookupCode` (committed code, null hasta Enter/Buscar), `lookupActive` (derivado: `!!lookupCode && isCodeFormat(lookupCode)`). Nuevo `useQuery` con `queryKey: ['reservation-lookup', lookupCode]`, `enabled: lookupActive`, `staleTime: 0` (siempre refetch), `retry: false` (no reintentar 404).
  5. **Handlers**: `handleBuscar()` — trim+uppercase, si `isCodeFormat` → setea lookupCode (dispara API), si no → setea null (tabla filtra client-side). `handleClearLookup()` — limpia searchQuery + lookupCode.
  6. **Filtro client-side**: `filteredReservations` = cuando `!lookupActive && searchLower`, filtra por `confirmationCode.toLowerCase().includes(searchLower) || (user.name ?? name).toLowerCase().includes(searchLower)`. Cuando lookupActive, muestra todas las reservas (la búsqueda "definitiva" vive en la tarjeta gold).
  7. **UI search bar** (insertado ANTES del bloque `{/* Filters */}`): `flex gap-2` con input (icon Search absoluto izq, pl-9, placeholder "Buscar por código (LT-XXXX-X) o nombre del cliente...", estilo `bg-white/5 border-white/20 text-white placeholder:text-white/30`) + botón "Buscar" (gold `bg-gold hover:bg-gold/90 text-obsidian`) + botón QrCode (ghost, disabled, `title="Escanear QR (próximamente)"`). Input `onChange` resetea lookupCode a null (cualquier cambio requiere re-commit). `onKeyDown` Enter → handleBuscar().
  8. **Lookup result section** (después de search bar, antes de Filters): `lookupActive && (...)` con 4 ramas: loading (spinner gold "Buscando reserva {code}…"), error (AlertCircle + mensaje + botón X), null/404 (XCircle + "No se encontró ninguna reserva con ese código" + botón X), success (`<LookupResultCard>` con `onConfirmArrival` que llama `statusMutation.mutate({ id: lookupData.id, status: 'COMPLETED' })`). Añadido `: null` final para satisfacer a TS (caso lookupData undefined).
  9. **Pista de formato**: "El código debe tener formato LT-XXXX-X" (text-white/40 font-mono text-[11px]) cuando el usuario teclea algo que empieza con "LT-" pero no cumple el regex (solo si no hay lookup activo, para no duplicar feedback).
  10. **Tabla**: cambiado `reservations.map` → `filteredReservations.map`. Añadida nueva rama de empty state: `filteredReservations.length === 0 ?` → "No hay reservas que coincidan con la búsqueda." (entre el "No hay reservas para mostrar" original y el render de la tabla).
  11. **`statusMutation.onSuccess` refactorizado**: reemplazado el if/else binario por un `switch` con 5 mensajes diferenciados: REJECTED → "Reserva rechazada. El cliente fue notificado." (info), COMPLETED → "Llegada confirmada" (success), NO_SHOW → "Cliente marcado como no asistió" (success), CONFIRMED → "Reserva confirmada" (success), default → "Reserva actualizada" (success). Soluciona el problema de doble toast: tanto "Marcar completada" (dropdown) como "Confirmar llegada" (lookup card) usan el mismo statusMutation con status=COMPLETED, y ahora el mutation-level onSuccess ya muestra el toast correcto sin que la lookup card tenga que añadir su propio toast. Añadido `void queryClient.invalidateQueries({ queryKey: ['reservation-lookup'] })` al onSuccess para que la tarjeta gold refresque su badge al cambiar status (ej: al confirmar llegada, el badge pasa a COMPLETED y el botón desaparece).
- Verificación:
  * `bun run lint` → 0 errores, 0 warnings (eslint . pasa limpio).
  * `npx tsc --noEmit` → 0 errores en archivos modificados. Los 15 errores pre-existentes en otros archivos (Matchmaker.tsx, AdminMetricsTab.tsx, scripts/add-licobars.ts, src/lib/auth.ts, src/lib/data.ts, etc.) no fueron tocados y siguen siendo los mismos.
  * Dev server recompila limpio (`✓ Compiled in 233ms`, `✓ Compiled in 249ms` tras los últimos edits). Los warnings `prisma:error Error in PostgreSQL connection` son pre-existentes (Neon cold-start, la app se auto-recupera).
- Archivos modificados:
  * ~ `src/lib/api.ts` (+70 líneas: `ReservationLookupResult` interface + `lookupReservation` function)
  * ~ `src/components/conecta/owner/OwnerDashboard.tsx` (+370 líneas: imports, isCodeFormat helper, LookupResultCard component, estado+query del lookup, handlers, filtro client-side, search bar UI, lookup result section, pista de formato, cambio a filteredReservations.map, nueva rama empty state, refactor statusMutation.onSuccess)
- Sin tocar: APIs (lookup endpoint solo lectura), schema.prisma, backend services. No se crearon archivos de test.

Stage Summary:
- ✅ Search bar arriba de la tabla con input (gold Search icon) + botón "Buscar" (gold) + botón QrCode (disabled, placeholder futuro)
- ✅ Lookup por API: teclear LT-XXXX-X + Enter/Buscar dispara `GET /api/reservations/lookup/[code]` con `useQuery` (queryKey `['reservation-lookup', code]`, `enabled: isCodeFormat(code)`, `staleTime: 0`, `retry: false`)
- ✅ Tarjeta de resultado gold (`bg-gold/5 border-gold/30`) arriba de la tabla: código gold mono bold, status badge, customer name+phone, fecha/hora/comensales, business name+address
- ✅ Botón "Confirmar llegada" (verde emerald, icon CheckCircle2) — solo si `status === CONFIRMED && !!reservation.id`. Llama `statusMutation.mutate({ id, status: 'COMPLETED' })` + toast "Llegada confirmada" (via onSuccess refactorizado)
- ✅ Botón "Cerrar" (ghost, X) limpia searchQuery + lookupCode
- ✅ Mensaje "No se encontró ninguna reserva con ese código" (rojo, XCircle) en 404 + botón X
- ✅ Mensaje de error genérico (rojo, AlertCircle) + botón X si la API falla
- ✅ Spinner gold "Buscando reserva {code}…" mientras la query está en flight
- ✅ Pista de formato "El código debe tener formato LT-XXXX-X" cuando empieza con "LT-" pero no cumple regex
- ✅ Filtro client-side en tiempo real por código o nombre del cliente (case-insensitive). Lookup activo desactiva el filtro (la búsqueda "definitiva" vive en la tarjeta)
- ✅ Nueva rama de empty state: "No hay reservas que coincidan con la búsqueda"
- ✅ `statusMutation.onSuccess` refactorizado a switch con 5 toasts diferenciados — mejora feedback para todas las transiciones, no solo la nueva
- ✅ Invalidación del query `reservation-lookup` en onSuccess — la tarjeta gold refresca su badge automáticamente al cambiar status
- ✅ TypeScript limpio (0 errores nuevos), ESLint limpio (0 errores / 0 warnings), dev server compila sin errores

---
Task ID: qr-real-buscador-dueño
Agent: main + 2 subagents (full-stack-developer)
Task: Opción 2 — QR real + buscador en panel del dueño para validar reservas

Work Log:
- Instalada librería `qrcode` + `@types/qrcode`
- CREADO src/components/ui/qrcode.tsx: componente QRCode reutilizable que genera QR real (dataURL via qrcode lib). Codifica `${origin}/r/${code}`. Props: value, size, className. White bg para escaneabilidad. Fallback a texto si falla
- EDITADO EstablishmentPage.tsx: reemplazado SVG decorativo por <QRCode value={reservationCode} size={160} />. Glow-gold en lugar de glow-purple. Código mostrado debajo en gold mono
- CREADO src/app/api/reservations/lookup/[code]/route.ts: GET busca reserva por confirmationCode. Sin auth → info pública solo (code, status, date, time, guests, business). BUSINESS_OWNER (con ownership) o ADMIN → info completa (name, phone, email, notes, rejectionReason, id). 400 si código inválido, 404 si no existe
- Subagent 4 (OwnerDashboard): nueva search bar arriba de la tabla. Input + botón Buscar. Si el término matchea LT-XXXX-X → llama API lookup → muestra LookupResultCard (gold border) con código, status badge, cliente, botón verde 'Confirmar llegada' (statusMutation COMPLETED). Si es nombre parcial → filtra tabla client-side. Toasts diferenciados por status. Formato hint cuando empieza con LT- pero no matchea
- Subagent 5 (ProfilePage): cada reserva PENDING/CONFIRMED muestra QR inline (64px) + botón 'AMPLIAR' que abre Dialog con QR 200px + código + business info. Estados terminales (CANCELLED, REJECTED, COMPLETED, NO_SHOW) ocultan el QR
- api.ts: nuevo helper lookupReservation() + tipo ReservationLookupResult
- Bug cazado: Prisma client no reconocía rejectionReason (campo añadido en sesión anterior). Solución: bunx prisma generate + reiniciar dev server
- E2E verificado: LT-4243-F con admin → 200 con full info + hasOwnership:true. Sin auth → 200 con info pública only. LT-NOPE-X → 404. INVALID → 400. Lint limpio
- Commit b9dd3b4 pushed a origin/main

Stage Summary:
- ✅ QR real funcional en confirmación de reserva + Mis Reservas (cliente puede mostrarlo)
- ✅ Buscador en panel del dueño: escribe código LT-XXXX-X → ve la reserva destacada → click 'Confirmar llegada' → COMPLETED
- ✅ Búsqueda client-side por nombre/código parcial filtra la tabla en tiempo real
- ✅ API lookup respeta ownership: dueño solo ve datos de clientes de sus propios locales
- ✅ Visitantes sin auth pueden escanear el QR y ver info pública (status, fecha, business) pero NO datos del cliente
- Pendiente futuro: página pública /r/[code] (por ahora el QR apunta a esa URL pero la ruta no existe aún — el visitante que escanea verá 404). Se puede añadir en otra iteración

---
Task ID: pagina-publica-reserva-qr
Agent: main
Task: Página pública /r/[code] para escanear QR y ver/validar la reserva

Work Log:
- CREADO src/app/r/[code]/page.tsx: página server-rendered (no 'use client'). Busca la reserva por confirmationCode en la DB. Si no existe → muestra card 'Reserva no encontrada'. Si existe → renderiza <PublicReservationCard>. generateMetadata con título dinámico + robots noindex (no indexar reservas). 404 si el código no empieza con 'LT-'
- CREADO src/components/conecta/PublicReservationCard.tsx: componente cliente. Recibe data pública del SSR. Al montar, si hay sesión, hace fetch a /api/reservations/lookup/[code] para obtener datos completos (con ownership check del backend). Si el visitante es dueño del negocio → muestra datos del cliente (nombre, teléfono, email, notas) en caja dorada + botón verde 'Confirmar llegada' (si status=CONFIRMED). Click → PATCH status COMPLETED + mensaje de confirmación. Non-owners solo ven info pública
- UI: glass-card con cover del negocio, badge de status, QR + código en caja destacada, grid 3 cols (fecha/hora/personas), motivo del rechazo si aplica, datos del cliente (owners only), botón confirmar llegada (owners + CONFIRMED), link 'Volver a CONECTA-LT'
- Verificado: GET /r/LT-4243-F → 200 renderiza Tasca La Cava + código. GET /r/LT-NOPE-X → 200 muestra card 'no encontrada'. GET /r/INVALID → 404. Lint limpio
- Commit acd53ff pushed a origin/main

Stage Summary:
- ✅ Flujo del QR completo: cliente muestra QR → dueño (o cualquier visitante) escanea → cae en /r/LT-XXXX-X → ve info pública de la reserva
- ✅ Si el visitante es el dueño del negocio: ve datos del cliente + botón 'Confirmar llegada' → marca COMPLETED
- ✅ Si es un visitante sin auth: solo ve info pública (status, fecha, business) — no datos del cliente
- ✅ Si el dueño entró desde su panel con el buscador: mismo flujo, mismo botón 'Confirmar llegada'
- ✅robots noindex: las reservas no aparecen en Google
- 🔒 Cierre de la sesión: sistema de reservas completo end-to-end (crear → notificar → rechazar → QR → validar llegada)

---
Task ID: menutab-menu-files
Agent: conecta-frontend (Z.ai Code)
Task: Sección "Carta en archivos (opcional)" en MenuTab — subida de hasta 3 archivos (JPG/PNG/WebP/PDF) de la carta física, con moderación, badges de aprobación y delete optimista

Work Log:
- Leído worklog.md (contexto: backend ya listo — ImageType.MENU, presign con PDF (R2 key `businesses/{slug}/menu/{uuid}.{ext}`), POST images con límite 3 + 409, GET owner images devuelve approvalStatus, endpoint público devuelve menuFiles). Leídos: MenuTab.tsx (1438 líneas), image-upload-zone.tsx, api.ts (helpers fetchBusinessImages/deleteBusinessImage/presignUpload), OwnerDashboard.tsx (ImageSection/GallerySection como referencia de badges + delete optimista), schema.prisma (BusinessImage.approvalStatus), route.ts de images (contrato GET/POST/DELETE), r2.ts (publicUrl relativo `/api/images/${key}`).
- src/components/conecta/owner/MenuTab.tsx (+281 líneas):
  * Header comment actualizado (nueva sección documentada).
  * Imports: lucide CheckCircle/Clock/FileText/Info/X/XCircle; `deleteBusinessImage, fetchBusinessImages` de @/lib/api; `ImageUploadZone`.
  * Constantes: `QK_OWNER_IMAGES(slug) = ['owner','images',slug]` (misma clave que la galería de OwnerDashboard → caché compartida/invalidación cruzada) y `MAX_MENU_FILES = 3` (espejo del backend).
  * Tipos: `ImageApprovalStatus` ('PENDING'|'APPROVED'|'REJECTED'), `OwnerImageWithApproval` (fila completa del GET con approvalStatus, type-assert en queryFn — mismo approach que OwnerDashboard), `MenuFileImage` (proyección UI). Helper `isPdfUrl(url)`: los publicUrl de R2 son relativos (`/api/images/businesses/{slug}/menu/{uuid}.pdf`) → new URL() lanza, así que try/catch con fallback a endsWith('.pdf').
  * useQuery de imágenes (queryKey ['owner','images',slug], staleTime 30s) + filter type==='MENU' → menuFileImages; fileCount/filesAtLimit derivados (cuentan TODOS los estados — el backend también cuenta PENDING/REJECTED hacia el límite de 3). Estado `filesOpen` (colapsable, abierto por defecto).
  * menuFileDeleteMutation: delete optimista con cancelQueries → setQueryData filter → rollback en onError → invalidate en onSettled; toasts 'Archivo eliminado' / error.
  * UI: nueva `<section glass-card>` DESPUÉS del editor de secciones, ANTES de los dialogs. Header estilo CARTA DIGITAL (FileText gold + mono tracking-[3px] "CARTA EN ARCHIVOS" + chip "(opcional)") + contador "X/3 archivos" (estilo galería) + Button ghost chevron colapsable (aria-expanded + aria-label).
  * Contenido colapsado→expandido: serif "Carta en archivos (opcional)"; descripción exacta pedida (5 MB c/u, pestaña adicional en carta pública); nota de convivencia en itálica "Tu carta puede tener secciones manuales, archivos, o ambos."; info box amber (border-amber-500/30 bg-amber-500/10 + Info icon) sobre moderación del admin (mismo estilo que galería).
  * ImageUploadZone compact con businessSlug/imageType="MENU"/maxFiles=3/currentImages=menuFileImages/onImageDelete→mutation/onUploadComplete→invalidate ['owner','images',slug] + ['business',slug]. Oculto a 3/3 → mensaje dashed "Has alcanzado el límite de 3 archivos…" (igual patrón que galería).
  * Grid de miniaturas grid-cols-2 sm:grid-cols-3: imágenes con <img object-cover loading=lazy>; PDFs con FileText 28px sobre fondo neutro + "Documento PDF" (no se puede thumbnailar PDF). Badges idénticos a galería: Pendiente (bg-amber-500/90 Clock) / Aprobada (bg-emerald-500/90 CheckCircle) / Rechazada (bg-red-500/90 XCircle, tile opacity-60). Delete circular rojo top-right en hover (focus:opacity-100 para teclado).
- src/components/ui/image-upload-zone.tsx (completar soporte PDF que la tarea daba por hecho a medias):
  * accept del input condicional: MENU incluye application/pdf (sin esto el file picker bloqueaba PDFs).
  * Hint "Usa JPG, PNG, WebP o PDF — máx. 5 MB" para MENU ("JPG, PNG o WebP" para el resto) + "Subiendo archivo…" para MENU.
  * Preview local solo para imágenes (isPdf → objectUrl null; un blob PDF en <img> se ve roto) + revoke condicional en finally.
  * Toast de éxito "Archivo subido correctamente" para MENU; NUEVO catch general en handleFile para que errores del registro en DB (ej. 409 límite) muestren toast (antes eran unhandled rejection silencioso).
- src/lib/api.ts (solo firma del cliente, NO backend): presignUpload ahora acepta imageType 'MENU' — alineaba el tipo del cliente con el backend ya actualizado; arregla 2 TS errors pre-existentes en image-upload-zone.tsx (ImageUploadType incluye MENU pero presignUpload no lo aceptaba).
- Sin tocar: rutas API, schema.prisma, r2.ts, services, BusinessMenuSheet (todo eso es del agente backend anterior, sin commitear). No creados archivos de test.
- Verificación: `bun run lint` → 0 errores/warnings. `npx tsc --noEmit` → 0 errores en archivos tocados (quedan 15 pre-existentes en archivos ajenos: scripts, presign route [backend, fuera de alcance], Matchmaker, PublicReservationCard, etc.). dev.log compila limpio (✓ Compiled). R2 credential warning en /api/images es pre-existente (R2_ACCESS_KEY_ID con length 34 — env, no código).

Stage Summary:
- ✅ Nueva sección colapsable "Carta en archivos (opcional)" en la pestaña Menú del dueño, tras el editor de secciones: header gold mono + contador X/3 + chevron
- ✅ Subida de hasta 3 archivos (JPG/PNG/WebP/PDF ≤5MB) vía ImageUploadZone (type MENU, compact); oculta a 3/3 con mensaje de límite; backend 409 también ahora muestra toast (catch nuevo)
- ✅ Miniaturas con badge de moderación (Pendiente/Aprobada/Rechazada) y delete en hover con update optimista + rollback; los PDF muestran icono FileText + "Documento PDF"
- ✅ Convivencia explícita: nota "Tu carta puede tener secciones manuales, archivos, o ambos" — las secciones manuales no se tocan
- ✅ Caché compartida con la galería (['owner','images',slug]) → uploads/borrados se sincronizan con OwnerDashboard y la ficha pública (['business',slug])
- ✅ ImageUploadZone completado para PDF (accept, hint, preview, toasts) + api.ts presignUpload acepta MENU (2 TS errors pre-existentes arreglados)
- ⏳ El preview dialog del dueño sigue mostrando solo secciones manuales (los archivos viven en su propia sección; la pestaña de archivos en el sheet público ya la renderiza el backend/BusinessMenuSheet)
---
Task ID: menusheet-menu-files-public
Agent: conecta-frontend (Z.ai Code)
Task: Mostrar archivos de carta subidos (fotos/PDF) como pestaña "Fotos de la carta" en el visor público BusinessMenuSheet

Work Log:
- Leído worklog.md + BusinessMenuSheet.tsx completo (sheet 85vh, fetch lazy React Query enabled:open, tabs sticky con scroll-spy por refs, estados skeleton/vacío/error)
- src/lib/types.ts: nueva interface MenuFileData (id, url, sortOrder, createdAt opcional — el schema BusinessImage NO tiene createdAt y la UI no lo consume) + BusinessMenu.menuFiles?: MenuFileData[] (opcional → MenuTab.tsx del dueño sigue compilando sin cambios)
- ⚠️ FIX BLOQUEANTE fuera de mi alcance nominal (backend): GET /api/businesses/[slug]/menu respondía 500 para TODOS los locales porque el select de businessImage.findMany pedía `createdAt: true`, campo inexistente en el modelo BusinessImage (PrismaClientValidationError). Removí esa línea del select (1 línea). Justificación: la verificación de esta tarea exigía la API arriba y la UI era intestable; cambio mínimo, sin tocar schema. Si se quiere createdAt real → requiere migración (decisión para main). Nota: curl de /api/images falla con 'Credential access key has length 34' — pre-existente del proxy R2, no relacionado
- BusinessMenuSheet.tsx (todo aditivo, comportamiento existente intacto):
  * Imports: +FileText (lucide), +MenuFileData (types). Header doc actualizado con el contrato { visible, sections, menuFiles? }
  * Normalización defensiva menuFiles (visible + Array.isArray → EMPTY_MENU_FILES, identidad estable como EMPTY_SECTIONS)
  * FILES_SECTION_ID='menu-files' + isPdfFile(url) → url.toLowerCase().endsWith('.pdf') (clave R2 conserva extensión)
  * scrollTargets = secciones manuales + { id: FILES_SECTION_ID, name: 'Fotos de la carta' } al final SOLO si hasMenuFiles; tabs renderizan scrollTargets (antes sections); activeSectionId default = scrollTargets[0]; handleScroll itera scrollTargets con guard first/last type-safe (fix TS2532 de noUncheckedIndexedAccess)
  * MenuFilesBlock: mismo header dorado mono que MenuSectionBlock + ref registrado en sectionRefs bajo FILES_SECTION_ID → tap en tab y scroll-spy funcionan idéntico a una sección manual; imágenes <figure><img loading="lazy" class="w-full h-auto rounded-xl border border-white/10 bg-white/5" alt="Foto N de la carta de X"> (sin lightbox, pinch-zoom nativo); PDFs → MenuPdfCard (bg-white/5 border-white/10 rounded-xl p-4, icono FileText gold en badge bg-gold/10, "Documento PDF" + hint, botón bg-gold text-obsidian "Abrir PDF" → window.open(url,'_blank','noopener,noreferrer'), aria-label descriptivo, target 40px)
  * Estado vacío "Carta aún no disponible" ahora SOLO si sections.length===0 && !hasMenuFiles; menú con solo archivos → única tab auto-seleccionada (reset on open setActiveOverride(null) ya lo cubre); sin archivos → UI byte-idéntica a la previa; visible:false → sin sheet (sin cambios)
- Verificación:
  * bun run lint → 0 errores/0 warnings; npx tsc --noEmit → 0 errores en archivos tocados (Matchmaker.tsx arrastra 1 error pre-existente)
  * Probe temporal de datos (creado y ELIMINADO, sin dejar código): 2 filas BusinessImage type=MENU/APPROVED en tasca-los-amigos (1 .png + 1 .pdf) → curl API devolvió menuFiles:[png sortOrder:0, pdf sortOrder:1] ordenado; limpieza → menuFiles:[]
  * E2E con agent-browser headless: home → age gate → Tasca Los Amigos → VER MENÚ → tabs [Cervezas, Rones y Whisky, Fotos de la carta]; img con lazy+rounded verificada por DOM; botón "Abrir PDF" presente; tap tab fotos → aria-current=true; scroll al fondo del contenido → scroll-spy activa "Fotos de la carta" sola
  * Edge "solo archivos" con mock de red (route + body estático, desecho después): sections=[] + 2 menuFiles → UNA tab "Fotos de la carta", sin empty state, imagen+PDF renderizadas
  * Estado final API: {"visible":true,"sections":2,"menuFiles":0} → sheet sin tab de fotos, comportamiento previo intacto; dev.log compila limpio
- Archivos: ~ src/lib/types.ts (+28), ~ src/components/conecta/BusinessMenuSheet.tsx (+140 aprox), ~ src/app/api/businesses/[slug]/menu/route.ts (-1 línea, fix 500); sin archivos nuevos en src/, sin tests, sin tocar schema.prisma ni servicios backend

Stage Summary:
- ✅ Pestaña "Fotos de la carta" al final de las tabs cuando hay archivos MENU aprobados (máx 3, filtra el backend); integrada al scroll-spy y al scroll por tap como una sección más
- ✅ Imágenes full-width rounded-xl lazy con alt en español; PDFs como tarjeta con FileText dorado + botón gold "Abrir PDF" en pestaña nueva (noopener)
- ✅ Edge cases cubiertos: solo archivos → única tab auto-seleccionada sin empty state; solo secciones → sin cambios; visible:false → sin sheet
- ✅ Fix colateral de 1 línea: endpoint público de menú volvió de 500 → 200 (select createdAt inexistente en BusinessImage)
- ✅ Lint/tsc limpios, verificación E2E headless verde, sin regresiones en el flujo previo del visor

---
Task ID: menu-archivos-3
Agent: main + 2 subagents (full-stack-developer)
Task: Subida de hasta 3 archivos con el menú (fotos de la carta física o PDF)

Work Log:
- Sincronizado sandbox local con origin/main (dd3b04a) tras el reset del sandbox
- Restaurado .env (Neon + pool params + NEXTAUTH_SECRET + R2 vars)
- Reinstalado qrcode + deps (bun install)
- Backend: r2.ts con ALLOWED_MENU_TYPES (jpg/png/webp/pdf); presign acepta imageType=MENU (key: businesses/{slug}/menu/uuid.ext); images route acepta type=MENU con límite 3 (409 si excede) + approval flow (dueño→PENDING, admin→APPROVED); menú público devuelve menuFiles (solo APPROVED, solo si menuVisible=true)
- image-upload-zone.tsx: acepta PDF cuando imageType=MENU (accept attr + validación + límite)
- Subagent 1 (MenuTab): sección colapsable 'CARTA EN ARCHIVOS (opcional)' con contador X/3, upload zone con PDF, thumbnails (imágenes renderizadas, PDFs con icono FileText), badges de aprobación, delete optimista
- Subagent 2 (BusinessMenuSheet): tab 'Fotos de la carta' al final cuando hay archivos aprobados (imágenes full-width lazy, PDFs con botón 'Abrir PDF'); integrada al scroll-spy; solo-archivos → única tab sin empty state. FIX: removió createdAt del select (campo no existe en BusinessImage — bug mío que daba 500)
- E2E verificado: presign PDF+MENU OK (key generada); PDF+GALLERY rechazado; 3 archivos registrados 201, 4to 409; archivos PENDING para dueña; admin aprueba OK; menú oculto no expone archivos
- NOTA: el negocio licobar-punto-de-encuentro fue renombrado a 'Licobar JJ' por el usuario en sus pruebas
- Lint limpio; commit 44e8f32 (local, push pendiente — PAT revocado)

Stage Summary:
- ✅ Los dueños pueden subir hasta 3 archivos de carta (fotos o PDF) desde MenuTab
- ✅ Los archivos siguen el mismo flujo de moderación que las fotos
- ✅ El público ve los archivos aprobados como tab 'Fotos de la carta' en el menú
- ✅ Coexistencia: carta manual + archivos, o solo una de las dos
- ⏳ PUSH PENDIENTE: commit 44e8f32 local esperando nuevo PAT de GitHub

---
Task ID: menu-archivos-push-produccion
Agent: main (Z.ai Code)
Task: Configurar nuevo PAT de GitHub, hacer push del feature de archivos de menú (pendiente de la sesión anterior), verificar el feature E2E en producción y arreglar el bug de admin detectado durante la verificación

Work Log:
- Configurado nuevo PAT del usuario en ~/.git-credentials (el anterior fue revocado)
- Descubierto que el feature menu-archivos-3 YA estaba commiteado localmente (44e8f32) — solo faltaba el push
- Push 7afa5d4 -> origin/main (feature completo + worklog); Vercel deploy automático
- Verificado deploy en producción: GET /api/businesses/tasca-los-amigos/menu devuelve campo menuFiles (~25s después del push)
- E2E COMPLETO EN PRODUCCIÓN (Vercel + Neon + R2 reales):
  * Login demo cerotraba@gmail.com (dueña de licobar-punto-de-encuentro/Licobar JJ) → 200, role BUSINESS_OWNER
  * POST /api/upload/presign {fileType:application/pdf, imageType:MENU} → 200 con key businesses/{slug}/menu/{uuid}.pdf
  * PUT a R2 → 200; proxy /api/images/... sirve el PDF con content-type application/pdf
  * POST images {type:MENU} → 201, approvalStatus PENDING
  * GET público del menú con menuVisible=false → menuFiles:0 (menú oculto no expone archivos — correcto)
  * Login admin sqn8nproyect@gmail.com → approve del archivo → APPROVED con approvedById/approvedAt
  * Admin sube PNG MENU a tasca-los-amigos (menú visible) → auto-APPROVED → API pública devuelve menuFiles:1 → exposición pública verificada
  * Limpieza total: 3 DELETE (200) — incluido 1 archivo de prueba huérfano de la sesión anterior que quedó en Licobar JJ; proxy R2 403 (objetos borrados); API pública menuFiles:0
- BUG ENCONTRADO Y FIXEADO durante la verificación:
  * Síntoma: admin (sqn8nproyect@gmail.com) recibía 403 al registrar imágenes en negocios ajenos
  * Causa: requireRole() lee el role del JWT (ADMIN vía isAdminEmail) pero assertBusinessOwnership() leía el role SOLO de la DB (BUSINESS_OWNER, dato pre-RBAC) → inconsistencia
  * Fix código (efcf2e2): assertBusinessOwnership ahora acepta si db.role==='ADMIN' OR isAdminEmail(email) — ADMIN_EMAILS es la single source of truth
  * Fix dato: UPDATE user SET role='ADMIN' WHERE email='sqn8nproyect@gmail.com' (aplicado a Neon en vivo)
- Commit efcf2e2 pushed a origin/main

Stage Summary:
- ✅ Feature "subir hasta 3 archivos con el menú" LIVE EN PRODUCCIÓN (backend + UI dueño + visor público)
- ✅ Verificación E2E en producción completa: presign MENU+PDF → R2 → registro PENDING → admin approve → APPROVED → menú público expone menuFiles → delete limpia DB+R2
- ✅ Bug de inconsistencia de roles JWT-vs-DB fixeado (código + dato); el admin ya puede gestionar cualquier local
- ✅ Producción limpia (0 archivos de prueba residuales)

---
Task ID: sincronizacion-origin-main-2026-09-10
Agent: main (sesión restaurada)
Task: Sincronizar workspace local con origin/main (última versión de producción) usando PAT read-only del usuario

Work Log:
- git fetch origin con PAT temporal (solo lectura) → remoto 48 commits adelante del tar
- Commits nuevos (8-9 Sep): carta digital + 3 archivos menú, QR reservas /r/[code], polling 30s, notificaciones bidireccionales, hero slider 3 fotos, moderación fotos (max 10), categoría Licobar (7 locales), fix R2 proxy, fixes auth
- 2 commits locales (auto-snapshots plataforma) evaluados: PROTOCOL.md local era plantilla vieja con $(date) sin expandir → descartada la local, se usa la remota (28-Ago, credenciales rotadas); eliminación accidental de presign/route.ts NO traída
- git reset --hard origin/main → HEAD = d273e29, working tree limpio, idéntico a producción
- bun install re-ejecutado tras sync

Stage Summary:
- Workspace = EXACTAMENTE lo desplegado en producción (Vercel + Neon), commit d273e29
- Sin pendientes del chat roto: última sesión (9-Sep) verificó E2E el feature de archivos de menú y dejó producción limpia
- Pendiente: credenciales Neon (DATABASE_URL/DIRECT_URL) para levantar dev con datos reales
- Usuario debe revocar el PAT usado para fetch

---
Task ID: conexion-neon-completa-2026-09-10
Agent: main (sesión restaurada)
Task: Conectar base de datos Neon real y verificar la app E2E en el sandbox restaurado

Work Log:
- Usuario proveyó pooled connection string de Neon
- Configurado .env: DATABASE_URL (pooler) + DIRECT_URL (sin pooler) + NEXTAUTH_SECRET nuevo
- Quitado channel_binding=require (Prisma no lo soporta)
- GOTCHA CONOCIDO CONFIRMADO: el shell del sandbox exporta DATABASE_URL=custom.db (SQLite vieja) que pisa el .env → fix: unset DATABASE_URL DIRECT_URL antes de arrancar dev server
- bun run db:verify-neon → 28 negocios ACTIVE (incluye los 7 Licobar), 227 imágenes, 115 reviews, 6716 analytics events
- Dev server reiniciado con env limpia: API /api/businesses devuelve datos reales ✅
- Verificación visual con agent-browser: AgeGate OK → Home con hero slider OK → Populares (Licobar JJ #1 con 8 vistas) OK → Explora Locales con filtros OK → 0 errores de página
- Screenshots guardados en db/verificacion-*.png

Stage Summary:
- PROYECTO 100% OPERATIVO en sandbox: código d273e29 (= producción) + Neon conectado + UI verificada
- Seguridad: PAT de GitHub usado solo para fetch (usuario debe revocarlo); contraseña Neon expuesta en chat (recomendar rotación futura en Neon console)
- Listo para iterar nuevas features

---
Task ID: prevencion-sesiones-trabadas-2026-09-10
Agent: main (sesión restaurada)
Task: Blindaje del proyecto contra muerte de chats (petición del usuario tras el incidente del 10-Sep)

Work Log:
- Creado RECOVERY.md: playbook completo de prevención + rescate (causas identificadas: chats longevos con contexto saturado + worklog gigante; plan de rescate de 8 pasos probado en el rescate real)
- Cirugía de worklog.md: 544KB/133 entradas → 40KB/10 entradas activas; 123 entradas antiguas archivadas en worklog-archivo-2026-09.md (508KB, encabezado explicativo)
- Creado scripts/archive-worklog.ts (bun) para repetir el archivado cuando worklog supere ~15 entradas: bun run scripts/archive-worklog.ts 10
- PROJECT_STATUS.md actualizado: estado global 10-Sep (restauración completa) + nuevo Paso 7 de prevención en el protocolo de sesión + referencia a RECOVERY.md
- Commit local para mantener working tree limpio (push pendiente de próximo PAT)

Stage Summary:
- Proyecto blindado: chats desechables + boot protocol + push por tarea + worklog ligero + secretos en gestor + plan de rescate documentado
- Jerarquía de backups definida: GitHub (código) / gestor de contraseñas (secretos) / tar del panel (sandbox) / Neon (datos)

---
Task ID: protocolo-automatizado-2026-09-10
Agent: main (sesión restaurada)
Task: Sistema de protocolo de sesión automatizado (petición del usuario: boot casi automático + advertencias + cero restauraciones desde cero)

Work Log:
- Creado SESSION_HANDOFF.md — "RAM" del proyecto (máx 40 líneas): estado volátil, contador de tareas del chat, en-vuelo, siguiente paso, gotchas activos
- Creado scripts/session-boot.sh (bun run boot): 10 pasos — limpia gotcha DATABASE_URL, verifica deps/Prisma/.env/Neon, arranca dev server, health HTTP+API, estado git, y escupe TODO el contexto (handoff + cabecera status + última entrada worklog)
- Creado scripts/session-health.sh (bun run health): 6 checks con semáforo 🟢🟡🔴 — peso del worklog (>10 🟡, >15 🔴), árbol git sucio, commits sin push (>5 🔴), fatiga del chat (>=4 🟡, >=6 🔴 ABRIR CHAT NUEVO), Neon en .env, app viva con datos. Exit code = severidad
- Creado scripts/session-task.sh (bun run task): incrementa contador en handoff + timestamp + corre health
- Hooks instalados: CLAUDE.md ahora define el protocolo de 3 comandos (los agentes lo leen automáticamente); PROJECT_STATUS.md con tabla de la versión automatizada; package.json con scripts boot/health/task
- Bugs corregidos durante pruebas: patrones grep/perl no matcheaban formato markdown **negrita** (contador quedaba en 0) y regex de fecha con . en vez de .* (timestamp no actualizaba)
- Tests en vivo: boot OK (contexto completo en un output), health OK (detectó 3 🟡 reales), task OK (4→5, fecha actualizada)

Stage Summary:
- Protocolo nuevo: usuario dice "boot" → contexto completo automático en ~30s; tras cada tarea → bun run task da advertencias ANTES de que el chat muera; health >=6 tareas 🔴 obliga a abrir chat nuevo con push previo
- Con handoff+boot+health, ningún chat nuevo necesita restaurar nada: contexto completo en 1 comando
- Commit local pendiente de push con próximo PAT

---
Task ID: push-infraestructura-2026-09-10
Agent: main (sesión restaurada)
Task: Push de los commits de prevención + protocolo automatizado a GitHub y verificación de deploy

Work Log:
- Fetch con PAT para confirmar que origin/main no se movió (0 detrás)
- Inspeccionados los 2 auto-snapshots UUID antes de subir (worklog + capturas — inofensivos)
- Push d273e29..c400301 → origin/main OK (5 commits: 3 reales + 2 snapshots)
- Producción verificada post-deploy: conectalt.com HTTP 200, vercel.app HTTP 200

Stage Summary:
- Local = remoto = producción. Cero trabajo en riesgo
- Usuario debe revocar el PAT de escritura YA

---
Task ID: restore-session-2026-09-10-b
Agent: main (nuevo chat)
Task: Restaurar workspace desde GitHub y arrancar sesión (clone → bun install → session-boot.sh)

Work Log:
- git clone Conecta-Lt2.0 → /home/z/my-project (HEAD f0d69a1, árbol limpio, 0 sin push)
- bun install OK (890 paquetes, 10.9s)
- session-boot.sh + session-health.sh ejecutados; contexto de SESSION_HANDOFF.md cargado

Stage Summary:
- Workspace restaurado al 100% = origin/main. Veredicto health: 🔴 solo por ENV (.env ausente) — bloqueado por DATABASE_URL que el usuario enviará
- Siguiente acción: construir .env (RECOVERY.md paso 6) → prisma generate → dev server → verificación E2E

---
Task ID: neon-reconexion-2026-09-10
Agent: main (mismo chat)
Task: Reconstruir .env con DATABASE_URL de Neon, regenerar Prisma Client y verificar E2E

Work Log:
- .env reconstruido: DATABASE_URL (pooler) + DIRECT_URL (directo) + NEXTAUTH/AUTH_SECRET generados con openssl
- prisma generate v6.19.2 OK, schema validado
- scripts/verify-db-connection.js: Neon OK en 3.8s (28 negocios, 40 users, 115 reviews — igual al estado del 10-Sep)
- Descubierto gotcha: el sandbox mata procesos background entre tool calls (setsid no sobrevive) → creado scripts/smoke-test.sh que prueba todo en 1 llamada
- Smoke test E2E: / 200, /api/businesses 200 con datos reales, /api/categories 200, home renderiza contenido

Stage Summary:
- Entorno local 100% operativo: .env → Neon → Prisma → Next.js → API con datos reales
- SESSION_HANDOFF.md actualizado (gotcha de procesos background documentado)
- Pendiente sin cambios: revocar PAT, rotar contraseña Neon al terminar de iterar

---
Task ID: migracion-authjs-v5-2026-09-10
Agent: main (mismo chat)
Task: Migrar NextAuth v4 → Auth.js v5 y eliminar dependencia del patch openid-client

Work Log:
- Auditoría: superficie = 3 archivos server (lib/auth.ts, server/auth.ts, route.ts) + tipos; cliente next-auth/react 100% compatible (0 cambios en 13 archivos)
- Instalado next-auth@5.0.0-beta.32 (peer deps soportan Next ^16 oficialmente); adapter @auth/prisma-adapter 2.11.3 compatible
- src/lib/auth.ts reescrito a v5: NextAuth() → { handlers, auth, signIn, signOut }; secret explícito AUTH_SECRET ?? NEXTAUTH_SECRET (continuidad JWT en Vercel sin tocar env vars); cookies authjs.* sin __Host- prefix (workaround portado); trustHost ahora tipo oficial
- src/server/auth.ts: getServerSession(authOptions) → auth() — firmas públicas intactas, ~40 API routes sin cambios
- route.ts: export { GET, POST } = handlers
- Eliminado scripts/patch-openid-client.js (git rm) y del postinstall (ahora solo prisma generate); v5 usa oauth4webapi
- Fix 1 error nuevo: credentials?.email tipado unknown en v5 → cast a string
- Error TS legacy 'trustHost does not exist in AuthOptions' DESAPARECIÓ
- E2E 9/9 (scripts/auth-e2e-test.js): providers, sesión anónima null (contrato v5), csrf, login demo 302+JWT, sesión con id/role/name, RBAC, /api/favorites 200 con cookie y 401 sin, signout→null
- Build producción OK (valida deploy Vercel); smoke test general 200 en /, /api/businesses, /api/categories

Stage Summary:
- Stack auth: next-auth@5.0.0-beta.32 + oauth4webapi — patch de node_modules eliminado, deuda crítica saldada
- PROJECT_STATUS.md gotchas reescritos (patch marcado ELIMINADO, contrato v5 documentado)
- Sin PAT: commit local pendiente de push; recuerda revocar PAT viejo y rotar Neon al cerrar
