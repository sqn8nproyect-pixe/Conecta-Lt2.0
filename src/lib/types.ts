// CONECTA-LT — Type definitions

export type Category = 'licorería' | 'tasca' | 'discoteca';

export type PriceRange = '$' | '$$' | '$$$';

// ─── Etapa 7.B — UserRole (local mirror of the Prisma enum) ────
//
// We define this locally rather than importing from '@prisma/client'
// because types.ts is shared with client code, and importing Prisma's
// generated types into the client bundle would unnecessarily bloat it.
// The runtime values of the Prisma `UserRole` enum are exactly these
// strings (see prisma/schema.prisma → `enum UserRole`), so the union
// is structurally identical and casts at the API boundary are safe.
//
// Mirrors `UserRole` from `prisma/schema.prisma`:
//   enum UserRole { USER, BUSINESS_OWNER, BUSINESS_MANAGER, MODERATOR, ADMIN }
export type UserRole =
  | 'USER'
  | 'BUSINESS_OWNER'
  | 'BUSINESS_MANAGER'
  | 'MODERATOR'
  | 'ADMIN';

// ─── Etapa 3.6 — Aforo en tiempo real ──────────────────────────
// Crowdsourced venue capacity. Users who visit a venue report its
// current load: QUIET (tranquilo — plenty of space) / MODERATE
// (moderado — filling up) / FULL (lleno — at capacity). The most
// recent report wins (per-business). Mirrors the Prisma
// `CapacityLevel` enum in `prisma/schema.prisma`.
export type CapacityLevel = 'QUIET' | 'MODERATE' | 'FULL';

export interface SubRatings {
  ambiente: number;
  servicio: number;
  precioCalidad: number;
}

export interface SocialMedia {
  /** Full URL to the Instagram profile (https://instagram.com/handle) */
  instagram?: string;
  /** Full URL to the TikTok profile */
  tiktok?: string;
  /** Full URL to the Facebook page */
  facebook?: string;
}

export interface ActivePromotion {
  /** Short label, e.g. "2x1 en Cócteles" */
  label: string;
  /** ISO date string (YYYY-MM-DD) until which the promo is valid */
  validUntil: string;
}

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  /** Legacy handle (e.g. "@licoreriadonsancho"). Kept for backwards-compat with existing UI. */
  instagram: string;
  coverImage: string;
  /** Legacy array (2-3 photos). Kept for backwards-compat with the hero slider. */
  images: string[];
  avgRating: number;
  reviewCount: number;
  priceRange: PriceRange;
  schedule: string;
  subRatings: SubRatings;

  // ─── NEW: enriched fields (Fichas Enriquecidas) ─────────────────────────
  /** Distinctive specialty tag, e.g. "Coctelería de Autor", "Whiskies Añejos" */
  specialty: string;
  /** Hook phrase that differentiates this establishment from the competition */
  valueProposition: string;
  /** Exactly 10 photo URLs used by the immersive PhotoGallery component */
  gallery: string[];
  /** Official website URL (optional) */
  website?: string;
  /** Social media profile URLs (each one optional) */
  socialMedia: SocialMedia;
  /** If present, the home card shows a pulsing "PROMO ACTIVA" badge */
  activePromotion?: ActivePromotion;

  // ─── Etapa 3.6 — Aforo en tiempo real ──────────────────────────
  // Crowdsourced current-capacity signal. Null when no one has reported
  // yet. Set by POST /api/businesses/[slug]/capacity (auth required) and
  // surfaced on every card + the detail page header so users can see at
  // a glance whether a venue is tranquilo / moderado / lleno right now.
  currentCapacity?: CapacityLevel | null;

  // ─── Etapa 7.B — Business claim flow ────────────────────────
  // `ownerId` is null until a BUSINESS_OWNER (or ADMIN) claims the
  // business via POST /api/businesses/[slug]/claim. Once set,
  // `claimedAt` is the ISO timestamp of when the claim happened.
  //
  // The EstablishmentPage uses these to render either:
  //   - "Gestionando este local" badge (if ownerId === current user.id)
  //   - "Reclamar este local" button (if ownerId is null AND the user
  //     is a BUSINESS_OWNER)
  //   - nothing (if someone else owns it)
  ownerId?: string | null;
  claimedAt?: string | null;
}

