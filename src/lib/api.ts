// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Frontend API helpers
// Thin wrappers around fetch() for the public-facing endpoints.
// ─────────────────────────────────────────────────────────────

import type {
  AdminAnalyticsOverview,
  AdminBusiness,
  AdminReview,
  AdminStats,
  AdminUser,
  AnalyticsRange,
  BusinessStatus,
  BusinessViewCount,
  CapacityLevel,
  CouponRedemption,
  Establishment,
  OwnerBusiness,
  OwnerPromotion,
  OwnerReservation,
  PersistentNotification,
  PopularBusiness,
  PromotionStatus,
  RedeemedPromotion,
  Reservation,
  ReservationStatus,
  Review,
  ReviewStatus,
  TrackEventPayload,
  UserRole,
} from './types';
import type {
  NightPlannerPreferences,
  NightPlannerResponse,
} from '@/server/planner/types';

// The API returns an extended Establishment shape that also embeds
// the establishment's offers and reviews (see transformBusiness).
export type EstablishmentWithRelations = Establishment & {
  offers: import('./types').Offer[];
  reviews: Review[];
};

// A review plus the establishment it belongs to (used by /api/reviews?userId=me).
export type ReviewWithEstablishment = Review & {
  establishment: EstablishmentWithRelations;
};

export async function fetchBusinesses(params?: {
  category?: string;
  priceRange?: string;
  q?: string;
}): Promise<EstablishmentWithRelations[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.priceRange) searchParams.set('priceRange', params.priceRange);
  if (params?.q) searchParams.set('q', params.q);
  const res = await fetch(`/api/businesses?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch businesses');
  return res.json();
}

export async function fetchBusinessBySlug(
  slug: string,
): Promise<EstablishmentWithRelations | null> {
  const res = await fetch(`/api/businesses/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch business');
  return res.json();
}

export async function fetchCategories(): Promise<
  Array<{ id: string; name: string; slug: string; icon: string | null; color: string | null; sortOrder: number }>
> {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

// ─── Favorites (Etapa 2) ───────────────────────────────────────

export async function fetchFavorites(): Promise<EstablishmentWithRelations[]> {
  const res = await fetch('/api/favorites');
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function toggleFavorite(
  businessSlug: string,
): Promise<{ favorited: boolean; business: EstablishmentWithRelations }> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ businessSlug }),
  });
  if (res.status === 401) {
    throw new Error('NOT_AUTHENTICATED');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to toggle favorite' }));
    throw new Error(data.error ?? 'Failed to toggle favorite');
  }
  return res.json();
}

export async function checkFavorites(
  businessSlugs: string[],
): Promise<Record<string, boolean>> {
  if (businessSlugs.length === 0) return {};
  const res = await fetch('/api/favorites/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ businessSlugs }),
  });
  if (res.status === 401) return {};
  if (!res.ok) throw new Error('Failed to check favorites');
  return res.json();
}

// ─── Reviews (Etapa 2) ─────────────────────────────────────────

export async function fetchMyReviews(): Promise<ReviewWithEstablishment[]> {
  const res = await fetch('/api/reviews?userId=me');
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to fetch my reviews');
  return res.json();
}

export async function createReview(input: {
  businessSlug: string;
  ambienteRating: number;
  servicioRating: number;
  precioCalidadRating: number;
  comment: string;
}): Promise<{ review: Review; business: EstablishmentWithRelations }> {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Failed to create review' }));
  if (!res.ok) throw new Error(data.error ?? 'Failed to create review');
  return data;
}

// ─── Coupon Redemptions (Etapa 4) ──────────────────────────────
// Persistent "claimed coupons" — backed by the CouponRedemption table.
// Replaces the old `claimedCodes` useState in EstablishmentPage so that
// a user who logs out and back in still sees the coupons they redeemed.

