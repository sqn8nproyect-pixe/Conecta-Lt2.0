// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Frontend API helpers
// Thin wrappers around fetch() for the public-facing endpoints.
// ─────────────────────────────────────────────────────────────

import type { Establishment, Review } from './types';

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

