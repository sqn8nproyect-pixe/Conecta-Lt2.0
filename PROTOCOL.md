# CONECTA-LT 3.0 — PROTOCOLO DE VERIFICACIÓN COMPLETO
# Última actualización: 2026-08-28 (credenciales rotadas)

## 1. IDENTIDAD DEL PROYECTO

- **Nombre**: CONECTA-LT 3.0 (Conecta Los Teques)
- **Tipo**: Directorio de vida nocturna de Los Teques, Venezuela
- **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Framer Motion + Zustand
- **Arquitectura**: SPA con ruta única `/` — vistas controladas por estado global (Zustand)
- **Repositorio GitHub**: https://github.com/sqn8nproyect-pixe/Conecta-Lt2.0.git (branch: main)
- **Proyecto Vercel**: conecta-lt2-0 (ID: prj_yZ81u5SXdIvXpsngw0cEHrVMxclH)
- **URL producción**: conecta-lt2-0-sqn8nproyect-1584s-projects.vercel.app (SSO habilitado)

## 2. BASE DE DATOS (Neon PostgreSQL)

- **Proveedor**: Neon (serverless PostgreSQL)
- **Pooler URL**: ep-lingering-hill-ay3mv4lk-pooler.c-5.us-east-2.aws.neon.tech
- **Schema**: 16 modelos (prisma/schema.prisma, provider=postgresql)
- **Modelos**: Country, State, City, Zone, User, Account, Session, VerificationToken, Category, Business, BusinessHours, BusinessSocial, BusinessImage, Promotion, CouponRedemption, Review, Favorite, Reservation, AnalyticsEvent, Notification, BusinessProposal

### Datos en producción:
| Tabla | Registros |
|-------|----------|
| Businesses | 21 |
| Promotions | 42 |
| Reviews | 93 |
| Users | 38 |
| CouponRedemptions | 5 |
| Reservations | 9 |
| BusinessImages | 231 (seeded, no R2 yet) |
| AnalyticsEvents | 6,520 |
| Notifications | 31 |
| BusinessProposals | 0 |
| Categorías | 3 (discoteca×7, licorería×7, tasca×7) |

### Asignaciones de dueños:
- **20 de 21 negocios** owned por sqn8nproyect@gmail.com (role: BUSINESS_OWNER)
- **1 negocio** (Tasca Los Amigos) owned por ana.rodriguez@gmail.com (role: BUSINESS_OWNER)
- **tasca-el-patio** (Africa Burguers) tiene AMBOS ownerId y proposedOwnerId = sqn8nproyect

## 3. AUTENTICACIÓN Y ROLES

### Proveedor:
- Google OAuth (cuando NEXT_PUBLIC_GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET están configurados)
- Credentials demo (Ana Rodríguez) como fallback
- Adapter: @auth/prisma-adapter (Account, Session, VerificationToken)
- Estrategia: JWT

### RBAC:
- **ADMIN_EMAILS** (admin-config.ts): ['sqn8nproyect@gmail.com']
- El JWT callback OVERRIDEA el rol de la BD si el email está en ADMIN_EMAILS → ADMIN
- Emails NO en ADMIN_EMAILS con rol ADMIN/MODERATOR en BD → degradados a USER
- **requireRole(...roles)** en server/auth.ts: 401 sin sesión, 403 sin permiso
- Defense in depth: re-verifica ADMIN_EMAILS en cada request del servidor

### Usuario admin:
- **sqn8nproyect@gmail.com** → ADMIN (por allowlist), BUSINESS_OWNER (en BD)
- **ID**: cmsnq9x850000kv04jj4wpxbe
- Nombre: Sqn8nproyect Beta

## 4. ALMACENAMIENTO DE IMÁGENES (R2)

### Infraestructura Cloudflare R2:
- **Bucket**: conectalt
- **Account ID**: c0052c1eca67cae29715fad932ee5f91
- **S3 Endpoint**: https://c0052c1eca67cae29715fad932ee5f91.r2.cloudflarestorage.com
- **Public URL**: https://pub-conectalt.c0052c1eca67cae29715fad932ee5f91.r2.dev
- **CORS**: Configurado (PUT, GET, HEAD, DELETE desde cualquier origen)
- **Public Access**: Activado

### Código R2:
- **src/lib/r2.ts**: Cliente S3 singleton, generatePresignedUploadUrl(), deleteObject(), isR2Configured()
- **src/app/api/upload/presign/route.ts**: POST → genera presigned PUT (auth: BUSINESS_OWNER/ADMIN + verificación propiedad)
- **src/app/api/owner/businesses/[slug]/images/route.ts**: GET/POST/DELETE imágenes en BD + R2
- **src/components/ui/image-upload-zone.tsx**: Componente drag & drop reutilizable con preview, progreso, errores