export async function redeemPromotion(
  promotionId: string,
): Promise<{ redemption: CouponRedemption; promotion: RedeemedPromotion }> {
  const res = await fetch(`/api/promotions/${promotionId}/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Failed to redeem promotion' }));
  if (!res.ok) throw new Error(data.error ?? 'Failed to redeem promotion');
  return data;
}

export async function fetchMyRedemptions(): Promise<CouponRedemption[]> {
  const res = await fetch('/api/promotions/redeemed');
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to fetch redemptions');
  return res.json();
}

export async function checkRedemptions(
  promotionIds: string[],
): Promise<Record<string, boolean>> {
  if (promotionIds.length === 0) return {};
  const res = await fetch('/api/promotions/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ promotionIds }),
  });
  if (res.status === 401) return {};
  if (!res.ok) throw new Error('Failed to check redemptions');
  return res.json();
}

// ─── Reservations (Etapa 5) ────────────────────────────────────
// Persistent "bookings" — backed by the Reservation table.
// Replaces the local `generateReservationCode()` flow in the booking
// modal so that the confirmation code is generated server-side and
// survives reloads / logouts.

export async function createReservation(input: {
  businessSlug: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  couponRedemptionId?: string;
}): Promise<{ reservation: Reservation; confirmationCode: string }> {
  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({
    error: 'Failed to create reservation',
  }));
  if (!res.ok) throw new Error(data.error ?? 'Failed to create reservation');
  return data;
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  const res = await fetch('/api/reservations');
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to fetch reservations');
  return res.json();
}

export async function cancelReservation(
  id: string,
): Promise<{ reservation: { id: string; status: string } }> {
  const res = await fetch(`/api/reservations/${id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({
    error: 'Failed to cancel reservation',
  }));
  if (!res.ok) throw new Error(data.error ?? 'Failed to cancel reservation');
  return data;
}

// ─── Analytics (Etapa 6) ───────────────────────────────────────
// Fire-and-forget tracking + public read endpoints for "Populares esta
// semana" and per-business view counts. Mirrors the API contract exposed
// by the backend in Task 6.1 (see agent-ctx/6.1-full-stack-developer.md).

export async function trackAnalyticsEvent(
  payload: TrackEventPayload,
): Promise<void> {
  // Fire-and-forget: fire the request but never throw to the caller.
  // If it fails (network/400), just console.warn — tracking must NEVER
  // break the user flow.
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('analytics track failed:', e);
  }
}

