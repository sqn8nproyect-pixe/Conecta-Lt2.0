// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Service Layer
//
// Orchestrates the planner pipeline:
//   validate → load candidates → filter hard → score → sort → top 3
//
// This is the ONLY module that touches both the DB (via
// planner.repository.ts) AND the pure scoring engine
// (planner.scoring.ts). Keeping it thin ensures the scoring logic
// stays testable in isolation.
//
// Blueprint FASE 3 pipeline:
//   Input → Validate → Load candidates → Filter active → Filter city
//   → Check hours → Check distance → Check capacity
//   → Read active promotions → Read reservation context
//   → Calculate scores → Sort → Return Top N
// ─────────────────────────────────────────────────────────────

import type { CapacityLevel, PriceRange } from '@/lib/types';
import { isPromotionLive } from '@/server/repositories/promotion.repository';
import {
  plannerRepository,
  type PlannerCandidate,
} from './planner.repository';
import {
  buildScheduleLabel,
  getRemainingOpenMinutes,
  isBusinessOpenAt,
} from './planner.availability';
import {
  calculateDistanceKm,
  getDistanceCeilingKm,
} from './planner.distance';
import {
  calculateScore,
  type PlannerScoringInput,
} from './planner.scoring';
import { buildReasons } from './planner.reasons';
import type {
  NightPlannerEmptyResult,
  NightPlannerPreferences,
  NightPlannerResult,
  PlannerAvailability,
  PlannerBusinessSummary,
  PlannerPromotionSummary,
  PlannerRecommendation,
} from './types';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Build a JSON Response (thrown from service → returned by route handler).
 * Same convention as `requireUser()` and the other services.
 */
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Convert a raw Prisma Business row (with relations) into the
 * `PlannerBusinessSummary` shape the response contract expects.
 *
 * This is a LIGHTER transform than `transformBusiness` — we only
 * include the fields the planner result card needs (no gallery,
 * no socials, no full review list). The full Establishment is
 * fetched separately when the user clicks "Ver local".
 */
function toBusinessSummary(
  candidate: PlannerCandidate,
  date: string,
): PlannerBusinessSummary {
  const categorySlug = candidate.category?.slug ?? 'licorería';
  // Map the Category.slug to the frontend Category union. The DB
  // categories are seeded with slugs like 'licoreria', 'tasca',
  // 'discoteca' — we normalize to the union values (which use
  // the accented 'licorería' for legacy reasons).
  const categoryMap: Record<string, 'licorería' | 'tasca' | 'discoteca'> = {
    licoreria: 'licorería',
    licorería: 'licorería',
    tasca: 'tasca',
    discoteca: 'discoteca',
  };
  return {
    id: candidate.id,
    name: candidate.name,
    slug: candidate.slug,
    category: categoryMap[categorySlug] ?? 'licorería',
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    phone: candidate.phone ?? '',
    priceRange: (candidate.priceRange as PriceRange) ?? '$$',
    avgRating: candidate.avgRating,
    reviewCount: candidate.reviewCount,
    currentCapacity:
      (candidate.currentCapacity as CapacityLevel | null) ?? null,
    scheduleLabel: buildScheduleLabel(candidate.hours, date),
  };
}

/**
 * Pick the most relevant active promotion for a candidate.
 *
 * Returns the first live promotion (or null if none). We don't
 * score promotions by "relevance" yet — that's a future enhancement.
 * For now, "has any live promo" is the signal the scoring engine uses.
 */
function pickActivePromotion(
  candidate: PlannerCandidate,
): PlannerPromotionSummary | null {
  const now = new Date();
  for (const promo of candidate.promotions) {
    if (isPromotionLive(promo, now)) {
      return {
        id: promo.id,
        title: promo.title,
        discount: promo.discount ?? null,
        endDate: promo.endDate ? promo.endDate.toISOString() : null,
      };
    }
  }
  return null;
}

/**
 * Estimate reservation availability for a business on a date.
 *
 * Blueprint FASE 10 — the 4-state enum:
 *   - AVAILABLE        → few reservations, headroom likely
 *   - LIKELY_AVAILABLE → no reservations recorded, open
 *   - CHECK_REQUIRED   → moderate reservations, ambiguous
 *   - UNAVAILABLE      → closed OR many reservations
 *
 * We don't have a real "capacity" number per business (only the
 * crowdsourced QUIET/MODERATE/FULL signal), so we use reservation
 * count as a proxy:
 *   - 0 reservations → LIKELY_AVAILABLE (or AVAILABLE if open)
 *   - 1-3 reservations → AVAILABLE (headroom)
 *   - 4-7 reservations → CHECK_REQUIRED
 *   - 8+ reservations → UNAVAILABLE (likely full)
 *
 * These thresholds are conservative starting points — we can tune
 * them once we have real reservation volume data.
 */
