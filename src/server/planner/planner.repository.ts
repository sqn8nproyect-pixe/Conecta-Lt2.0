// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Repository Layer
//
// Thin Prisma accessors that fetch planner candidates with all
// the relations the scoring engine needs (hours, promotions,
// category, city, zone). Reuses `businessInclude` from
// business.repository.ts so the relation shape is consistent.
//
// DESIGN (blueprint FASE 4):
//   - Single source of truth — no duplicate business queries.
//   - City-scoped: the planner NEVER loads businesses from other
//     cities. The `where` clause enforces this.
//   - Active-only: status === 'ACTIVE' (no DRAFT/SUSPENDED/etc.).
//   - Includes promotions so the service can filter live promos
//     in JS (via isPromotionLive) without an extra round-trip.
//   - Includes hours so the availability engine can check
//     isBusinessOpenAt without an extra round-trip.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { businessInclude } from '@/server/repositories/business.repository';

// Re-export the payload type so the service gets strong typing
// without redeclaring the include shape.
export type PlannerCandidate = Prisma.BusinessGetPayload<{
  include: typeof businessInclude;
}>;

export const plannerRepository = {
  /**
   * Fetch all ACTIVE businesses in a city, with full relations
   * (hours, promotions, category, etc.) so the service can score
   * them without extra round-trips.
   *
   * Filters:
   *   - status === 'ACTIVE' (hard filter — DRAFT/SUSPENDED/etc.
   *     are never planner candidates)
   *   - city.slug === citySlug (city-scoped search)
   *   - optional zoneId narrows to a zone within the city
   *
   * Does NOT filter by:
   *   - hours (the service checks isBusinessOpenAt in JS because
   *     the SQL equivalent is complex with midnight-crossing)
   *   - promotions (the service filters live promos in JS via
   *     isPromotionLive because the liveness check needs JS logic)
   *   - distance (the service computes Haversine in JS because
   *     PostGIS isn't available and SQL distance is approximate)
   *
   * The result set is small (Los Teques has ~15-30 businesses), so
   * loading all candidates per city is fine. If the DB grows to
   * thousands per city, we'd add SQL-level distance filtering.
   */
  findCandidates: async (
    citySlug: string,
    options?: { zoneId?: string },
  ): Promise<PlannerCandidate[]> => {
    return db.business.findMany({
      where: {
        status: 'ACTIVE',
        city: { slug: citySlug },
        ...(options?.zoneId ? { zoneId: options.zoneId } : {}),
      },
      include: businessInclude,
      // No orderBy — the service sorts by score after computing it.
      // Loading in arbitrary order is fine (and slightly faster than
      // ordering by avgRating which we don't need here).
    });
  },

  /**
   * Count confirmed/pending reservations for a business on a date.
   *
   * Used by the service to estimate availability:
   *   - 0 reservations + open → LIKELY_AVAILABLE
   *   - few reservations + open → AVAILABLE (headroom)
   *   - many reservations (≥ threshold) → CHECK_REQUIRED
   *
   * We only count PENDING + CONFIRMED (not CANCELLED/NO_SHOW/COMPLETED)
   * because those are the ones that actually occupy capacity.
   *
   * Single round-trip per business. If we later need to batch this
   * across N businesses, we'd switch to a groupBy on businessId —
   * but for now the planner scores ≤30 candidates so 30 round-trips
   * in parallel (Promise.all) is acceptable.
   */
  countActiveReservations: async (
    businessId: string,
    date: string,
  ): Promise<number> => {
    return db.reservation.count({
      where: {
        businessId,
        date,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
  },
};