export async function fetchPopularBusinesses(
  limit = 8,
): Promise<PopularBusiness[]> {
  const res = await fetch(`/api/analytics/popular?limit=${limit}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error');
  }
  return res.json();
}

export async function fetchBusinessViews(
  slug: string,
): Promise<BusinessViewCount> {
  const res = await fetch(`/api/businesses/${slug}/views`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error');
  }
  return res.json();
}

export async function fetchBulkBusinessViews(
  slugs: string[],
): Promise<BusinessViewCount[]> {
  const res = await fetch('/api/businesses/views', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slugs }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error');
  }
  return res.json();
}

// ─── Night Planner v2 (Sprint 3) ──────────────────────────────
//
// POST /api/planner/recommend — generates a Top 3 night-plan
// recommendation based on the user's preferences (mood, budget,
// company, date/time, guests, distance). Public endpoint, rate-
// limited to 10 req/min per IP.
//
// The response is either a success (with `recommendations` array)
// or an empty result (with `reason` + `suggestion`). The caller
// distinguishes by checking `recommendations.length > 0` or the
// presence of `reason`.
//
// The types are imported at the top of this file (from
// @/server/planner/types) — they're shared between client and server.

export async function fetchPlannerRecommend(
  preferences: NightPlannerPreferences,
): Promise<NightPlannerResponse> {
  const res = await fetch('/api/planner/recommend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  // 429 — rate limited (let the caller show a friendly message)
  if (res.status === 429) {
    throw new Error('Demasiadas búsquedas. Espera un minuto e intenta de nuevo.');
  }
  // 400 — validation error (Zod rejected the body)
  if (res.status === 400) {
    const data = await res.json().catch(() => ({ error: 'Datos inválidos' }));
    const detail = data.details?.[0]?.message ?? data.error ?? 'Datos inválidos';
    throw new Error(detail);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error al generar recomendaciones');
  }
  return res.json();
}

// ─── Capacity Reports (Etapa 3.6) ─────────────────────────────
// Aforo en tiempo real — any logged-in user can report a venue's
// current load (QUIET / MODERATE / FULL). The most recent report
// wins (per-business). Returns the persisted `{ id, currentCapacity }`
// so the caller can do an optimistic update.

export async function reportCapacity(
  slug: string,
  capacity: CapacityLevel,
): Promise<{ id: string; currentCapacity: CapacityLevel }> {
  const res = await fetch(`/api/businesses/${slug}/capacity`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ capacity }),
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  if (!res.ok) throw new Error(data.error ?? 'Error');
  return data;
}

// ─── Notifications (Etapa 7.A) ───────────────────────────────
// Persistent notifications inbox — backed by the Notification table.
// The bell icon in the Navbar shows the unread count badge; the
// dropdown lists the most recent 10 (with the full 50 available via
// the underlying query) and supports mark-as-read on click + a
// "mark all read" bulk action.

/**
 * Fetch the authenticated user's persistent notifications (newest
 * first, capped at 50 by the backend).
 *
 * Returns an empty array (NOT an error) when the user is anonymous —
 * the Navbar's `useNotificationsSync` only enables the query when
 * authenticated, so this is mostly a defensive fallback.
 */
export async function fetchMyNotifications(): Promise<PersistentNotification[]> {
  const res = await fetch('/api/notifications');
  if (res.status === 401) return []; // anonymous = no notifications
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(data.error ?? 'Error');
  }
  return res.json();
}

/**
 * Mark a single notification as read. The user identity comes from the
 * session cookie; the backend scopes the update by both `id` AND
 * `userId` so a malicious payload can't flip someone else's notification.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  if (!res.ok) throw new Error(data.error ?? 'Error');
}

/**
 * Mark all unread notifications for the user as read in a single
 * bulk UPDATE. Used by the "Marcar todo como leído" button at the
 * bottom of the navbar dropdown.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markAllRead' }),
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  if (!res.ok) throw new Error(data.error ?? 'Error');
}

// ─── Business claim (Etapa 7.B) ──────────────────────────────
// A BUSINESS_OWNER (or ADMIN acting on their behalf) asserts they own
// an unclaimed business. The backend sets `ownerId` + `claimedAt` and
// fires a SYSTEM notification to every ADMIN/MODERATOR alerting them
// of the claim (so the admin panel in 7.C can show a review queue).
//
// Auth/role enforcement is server-side (requireRole), so the client
// just surfaces the response errors:
//   - 401 NOT_AUTHENTICATED → "Inicia sesión para reclamar este local."
//   - 403 Acceso denegado   → "Tu cuenta no tiene permisos para reclamar locales."
//   - 400 ya tiene un dueño  → "Este local ya tiene un dueño gestionando."
//   - 404                   → "Negocio no encontrado."

export async function claimBusiness(slug: string): Promise<{
  id: string;
  name: string;
  ownerId: string;
  claimedAt: string;
}> {
  const res = await fetch(`/api/businesses/${slug}/claim`, {
    method: 'POST',
  });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  if (!res.ok) throw new Error(data.error ?? 'Error');
  return data;
}

// ─── Admin (Etapa 7.C.1) ──────────────────────────────────────
// Admin/moderator endpoints — protected by `requireRole('ADMIN',
// 'MODERATOR')` (or `requireRole('ADMIN')` for destructive ops like
// changing business status or user roles). All wrappers throw
// 'No autenticado' on 401 and 'Acceso denegado' on 403 — the caller
// can show a friendly error message based on which one fires.

/**
 * Build a search params string from a partial record, skipping
 * undefined / null values. Used by the admin list endpoints to keep
 * the call sites concise.
 */
function buildAdminQuery(
  params: Record<string, string | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Convert a fetch error response into a thrown Error. The admin
 * wrappers use 'No autenticado' / 'Acceso denegado' as the standard
 * error messages for 401 / 403 so the caller can switch on them —
 * any other failure surfaces the backend's `{ error }` body or a
 * generic fallback.
 */
async function throwAdminError(res: Response): Promise<never> {
  if (res.status === 401) throw new Error('No autenticado');
  if (res.status === 403) throw new Error('Acceso denegado');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  throw new Error(data.error ?? 'Error');
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats');
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function fetchAdminBusinesses(opts?: {
  status?: string;
  claimed?: boolean;
  ownerId?: string;
  search?: string;
}): Promise<AdminBusiness[]> {
  const qs = buildAdminQuery({
    status: opts?.status,
    claimed: opts?.claimed,
    ownerId: opts?.ownerId,
    search: opts?.search,
  });
  const res = await fetch(`/api/admin/businesses${qs}`);
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function updateBusinessStatus(
  id: string,
  status: BusinessStatus,
): Promise<{ id: string; status: BusinessStatus }> {
  const res = await fetch(`/api/admin/businesses/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function fetchAdminReviews(opts?: {
  status?: string;
  businessId?: string;
}): Promise<AdminReview[]> {
  const qs = buildAdminQuery({
    status: opts?.status,
    businessId: opts?.businessId,
  });
  const res = await fetch(`/api/admin/reviews${qs}`);
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<{ id: string; status: ReviewStatus }> {
  const res = await fetch(`/api/admin/reviews/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function fetchAdminUsers(opts?: {
  role?: string;
  search?: string;
}): Promise<AdminUser[]> {
  const qs = buildAdminQuery({
    role: opts?.role,
    search: opts?.search,
  });
  const res = await fetch(`/api/admin/users${qs}`);
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function fetchAdminAnalytics(
  range: AnalyticsRange = '7d',
): Promise<AdminAnalyticsOverview> {
  const res = await fetch(`/api/admin/analytics/overview?range=${range}`);
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function updateUserRole(
  id: string,
  role: UserRole,
): Promise<{ id: string; role: UserRole }> {
  const res = await fetch(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

// ─── Owner (Etapa 7.C.2) ──────────────────────────────────────
// Business-owner endpoints — protected by `requireRole('BUSINESS_OWNER',
// 'ADMIN')` AND a per-business ownership check (assertBusinessOwnership
// in the service layer). All wrappers throw 'No autenticado' on 401,
// 'Acceso denegado' on 403, or the backend's `{ error }` body on other
// failures — same pattern as the admin wrappers above.

/**
 * Convert a fetch error response into a thrown Error for the owner
 * endpoints. Mirrors `throwAdminError` — kept as a separate function
 * (rather than reusing throwAdminError) so the 403 message can be
 * tailored to the owner context ("No tienes permisos para gestionar
 * este local" vs. "Acceso denegado").
 */
async function throwOwnerError(res: Response): Promise<never> {
  if (res.status === 401) throw new Error('No autenticado');
  if (res.status === 403) throw new Error('No tienes permisos para gestionar este local');
  const data = await res.json().catch(() => ({ error: 'Error' }));
  throw new Error(data.error ?? 'Error');
}

/**
 * GET /api/owner/businesses/[slug] — returns the business with ALL
 * fields (hours, socials, owner info) for the owner dashboard. The
 * owner dashboard's edit forms (info / hours / socials) all read
 * from this single payload.
 */
export async function fetchOwnerBusiness(slug: string): Promise<OwnerBusiness> {
  const res = await fetch(`/api/owner/businesses/${slug}`);
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * PATCH /api/owner/businesses/[slug] — updates basic info (name,
 * description, address, phone, priceRange, coverImage, specialty,
 * valueProposition). Body is a partial of those fields. Returns
 * `{ id, slug, name }`.
 */
export async function updateOwnerBusiness(
  slug: string,
  data: {
    name?: string;
    description?: string;
    address?: string;
    phone?: string | null;
    priceRange?: string;
    coverImage?: string | null;
    specialty?: string | null;
    valueProposition?: string | null;
  },
): Promise<{ id: string; slug: string; name: string }> {
  const res = await fetch(`/api/owner/businesses/${slug}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * PUT /api/owner/businesses/[slug]/hours — replaces the entire hours
 * array. Body is the full 7-day array. Returns `{ ok: true }`.
 */
export async function updateOwnerHours(
  slug: string,
  hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>,
): Promise<{ ok: true }> {
  const res = await fetch(`/api/owner/businesses/${slug}/hours`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(hours),
  });
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * PUT /api/owner/businesses/[slug]/socials — replaces socials. Body
 * is the full list. Returns `{ ok: true }`.
 */
export async function updateOwnerSocials(
  slug: string,
  socials: Array<{ type: string; value: string }>,
): Promise<{ ok: true }> {
  const res = await fetch(`/api/owner/businesses/${slug}/socials`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(socials),
  });
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * GET /api/owner/businesses/[slug]/reservations — list reservations
 * for the business. Supports `?status=PENDING&date=YYYY-MM-DD`
 * filters. Returns the full reservations with the customer's user
 * info attached.
 */
export async function fetchOwnerReservations(
  slug: string,
  opts?: { status?: ReservationStatus; date?: string },
): Promise<OwnerReservation[]> {
  const qs = buildAdminQuery({
    status: opts?.status,
    date: opts?.date,
  });
  const res = await fetch(`/api/owner/businesses/${slug}/reservations${qs}`);
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * PATCH /api/owner/businesses/[slug]/reservations/[id]/status — change
 * a reservation's status from the owner dashboard. Allowed transitions:
 *   PENDING → CONFIRMED, CONFIRMED → COMPLETED, CONFIRMED → NO_SHOW
 * The server validates the transition and notifies the user (best-effort).
 */
export async function updateOwnerReservationStatus(
  slug: string,
  id: string,
  status: ReservationStatus,
): Promise<{ id: string; status: ReservationStatus }> {
  const res = await fetch(
    `/api/owner/businesses/${slug}/reservations/${id}/status`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * GET /api/owner/businesses/[slug]/promotions — list all promotions
 * for the business (all statuses, not just ACTIVE). Requires
 * ownership.
 */
export async function fetchOwnerPromotions(
  slug: string,
): Promise<OwnerPromotion[]> {
  const res = await fetch(`/api/owner/businesses/${slug}/promotions`);
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

/**
 * POST /api/owner/businesses/[slug]/promotions — create a new
 * promotion. Status starts as DRAFT — the owner can publish it via
 * updateOwnerPromotion. Returns the created promotion.
 */
export async function createOwnerPromotion(
  slug: string,
  data: {
    title: string;
    description: string;
    price?: string;
    discount?: string;
    image?: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    maxRedemptions?: number | null;
  },
): Promise<OwnerPromotion> {
  const res = await fetch(`/api/owner/businesses/${slug}/promotions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

// ─── Owner management (admin) ──────────────────────────────

export async function migrateOwnership() {
  const res = await fetch('/api/admin/businesses/migrate-ownership', {
    method: 'POST',
  });
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function assignOwner(slug: string, email: string) {
  const res = await fetch(
    `/api/admin/businesses/${slug}/assign-owner`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function approveOwner(slug: string) {
  const res = await fetch(
    `/api/admin/businesses/${slug}/approve-owner`,
    { method: 'POST' },
  );
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function rejectOwner(slug: string) {
  const res = await fetch(
    `/api/admin/businesses/${slug}/reject-owner`,
    { method: 'POST' },
  );
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function fetchBusinessProposals(slug: string) {
  const res = await fetch(`/api/admin/businesses/${slug}/proposals`);
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

export async function reviewProposal(
  proposalId: string,
  action: 'approve' | 'reject',
) {
  const res = await fetch(
    `/api/admin/businesses/proposals/${proposalId}/review`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    },
  );
  if (!res.ok) await throwAdminError(res);
  return res.json();
}

// ─── Owner proposals (owner-side) ──────────────────────────────

export async function fetchOwnerProposals(slug: string) {
  const res = await fetch(`/api/owner/businesses/${slug}/proposals`);
  if (!res.ok) throw new Error((await res.json()).error || 'Error al cargar propuestas');
  return res.json();
}

export async function createOwnerProposal(slug: string, field: string, data: object) {
  const res = await fetch(`/api/owner/businesses/${slug}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, data }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al crear propuesta');
  return res.json();
}

export async function updateOwnerProposal(proposalId: string, data: object) {
  const res = await fetch(`/api/owner/businesses/proposals/${proposalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar propuesta');
  return res.json();
}

export async function deleteOwnerProposal(proposalId: string) {
  const res = await fetch(`/api/owner/businesses/proposals/${proposalId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar propuesta');
  return res.json();
}

/**
 * PATCH /api/owner/businesses/[slug]/promotions/[id] — update
 * promotion fields AND/OR change status. Body is a partial. Returns
 * `{ id, status }`.
 */
export async function updateOwnerPromotion(
  slug: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    price?: string;
    discount?: string;
    image?: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    maxRedemptions?: number | null;
    status?: PromotionStatus;
  },
): Promise<{ id: string; status: PromotionStatus }> {
  const res = await fetch(
    `/api/owner/businesses/${slug}/promotions/${id}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await throwOwnerError(res);
  return res.json();
}