export interface Offer {
  id: string;
  establishmentId: string;
  title: string;
  description: string;
  price: string;
  discount: string;
  image: string;
  code: string;
  /** ISO date string — when the promotion expires. Optional because legacy
   *  seeded offers may not have it (Etapa 4 backfill adds it to all 42). */
  endDate?: string | null;
  /** ISO date string — when the promotion starts. */
  startDate?: string | null;
  /** Max number of redemptions allowed for this promotion (null = unlimited). */
  maxRedemptions?: number | null;
  /** Running count of users who have claimed this promotion. */
  redemptionCount?: number;
  /** Status from DB: ACTIVE, EXPIRED, PAUSED, DRAFT. */
  status?: string;
}

/**
 * A Promotion returned by GET /api/promotions/redeemed — extends Offer with
 * the extra fields needed for the "MIS CUPONES" UI (countdown, status, etc.)
 * plus the business it belongs to (id/name/slug/address) for navigation.
 */
export interface RedeemedPromotion extends Offer {
  endDate?: string;
  maxRedemptions?: number | null;
  redemptionCount: number;
  business: {
    id: string;
    name: string;
    slug: string;
    address: string;
  };
}

/**
 * A user's claimed coupon — the row in the `CouponRedemption` table.
 * `status` drives the badge shown in MIS CUPONES:
 *   - CLAIMED  → "ACTIVO"   (green, can be used)
 *   - USED     → "USADO"    (blue, already redeemed at the venue)
 *   - EXPIRED  → "EXPIRADO" (grey, promo ended before being used)
 */
export interface CouponRedemption {
  id: string;
  status: 'CLAIMED' | 'USED' | 'EXPIRED';
  /** ISO timestamp of when the user clicked "RECLAMAR CÓDIGO". */
  claimedAt: string;
  promotion: RedeemedPromotion;
}

// ─── Reservations (Etapa 5) ─────────────────────────────────────
// Persistent reservations — backed by the Reservation table.
// Replaces the old `generateReservationCode()` local-only code so that
// a user who logs out and back in still sees the reservations they made.

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface Reservation {
  id: string;
  confirmationCode: string;
  status: ReservationStatus;
  /** ISO date string YYYY-MM-DD — the day the reservation is for. */
  date: string;
  /** HH:mm (24h) — the time the reservation is for. */
  time: string;
  guests: number;
  notes: string | null;
  name: string;
  phone: string;
  email: string | null;
  /** ISO timestamp of when the reservation was created. */
  createdAt: string;
  business: {
    id: string;
    name: string;
    slug: string;
    address: string;
    coverImage: string | null;
    phone: string | null;
  };
  coupon: {
    code: string;
    title: string;
    image: string | null;
    discount: string | null;
  } | null;
}

export interface Review {
  id: string;
  establishmentId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  /** Global rating 1-5 — average of the 3 sub-ratings, calculated by the backend. */
  rating: number;
  /** Sub-rating Ambiente 1-5 (Etapa 3 — real per-dimension value). */
  ambienteRating: number;
  /** Sub-rating Servicio 1-5 (Etapa 3 — real per-dimension value). */
  servicioRating: number;
  /** Sub-rating Precio-Calidad 1-5 (Etapa 3 — real per-dimension value). */
  precioCalidadRating: number;
  comment: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  /**
   * Etapa 7.B — RBAC role. Mirrors the Prisma `UserRole` enum.
   * Defaults to 'USER' if the session hasn't populated it yet (e.g.
   * during the brief window between session loading and the
   * `useFavoritesSync` effect mirroring the session into the store).
   */
  role?: UserRole;
}

