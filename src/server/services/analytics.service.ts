// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Analytics Service Layer
// Orchestrates the public tracking endpoint + the read-side helpers
// (popular-this-week, per-business view count, bulk view counts).
//
// Errors are thrown as `Response` objects (via `jsonError`) so route
// handlers can propagate them with `if (e instanceof Response) return e;`
// — same convention as favorite/review/promotion/reservation services.
//
// IMPORTANT: `trackEvent` is the ONLY method that follows a "best-effort"
// contract. It NEVER throws on transient DB errors (it returns
// `{ ok: false, reason }` instead) because tracking is fire-and-forget
// from the client's perspective. The ONLY case where it throws is a
// malformed `type` (400) — that's a caller bug, not a transient issue.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { Establishment } from '@/lib/types';
import { analyticsRepository } from '@/server/repositories/analytics.repository';
import {
  businessRepository,
} from '@/server/repositories/business.repository';
import {
  transformBusiness,
  type BusinessWithRelations,
} from '@/server/services/business.service';

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

// ─── Allowed event types ───────────────────────────────────
//
// Exported so the frontend (and the seed script) can reuse the same
// definition. Adding a new event type only requires touching this array
// (the repo is intentionally permissive — see analytics.repository.ts).
//
// IMPORTANT: the `AnalyticsEventType` union in `src/lib/types.ts` MUST
// be kept in sync with this array (both are the compile-time contract;
// the DB column is a plain string so no migration is needed when adding
// types, but TS will complain if a tracked type isn't in the union).
export const ANALYTICS_EVENT_TYPES = [
  // ── Establishment interaction (Etapa 6) ────────────────────────
  'BUSINESS_VIEW', // user opened an establishment detail page
  'WHATSAPP_CLICK', // user clicked the WhatsApp button on an establishment
  'INSTAGRAM_CLICK', // user clicked the Instagram button
  'MAPS_CLICK', // user clicked "Cómo llegar"
  'SEARCH', // user executed a search query on the homepage
  'RESERVE_CLICK', // user opened the booking modal
  'REDEEM_CLICK', // user clicked "Reclamar código"
  'CAPACITY_REPORT', // Etapa 3.6 — user reported a venue's current capacity

  // ── Night Planner v2 funnel (Sprint 1 — blueprint FASE 16) ─────
  // The full planner funnel. Each step is a separate event so the
  // admin dashboard can compute completion rate, zero-result rate,
  // result click-through rate, and reservation conversion. Metadata
  // for these events is defined in `usePlannerAnalytics` (Sprint 5).
  'PLANNER_OPENED', // user opened the Night Planner modal
  'PLANNER_STEP_COMPLETED', // user answered one step (metadata.step = 1..6)
  'PLANNER_SEARCH_STARTED', // user submitted the form → POST /api/planner/recommend
  'PLANNER_RESULTS_SHOWN', // server returned N results (metadata.resultCount, topScore)
  'PLANNER_RECOMMENDATION_VIEWED', // user scrolled to / hovered a result card
  'PLANNER_RECOMMENDATION_SELECTED', // user clicked "Ver local" on a result
  'PLANNER_ROUTE_CREATED', // user generated a multi-stop route (Sprint 7)
  'PLANNER_RESERVATION_STARTED', // user clicked "Reservar" from a result
  'PLANNER_RESERVATION_COMPLETED', // reservation was confirmed (from the planner flow)
  'PLANNER_PROMOTION_VIEWED', // user expanded a promo on a result card
  'PLANNER_PROMOTION_CLAIMED', // user claimed a promo from a result card
  'PLANNER_DISMISSED', // user closed the planner without selecting anything
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

// Runtime guard used by `trackEvent`.
const EVENT_TYPE_SET: ReadonlySet<string> = new Set(ANALYTICS_EVENT_TYPES);

/**
 * Public track input (matches the POST /api/analytics/track body).
 *   - `type`          — required, must be one of ANALYTICS_EVENT_TYPES.
 *   - `businessSlug`  — optional. Resolved to businessId inside the
 *                       service (only required for business-scoped events
 *                       like BUSINESS_VIEW / WHATSAPP_CLICK, but we accept
 *                       it for any type so the caller doesn't have to
 *                       know which events are business-scoped).
 *   - `userId`        — optional. Attached when the user is logged in
 *                       (resolved in the route via getCurrentUser).
 *   - `metadata`      — optional. Arbitrary JSON. For SEARCH events,
 *                       `metadata.query` is expected (defaults to `''`).
 */
export interface TrackEventInput {
  type: AnalyticsEventType;
  businessSlug?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Result shapes ─────────────────────────────────────────

export type TrackEventResult =
  | { ok: true }
  | { ok: false; reason: string };

export type PopularThisWeekEntry = {
  business: Establishment;
  viewCount: number;
};

export type BusinessViewsResult = {
  slug: string;
  viewCount: number;
};

export type BulkViewsEntry = {
  slug: string;
  viewCount: number;
};

export const analyticsService = {
  /**
   * Track a single analytics event.
   *
   * Contract:
   *   - Validates `type` is in ANALYTICS_EVENT_TYPES. Throws 400 if not.
   *   - If `businessSlug` is provided, resolves it to businessId via a
   *     findUnique. If the business doesn't exist, returns
   *     `{ ok: false, reason: 'business not found' }` SILENTLY — we don't
   *     404 because tracking is best-effort and a deleted slug shouldn't
   *     surface as an error to the client.
   *   - For SEARCH events, ensures `metadata.query` is present (defaults
   *     to `''` if missing — we still track the search so we know a search
   *     happened even if the query was empty).
   *   - Wraps the insert in try/catch. On DB error, logs to console.error
   *     and returns `{ ok: false, reason: 'db error' }`. NEVER throws out
   *     of `trackEvent` except for the 400 validation case.
   *
   * This makes the method safe to call fire-and-forget from the client:
   * a transient DB outage doesn't break the user's browsing flow.
   */
  trackEvent: async (input: TrackEventInput): Promise<TrackEventResult> => {
    // ── 1. Validate event type (the only case that throws) ────────────
    if (!input.type || !EVENT_TYPE_SET.has(input.type)) {
      throw jsonError('Tipo de evento inválido', 400);
    }

    // ── 2. Resolve businessSlug → businessId (best-effort) ────────────
    let businessId: string | null = null;
    if (input.businessSlug) {
      try {
        const business = await db.business.findUnique({
          where: { slug: input.businessSlug },
          select: { id: true },
        });
        if (!business) {
          // Silent: tracking a non-existent business is not a caller bug,
          // it's just an outdated slug. Don't surface as error.
          return { ok: false, reason: 'business not found' };
        }
        businessId = business.id;
      } catch (err) {
        // DB error resolving slug — log + bail with ok:false so the
        // client doesn't get a 500 from a fire-and-forget tracking call.
        console.error(
          '[analytics] trackEvent: error resolving businessSlug',
          input.businessSlug,
          err,
        );
        return { ok: false, reason: 'db error' };
      }
    }

    // ── 3. Normalize metadata ─────────────────────────────────────────
    let metadata: Record<string, unknown> = input.metadata ?? {};
    if (input.type === 'SEARCH') {
      const rawQuery = (metadata as { query?: unknown }).query;
      const queryStr =
        typeof rawQuery === 'string' ? rawQuery : String(rawQuery ?? '');
      metadata = { ...metadata, query: queryStr };
    }

    // ── 4. Insert AnalyticsEvent (best-effort) ────────────────────────
    try {
      await analyticsRepository.createEvent({
        type: input.type,
        userId: input.userId ?? null,
        businessId,
        // Cast through `InputJsonValue` — the local `metadata` is a plain
        // object (Record<string, unknown>) which TS doesn't auto-narrow to
        // Prisma's branded JSON input type, even though it's structurally
        // compatible at runtime.
        metadata: metadata as Prisma.InputJsonValue,
      });
      return { ok: true };
    } catch (err) {
      // Never throw out of trackEvent for a DB error — tracking is
      // fire-and-forget. Log + return ok:false so the route can still
      // respond 200 (the client doesn't care if tracking failed).
      console.error('[analytics] trackEvent: error inserting event', err);
      return { ok: false, reason: 'db error' };
    }
  },

  /**
   * Returns the top-N most-viewed businesses in the last 7 days, with
   * their full transformed Establishment shape (reusing transformBusiness
   * from business.service.ts).
   *
   * Flow:
   *   1. analyticsRepository.listPopularBusinesses({ sinceDays: 7, limit })
   *      → Array<{ businessId, count }> sorted desc by view count.
   *   2. Fetch the full businesses with businessRepository.findAll({
   *      id: { in: businessIds } }). findAll already filters by
   *      status: 'ACTIVE' (so archived/suspended businesses are dropped).
   *   3. CRITICAL: re-sort the fetched businesses to match the popular
   *      ranking — findAll orders by avgRating desc, which would scramble
   *      the view-count order.
   *   4. Transform each via transformBusiness() and pair with viewCount.
   *
   * Returns `[]` if no events in the window OR if all the popular
   * businessIds correspond to non-ACTIVE businesses.
   *
   * NOTE: viewCount is converted from bigint to Number here (the repo
   * returns bigint because Prisma's `_count._all` is typed as bigint).
   */
  getPopularThisWeek: async (
    limit?: number,
  ): Promise<PopularThisWeekEntry[]> => {
    const effectiveLimit = limit ?? 8;
    const popular = await analyticsRepository.listPopularBusinesses({
      sinceDays: 7,
      limit: effectiveLimit,
    });
    if (popular.length === 0) return [];

    const businessIds = popular.map((p) => p.businessId);
    const businesses = (await businessRepository.findAll({
      id: { in: businessIds },
    })) as BusinessWithRelations[];

    // Re-sort to match the popular ranking (highest views first).
    // `findIndex` is O(n) but n is small (≤ effectiveLimit ≤ 20), so this
    // is fine. Build a rank map for O(1) lookup.
    const rankMap = new Map<string, number>();
    popular.forEach((p, idx) => rankMap.set(p.businessId, idx));
    businesses.sort(
      (a, b) => (rankMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rankMap.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );

    // Build viewCount map (convert bigint → Number for JSON).
    const viewCountMap = new Map<string, number>();
    for (const p of popular) {
      viewCountMap.set(p.businessId, Number(p.count));
    }

    return businesses.map((b) => ({
      business: transformBusiness(b),
      viewCount: viewCountMap.get(b.id) ?? 0,
    }));
  },

  /**
   * Returns the BUSINESS_VIEW count for a single business in the last
   * 7 days. Resolves slug → businessId first (404 if the slug doesn't
   * match any business — this is a real caller error, unlike the silent
   * best-effort case in `trackEvent`).
   */
  getBusinessViews: async (slug: string): Promise<BusinessViewsResult> => {
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!business) {
      throw jsonError('Negocio no encontrado', 404);
    }
    const viewCount = await analyticsRepository.countByBusiness(
      business.id,
      7,
    );
    return { slug, viewCount };
  },

  /**
   * Bulk: takes an array of slugs, returns Array<{ slug, viewCount }>
   * for the cards on the homepage.
   *
   * Two round-trips total:
   *   1. findMany on Business by slug → builds slug→id map.
   *   2. groupBy on AnalyticsEvent → builds id→count map.
   * Then maps each requested slug to its view count (0 if missing).
   *
   * Used by POST /api/businesses/views so the homepage can render view
   * counts on every card with a single request instead of N.
   */
  getBulkViews: async (slugs: string[]): Promise<BulkViewsEntry[]> => {
    if (slugs.length === 0) return [];

    // ── 1. Resolve slugs → ids in one query ───────────────────────────
    const businesses = await db.business.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });

    const slugToId = new Map<string, string>();
    for (const b of businesses) slugToId.set(b.slug, b.id);

    // ── 2. Bulk count by businessId ──────────────────────────────────
    const ids = Array.from(slugToId.values());
    const idToCount = await analyticsRepository.countByBusinesses(ids, 7);

    // ── 3. Map back to slug-keyed entries ────────────────────────────
    // Slugs that don't resolve to a business get viewCount: 0.
    return slugs.map((slug) => {
      const id = slugToId.get(slug);
      const viewCount = id ? (idToCount.get(id) ?? 0) : 0;
      return { slug, viewCount };
    });
  },
};
