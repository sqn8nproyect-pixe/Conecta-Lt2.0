// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Analytics Repository Layer
// Thin Prisma accessors for the AnalyticsEvent model.
//
// `businessId` is intentionally stored as a loose string (no FK — see
// the model comment in prisma/schema.prisma) so we can track events
// for businesses that have been deleted/archived without breaking
// the FK constraint. `userId` IS a real FK because we only attach
// it when there is a logged-in user.
//
// All write paths accept an optional `tx` so the service can wrap
// them in a db.$transaction() (same pattern as promotion.repository.ts).
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import {
  Prisma,
  PrismaClient,
  type AnalyticsEvent,
} from '@prisma/client';

// Accept either the singleton client or a transaction client so the
// service layer can wrap write operations in db.$transaction().
type DbOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Default look-back window for "popular this week" / per-business view
 * counts. Kept here (and exported) so the service and any future caller
 * share the same definition.
 */
export const DEFAULT_SINCE_DAYS = 7;

export const analyticsRepository = {
  /**
   * Insert a single AnalyticsEvent row.
   *
   *   - `type`        — one of ANALYTICS_EVENT_TYPES (validated by the
   *                     service layer; the repo is intentionally permissive
   *                     so future event types can be added without touching
   *                     the repo).
   *   - `userId`      — optional. Only attached when the user is logged in.
   *   - `businessId`  — optional. Stored as a loose string (no FK).
   *   - `metadata`    — arbitrary JSON (default `{}`).
   *
   * Accepts an optional transaction client (not strictly needed for a
   * single insert, but kept for symmetry with the other repositories
   * and so the service can wrap tracking in a larger tx if needed).
   */
  createEvent: async (
    data: {
      type: string;
      userId?: string | null;
      businessId?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    tx: DbOrTx = db,
  ): Promise<AnalyticsEvent> => {
    return tx.analyticsEvent.create({
      data: {
        type: data.type,
        userId: data.userId ?? null,
        businessId: data.businessId ?? null,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  /**
   * Count BUSINESS_VIEW events for a single business within the last
   * `sinceDays` days (default 7). Returns a plain integer.
   *
   *   - `businessId`  — the Business.id (loose string FK on AnalyticsEvent).
   *   - `sinceDays`   — look-back window in days. Defaults to 7.
   *
   * The composite index `@@index([type, createdAt])` makes this count
   * cheap even with millions of rows.
   */
  countByBusiness: async (
    businessId: string,
    sinceDays: number = DEFAULT_SINCE_DAYS,
  ): Promise<number> => {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    return db.analyticsEvent.count({
      where: {
        type: 'BUSINESS_VIEW',
        businessId,
        createdAt: { gte: since },
      },
    });
  },

  /**
   * Bulk count BUSINESS_VIEW events for multiple businesses within
   * `sinceDays`. Returns a Map<businessId, number> for O(1) lookup
   * in the service layer.
   *
   * Uses a single `groupBy` query on `businessId` with `_count._all`
   * to avoid N+1 queries — one round-trip for any number of businesses.
   *
   * Businesses with zero events in the window are simply absent from
   * the returned Map; callers should default missing entries to 0.
   */
  countByBusinesses: async (
    businessIds: string[],
    sinceDays: number = DEFAULT_SINCE_DAYS,
  ): Promise<Map<string, number>> => {
    const result = new Map<string, number>();
    if (businessIds.length === 0) return result;

    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const rows = await db.analyticsEvent.groupBy({
      by: ['businessId'],
      where: {
        type: 'BUSINESS_VIEW',
        businessId: { in: businessIds },
        createdAt: { gte: since },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      // row.businessId is non-null here because the `where` clause filters
      // on `businessId: { in: [...] }`, which excludes nulls. But TS still
      // types it as `string | null` because that's the column type.
      if (row.businessId !== null) {
        result.set(row.businessId, Number(row._count._all));
      }
    }
    return result;
  },

  /**
   * Top-N businesses by BUSINESS_VIEW count in the last `sinceDays` days.
   * Returns an array of `{ businessId, count }` sorted by count desc,
   * limited to `limit` rows.
   *
   * Implementation notes:
   *   - Prisma's `groupBy` with `orderBy: { _count: { businessId: 'desc' } }`
   *     is supported on PostgreSQL and gives us the ranking in a single
   *     query (no JS sort needed).
   *   - The `_count._all` value is a `bigint` on Prisma's type system;
   *     we convert it to `Number` because view counts comfortably fit in
   *     a JS number (< 2^53).
   *   - Rows with `businessId === null` are excluded by the `where` clause
   *     (we filter on `businessId: { not: null }` for safety).
   */
  listPopularBusinesses: async (opts: {
    sinceDays?: number;
    limit?: number;
  }): Promise<Array<{ businessId: string; count: bigint }>> => {
    const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS;
    const limit = opts.limit ?? 8;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const rows = await db.analyticsEvent.groupBy({
      by: ['businessId'],
      where: {
        type: 'BUSINESS_VIEW',
        businessId: { not: null },
        createdAt: { gte: since },
      },
      _count: { _all: true },
      orderBy: { _count: { businessId: 'desc' } },
      take: limit,
    });

    // Prisma's groupBy types `businessId` as `string | null` (the column
    // is nullable in the schema) and `_count._all` as `number` for SQLite
    // / `bigint` for PostgreSQL. Our `where` clause excludes nulls, so we
    // can safely narrow here. We cast to the desired output shape rather
    // than using a type predicate (Prisma's row type doesn't expose the
    // bigint form on its TS surface even though PG returns it at runtime).
    const out: Array<{ businessId: string; count: bigint }> = [];
    for (const row of rows) {
      if (row.businessId !== null) {
        out.push({
          businessId: row.businessId,
          // At runtime on PG, `_count._all` is bigint (matches our return
          // type). Cast to satisfy the divergent TS-side number type.
          count: row._count._all as unknown as bigint,
        });
      }
    }
    return out;
  },
};