// ─── Etapa 7.C.1 — Admin Panel types ───────────────────────────
//
// The admin panel surfaces businesses / reviews / users / claims in
// every status (not just ACTIVE / PUBLISHED / USER) so moderators can
// triage queues. The following types mirror the Prisma enums for the
// frontend, declared locally (same policy as `UserRole` above — avoid
// importing `@prisma/client` into the client bundle).
//
// Mirrors `BusinessStatus` from `prisma/schema.prisma`:
//   enum BusinessStatus { DRAFT, PENDING_REVIEW, ACTIVE, SUSPENDED, ARCHIVED }
export type BusinessStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED';

// Mirrors `ReviewStatus` from `prisma/schema.prisma`:
//   enum ReviewStatus { PENDING, PUBLISHED, HIDDEN, FLAGGED }
export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

export type View = 'home' | 'map' | 'detail' | 'profile' | 'admin' | 'owner';

export type NotificationType = 'success' | 'info';

// ── Admin dashboard types (Etapa 7.C.1) ───────────────────────────
//
// `AdminStats` is the payload of GET /api/admin/stats — a single object
// with totals, pending queues, recent activity and "top this week"
// rankings. Drives the Resumen tab of the AdminDashboard.
//
// `AdminBusiness` extends the public `Establishment` with the admin-only
// `status` and `owner` fields (the public transformBusiness already
// exposes `ownerId`/`claimedAt`, but the admin table also needs the
// owner's name + email so the moderator can contact them).
export interface AdminStats {
  totals: {
    businesses: number;
    users: number;
    reviews: number;
    reservations: number;
    promotions: number;
    couponRedemptions: number;
    analyticsEvents: number;
    notifications: number;
  };
  pending: {
    businesses: number; // status = PENDING_REVIEW
    reviews: number; // status = PENDING or FLAGGED
    promotions: number; // status = DRAFT or PAUSED
  };
  recent: {
    reservations: Array<{
      id: string;
      confirmationCode: string;
      createdAt: string;
      business: { name: string; slug: string };
      user: { name: string | null; email: string } | null;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      createdAt: string;
      business: { name: string; slug: string };
      user: { name: string | null };
    }>;
    claims: Array<{
      id: string;
      name: string;
      slug: string;
      claimedAt: string;
      owner: { name: string | null; email: string };
    }>;
  };
  topThisWeek: {
    businesses: Array<{ name: string; slug: string; views: number }>;
  };
}

