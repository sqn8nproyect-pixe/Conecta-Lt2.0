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

---
Task ID: plan-mejoras-estructurales-2026-09-10
Agent: main (mismo chat)
Task: Priorizar 5 mejoras estructurales propuestas por el usuario y diseñar plan de implementación

Work Log:
- Diagnóstico en código: metadata "21" localizada (layout.tsx:29 → corregir a 28); data.ts es código muerto (0 imports); slugs 28/28 únicos en DB (rutas /local/[slug] sin migración); 1/28 descripciones duplicadas; AgeGate usa sessionStorage (por sesión); NO existen sitemap.ts/robots.ts; negocios sin URL indexable (view client-side 'detail')
- Orden definido: 6A saneamiento → 6B rutas /local/[slug] → 7A sitemap+JSON-LD → 7B AgeGate 30d+login contextual (ortogonal) → 8 editorial
- Creado PLAN-MEJORAS-ESTRUCTURALES.md: 5 sprints con tareas, archivos, criterios de done, riesgos y métricas
- Verificado: prisma db push en sync (el db:push del platform será no-op seguro)
- SESSION_HANDOFF apunta al plan

Stage Summary:
- Roadmap aprobado para implementación; Sprint 6A (saneamiento) listo para arrancar
- Bloqueante parcial del dueño: horarios reales verificados por negocio (6A.4)
- Métricas de éxito definidas: 28 locales indexados en GSC post-deploy

---
Task ID: horarios-alcaldia-prep
Agent: main
Task: Preparar terreno para adaptar horarios oficiales de la Alcaldía de Los Teques a los 28 locales

Work Log:
- Creado scripts/audit-business-hours.js: audita BusinessHours de todos los negocios, imprime tabla + JSON (hours-audit.json)
- Auditado Neon: 28 locales (7 por categoría), 0 sin horarios, pero datos claramente templados

Stage Summary:
- Hallazgos clave: 7 discotecas idénticas 09:00-22:00 diario (imposible para discoteca), 7 tascas idénticas 09:00-22:00, 6/7 licorerías 09:00-22:00
- Anomalías detectadas: Licobar JJ Sáb:22:00-21:00(+1) inválido (23h); Africa Burguers usa slug tasca-el-patio (mismatch nombre/slug); Licobar La Terraza cierra 00:00 y lunes cerrado; El Botellón cruza medianoche 4 días
- Schema BusinessHours soporta: dayOfWeek 0-6, openTime/closeTime HH:mm, isClosed, cruce de medianoche
- Esperando datos oficiales del usuario para mapear por categoría + overrides por local

---
Task ID: horarios-alcaldia-aplicacion
Agent: main
Task: Aplicar horarios oficiales de la Alcaldía de Los Teques a los 28 locales

Work Log:
- Usuario pasó ordenanza: Bares/Tascas/Cantinas Lun-Dom 11:00-01:00; Discotecas Lun-Dom 19:00-03:00; Restaurantes 11:00-00:00 (no aplica, no hay restaurantes)
- Decisión: licorerías NO cubiertas (expendio al detal, no consumo en sitio) → se conservan horarios actuales hasta que el usuario pase regla específica
- Creado scripts/apply-alcaldia-hours.js: mapeo por categoría, transacción deleteMany+createMany por local, idempotente
- Ejecutado: 21 locales actualizados (7 licobares + 7 tascas → 11:00-01:00(+1); 7 discotecas → 19:00-03:00(+1)), 7 licorerías omitidas
- Verificado con audit-business-hours.js: 28/28 con horarios, 0 días cerrados, cruces de medianoche con convención closeTime<openTime

Stage Summary:
- Anomalías corregidas de paso: Licobar JJ Sáb 22:00-21:00 (inválido), Doña Rosa/El Tequeño/Tasca Los Amigos ahora abren domingo
- Frontend ya soporta cruce de medianoche (PlannerSteps + business.service.ts) — solo fueron cambios de datos
- Pendiente: regla específica para licorerías si la Alcaldía la tiene; Africa Burguers slug tasca-el-patio (se aborda en saneamiento de nombres)

---
Task ID: horarios-alcaldia-v2
Agent: main
Task: Aplicar regla de licorerías (envase cerrado) y corrección de licobares de la ordenanza

Work Log:
- Usuario pasó: Licorerías Lun-Sáb 11:00-21:00 (domingo cerrado); licobares cierre mayor 11:00→12:00pm (interpretado como medianoche)
- Edge case detectado ANTES de aplicar: guardar closeTime '00:00' rompe isBusinessOpenAt() (closeMin<openMin cae en rama cruce-medianoche → local abierto indefinidamente desde las 11:00)
- Solución sin cambios de código: licobares guardan closeTime '23:59' (rama normal, renderiza 11:59 PM)
- Verificado slug exacto de categoría: 'licoreria' (sin tilde)
- Editado scripts/apply-alcaldia-hours.js a v2: REGLAS con closedDays[], licorería Lun-Sáb 11:00-21:00 + domingo isClosed
- Ejecutado: 28/28 locales actualizados, verificación 7 registros cerrados = 7 domingos de licorerías
- Audit final: licobares 11:00-23:59 7/7; licorerías Lun-Sáb 11:00-21:00 con Dom:cerrado; tascas y discotecas intactas

Stage Summary:
- Ordenanza completa aplicada: licorería 11-21 Lun-Sáb / licobar 11-23:59 / tasca 11-01(+1) / discoteca 19-03(+1)
- Decisión documentada: medianoche = '23:59' en DB para no romper planner.availability.ts
- Interpretación a confirmar con usuario: "12:00pm" = medianoche (no mediodía)

---
Task ID: horarios-alcaldia-confirmacion
Agent: main
Task: Cierre de la ordenanza de horarios

Work Log:
- Usuario confirmó interpretación: "12:00pm" = medianoche
- Sin cambios adicionales: DB queda con horarios v2 definitivos

