// CONECTA-LT — Type definitions

export type Category = 'licorería' | 'tasca' | 'discoteca';

export type PriceRange = '$' | '$$' | '$$$';

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
}

export type View = 'home' | 'map' | 'detail' | 'profile';

export type NotificationType = 'success' | 'info';

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
