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

  // ─── Etapa 8.A — Admin Metrics aggregations ────────────────────
  //
  // These methods power the new "Métricas" tab in the AdminDashboard.
  // They are READ-ONLY aggregations over AnalyticsEvent, optimized for
  // the composite index `@@index([type, createdAt])` declared in the
  // Prisma schema.
  //
  // All methods accept a `sinceDays` window (default 7) and return
  // plain JSON-serializable shapes (no Date / bigint leaks).

  /**
   * Count events grouped by `type` within the last `sinceDays` days.
   * Returns a Record<eventType, count> covering ALL event types in
   * ANALYTICS_EVENT_TYPES (zero-filled for types with no events).
   *
   * One single `groupBy` query — cheap on the composite index.
   */
  countByType: async (
    sinceDays: number = DEFAULT_SINCE_DAYS,
  ): Promise<Record<string, number>> => {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const rows = await db.analyticsEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.type] = Number(row._count._all);
    }
    return out;
  },

  /**
   * Daily breakdown of events for the last `sinceDays` days, optionally
   * filtered by a single event type.
   *
   * Returns an array of `{ date, type, count }` sorted by date asc.
   * `date` is an ISO `YYYY-MM-DD` string in UTC (the caller can format
   * it in the user's timezone — we keep the repo tz-agnostic).
   *
   * Implementation: we use Prisma's `groupBy` on a date expression.
   * Because Prisma doesn't expose `DATE_TRUNC` directly, we fetch the
   * raw rows grouped by `[type, createdAt]` is NOT viable (createdAt is
   * a timestamp, not a day). Instead we use `findMany` with `select` to
   * pull just the `type` and `createdAt` columns for the window, then
   * bucket in JS. For the scale of CONECTA-LT (low thousands of events
   * per week) this is fast and avoids raw SQL.
   *
   * If the platform ever reaches > 50k events/day, swap this for a
   * `$queryRaw` with `DATE_TRUNC('day', "createdAt")`.
   */
  countByTypeAndDay: async (opts: {
    sinceDays?: number;
    type?: string | null;
  }): Promise<Array<{ date: string; type: string; count: number }>> => {
    const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const where: { createdAt: { gte: Date }; type?: string } = {
      createdAt: { gte: since },
    };
    if (opts.type) where.type = opts.type;

    const rows = await db.analyticsEvent.findMany({
      where,
      select: { type: true, createdAt: true },
    });

    // Bucket by day + type.
    const bucket = new Map<string, number>();
    for (const r of rows) {
      const d = r.createdAt;
      const dateKey = `${d.getUTCFullYear()}-${String(
        d.getUTCMonth() + 1,
      ).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const key = `${dateKey}|${r.type}`;
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    }

    // Expand into a sorted array, filling zero-days so the chart has no
    // gaps. We generate the full list of dates in the window, then for
    // each date emit one row per known event type (zero-filled).
    const eventTypes = opts.type
      ? [opts.type]
      : [
          'BUSINESS_VIEW',
          'WHATSAPP_CLICK',
          'INSTAGRAM_CLICK',
          'MAPS_CLICK',
          'SEARCH',
          'RESERVE_CLICK',
          'REDEEM_CLICK',
          'CAPACITY_REPORT',
        ];

    const out: Array<{ date: string; type: string; count: number }> = [];
    const now = new Date();
    for (let i = sinceDays - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - i,
        ),
      );
      const dateKey = `${d.getUTCFullYear()}-${String(
        d.getUTCMonth() + 1,
      ).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      for (const type of eventTypes) {
        const key = `${dateKey}|${type}`;
        out.push({ date: dateKey, type, count: bucket.get(key) ?? 0 });
      }
    }
    return out;
  },

  /**
   * Top-N businesses by a given event type (e.g. WHATSAPP_CLICK) within
   * the last `sinceDays` days. Returns an array of
   * `{ businessId, businessName, slug, count }` sorted by count desc.
   *
   * Two round-trips:
   *   1. groupBy on businessId (cheap on the index).
   *   2. findMany on Business to resolve ids → { name, slug }.
   *
   * Businesses that have been deleted are silently dropped (their
   * businessId is a loose string, no FK to enforce existence).
   */
  topBusinessesByEventType: async (opts: {
    type: string;
    sinceDays?: number;
    limit?: number;
  }): Promise<
    Array<{
      businessId: string;
      businessName: string;
      slug: string;
      count: number;
    }>
  > => {
    const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS;
    const limit = opts.limit ?? 10;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const grouped = await db.analyticsEvent.groupBy({
      by: ['businessId'],
      where: {
        type: opts.type,
        businessId: { not: null },
        createdAt: { gte: since },
      },
      _count: { _all: true },
      orderBy: { _count: { businessId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const ids = grouped
      .map((r) => r.businessId)
      .filter((id): id is string => id !== null);

    const businesses = await db.business.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true },
    });
    const bizMap = new Map(businesses.map((b) => [b.id, b]));

    return grouped
      .map((r) => {
        const id = r.businessId;
        if (id === null) return null;
        const biz = bizMap.get(id);
        if (!biz) return null; // business deleted → drop
        return {
          businessId: id,
          businessName: biz.name,
          slug: biz.slug,
          count: Number(r._count._all),
        };
      })
      .filter(
        (
          x,
        ): x is {
          businessId: string;
          businessName: string;
          slug: string;
          count: number;
        } => x !== null,
      );
  },

  /**
   * Top-N search queries from SEARCH events in the last `sinceDays`
   * days. Reads `metadata.query` from each SEARCH event (set by
   * analyticsService.trackEvent).
   *
   * Implementation: findMany on SEARCH events with `select: { metadata }`,
   * then aggregate in JS. For the scale of CONECTA-LT this is fine; if
   * searches explode, persist a denormalized `SearchQuery` table.
   *
   * Returns Array<{ query, count }> sorted by count desc, limited to
   * `limit` rows. Queries are trimmed + lowercased for grouping; the
   * returned `query` is the trimmed lowercase form.
   */
  topSearchQueries: async (opts: {
    sinceDays?: number;
    limit?: number;
  }): Promise<Array<{ query: string; count: number }>> => {
    const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS;
    const limit = opts.limit ?? 10;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    const rows = await db.analyticsEvent.findMany({
      where: { type: 'SEARCH', createdAt: { gte: since } },
      select: { metadata: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      // metadata is typed as Prisma.JsonValue. We only care about the
      // `query` field if it's a string.
      const meta = r.metadata as { query?: unknown } | null;
      const q =
        typeof meta?.query === 'string' ? meta.query.trim().toLowerCase() : '';
      if (!q) continue;
      counts.set(q, (counts.get(q) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /**
   * Most recent N events, optionally filtered by type. Used in the
   * "activity feed" of the metrics tab.
   *
   * Resolves businessId → { name, slug } (best-effort, may be null if
   * the business was deleted) and userId → { name, email } (always
   * present because userId is a real FK with onDelete: SET NULL).
   *
   * Returns Array<{ id, type, businessId, businessName, slug, userId,
   * userName, userEmail, createdAt }> sorted by createdAt desc.
   */
  recentEvents: async (opts: {
    limit?: number;
    type?: string | null;
  }): Promise<
    Array<{
      id: string;
      type: string;
      businessId: string | null;
      businessName: string | null;
      slug: string | null;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
      createdAt: string;
    }>
  > => {
    const limit = opts.limit ?? 50;
    const where: { type?: string } = {};
    if (opts.type) where.type = opts.type;

    const rows = await db.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        businessId: true,
        userId: true,
        createdAt: true,
      },
    });

    if (rows.length === 0) return [];

    // Batch-resolve business + user info to avoid N+1.
    const bizIds = Array.from(
      new Set(
        rows
          .map((r) => r.businessId)
          .filter((id): id is string => id !== null),
      ),
    );
    const userIds = Array.from(
      new Set(
        rows.map((r) => r.userId).filter((id): id is string => id !== null),
      ),
    );

    const [businesses, users] = await Promise.all([
      bizIds.length > 0
        ? db.business.findMany({
            where: { id: { in: bizIds } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
    ]);

    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const biz = r.businessId ? bizMap.get(r.businessId) : null;
      const usr = r.userId ? userMap.get(r.userId) : null;
      return {
        id: r.id,
        type: r.type,
        businessId: r.businessId,
        businessName: biz?.name ?? null,
        slug: biz?.slug ?? null,
        userId: r.userId,
        userName: usr?.name ?? null,
        userEmail: usr?.email ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  },
};
