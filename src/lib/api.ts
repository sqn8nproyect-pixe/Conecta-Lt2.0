// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Frontend API helpers
// Thin wrappers around fetch() for the public-facing endpoints.
// ─────────────────────────────────────────────────────────────

import type {
  BusinessViewCount,
  CouponRedemption,
  Establishment,
  PopularBusiness,
  RedeemedPromotion,
  Reservation,
  Review,
  TrackEventPayload,
} from './types';

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

