// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Favorite Repository Layer
// Thin Prisma accessors for the Favorite model.
// All writes are idempotent: re-favoriting is a no-op, un-favoriting
// a non-existing row is a no-op.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { Prisma, type Favorite } from '@prisma/client';
import { businessInclude } from './business.repository';

// Re-exported type so callers can type the result of findByUser()
// without re-declaring the business relation shape.
export type FavoriteWithBusiness = Prisma.FavoriteGetPayload<{
  include: { business: { include: typeof businessInclude } };
}>;

export const favoriteRepository = {
  /**
   * List all favorites for a user, with the full Business payload
   * (category, hours, socials, images, promotions, reviews) included
   * so the service can transform each into a frontend Establishment.
   */
  findByUser: async (userId: string): Promise<FavoriteWithBusiness[]> => {
    return db.favorite.findMany({
      where: { userId },
      include: { business: { include: businessInclude } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Whether a (userId, businessId) favorite row exists.
   * Uses count() to avoid transferring the row.
   */
  exists: async (
    userId: string,
    businessId: string,
  ): Promise<boolean> => {
    const count = await db.favorite.count({
      where: { userId, businessId },
    });
    return count > 0;
  },

  /**
   * Create a favorite row. If a row already exists (unique constraint
   * [userId, businessId] — Prisma error P2002), return the existing row
   * instead of throwing, so callers can treat create() as idempotent.
   */
  create: async (
    userId: string,
    businessId: string,
  ): Promise<Favorite> => {
    try {
      return await db.favorite.create({
        data: { userId, businessId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await db.favorite.findFirst({
          where: { userId, businessId },
        });
        if (existing) return existing;
      }
      throw e;
    }
  },

  /**
   * Delete the (userId, businessId) favorite row, if any.
   * Idempotent: returns metadata about deleted rows (always 0 or 1).
   */
  delete: async (
    userId: string,
    businessId: string,
  ): Promise<Prisma.BatchPayload> => {
    return db.favorite.deleteMany({
      where: { userId, businessId },
    });
  },

  /**
   * Delete a favorite by its primary key, scoped to a user.
   * Used by admin flows where the caller knows the favorite's id but
   * we still want to enforce user ownership.
   */
  deleteById: async (
    id: string,
    userId: string,
  ): Promise<Prisma.BatchPayload> => {
    return db.favorite.deleteMany({
      where: { id, userId },
    });
  },
};
