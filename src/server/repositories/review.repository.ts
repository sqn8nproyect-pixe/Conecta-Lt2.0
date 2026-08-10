// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Review Repository Layer
// Thin Prisma accessors for the Review model.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { Prisma, PrismaClient, type ReviewStatus } from '@prisma/client';
import { businessInclude } from './business.repository';

// Accept either the singleton client or a transaction client so the
// service layer can wrap write operations in db.$transaction().
type DbOrTx = PrismaClient | Prisma.TransactionClient;

// Re-exported types so callers don't need to redeclare include shapes.
export type ReviewWithUser = Prisma.ReviewGetPayload<{
  include: { user: true };
}>;

export type ReviewWithBusiness = Prisma.ReviewGetPayload<{
  include: {
    user: true;
    business: { include: typeof businessInclude };
  };
}>;

export type ReviewUpsertInput = {
  businessId: string;
  userId: string;
  rating: number;
  comment: string;
};

export const reviewRepository = {
  /**
   * List reviews for a business, optionally filtered by status.
   * Includes the user relation so the service can transform into
   * the frontend Review type with userName / userAvatar.
   * Ordered by createdAt desc (most recent first).
   */
  findByBusiness: async (
    businessId: string,
    opts?: { status?: ReviewStatus },
  ): Promise<ReviewWithUser[]> => {
    const where: Prisma.ReviewWhereInput = { businessId };
    if (opts?.status) where.status = opts.status;
    return db.review.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * List all reviews authored by a user, with the full Business payload
   * AND the user relation included so the service can both transform
   * the review (needs user) and attach an `establishment: Establishment`
   * to each review for the ProfilePage.
   */
  findByUser: async (userId: string): Promise<ReviewWithBusiness[]> => {
    return db.review.findMany({
      where: { userId },
      include: {
        user: true,
        business: { include: businessInclude },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Look up the existing review for a (businessId, userId) pair.
   * Returns null if none. Used both by the service to decide whether
   * to create or update, and after an upsert to re-fetch with user.
   */
  findExisting: async (
    businessId: string,
    userId: string,
  ): Promise<ReviewWithUser | null> => {
    return db.review.findUnique({
      where: { businessId_userId: { businessId, userId } },
      include: { user: true },
    });
  },

  /**
   * Upsert a review for (businessId, userId).
   * - If a row exists, update rating + comment + reset status to PUBLISHED.
   * - Otherwise, create a new row with status PUBLISHED.
   * Returns the row with the user relation included.
   *
   * Accepts an optional transaction client so the service can wrap this
   * write + the business ratings recalculation in a single transaction.
   */
  create: async (
    data: ReviewUpsertInput,
    tx: DbOrTx = db,
  ): Promise<ReviewWithUser> => {
    return tx.review.upsert({
      where: {
        businessId_userId: {
          businessId: data.businessId,
          userId: data.userId,
        },
      },
      create: {
        businessId: data.businessId,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment,
        status: 'PUBLISHED',
      },
      update: {
        rating: data.rating,
        comment: data.comment,
        status: 'PUBLISHED',
      },
      include: { user: true },
    });
  },

  /**
   * Delete the review authored by `userId` on `businessId`, if any.
   * Idempotent. The caller is responsible for recalculating business
   * ratings after a delete (Etapa 3 admin flow).
   */
  delete: async (
    businessId: string,
    userId: string,
  ): Promise<Prisma.BatchPayload> => {
    return db.review.deleteMany({
      where: { businessId, userId },
    });
  },
};
