// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Promotion Repository Layer
// Thin Prisma accessors for the Promotion + CouponRedemption models.
//
// All write paths (createRedemption, incrementRedemptionCount) accept an
// optional `tx` so the service can wrap them in a single db.$transaction()
// (same pattern as review.repository.ts).
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import {
  Prisma,
  PrismaClient,
  type Promotion,
  type CouponRedemption,
} from '@prisma/client';
import { businessInclude } from './business.repository';

// Accept either the singleton client or a transaction client so the
// service layer can wrap write operations in db.$transaction().
type DbOrTx = PrismaClient | Prisma.TransactionClient;

// Re-exported types so callers don't need to redeclare include shapes.
export type PromotionWithBusiness = Prisma.PromotionGetPayload<{
  include: { business: true };
}>;

export type CouponRedemptionWithPromotion = Prisma.CouponRedemptionGetPayload<{
  include: {
    promotion: { include: { business: { include: typeof businessInclude } } };
  };
}>;

/**
 * Whether a promotion is "live" right now, given its DB row.
 *
 *   - status === 'ACTIVE'
 *   - startDate is null or in the past
 *   - endDate is null or in the future
 *   - maxRedemptions is null OR redemptionCount < maxRedemptions
 *
 * Exported so the business.service transformer can reuse the same
 * definition when splitting promotions into `offers` (live) vs
 * `expiredPromotions` (everything else).
 */
export function isPromotionLive(promo: Promotion, now: Date = new Date()): boolean {
  if (promo.status !== 'ACTIVE') return false;
  if (promo.startDate !== null && promo.startDate > now) return false;
  if (promo.endDate !== null && promo.endDate < now) return false;
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return false;
  }
  return true;
}

export const promotionRepository = {
  /**
   * Find a promotion by id, with its parent business included.
   * Accepts an optional transaction client (not strictly needed for a
   * single read, but kept for symmetry with the other accessors).
   * Returns null if no row matches.
   */
  findById: async (
    id: string,
    tx: DbOrTx = db,
  ): Promise<PromotionWithBusiness | null> => {
    return tx.promotion.findUnique({
      where: { id },
      include: { business: true },
    });
  },

  /**
   * List ACTIVE promotions for a business (by slug) that are currently live:
   *   - status === 'ACTIVE'
   *   - startDate <= now <= endDate (null dates are treated as unbounded)
   *   - redemptionCount < maxRedemptions (null maxRedemptions = unlimited)
   *
   * Note: Prisma's `where` clause compares columns to literal values, not to
   * other columns, so the `redemptionCount < maxRedemptions` check is applied
   * in JS via `isPromotionLive()`. The per-business result set is small (~2
   * rows in seed data), so this is cheap.
   */
  findActiveByBusinessSlug: async (slug: string): Promise<Promotion[]> => {
    const now = new Date();
    const candidates = await db.promotion.findMany({
      where: {
        business: { slug },
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'asc' },
    });
    return candidates.filter((p) => isPromotionLive(p, now));
  },

  /**
   * List ALL promotions for a business (by slug), including EXPIRED, sold-out,
   * PAUSED, and DRAFT ones. Used by the frontend to display "EXPIRADO" /
   * "AGOTADO" badges next to non-live promotions on the establishment detail
   * page.
   */
  findAllByBusinessSlug: async (slug: string): Promise<Promotion[]> => {
    return db.promotion.findMany({
      where: { business: { slug } },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Atomically increment the `redemptionCount` of a promotion by 1.
   *
   * Uses Prisma's `{ increment: 1 }` update operator so the read-modify-write
   * happens inside a single SQL UPDATE — no race conditions between concurrent
   * redeem calls (two concurrent increments will both succeed and produce
   * count+2, never count+1).
   *
   * Accepts an optional transaction client so the service can wrap this
   * increment + the redemption row creation in a single transaction.
   */
  incrementRedemptionCount: async (
    promotionId: string,
    tx: DbOrTx = db,
  ): Promise<Promotion> => {
    return tx.promotion.update({
      where: { id: promotionId },
      data: { redemptionCount: { increment: 1 } },
    });
  },

  /**
   * Look up the existing CouponRedemption for a (userId, promotionId) pair.
   * Returns null if none. Uses the unique constraint [userId, promotionId]
   * declared on the CouponRedemption model.
   */
  findRedemptionByUser: async (
    userId: string,
    promotionId: string,
  ): Promise<CouponRedemption | null> => {
    return db.couponRedemption.findUnique({
      where: { userId_promotionId: { userId, promotionId } },
    });
  },

  /**
   * Create a CouponRedemption row in CLAIMED status with claimedAt = now
   * (the DB default).
   *
   * Accepts an optional transaction client so the service can wrap this
   * insert + the promotion's redemptionCount increment in a single transaction.
   *
   * The unique constraint [userId, promotionId] guarantees that concurrent
   * redeem attempts for the same user+promo will fail with P2002 for the
   * loser — the service layer checks existence first to give a clean 409.
   */
  createRedemption: async (
    data: { userId: string; promotionId: string },
    tx: DbOrTx = db,
  ): Promise<CouponRedemption> => {
    return tx.couponRedemption.create({
      data: {
        userId: data.userId,
        promotionId: data.promotionId,
        status: 'CLAIMED',
      },
    });
  },

  /**
   * List all coupon redemptions for a user, with the promotion AND the
   * promotion's parent business (full businessInclude) included so the
   * service can transform each into the frontend Establishment shape.
   *
   * Ordered by claimedAt desc (most recently claimed first).
   */
  listRedemptionsByUser: async (
    userId: string,
  ): Promise<CouponRedemptionWithPromotion[]> => {
    return db.couponRedemption.findMany({
      where: { userId },
      include: {
        promotion: { include: { business: { include: businessInclude } } },
      },
      orderBy: { claimedAt: 'desc' },
    });
  },

  /**
   * Batch check: given a list of promotion IDs, return the set of IDs that
   * the user has already claimed. Used by the service's `checkRedemptions`
   * to mark "RECLAMADO" badges across a list of promotions in a single
   * round-trip (instead of N findRedemptionByUser calls).
   *
   * Single DB round-trip with an IN-clause on promotionId. Returns only
   * the promotionId field to keep the payload small.
   */
  findClaimedPromotionIds: async (
    userId: string,
    promotionIds: string[],
  ): Promise<Set<string>> => {
    if (promotionIds.length === 0) return new Set();
    const rows = await db.couponRedemption.findMany({
      where: { userId, promotionId: { in: promotionIds } },
      select: { promotionId: true },
    });
    return new Set(rows.map((r) => r.promotionId));
  },
};
