// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Favorite Service Layer
// Translates between Prisma rows (with relations) and the frontend
// Establishment type, and implements the toggle / list / check
// business logic on top of favoriteRepository.
// ─────────────────────────────────────────────────────────────

import type { Establishment } from '@/lib/types';
import { businessRepository } from '@/server/repositories/business.repository';
import { favoriteRepository } from '@/server/repositories/favorite.repository';
import { transformBusiness } from '@/server/services/business.service';

/**
 * Build a JSON Response (thrown from service → returned by route handler).
 * Throwing a Response is the same convention used by `requireUser()`.
 */
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const favoriteService = {
  /**
   * Return the user's favorited establishments, already transformed to
   * the frontend Establishment shape (with offers + reviews embedded).
   */
  listForUser: async (userId: string): Promise<Establishment[]> => {
    const favorites = await favoriteRepository.findByUser(userId);
    return favorites.map((f) => transformBusiness(f.business));
  },

  /**
   * Toggle the favorite state for a business identified by its slug
   * (safer than accepting a raw businessId from the client).
   *
   * Returns `{ favorited, business }` where `favorited` is the new state
   * after the toggle and `business` is the transformed Establishment.
   *
   * Throws a 404 Response if no business matches the slug.
   */
  toggle: async (
    userId: string,
    businessSlug: string,
  ): Promise<{ favorited: boolean; business: Establishment }> => {
    const business = await businessRepository.findBySlug(businessSlug);
    if (!business) {
      throw jsonError('Negocio no encontrado', 404);
    }

    const alreadyFavorited = await favoriteRepository.exists(
      userId,
      business.id,
    );

    if (alreadyFavorited) {
      await favoriteRepository.delete(userId, business.id);
      return {
        favorited: false,
        business: transformBusiness(business),
      };
    }

    await favoriteRepository.create(userId, business.id);
    return {
      favorited: true,
      business: transformBusiness(business),
    };
  },

  /**
   * Whether the user has favorited a given business (by id).
   * Convenience wrapper around the repository for callers that already
   * hold a businessId (e.g. detail page hydration).
   */
  isFavorite: async (
    userId: string,
    businessId: string,
  ): Promise<boolean> => {
    return favoriteRepository.exists(userId, businessId);
  },

  /**
   * Batch check: given a list of business slugs, return a slug → boolean
   * map indicating which ones the user has favorited.
   *
   * Implementation: fetch the user's favorites once (with business
   * included so we can read the slug), build a Set of favorited slugs,
   * then map each requested slug to a boolean. Single DB round-trip.
   */
  checkSlugs: async (
    userId: string,
    slugs: string[],
  ): Promise<Record<string, boolean>> => {
    if (slugs.length === 0) return {};
    const favorites = await favoriteRepository.findByUser(userId);
    const favoritedSlugs = new Set(
      favorites.map((f) => f.business.slug),
    );
    const result: Record<string, boolean> = {};
    for (const slug of slugs) {
      result[slug] = favoritedSlugs.has(slug);
    }
    return result;
  },
};
