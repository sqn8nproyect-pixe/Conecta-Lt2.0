// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Frontend API helpers
// Thin wrappers around fetch() for the public-facing endpoints.
// ─────────────────────────────────────────────────────────────

import type { Establishment } from './types';

// The API returns an extended Establishment shape that also embeds
// the establishment's offers and reviews (see transformBusiness).
export type EstablishmentWithRelations = Establishment & {
  offers: import('./types').Offer[];
  reviews: import('./types').Review[];
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