Stage Summary:
- Ordenanza de la Alcaldía 100% aplicada y confirmada (commits 8a225c9, dbdc327)

---
Task ID: saneamiento-cifra-descripciones
Agent: main
Task: Cifra 21→28 en UI + auditoría y corrección de descripciones

Work Log:
- Corregida meta description en src/app/layout.tsx: "21 mejores licorerías, tascas y discotecas" → "28 mejores locales: licorerías, tascas, licobares y discotecas con horarios verificados" (añadida categoría licobar que faltaba)
- Verificado: era la única cifra errónea user-facing; src/lib/data.ts es código muerto (0 imports, candidato a eliminar)
- Creado scripts/audit-descriptions.js: duplicados exactos, longitud, ficha enriquecida
- Auditoría: 27/28 descripciones únicas; 17 cortas (<120 chars, pobre SEO); specialty/valueProposition llenos (posiblemente templados)
- Bug grave detectado: Africa Burguers (tasca de hamburguesas, slug tasca-el-patio) tenía perfil completo de licorería de rones (desc + specialty "Ron Venezolano Añejo" + valueProp de curaduría)
- Creado y ejecutado scripts/fix-africa-burguers-profile.js: ficha reescrita genérica de categoría, sin datos inventados, pendiente verificación de dueño

Stage Summary:
- Cifra 21→28 corregida; única duplicación de descripción eliminada
- Pendiente decisión del usuario: reescritura de las 17 descripciones cortas (propuesta: drafts únicos de 150-250 chars por local para revisión)
---
Task ID: investigacion-locales-reales
Agent: general-purpose
Task: Investigar venues reales de vida nocturna en municipio Guaicaipuro para reemplazar 25 locales de plantilla