function estimateAvailability(
  reservationCount: number,
  isOpen: boolean,
): PlannerAvailability {
  if (!isOpen) return 'UNAVAILABLE';
  if (reservationCount === 0) return 'LIKELY_AVAILABLE';
  if (reservationCount <= 3) return 'AVAILABLE';
  if (reservationCount <= 7) return 'CHECK_REQUIRED';
  return 'UNAVAILABLE';
}

// ─── Main orchestrator ──────────────────────────────────────

/**
 * Generate a night plan recommendation for the given preferences.
 *
 * Pipeline:
 *   1. Load candidates (city-scoped, ACTIVE only)
 *   2. Hard filter: hours (must be open), distance (within ceiling)
 *   3. For each surviving candidate:
 *      - Compute distance
 *      - Count active reservations (parallel)
 *      - Estimate availability
 *      - Build scoring input
 *      - Calculate score
 *      - Build reasons
 *   4. Sort by total score descending
 *   5. Take top 3
 *   6. Build response payload
 *
 * If fewer than 1 candidate survives the hard filters, returns an
 * empty result with a reason code + suggestion.
 */
export async function recommendNightPlan(
  prefs: NightPlannerPreferences,
): Promise<NightPlannerResult | NightPlannerEmptyResult> {
  const startTime = Date.now();
  console.log('[planner] request', {
    city: prefs.citySlug,
    date: prefs.date,
    time: prefs.startTime,
    mood: prefs.mood,
    company: prefs.company,
    budget: prefs.budget,
    guests: prefs.guests,
  });

  // ── 1. Load candidates ─────────────────────────────────────
  const candidates = await plannerRepository.findCandidates(prefs.citySlug, {
    zoneId: prefs.zoneId,
  });
  console.log('[planner] candidates', { count: candidates.length });

  if (candidates.length === 0) {
    return buildEmptyResult(
      prefs,
      'NO_CANDIDATES_IN_CITY',
      'No encontramos negocios activos en esta ciudad. Prueba con otra ciudad.',
      startTime,
      0,
      0,
    );
  }

  // ── 2. Hard filter: hours + distance ───────────────────────
  const distanceCeilingKm = getDistanceCeilingKm(prefs.distance);
  // User location — null because we don't ask for GPS yet. The
  // distance is computed from the city center (or zone centroid)
  // in a future sprint. For now, distance is null and the score
  // is neutral (0.5).
  // TODO Sprint 4: accept userLat/userLng in the preferences.
  const userLocation: { lat: number; lng: number } | null = null;

  const filtered: Array<{
    candidate: PlannerCandidate;
    isOpen: boolean;
    remainingOpenMinutes: number;
    distanceKm: number | null;
  }> = [];

  let allClosed = true;
  for (const candidate of candidates) {
    const isOpen = isBusinessOpenAt(
      candidate.hours,
      prefs.date,
      prefs.startTime,
    );
    if (isOpen) allClosed = false;

    // Hard filter: must be open at the requested time.
    // (We could relax this to "open within 30 min" later, but for
    // the MVP we require the venue to be open AT the requested time.)
    if (!isOpen) continue;

    // Hard filter: distance ceiling (only if user location is known).
    // When userLocation is null, we skip this filter (distance is
    // unknown, can't filter on it).
    let distanceKm: number | null = null;
    if (userLocation) {
      distanceKm = calculateDistanceKm(userLocation, {
        lat: candidate.lat,
        lng: candidate.lng,
      });
      if (distanceKm !== null && distanceKm > distanceCeilingKm) {
        continue;
      }
    }

    filtered.push({
      candidate,
      isOpen,
      remainingOpenMinutes: getRemainingOpenMinutes(
        candidate.hours,
        prefs.date,
        prefs.startTime,
      ),
      distanceKm,
    });
  }

  console.log('[planner] filtered', {
    count: filtered.length,
    allClosed,
  });

  // ── 3. Empty-result cases ──────────────────────────────────
  if (filtered.length === 0) {
    if (allClosed) {
      return buildEmptyResult(
        prefs,
        'ALL_CLOSED_AT_TIME',
        'No hay negocios abiertos a esta hora. Prueba 1 hora antes o después.',
        startTime,
        candidates.length,
        0,
      );
    }
    // If not all closed but filtered is empty, it must be distance.
    return buildEmptyResult(
      prefs,
      'DISTANCE_TOO_STRICT',
      'No encontramos opciones dentro de esa distancia. Prueba ampliar el rango.',
      startTime,
      candidates.length,
      0,
    );
  }

  // ── 4. Score each candidate (with parallel reservation counts) ──
  const reservationCounts = await Promise.all(
    filtered.map((f) =>
      plannerRepository.countActiveReservations(f.candidate.id, prefs.date),
    ),
  );

  const scored: PlannerRecommendation[] = filtered.map(
    (f, idx): PlannerRecommendation => {
      const reservationCount = reservationCounts[idx] ?? 0;
      const availability = estimateAvailability(
        reservationCount,
        f.isOpen,
      );
      const activePromotion = pickActivePromotion(f.candidate);

      const scoringInput: PlannerScoringInput = {
        business: {
          id: f.candidate.id,
          category:
            (f.candidate.category?.slug === 'tasca'
              ? 'tasca'
              : f.candidate.category?.slug === 'discoteca'
                ? 'discoteca'
                : 'licorería') as 'licorería' | 'tasca' | 'discoteca',
          priceRange:
            (f.candidate.priceRange as PriceRange) ?? '$$',
          avgRating: f.candidate.avgRating,
          reviewCount: f.candidate.reviewCount,
          currentCapacity:
            (f.candidate.currentCapacity as CapacityLevel | null) ?? null,
        },
        preferences: prefs,
        context: {
          isOpenAtRequestedTime: f.isOpen,
          remainingOpenMinutes: f.remainingOpenMinutes,
          distanceKm: f.distanceKm,
          distanceCeilingKm,
          availability,
          hasActivePromotion: activePromotion !== null,
        },
      };

      const breakdown = calculateScore(scoringInput);
      const reasons = buildReasons(scoringInput, breakdown);

      return {
        business: toBusinessSummary(f.candidate, prefs.date),
        score: breakdown.total,
        scoreBreakdown: breakdown,
        reasons,
        distanceKm: f.distanceKm,
        openAtRequestedTime: f.isOpen,
        availability,
        activePromotion,
      };
    },
  );

  console.log('[planner] scored', { count: scored.length });

  // ── 5. Sort by score desc, take top 3 ──────────────────────
  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3);

  // ── 6. Build response ──────────────────────────────────────
  const durationMs = Date.now() - startTime;
  console.log('[planner] completed', {
    durationMs,
    topScore: top3[0]?.score ?? 0,
    resultCount: top3.length,
  });

  return {
    query: {
      citySlug: prefs.citySlug,
      date: prefs.date,
      startTime: prefs.startTime,
      guests: prefs.guests,
      mood: prefs.mood,
      company: prefs.company,
      budget: prefs.budget,
      distance: prefs.distance,
    },
    recommendations: top3,
    // Route is a future sprint (Sprint 7) — always null for now.
    route: null,
    meta: {
      candidateCount: candidates.length,
      scoredCount: scored.length,
      generatedAt: new Date().toISOString(),
      durationMs,
    },
  };
}