export interface AdminBusiness extends Establishment {
  status: BusinessStatus;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface AdminReview {
  id: string;
  rating: number;
  ambienteRating: number;
  servicioRating: number;
  precioCalidadRating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  business: { id: string; name: string; slug: string };
  user: { id: string; name: string | null; email: string; image: string | null };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: string;
}

// ─── Etapa 8.A — Admin Metrics types ────────────────────────────
//
// `AdminAnalyticsOverview` is the payload of
// GET /api/admin/analytics/overview?range=7d. Drives the "Métricas"
// tab of the AdminDashboard.
export type AnalyticsRange = '1d' | '7d' | '30d' | '90d';

export interface AdminAnalyticsOverview {
  range: { days: number; label: AnalyticsRange };
  // Count by event type for the window. Keys are event type names
  // (BUSINESS_VIEW, WHATSAPP_CLICK, …). Missing keys = 0.
  kpis: Record<string, number>;
  // Daily time series for the line chart. One entry per (day, type)
  // pair, zero-filled for days/types with no events.
  timeSeries: Array<{ date: string; type: string; count: number }>;
  // Top 10 businesses by WHATSAPP_CLICK in the window.
  topWhatsApp: Array<{
    businessId: string;
    businessName: string;
    slug: string;
    count: number;
  }>;
  // Top 10 businesses by BUSINESS_VIEW in the window.
  topViews: Array<{
    businessId: string;
    businessName: string;
    slug: string;
    count: number;
  }>;
  // Top 10 search queries (lowercased, trimmed) in the window.
  topSearches: Array<{ query: string; count: number }>;
  // Last 50 events with resolved business + user info.
  recentEvents: Array<{
    id: string;
    type: string;
    businessId: string | null;
    businessName: string | null;
    slug: string | null;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    createdAt: string;
  }>;
}

// ─── Etapa 7.C.2 — Owner Dashboard types ───────────────────────
//
// The owner dashboard ("Mis Locales") surfaces a BUSINESS_OWNER's
// claimed businesses with ALL editable fields exposed (hours, socials,
// owner info) — not just the public Establishment shape. It also
// lists reservations for their business (with the customer's user
// info) and their promotions (all statuses, not just ACTIVE).

// Mirrors `PromotionStatus` from `prisma/schema.prisma`:
//   enum PromotionStatus { DRAFT, ACTIVE, EXPIRED, PAUSED }
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'PAUSED';

/**
 * The business payload returned by GET /api/owner/businesses/[slug] —
 * the full public Establishment shape PLUS the raw `hours` / `socials`
 * / `owner` arrays the owner dashboard's edit forms need (the public
 * transformer collapses them into derived fields like `schedule` /
 * `instagram` / etc., but the edit forms need the raw rows too).
 */
export interface OwnerBusiness extends Establishment {
  hours: Array<{
    id: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  socials: Array<{ id: string; type: string; value: string }>;
  owner: { id: string; name: string | null; email: string } | null;
}

/**
 * A reservation with the user's info attached — the owner dashboard
 * table shows the customer's name + phone so the owner can contact
 * them. The user is null for legacy reservations that pre-date the
 * user link (or for guest reservations if we ever add that flow).
 */
export interface OwnerReservation extends Reservation {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

/**
 * The promotion payload returned by the owner list/create endpoints.
 * Same shape as `Offer` plus the dates as ISO strings + the
 * redemptionCount + status (so the dashboard can render status
 * badges and redemption progress).
 */
export interface OwnerPromotion {
  id: string;
  businessId: string;
  title: string;
  description: string;
  price: string;
  discount: string;
  image: string;
  code: string;
  startDate: string | null;
  endDate: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  status: PromotionStatus;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
}

export interface MatchAnswers {
  mood: '' | 'chill' | 'party';
  company: '' | 'couple' | 'friends';
  budget: '' | 'low' | 'premium';
}

export interface BookingData {
  name: string;
  /** Contact phone — required by the backend (POST /api/reservations). */
  phone: string;
  date: string;
  time: string;
  guests: string;
  /** Optional notes the user wants to send to the venue. */
  notes: string;
  /** The promotion ID the user is reserving with (empty if none). */
  dealId: string;
  /** Display label for the offer (its title) — shown on the modal + ticket. */
  dealTitle: string;
}

// ── ANALYTICS (Etapa 6) ───────────────────────────────────────
export type AnalyticsEventType =
  | 'BUSINESS_VIEW'
  | 'WHATSAPP_CLICK'
  | 'INSTAGRAM_CLICK'
  | 'MAPS_CLICK'
  | 'SEARCH'
  | 'RESERVE_CLICK'
  | 'REDEEM_CLICK'
  | 'CAPACITY_REPORT'; // Etapa 3.6

export interface TrackEventPayload {
  type: AnalyticsEventType;
  businessSlug?: string;
  metadata?: Record<string, unknown>;
}

export interface PopularBusiness {
  business: Establishment;
  viewCount: number;
}

export interface BusinessViewCount {
  slug: string;
  viewCount: number;
}

// ── NOTIFICATIONS persistent (Etapa 7.A) ─────────────────────
//
// Persistent notifications = an "inbox" of important events for the
// user (reservation confirmed, coupon redeemed, review published…).
// They survive across sessions (DB-backed) and are surfaced via the
// bell icon in the navbar. This is a SEPARATE concept from the
// ephemeral `AppNotification` toast array above (which is for transient
// feedback like "¡Reserva confirmada!" and disappears in 4s).
//
// `PersistentNotificationType` mirrors the union in
// `src/server/services/notification.service.ts → NotificationType`.
// The Prisma schema stores `type` as a plain String so we can add new
// types without a migration, but this union is the compile-time
// contract for the frontend.
export type PersistentNotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'COUPON_REDEEMED'
  | 'REVIEW_PUBLISHED'
  | 'CAPACITY_REPORTED'
  | 'SYSTEM';

export interface PersistentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO
}