### Flujo de subida:
1. Frontend → POST /api/upload/presign → obtiene uploadUrl + publicUrl + key
2. Frontend → PUT directo a uploadUrl (R2, bypass Vercel 4.5MB limit)
3. Frontend → POST /api/owner/businesses/[slug]/images → registra en BD

## 5. VARIABLES DE ENTORNO

### .env local:
```
DATABASE_URL=postgresql://neondb_owner:npg_Giq7C6LlYdkz@ep-lingering-hill-ay3mv4lk-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=(mismo pooler URL)
NEXTAUTH_SECRET=dev-secret-key-for-local-conecta-lt-32bytes!!
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=(mismo)
AUTH_URL=http://localhost:3000
R2_ACCOUNT_ID=c0052c1eca67cae29715fad932ee5f91
R2_ACCESS_KEY_ID=d403bbcb052b6e78af74ee5a5ee2e3e7
R2_SECRET_ACCESS_KEY=44e45ceaa33a4971329cc88dd2396acf72250a22f7657fc5a120a3182baba17b
R2_BUCKET_NAME=conectalt
R2_PUBLIC_URL=https://pub-conectalt.c0052c1eca67cae29715fad932ee5f91.r2.dev
```

### Vercel env vars (configuradas vía API):
- DATABASE_URL ✅ (production+preview+development)
- DIRECT_URL ✅
- NEXTAUTH_SECRET ✅ (preview+production)
- AUTH_SECRET ✅ (preview+production)
- NEXTAUTH_URL_VERCEL ✅ (preview+production)
- GOOGLE_CLIENT_SECRET ✅
- NEXT_PUBLIC_GOOGLE_CLIENT_ID ✅
- R2_ACCOUNT_ID ✅ (production+preview+development)
- R2_ACCESS_KEY_ID ✅
- R2_SECRET_ACCESS_KEY ✅
- R2_BUCKET_NAME ✅
- R2_PUBLIC_URL ✅

## 6. RUTAS API (38 endpoints)

### Auth:
- /api/auth/[...nextauth] — NextAuth

### Público:
- GET/POST /api/businesses, GET /api/businesses/[slug]
- GET/POST /api/reviews, GET /api/favorites, GET/POST /api/reservations
- POST /api/reservations/[id]/cancel
- GET/POST /api/promotions/[id]/redeem, GET /api/promotions/check, GET /api/promotions/redeemed
- GET/POST /api/notifications, POST /api/notifications/[id]/read
- POST /api/analytics/track, GET /api/analytics/popular
- GET /api/categories, POST /api/businesses/[slug]/views
- POST /api/businesses/[slug]/capacity, POST /api/businesses/[slug]/claim
- GET /api/planner/recommend

### Owner (BUSINESS_OWNER + ADMIN):
- GET/PUT /api/owner/businesses/[slug]
- PUT /api/owner/businesses/[slug]/hours
- PUT /api/owner/businesses/[slug]/socials
- GET/POST /api/owner/businesses/[slug]/promotions
- PUT/DELETE /api/owner/businesses/[slug]/promotions/[id]
- GET/POST /api/owner/businesses/[slug]/reservations
- PUT /api/owner/businesses/[slug]/reservations/[id]/status
- GET/POST/DELETE /api/owner/businesses/[slug]/images
- GET/POST /api/owner/businesses/[slug]/proposals
- GET/PUT /api/owner/businesses/proposals/[id]

### Admin (ADMIN only):
- GET /api/admin/stats, GET /api/admin/analytics/overview
- GET/PUT /api/admin/businesses, PUT /api/admin/businesses/[slug]/status
- POST /api/admin/businesses/[slug]/assign-owner
- POST /api/admin/businesses/[slug]/approve-owner
- POST /api/admin/businesses/[slug]/reject-owner
- GET /api/admin/businesses/[slug]/proposals
- POST /api/admin/businesses/[slug]/proposals/[id]/review
- POST /api/admin/businesses/migrate-ownership
- GET/PUT /api/admin/reviews, PUT /api/admin/reviews/[id]/status
- GET /api/admin/users, PUT /api/admin/users/[id]/role

### Upload (BUSINESS_OWNER + ADMIN):
- POST /api/upload/presign

