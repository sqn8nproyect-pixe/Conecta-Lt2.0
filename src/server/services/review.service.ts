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
 *   - reviewCount      = number of PUBLISHED reviews
 *   - avgRating        = arithmetic mean of ratings (0 if no reviews)
 *   - ambienteRating   = avgRating   ← (Etapa 3 will split these)
 *   - servicioRating   = avgRating
 *   - precioCalidadRating = avgRating
 *
 * The Review model currently only stores a single `rating` field, so we
 * assign the same average to all three sub-ratings. Etapa 3 will extend
 * the Review schema with per-dimension ratings and refine this function.
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
  const reviews = await tx.review.findMany({
    where: { businessId, status: 'PUBLISHED' },
    select: { rating: true },
  });

  const reviewCount = reviews.length;
  const avgRating =
    reviewCount === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

  return tx.business.update({
    where: { id: businessId },
    data: {
      avgRating,
      reviewCount,
      // Until Etapa 3 adds sub-dimensions to Review, mirror the average.
      ambienteRating: avgRating,
      servicioRating: avgRating,
      precioCalidadRating: avgRating,
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
   * Flow:
   *   1. Look up the business by slug → 404 if not found.
   *   2. In a single transaction:
   *        a. Upsert the review (creates or updates, status PUBLISHED).
   *        b. Recalculate the business's denormalized rating fields
   *           from its PUBLISHED reviews.
   *   3. Re-fetch the business with full relations so the response
   *      carries the updated avgRating/reviewCount visible to the UI.
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
    rating: number;
    comment: string;
  }): Promise<{ review: Review; business: Establishment }> => {
    const { businessSlug, userId, rating, comment } = params;

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
