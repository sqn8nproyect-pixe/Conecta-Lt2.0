// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Review Service Layer
// Translates between Prisma Review rows and the frontend Review type,
// and orchestrates the atomic "upsert review + recalc business ratings"
// flow inside a single Prisma transaction.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { Prisma, PrismaClient, type Business } from '@prisma/client';
import type { Establishment, Review } from '@/lib/types';
import { businessRepository } from '@/server/repositories/business.repository';
import { reviewRepository } from '@/server/repositories/review.repository';
import {
  transformBusiness,
  transformReview,
  type BusinessWithRelations,
} from '@/server/services/business.service';

type DbOrTx = PrismaClient | Prisma.TransactionClient;

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

/**
 * Recalculate the denormalized rating fields on a Business row from
 * its currently PUBLISHED reviews:
 *
 *   - reviewCount         = number of PUBLISHED reviews
 *   - avgRating           = arithmetic mean of review.rating (0 if no reviews)
 *   - ambienteRating      = arithmetic mean of review.ambienteRating
 *   - servicioRating      = arithmetic mean of review.servicioRating
 *   - precioCalidadRating = arithmetic mean of review.precioCalidadRating
 *
 * Each sub-rating dimension is aggregated independently with Prisma's
 * `_avg` so the Business row reflects the true per-dimension average
 * across all PUBLISHED reviews (not a mirror of the overall avgRating).
 *
 * Accepts an optional transaction client so the service can run this
 * inside the same transaction as the review write.
 *
 * Returns the updated Business row (without relations).
 */
export async function recalculateBusinessRatings(
  businessId: string,
  tx: DbOrTx = db,
): Promise<Business> {
  const agg = await tx.review.aggregate({
    where: { businessId, status: 'PUBLISHED' },
    _avg: {
      rating: true,
      ambienteRating: true,
      servicioRating: true,
      precioCalidadRating: true,
    },
    _count: true,
  });

  const reviewCount = agg._count;
  // Prisma returns `null` for `_avg` fields when there are no matching rows.
  const avgRating = agg._avg.rating ?? 0;
  const ambienteRating = agg._avg.ambienteRating ?? 0;
  const servicioRating = agg._avg.servicioRating ?? 0;
  const precioCalidadRating = agg._avg.precioCalidadRating ?? 0;

  return tx.business.update({
    where: { id: businessId },
    data: {
      avgRating,
      reviewCount,
      ambienteRating,
      servicioRating,
      precioCalidadRating,
    },
  });
}

export const reviewService = {
  /**
   * List PUBLISHED reviews for a business, transformed into the
   * frontend Review type (with userName + userAvatar resolved).
   */
  listForBusiness: async (businessId: string): Promise<Review[]> => {
    const reviews = await reviewRepository.findByBusiness(businessId, {
      status: 'PUBLISHED',
    });
    return reviews.map((r) => transformReview(r, businessId));
  },

  /**
   * List all reviews authored by a user, each annotated with the
   * transformed `establishment: Establishment` so the ProfilePage can
   * show the business name next to the user's review.
   *
   * Return type: `Array<Review & { establishment: Establishment }>`
   * (the establishment carries its own embedded offers + reviews, since
   * `transformBusiness` returns `EstablishmentWithRelations`).
   */
  listForUser: async (
    userId: string,
  ): Promise<Array<Review & { establishment: Establishment }>> => {
    const reviews = await reviewRepository.findByUser(userId);
    return reviews.map((r) => ({
      ...transformReview(r, r.business.id),
      establishment: transformBusiness(r.business as BusinessWithRelations),
    }));
  },

  /**
   * Create or update a review for (businessSlug, userId).
   *
   * The caller supplies the 3 sub-rating dimensions (ambiente, servicio,
   * precio-calidad); the overall `rating` is computed by the server as the
   * rounded average of the three. This makes the server the single source
   * of truth for `rating` and avoids drift between client-sent values and
   * the sub-ratings actually persisted.
   *
   * Flow:
   *   1. Look up the business by slug → 404 if not found.
   *   2. In a single transaction:
   *        a. Upsert the review with all 3 sub-ratings + computed rating
   *           (creates or updates, status PUBLISHED).
   *        b. Recalculate the business's denormalized rating fields
   *           (avgRating, reviewCount, + the 3 sub-rating averages)
   *           from its PUBLISHED reviews.
   *   3. Re-fetch the business with full relations so the response
   *      carries the updated ratings visible to the UI.
   *
   * Returns `{ review, business }`:
   *   - `review`    = the upserted review, transformed to the frontend type.
   *   - `business`  = the updated Establishment (with offers + reviews embedded).
   *
   * Throws a 404 Response if the slug doesn't match any business.
   */
  create: async (params: {
    businessSlug: string;
    userId: string;
    ambienteRating: number; // 1-5
    servicioRating: number; // 1-5
    precioCalidadRating: number; // 1-5
    comment: string;
  }): Promise<{ review: Review; business: Establishment }> => {
    const {
      businessSlug,
      userId,
      ambienteRating,
      servicioRating,
      precioCalidadRating,
      comment,
    } = params;

    // Server-side computation of the overall `rating` from the 3 sub-ratings.
    // Math.round handles the typical .33/.67 splits (sum is an integer, so
    // sum/3 has fractional part 0, .33, or .67 — no .5 ties to worry about).
    const rating = Math.round(
      (ambienteRating + servicioRating + precioCalidadRating) / 3,
    );

    const business = await businessRepository.findBySlug(businessSlug);
    if (!business) {
      throw jsonError('Negocio no encontrado', 404);
    }

    // Atomic: review write + business ratings recalculation.
    const upserted = await db.$transaction(async (tx) => {
      const review = await reviewRepository.create(
        {
          businessId: business.id,
          userId,
          rating,
          ambienteRating,
          servicioRating,
          precioCalidadRating,
          comment,
        },
        tx,
      );
      await recalculateBusinessRatings(business.id, tx);
      return review;
    });

    // Re-fetch with full relations so the response includes the
    // updated ratings + the freshly upserted review (embedded).
    const refreshedBusiness = await businessRepository.findById(business.id);
    if (!refreshedBusiness) {
      // Extremely unlikely (business was here a moment ago), but guard anyway.
      throw jsonError('Negocio no encontrado tras la actualización', 404);
    }

    return {
      review: transformReview(upserted, business.id),
      business: transformBusiness(refreshedBusiness),
    };
  },
};