## 7. COMPONENTES PRINCIPALES (SPA Views)

| Vista | Componente | Store View |
|-------|-----------|------------|
| Home | HomePage.tsx | 'home' |
| Mapa | MapPage.tsx + LeafletMap.tsx | 'map' |
| Detalle | EstablishmentPage.tsx | 'detail' |
| Perfil | ProfilePage.tsx | 'profile' |
| Admin | AdminDashboard.tsx | 'admin' |
| Owner | OwnerDashboard.tsx | 'owner' |
| Legal | LegalPage.tsx | 'privacy'/'terms' |
| About | AboutPage.tsx | 'about' |
| Planificador | NightPlanner.tsx (integrado en Home) | — |
| Matchmaker | Matchmaker.tsx (incompleto) | — |

### Componentes de soporte:
- Navbar.tsx (auth, nav, notificaciones, hidratación del store)
- Footer.tsx
- AgeGate.tsx
- Notifications.tsx (dropdown del navbar)
- image-upload-zone.tsx (drag & drop para R2)
- PhotoGallery.tsx, CapacityBadge.tsx, ActivePromotionsBadge.tsx
- SocialContactPanel.tsx, ValuePropositionBanner.tsx

### Estado global (Zustand store.ts):
- view, selectedEstablishmentSlug, selectedMapEstablishment
- user (hydrated desde NextAuth session)
- favorites[], redeemedPromotionIds[], reservations[]
- notifications[] (ephemeral, 4s auto-dismiss)
- persistentNotifications[] (DB-backed inbox)

## 8. SERVICIOS BACKEND (Server-side)

- src/server/repositories/: business, favorite, promotion, reservation, review, analytics, notification
- src/server/services/: business, favorite, promotion, reservation, review, analytics, notification
- src/server/planner/: availability, distance, reasons, repository, schema, scoring, service
- src/server/auth.ts: getCurrentUser(), requireUser(), getCurrentUserWithRole(), requireRole()

## 9. ERRORES TYPESCRIPT PRE-EXISTENTES (no bloquean el build)

Estos errores existen pero NO causan fallo en `next build` (Next.js no incluye estos archivos en el build graph):
1. Matchmaker.tsx — missing exports calculateMatch, getRecommendedDrink, MatchAnswers
2. Navbar.tsx:427 — string|undefined no asignable a string
3. AdminMetricsTab.tsx — Object possibly undefined (×2), Date no asignable a string
4. auth.ts:54 — trustHost no existe en tipo AuthOptions (NEXT_AUTH v4 type definition issue)

## 10. DEPENDENCIAS CLAVE

- next@^16.1.1, react@^19, next-auth@^4.24.11
- @prisma/client@^6.11.1, prisma@^6.11.1
- @aws-sdk/client-s3@^3.1119.0, @aws-sdk/s3-request-presigner@^3.1119.0
- framer-motion@^12.23.2, zustand@^5.0.6, @tanstack/react-query@^5.82.0
- leaflet@^1.9.4, react-leaflet@^5.0.0
- recharts@^2.15.4 (admin metrics), sharp@^0.34.3 (image processing)
- z-ai-web-dev-sdk@^0.0.18 (AI skills)

## 11. TAREAS PENDIENTES

### Seguridad (el usuario debe hacer):
1. ⚠️ **Rotar contraseña de Neon** — la URL de BD quedó expuesta en este chat
2. ⚠️ **Revocar PAT de GitHub** (ghp_o0z2H5CEc...) en github.com/settings/tokens
3. ✅ Token de Vercel ya revocado

### Funcionales:
4. Ejecutar "Migrar Dueños" en producción (POST /api/admin/businesses/migrate-ownership) — OPCIONAL, ya se asignaron dueños directamente
5. Limpiar proposedOwnerId de tasca-el-patio (tiene ambos ownerId y proposedOwnerId)
6. Probar la subida de imágenes R2 end-to-end en producción
7. Considerar cambiar NEXTAUTH_SECRET y AUTH_SECRET para producción (los actuales son dev secrets)

### Bugs conocidos:
8. Matchmaker.tsx — componente incompleto, imports rotos (no se usa en la UI)
9. auth.ts:54 `trustHost` — TypeScript error pero funciona en runtime (NextAuth v4 lo acepta)

## 12. ARQUITECTURA DE DESPLIEGUE

- **Git push** a GitHub (main) → **Vercel auto-deploy**
- Build command: `prisma generate && next build`
- No hay mini-services activos actualmente
- No hay custom domain configurado (usa Vercel subdomain con SSO)