// ─── Empty-result builder ───────────────────────────────────
//
// Centralized so the reason codes + suggestions stay consistent.
function buildEmptyResult(
  prefs: NightPlannerPreferences,
  reason: NightPlannerEmptyResult['reason'],
  suggestion: string,
  startTime: number,
  candidateCount: number,
  scoredCount: number,
): NightPlannerEmptyResult {
  return {
    query: {
      citySlug: prefs.citySlug,
      date: prefs.date,
      startTime: prefs.startTime,
      guests: prefs.guests,
      mood: prefs.mood,
      company: prefs.company,
      budget: prefs.budget,
      distance: prefs.distance,
    },
    recommendations: [],
    route: null,
    reason,
    suggestion,
    meta: {
      candidateCount,
      scoredCount,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ─── Exported for the route handler ─────────────────────────
//
// The route handler doesn't call recommendNightPlan directly — it
// calls this wrapper which catches any unexpected error and
// converts it to a 500 Response (so the route handler can just
// `if (e instanceof Response) return e;` like the other services).
export async function recommendNightPlanSafe(
  prefs: NightPlannerPreferences,
): Promise<NightPlannerResult | NightPlannerEmptyResult | Response> {
  try {
    return await recommendNightPlan(prefs);
  } catch (err) {
    console.error('[planner] error', err);
    return jsonError('Error al generar recomendaciones', 500);
  }
}