Work Log:
- Leído worklog.md (contexto: 28 locales en Neon, 25 con nombres de plantilla; Don Sancho, Africa Burguers y Tasca Los Amigos ya son reales; horarios de ordenanza aplicados)
- Invocado Skill web-search; creado scripts/research-venues.mjs → lote 1: 28 queries genéricas por categoría/zona (licorerías, bares, discotecas, tascas, salones de baile, botellas, site:instagram.com) → resultados crudos en scripts/research-raw/*.json
- Creado scripts/research-venues-v2.mjs → lote 2: 43 queries de verificación nominal (cada venue candidato por nombre) para sumar fuentes y extraer teléfonos/direcciones
- Creado scripts/research-pages.mjs (Skill web-reader): leídos cybo (discotecas "Los Teques" — todas eran Caracas, descartadas), tiktok.com/discover/discotecas-en-los-teques-venezuela (fuente clave: Donato, Medusa, Koko Frappe, Copacabana, Bodegón El Toro, El Emperador), guiapana (Scandalo, bares Carrizal, Paracotos Lunch). infoguia URL antigua cayó (404); resto rate-limited (429) tras 5 páginas
- Lote 3 (research-venues-v3.mjs, 15 queries): gaps — Moreno (resultó Carapita/Caracas → descartado), Copacabana (@newcopacabana), El Emperador (dirección exacta C.C. La Cascada), Jungla Bar, La Casita de Maikel, Shiang Lon
- Cruzado contra la DB (Prisma): listados los 28 slugs actuales para marcar duplicados (Don Sancho ya existe; "Licorería La Botella" de plantilla ≈ real "La Botella de Oro")
- Escrito scripts/real-venues-research.json: 39 venues (9 discoteca, 4 licobar, 15 licoreria, 11 tasca) con nombre/zona/dirección/teléfono/IG/sourceUrls/confidence/notes + sección discardedCandidates (10 venues fuera de alcance: Caracas/México/marcas) + limitations

Stage Summary:
- Cupos alcanzables con confianza ALTA+MEDIA: discoteca 7/7 (Donato, Medusa y El Emperador en ALTA; Koko Frappe, Copacabana, Club Centro de Amigos, Evolution en MEDIA), tasca 10/6 (Scandalo, Daws, Pasatiempos y La Casita de Maikel en ALTA), licorería 13/6 (El Barbecho, Los Picachos y Don Sancho en ALTA), licobar SOLO 4/6 (Jungla Bar, Bodegón El Toro/Terraza del Toro, Café Racer Bar, La Estación de la Birra) — categoría deficitaria, no hay "licobares" con ese nombre en la web indexada
- Hallazgos clave: la vida nocturna tequeña vive en TikTok/IG de DJs (discover pages como fuente agregadora); C.C. La Cascada (Carrizal) y C.C. La Matica (Km 25) son hubs reales de discotecas; el Corpus de directorios venezolanos (alcastars/todainfo/infoguia/guiapana) respalda bien las licorerías
- Limitaciones: URLs truncadas por el buscador (crudos en scripts/research-raw/), teléfonos parciales marcados con 'xx', venues sin dirección exacta (Copacabana, Jungla Bar), Prestige Game 8 Club y View Disco & Lounge solo tienen 1 fuente (BAJA)
- Entregable: scripts/real-venues-research.json listo para que el próximo agente haga el reemplazo de locales (usar confidence ALTA/MEDIA primero; respetar que licoreria-don-sancho ya existe en DB)

---
Task ID: investigacion-locales-reales-consolidacion
Agent: main
Task: Consolidar hallazgos del agente de investigación de venues reales

Work Log:
- Agente (agent-a578f9c4) completó 68 queries + 5 páginas agregadoras: 39 venues en scripts/real-venues-research.json (crudos en scripts/research-raw/)
- Validado JSON: 34 venues con confianza ALTA/MEDIA — discoteca 9, tasca 11, licorería 15, licobar 4
- Limitaciones documentadas: discotecas reales casi sin web indexada (viven en TikTok/IG), licobares puros no existen como categoría indexada (operan como bodegones/terrazas), teléfonos truncados en snippets

Stage Summary:
- Cobertura para los 25 slots: discotecas 7/7 ✓, tascas 6/6 ✓, licorerías 6/6 ✓, licobares 4/6 ⚠️
- Deficit licobar requiere decisión del usuario (26 locales reales o aporta 2 más)
- Mapeo propuesto presentado al usuario antes de renombrar 25 registros (cambio de slugs = URLs nuevas)

---
Task ID: venues-reales-aplicacion
Agent: main
Task: Reemplazar los 25 locales de plantilla por venues reales del municipio Guaicaipuro

Work Log:
- Usuario aportó 14 venues verificados en Google Maps (13 bodegones/licorerías + Mercaplus La Fortaleza mixto + Tasca-Bodegón San Pedro) con teléfonos, IG y horarios reales
- Agente web aportó 39 venues (68 queries): scripts/real-venues-research.json
- Creado scripts/real-venues-roster.js: 25 renames + 5 creates; keepers protegidos (licobar-punto-de-encuentro, licoreria-don-sancho, tasca-el-patio) con guardas en el script
- Fix pre-ejecución: Bicentenario iba sobre el slot de Don Sancho (keeper) → movido al slot licobar-la-terraza convertido a licorería; phone:'N/A' eliminados
- Creado y ejecutado scripts/apply-real-venues.js: validación previa (keepes/slugs/categorías), rename conserva reviews/favoritos/ofertas, socials IG upsert, horas custom del usuario (Lun-Sáb, dom cerrado) u ordenanza por categoría para venues del agente
- Resultado: 33 locales reales — discoteca 7, licobar 6, tasca 7, licorería 13; BusinessHours 231/231
- Meta description actualizada: número fijo eliminado (28→sin cifra)

Stage Summary:
- Directorio 100% venues reales: 3 keepers + 14 del usuario (★) + 16 del agente + 5 nuevos
- Horarios: usuario = datos reales de Maps; agente = ordenanza por categoría
- Pendiente: coordenadas aproximadas por zona (verificar GPS), cover images de plantilla en renombrados, descripciones son borradores editoriales para revisión de dueños
- Suplentes no usados documentados en real-venues-research.json (Dimartino, Las Dalias, Lama, Shiang Lon, Chila, Prestige, View, Club Campestre, Paracotos Lunch, etc.)

---
Task ID: venues-reales-cleanup-socials
Agent: main
Task: Limpiar socials de plantilla residuales en los 25 locales renombrados

Work Log:
- Detectado en verificación: renombrados arrastraban TikTok/Facebook/WhatsApp falsos de los slots de plantilla (ej: Donato mostraba @eclipselt)
- Creado y ejecutado scripts/cleanup-renamed-socials.js: deleteMany socials en 25 renombrados + restaurar solo IG real del roster
- Resultado: 76 socials falsos eliminados, 9 IG reales restaurados (Donato, Medusa, Emperador, Mercaplus, Naikel, Bravamar, Scandalo, Daws, Pasatiempos)
- Keepers y creates intactos

Stage Summary:
- Socials 100% reales en el directorio; verificado Donato = solo @donato_disco

---
Task ID: revision-directorio-post-venues
Agent: main
Task: Revisar el directorio tras la aplicación de venues reales y corregir residuos

Work Log:
- Creado scripts/review-directory.js: auditoría completa de los 33 locales (categoría, nombre, slug, zona, tel, IG, horarios compactos, reviews/favs/ofertas, flags); salida en scripts/directory-review.txt
- Revisión: 33/33 nombres reales, horarios correctos, 0 descripciones cortas, 12 con socials (9 IG verificados), GPS 33/33 (campos lat/lng del modelo, mis flags iniciales usaban nombres equivocados latitude/longitude — falso alarme)
- Slug de Mercaplus verificado limpio ("mercaplus-la-fortaleza"; la pérdida en consola era cosmética del terminal)
- Detectado: modelo Business no tiene zone como string sino relación Zone (cityId+name unique); city "Los Teques" tenía solo zona "Centro"
- Creado y ejecutado scripts/cleanup-phones-zones.js: (1) teléfonos 'N/A' → null en 4 locales (Scandalo, Pasatiempos, El Toro, Café Racer); (2) 5 zonas nuevas: Carrizal, San Antonio de Los Altos, San Pedro de los Altos, Panamericana Sur, Laguneta y La Llovizna; (3) asignación slug→zona para 33 locales (guarda: error si falta mapeo)
- Verificado: 0 teléfonos N/A; resumen final Centro 20, Panamericana Sur 4, SALOS 4, Carrizal 2, Laguneta/Llovizna 2, San Pedro 1
- Decisión: Jungla Bar y La Estación de la Birra quedan en Centro (su dirección es genérica "Los Teques, municipio Guaicaipuro"); pendiente ubicación precisa
- Validado impacto planner: zoneId es filtro opcional, UI pasa undefined (búsqueda por ciudad) → sin breaking changes, mejora precisión futura

Stage Summary:
- Directorio verificado y limpio tras el reemplazo de venues: datos de contacto 100% reales, zonas reales asignadas
- Commit b3d2775
- Pendiente conocido: 5 creates sin cover image (El Llanero, Chuky, La Llovizna, La Macarena, Panamericana); coordenadas lat/lng heredadas de slots/plantilla (aproximadas por zona, no verificadas venue a venue); 2 venues con dirección genérica

---
Task ID: correccion-direccion-guacara
Agent: main
Task: Corregir dirección falsa 'Sector Guacara' señalada por el usuario

Work Log:
- Usuario: "en los teques no existe ningun sector guacara" — la dirección de Licobar JJ venía del seed histórico scripts/add-licobars.ts (creaba 'Punto de Encuentro (Guacara)')
- Búsquedas web (5 queries, crudos en scripts/research-raw/licobar-jj-*.json): Licobar JJ / puntoencuentrolt sin presencia indexada → sin dirección real disponible, se pide al usuario
- Creado y ejecutado scripts/fix-addresses-feedback.js:
  * Licobar JJ: address → 'Los Teques, municipio Guaicaipuro' (genérico honesto); la descripción ya decía 'en pleno centro' (editada por el dueño) → zona Centro ratificada
  * La Estación de la Birra: dirección real hallada 'Av. Bertorelli Cisneros, sector El Cabotaje, al lado del Electroauto' (4 fuentes: IG bio, FB, TikTok bio, AlcaStars) + socials reales IG/TikTok @laestaciondelabirra + zona Centro → Panamericana Sur (misma avenida que Mercaplus)
  * Jungla Bar: dirección real hallada 'Mercado Municipal de El Paso, zona licorera' (IG oficial de Jungla Bar) → zona Centro ratificada
- Verificado: 0 negocios con 'Guacara' en dirección; 1 sola dirección genérica restante (Licobar JJ)
- Africa Burguers: investigación ambigua (existen varios 'El Patio' en Los Teques: Urban Food, Gastronómico, Food Park; su IG/website apuntan a @elpatio / elpatioltt.com mientras TikTok muestra @africa.burguers.ve) → NO se toca, pendiente confirmación del usuario

Stage Summary:
- Dato falso del seed eliminado; 2 venues ganaron dirección y socials reales de paso
- Commit post-b3d2775
- Pendiente: dirección real de Licobar JJ (preguntar al usuario); confirmar si los socials @elpatio de Africa Burguers le pertenecen

---
Task ID: direccion-licobar-jj-y-coords
Agent: main
Task: Dirección real de Licobar JJ (usuario) + saneamiento de coordenadas outliers

Work Log:
- Usuario aportó dirección de Licobar JJ: "calle carabobo, diagonal a CC Hito"
- Verificado con IG del C.C. Hito (@centrocomercialhito + post 2020): entre Calle Carabobo y Bulevar Bermúdez, centro de Los Teques → zona Centro ratificada
- Creado y ejecutado scripts/fix-licobar-jj-address.js con escaneo de sanidad de coords por rangos zonales → 6 outliers detectados
- Búsqueda CC La Cascada (mapcarta/tripadvisor/moovit): Panamericana sector Corralito, Carrizal → coords correctas para El Emperador
- Creado y ejecutado scripts/fix-outlier-coords.js:
  * Don Sancho: -67.043 (19km oeste, vicio seed) → 10.3452,-66.8552 (Av. Bolívar con Ayacucho, ±200m)
  * El Emperador: 10.3493 (en Los Teques) → 10.31,-66.99 (CC La Cascada, Corralito)
  * Pasatiempos: 10.3467 (en Los Teques) → 10.32,-66.985 (Vía San Diego, Carrizal)
  * Licobar JJ: -67.0241 → 10.3443,-66.855 (bloque CC Hito)
- Africa Burguers: -67.0354 → 10.3445,-66.85 (aprox centro, pendiente precisar Calle 9 con el usuario)
- Verificado Bertorelli Cisneros (8 fuentes): avenida urbana con sectores La Unión y El Cabotaje → Mercaplus (10.3561,-66.8468) y Casita de Maikel quedan como plausibles-no-verificados; refinar en pasada GPS venue a venue

Stage Summary:
- Coordenadas 30/33 en rango geográfico; 4 killers del seed corregidos (licobar JJ, Don Sancho, Africa Burguers, + Emperador/Pasatiempos reposicionados en Carrizal)
- Commit 4ca966d
- Pendiente: precisar Calle 9 de Africa Burguers + confirmar socials @elpatio (pregunta abierta al usuario); pasada GPS venue a venue para el resto

---
Task ID: coords-v2-teques
Agent: main
Task: Pin exacto de Africa Burguers (usuario) destapa error sistemático de geocodificación

Work Log:
- Usuario envió pin de Africa Burguers (maps.app.goo.gl/f1QaZQ276pPnk9f48) → resuelto: 10.3587,-67.0346, Plus Code 9X58+F5J "Los Teques"
- ALARMA: la longitud -67.03 coincide con coords que yo había "corregido" como outliers → verificado centro real de Los Teques: 10.344,-67.043 (Wikipedia 10°20'28"N 67°02'26"O, geodatos, 123coordenadas)
- ERROR RAÍZ: asumí centro en -66.85 (18km al este); mi escaneo anterior con rangos equivocados "validó" coords en la Cordillera de la Costa y moví Licobar JJ/Don Sancho/Africa Burguers a posiciones peores; el seed original de Don Sancho (10.3473,-67.0430) era correcto
- Creado y ejecutado scripts/fix-coords-v2-teques.js: 26 coordenadas corregidas — Africa Burguers pin exacto, Don Sancho restaurado, Licobar JJ aprox CC Hito, 19 Centro por calle/sector (ancla Plaza Bolívar), 5 Panamericana Sur interpolación Km 13→27 + Bertorelli, 2 Laguneta vía El Jarillo; SALOS/San Pedro/Carrizal intactos (eran correctos)
- Escaneo final con rangos correctos: 33/33 en rango geográfico (Panamericana Sur ampliado a lng [-67.05,-66.98] como corredor con pins pendientes)
- Lección registrada: verificar coordenadas de referencia de la ciudad ANTES de auditar; los pines de Google Maps del usuario son la fuente más confiable

Stage Summary:
- Coordenadas 33/33 en rango; error sistemático del seed eliminado; 1 pin exacto (Africa Burguers)
- Commit post-4ca966d
- Pendiente: 32 coords son aproximaciones (±500m-1.5km) — recolectar pines de Google Maps del usuario venue a venue; zona "Panamericana Sur" podría renombrarse si el corredor es más este que sur (decisión del usuario)

---
Task ID: estructura-duenos
Agent: main
Task: Restaurar patrón "admin dueño por defecto" en locales sin dueño

Work Log:
- Usuario: "recuerda la estructura yo como administrador por defecto de cada local"
- Auditoría: 26 locales owner=sqn8nproyect@gmail.com (ADMIN, patrón), 5 creates con ownerId=null (bug del script apply-real-venues.js), 2 reclamos legítimos (Licobar JJ → cerotraba 8-sep, San Pedro → ana.rodriguez 11-ago)
- Creado y ejecutado scripts/fix-owner-structure.js: los 5 huérfanos → admin por defecto con ownerStatus APPROVED (claimedAt queda null: gestionados por plataforma, no reclamados)
- Estructura final: 31 admin + 2 BUSINESS_OWNER reales = 33, 0 sin owner, 0 proposedOwner pendientes

Stage Summary:
- Estructura de dueños restaurada al patrón de la plataforma
- Commit post-78871fc
- Nota: los 5 venues ahora gestionables desde el panel de dueño del admin; reclamos reales intactos

---
Task ID: pin-el-toro
Agent: main
Task: Aplicar pin exacto de Bodegón El Toro (usuario)

Work Log:
- maps.app.goo.gl/QPMuo1mtsYZ2T5uP7 resuelto: place "Bodegón el Toro", marcador !3d10.3310781!4d-67.0410681
- Aplicado a bodegon-el-toro (reemplaza interpolación Km 26 que quedó 2km al NE)
- Hallazgo geográfico: El Toro está al SUR del centro (10.331) → valida el nombre de zona "Panamericana Sur" (corredor sur, no este); rango de sanidad ajustado lat [10.32,10.38]
- Implicación: la interpolación por km (Medusa Km 25, Ranch Grill Km 23) es sospechosa — pedir pin de Medusa (CC La Matica) y Ranch Grill (Los Cerritos)

Stage Summary:
- 2/33 pins exactos (Africa Burguers, El Toro); 31 aproximados
- Commit post-de62766

---
Task ID: pins-lote2
Agent: main
Task: Aplicar 4 pins exactos de Google Maps (lote 2 del usuario)

Work Log:
- Usuario envió 4 links: Medusa, Ranch Grill, Mercaplus, La Estación
- Resueltos con curl (marcador !3d/!4d de cada URL), places verificados contra los nombres reales
- Creado y ejecutado scripts/apply-pins-lote2.js: 4 updates con reporte de desplazamiento de la aproximación previa (1.2-2.1 km)
- Geografía: Mercaplus + La Estación + El Toro = clúster sur de ~300m (zona licorera real de Los Teques); Medusa 600m al norte; Ranch Grill al este (Los Cerritos)
- Panamericana Sur: 5/5 locales con pin exacto

Stage Summary:
- 6/33 pins exactos (Africa Burguers, El Toro, Medusa, Ranch Grill, Mercaplus, La Estación)
- Commit post-44ae2be
- Pendiente: 27 aproximaciones — prioridad pines de Centro (Donato, Koko Frappe, Copacabana, Club Centro de Amigos) y Laguneta (Casita de Maikel, La Llovizna); SALOS/Carrizal/San Pedro siguen siendo confiables de la investigación original

---
Task ID: pin-casita-maikel
Agent: Z.ai (sesión continua)
Task: Aplicar pin de Google Maps de "la casita de maikel" (https://maps.app.goo.gl/pFcwfsTxg4VAa83A7)

Work Log:
- Resueltos los 5 short-links pendientes: los 4 anteriores (Medusa 10.337378,-67.0394874; Ranch Grill 10.347115,-67.019501; Mercaplus 10.332984,-67.0424898; La Estación 10.3338621,-67.04263) YA estaban aplicados en DB de la sesión previa.
- La Casita de Maikel: pin real 10.3267369,-67.1443813. DB tenía aproximado (10.325,-67.065) → corrección de ~8.5 km al oeste. Aplicado vía scripts/apply-pin-casita-maikel.mjs.
- Análisis geo (scripts/geo-overview.mjs): el pin queda a 11.3 km del centro de Los Teques, 9.8+ km del negocio más cercano. Anomalía detectada: tasca-san-pedro tiene coords (10.4068,-66.9035) claramente erróneas — San Pedro de los Altos está a ~10.32,-67.13; pedir pin al usuario.
- Riesgo de regresión corregido: scripts/real-venues-roster.js (fuente de apply-real-venues.js) seguía con coords de la meridiana errónea (-66.8x). Sincronizados los 6 negocios con pin verificado en el roster.
- Commit: b48c5ac.

Stage Summary:
- Pins verificados exactos: 7/33 (Africa Burguers, El Toro, Medusa, Ranch Grill, Mercaplus, La Estación, La Casita de Maikel).
- Pendientes usuario: pin de tasca-san-pedro (coords erróneas ~28 km); confirmar zona de La Casita de Maikel (¿"Laguneta y La Llovizna" o "San Pedro de los Altos"?); resto ~26 coords siguen aproximadas.

---
Task ID: pin-casita-maikel-confirmacion
Agent: Z.ai (sesión continua)
Task: Usuario confirma que el pin aplicado de La Casita de Maikel es el real, verificado por él.

Work Log:
- Sin cambios en DB (el pin 10.3267369,-67.1443813 ya estaba aplicado en b48c5ac).
- La zona se mantiene en "Laguneta y La Llovizna": el usuario verificó el pin pero no pidió cambio de zona (su criterio geográfico manda; no mover sin instrucción explícita).
- Usuario pidió que toda interacción sea en español a partir de ahora.

Stage Summary:
- La Casita de Maikel: coordenadas VERIFICADAS por el usuario. 7/33 pins exactos.
- Sigue pendiente: pin de tasca-san-pedro (coords erróneas ~28 km).

---
Task ID: rename-tasca-villa-san-pedro
Agent: Z.ai (sesión continua)
Task: Usuario pregunta si "Tasca Restaurante La Villa De San Pedro" está en el catálogo.

Work Log:
- Verificado en DB: no existía con ese nombre; había una entrada genérica "Tasca - Bodegón San Pedro" (slug tasca-san-pedro, zona San Pedro de los Altos, coords erróneas 10.4068,-66.9035).
- Renombrado a "Tasca Restaurante La Villa de San Pedro" vía scripts/rename-tasca-villa-san-pedro.mjs (slug estable tasca-san-pedro para no romper enlaces).
- Roster actualizado (nombre + comentario de coords erróneas pendientes).
- Commit: ver git log (rename-tasca-villa-san-pedro).

Stage Summary:
- Catálogo 33/33 con nombre real de la tasca de San Pedro.
- Pendiente: pin de Google Maps de la tasca para corregir coords (~28 km off) y validar la dirección "Calle Principal del Pueblo".

---
Task ID: pin-villa-san-pedro
Agent: Z.ai (sesión continua)
Task: Aplicar pin de Google Maps de Tasca Restaurante La Villa de San Pedro (https://maps.app.goo.gl/iWifVVGP9cvYt7ew8)

Work Log:
- Short link resuelto: place "Tasca Restaurante La Villa De San Pedro" (confirma el rename anterior), pin !3d10.3648294!4d-67.0836514.
- DB actualizada vía scripts/apply-pin-villa-san-pedro.mjs: corrección de 20.2 km. Queda a 5.0 km NW del centro de Los Teques (carretera/vestíbulo de la parroquia San Pedro).
- Roster sincronizado (coords + comentario de pin real). Commit: ver git log.
- NOTA: el pin NO cae en el casco del pueblo de San Pedro (~-67.13) sino 5 km NW del centro de Los Teques; la dirección "Calle Principal del Pueblo" es dudosa — pedir al usuario la dirección real o el texto exacto de Google Maps.

Stage Summary:
- 8/33 pines exactos verificados por el usuario: Africa Burguers, El Toro, Medusa, Ranch Grill, Mercaplus, La Estación, La Casita de Maikel, La Villa de San Pedro.
- Pendiente: dirección real de La Villa de San Pedro; resto ~25 coords aproximadas.

---
Task ID: address-villa-san-pedro
Agent: Z.ai (sesión continua)
Task: Actualizar dirección de Tasca Restaurante La Villa de San Pedro con la dirección exacta de Google Maps.

Work Log:
- Usuario envió la dirección de Google Maps: "9W78+WGQ, Via Principal de San Pedro, 1201, Miranda".
- DB actualizada (scripts/update-address-villa-san-pedro.mjs): address = "9W78+WGQ, Vía Principal de San Pedro, 1201, Miranda".
- Roster sincronizado. Commit: ver git log.

Stage Summary:
- La Villa de San Pedro: 100% verificada (nombre, pin, dirección). 8/33 pines exactos.
- Pendiente general: ~25 coords aproximadas restantes; IG de La Villa (si tiene) no capturado.

---
Task ID: ig-villa-san-pedro
Agent: Z.ai (sesión continua)
Task: Agregar Instagram de La Villa de San Pedro (@lavilladesanpedroclub).

Work Log:
- Creado businessSocial INSTAGRAM para tasca-san-pedro vía scripts/add-ig-villa-san-pedro.mjs (relación es `socials`, no `businessSocial` — primer intento falló por nombre de relación).
- Audito el pipeline de render: EstablishmentPage usa est.instagram (extractInstagramHandle tolera cualquier formato) pero SocialContactPanel usa socialMedia.instagram CRUDO como href → solo funciona con URL completa.
- Normalizados 11 socials INSTAGRAM de '@handle'/'handle' a 'https://instagram.com/handle' vía scripts/normalize-instagram-urls.mjs. 3 ya estaban OK. 14 IG en total.
- apply-real-venues.js (setInstagram) actualizado para guardar URL completa.

Stage Summary:
- La Villa de San Pedro: nombre + pin + dirección + Instagram verificados.
- Formato canónico de socials INSTAGRAM en DB: URL completa.

---
Task ID: auditoria-completitud
Agent: Z.ai (sesión continua)
Task: Informe de estado de datos (verificados vs no verificados) para el usuario.

Work Log:
- Creado scripts/audit-completeness.mjs: audita los 33 negocios (pin exacto, dirección real, teléfono, IG, cover, descripción).
- Corregidos slugs en el mapa de verificación: pin exacto de Africa Burguers = slug tasca-el-patio; dirección real de Licobar JJ = slug licobar-punto-de-encuentro.

Stage Summary:
- Estado: 8/33 pins exactos; 4/33 direcciones reales; 14 IG; 8 teléfonos de directorio; 5 sin cover; 33/33 con descripción (redactada por agente, no verificada).
- Suspiciosos detectados: IG @puntoencuentrolt en Licobar JJ (parece del nombre viejo); atribución de @elpatio a Africa Burguers sin confirmar; dirección "CC La Matica Km 25" de Medusa contradice su pin (centro).

---
Task ID: pins-lote-centro
Agent: Z.ai (sesión continua)
Task: Lote de 8 pines verificados por el usuario (Bicentenario, Naikel, Panamericana, Club Centro de Amigos, Koko Frappe, Jungla Bar, Chuky, Cúrametono) + 4 direcciones.

Work Log:
- 8 short links resueltos y aplicados vía scripts/apply-pins-batch-centro.mjs (Δ 0.3–2.6 km).
- Direcciones reales: Bicentenario (Local 1, frente El Rincón, Av. Roscio esq. Flor de Mayo), Naikel (C.C. Ambrosi, C. Boyacá), Panamericana (8XVC+955), Chuky (9W2X+5RH, Av. Víctor Batista).
- Solo pin (dirección sin cambios): Club Centro de Amigos (CAPEM), Koko Frappe, Jungla Bar (conserva Mercado Municipal El Paso), Cúrametono.
- Roster sincronizado (8 entradas). Commit: ver git log.

Stage Summary:
- 16/33 pines exactos · 8/33 direcciones reales.
- Datos curiosos: Club Centro de Amigos = CAPEM según Google; Koko Frappe y Jungla Bar quedan ~2.5 km NW del centro (zona noreste-norte, revisar zona si el usuario quiere).
- Pendientes: 17 pins aproximados, 5 sin cover, IGs sin confirmar.

---
Task ID: covers-5-faltantes
Agent: Z.ai (sesión continua)
Task: Cierre de sesión — generar y conectar las 5 portadas faltantes.

Work Log:
- Invocado skill image-generation; 5 portadas 1024x1024 generadas vía scripts/generate-covers.sh (estilo ámbar cálido consistente, sin texto).
- Verificadas visualmente (bodegon-panamericana, licoreria-la-llovizna).
- DB actualizada vía scripts/attach-covers.mjs → coverImage = /images/<slug>.png. 33/33 con portada.
- Commit: ver git log.

Stage Summary:
- Cierre del día: 16/33 pines exactos · 8/33 direcciones reales · 33/33 portadas · 14 IGs en URL canónica.
- Pendiente próxima sesión: 17 pines aproximados; confirmar IG de Africa Burguers (@elpatio) y Licobar JJ (@puntoencuentrolt); zonas de Koko Frappe/Jungla Bar/La Casita de Maikel opcionales.

---
Task ID: seo-6b-7a
Agent: Z.ai (sesión continua)
Task: Generar sitemap.xml dinámico y añadir JSON-LD (LocalBusiness, AggregateRating, BreadcrumbList) — Sprint 7A + prerrequisito 6B.

Work Log:
- Diagnóstico: 7A requería URLs indexables (6B) — la app era SPA client-side sin rutas para locales.
- src/lib/seo.ts: helpers JSON-LD (SITE_URL, categoryToSchemaType → LiquorStore/NightClub/BarOrPub, buildOpeningHours con agrupación de días, buildLocalBusinessJsonLd con AggregateRating solo si reviewCount>0, buildBreadcrumbJsonLd, serializeJsonLd @graph).
- src/app/local/[slug]/page.tsx: Server Component SSG+ISR revalidate=3600, generateStaticParams (33 slugs, fallback [] si DB cae), generateMetadata (title/description/canonical/OG/Twitter), HTML crudo con contenido (portada, badges, rating, descripción, dirección+Maps, horarios via formatSchedule, teléfono, IG, CTA → /?local=slug), JSON-LD @graph (LocalBusiness+BreadcrumbList), 404 para inactivos/inexistentes.
- src/app/local/page.tsx: hub/directorio server agrupado por categoría (13 licorerías, 7 tascas, 7 discotecas, 6 licobares) con 33 links internos.
- src/app/sitemap.ts: 35 URLs (/ + /local + 33 /local/[slug]), lastModified desde updatedAt, revalidate 1h, fallback estático si DB falla.
- src/app/robots.ts: allow /, disallow /api/ y /r/, sitemap + host; eliminado public/robots.txt (conflicto Next).
- src/app/page.tsx (SPA): deep-link /?local=slug → goToDetail + limpia query; useEffect [view, selectedSlug] sincroniza URL con replaceState (/local/slug ↔ /).
- Validación: build prerenderiza 33 fichas + /local + sitemap + robots; scripts/validate-jsonld.mjs en verde (BarOrPub/NightClub correctos, rating 4.6(24) en El Toro, 404 en slug falso, 0 bloques JSON-LD en home); HTML crudo muestra nombre/dirección/horario; directorio expone 33 hrefs; eslint limpio.
- PLAN-MEJORAS-ESTRUCTURALES.md actualizado (6B+7A marcados implementados con nota de decisiones).

Stage Summary:
- Google ahora tiene 35 URLs indexables con rich results potenciales.
- Commit: ver git log. Pendiente post-deploy: registrar sitemap en Search Console (tarea externa 7A.6).
- Nota: fichas server no llevan AgeGate (info factual del local); si el dueño quiere gate también en fichas, es decisión de producto.
- Siguientes sprints según plan: 7B (AgeGate cookie 30d + login contextual) y 8 (editorial semanal).

---
Task ID: sprint-7b
Agent: Z.ai (sesión continua)
Task: Sprint 7B — AgeGate cookie 30 días + login contextual + retorno post-login.

Work Log:
- 7B.1-2: page.tsx migró AgeGate de sessionStorage a cookie 'age-verified=1' (Max-Age 2592000, SameSite=Lax, Secure solo https). Patrón anti-hydration (useSyncExternalStore + getServerSnapshot=false) intacto. Nota regulatoria en comentario (criterio dueño).
- 7B.3: store.ts +requestLogin/clearLoginPrompt + tipo PendingIntent (favorite/redeem/reserve). requestLogin persiste en sessionStorage 'pending-intent' (bug inicial detectado en E2E: estado zustand no sobrevivía redirect → corregido).
- LoginPromptModal.tsx nuevo (montado en page.tsx): mensaje contextual + botón Google/demo vía beginLogin() extraído a src/lib/auth-login.ts (producción redirect:true / dev redirect:false / demo modal).
- Hooks use-favorite/reservation/redemption-actions: notificaciones 'Inicia sesión...' → requestLogin() con intención; catch NOT_AUTHENTICATED también abre modal.
- 7B.4: use-pending-intent.ts (montado en page.tsx): al authenticated + intent persistido → favorite/redeem auto-ejecutados; reserve → goToDetail(slug) para confirmar con datos del usuario; limpia intent antes de ejecutar (sin bucles de reintento).
- Navbar: CTA global de login eliminado para visitantes (solo avatar/notifications/logout con sesión); DemoLoginModal movido al LoginPromptModal; imports/GoogleIcon limpiados; lógica de login en auth-login.ts.
- E2E agent-browser (server standalone + env del .env): gate visible → click SOY MAYOR → document.cookie 'age-verified=1' → reload → gate 0 veces, cookie persiste. Corazón Bodegón Bravamar sin sesión → modal 'Inicia sesión para guardar Bodegón Bravamar en tus favoritos' → pending-intent '{"type":"favorite",...}' en sessionStorage. Build 63 páginas + eslint limpio.

Stage Summary:
- Criterios done 7B cumplidos (verificados con agent-browser salvo auto-ejecución post-OAuth real, que sigue el patrón de hooks ya probados).
- Commits: 3f6275e (6B+7A) → d73a722 (7B). Push a GitHub realizado por el dueño con PAT (Vercel despliega). Sitemap registrado en Search Console por el dueño.
- Siguiente sprint del plan: 8 (editorial 'Qué hacer este fin de semana', requiere datos reales del dueño). Pendiente menor: 6A.1 cifra '28' en layout.tsx (hoy son 33).

---
Task ID: sprint-7b-push
Agent: Z.ai (sesión continua)
Task: Push del Sprint 7B a GitHub con PAT del dueño.

Work Log:
- Verificado: origin/main estaba en 48fc2ad; local tenía d73a722 (Sprint 7B) + c6ebd01 (plan/worklog) sin pushear.
- Confirmado en worklog previo que 7B ya estaba validado (E2E agent-browser, build 63 páginas, eslint limpio).
- Push ejecutado: 48fc2ad..c6ebd01 main -> main (repo sqn8nproyect-pixe/Conecta-Lt2.0). Vercel despliega automáticamente.

Stage Summary:
- Sprint 7B ya en GitHub → Vercel desplegará AgeGate cookie 30d + login contextual.
- El dueño confirmó que aún NO revocó el PAT; recordarle revocarlo tras confirmar el deploy.
- Siguiente sprint del plan: 8 (editorial semanal, requiere datos del dueño). Pendiente menor: 6A.1 cifra '28' en layout.tsx (hoy son 33).

---
Task ID: sprint-8
Agent: Z.ai (sesión continua)
Task: Sprint 8 — Editorial "Qué hacer este fin de semana" (8.1-8.5).

Work Log:
- 8.1: prisma/schema.prisma + enum EditorialStatus (DRAFT/PUBLISHED) + model EditorialPost (slug unique, body markdown @db.Text, weekOf @db.Date, publishedAt, M-N implícita con Business) + editorialPosts en Business. `prisma db push` a Neon OK (aditivo) + generate.
- 8.4: prisma/seed-editorial.ts — post v1 "Qué hacer este fin de semana en Los Teques (12 y 13 de septiembre)" (weekOf 2026-09-12). Investigación previa con scripts/editorial-research.mjs: 21 negocios con promos, pero SOLO se citan las 7 vigentes (endDate ≥ 12-sep: El Toro BARRILITO24, Café Racer BOTELLON24, Mercaplus TEQUENO2X1, Estación Birra FRIO6AM, Licobar JJ PUNTO24, Bicentenario TERRAZA17, Jungla DONAROSA4) — las vencidas 09-sep no se citan. Horarios y ratings con reviewCount real tomados de la DB. Slugs de links resueltos en runtime (15/15 conectados). Idempotente (upsert). Bugfix: en upsert create no existe `set` para M-N → connect en create / set en update. Script npm: db:seed-editorial.
- 8.2: src/app/editorial/page.tsx — hub SSG+ISR (revalidate 3600), posts PUBLISHED ordenados por weekOf desc, cards con fecha "Fin de semana del X de septiembre" (Intl es-VE timeZone UTC) + nº de locales, JSON-LD BreadcrumbList, metadata canonical /editorial, empty state.
- 8.3: src/app/editorial/[slug]/page.tsx — SSG (generateStaticParams fallback [] si DB cae) + ISR, generateMetadata (OG type article, publishedTime, canonical, OG/Twitter con cover del primer local mencionado), body markdown con react-markdown (a interna → Link /externa → _blank, estilos obsidian/gold coherentes con /local), sección "Locales mencionados" con cards a /local/[slug] (cover, rating, categoría, zona, priceRange), CTA a la app, notFound() si DRAFT/inexistente. JSON-LD @graph Article + BreadcrumbList (buildArticleJsonLd añadido a src/lib/seo.ts).
- Sitemap: /editorial (0.8 weekly) + posts PUBLISHED (0.7 weekly, lastModified=updatedAt) → 37 URLs totales.
- 8.5: API pública GET /api/editorial/active (post más reciente, 503-safe) + fetchActiveEditorial() en api.ts + widget "ESTE FIN DE SEMANA" en HomePage (useQuery staleTime 10min, hidden si no hay post; card glass-card con CalendarDays, título, excerpt, flecha).
- Validación: build OK (/editorial estática + post SSG + 33 fichas + sitemap), eslint limpio, scripts/validate-editorial.mjs 25/25 checks E2E (JSON-LD Article completo, 15 links internos únicos, canonical, OG article, 404 slug falso, sitemap 37 URLs, API devuelve post).

Stage Summary:
- Google ahora tiene 37 URLs indexables (3 estáticas + 33 fichas + 1 post) con rich result Article potencial.
- Post v1 en producción con SOLO hechos verificados de la DB; promos vencidas excluidas deliberadamente.
- Cadencia semanal y 8.6 (ABM admin) pendientes de decisión del dueño; plantilla para próximas ediciones: prisma/seed-editorial.ts + bun run db:seed-editorial.
- Pendiente menor arrastrado: 6A.1 cifra '28' en layout.tsx (hoy son 33).
