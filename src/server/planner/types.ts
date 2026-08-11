// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Domain Types
//
// Single source of truth for the planner domain. Used by:
//   - src/server/planner/planner.schema.ts (Zod validation)
//   - src/server/planner/planner.service.ts (orchestrator)
//   - src/server/planner/planner.scoring.ts (pure scoring)
//   - src/server/planner/planner.availability.ts (pure hours check)
//   - src/server/planner/planner.distance.ts (pure Haversine)
//   - src/app/api/planner/recommend/route.ts (HTTP boundary)
//   - src/components/planner/* (UI)
//   - src/lib/api.ts (client-side fetch helpers)
//
// PRINCIPLES (from blueprint):
//   1. The client NEVER computes the final ranking.
//   2. Recommendations must NOT depend on hardcoded slugs.
//   3. The scoring must be explainable (every result ships `reasons[]`).
//   4. Availability is never promised falsely — use the 4-state enum.
//   5. These types are shared between client and server, so they must
//      not import anything from `@prisma/client` (would bloat the
//      client bundle — same policy as `UserRole` in src/lib/types.ts).
// ─────────────────────────────────────────────────────────────

import type { Establishment, PriceRange } from '@/lib/types';

// ─── Preference enums ────────────────────────────────────────
//
// The planner asks a progressive set of questions. Each enum below
// is the closed set of answers for one question.
//
// `PlannerMood` is the ONLY multi-select — a user can pick up to 2
// moods (e.g. ["food_drinks", "drinks"]) so the planner can build a
// multi-stop route. The other fields are single-select.

export type PlannerMood =
  | 'relax'
  | 'date'
  | 'friends'
  | 'party'
  | 'celebration'
  | 'live_music'
  | 'food_drinks'
  | 'drinks';

export type PlannerBudget =
  | 'under_20' // ≤ $20 per person
  | '20_50' // $20–$50
  | '50_100' // $50–$100
  | '100_plus'; // > $100

export type PlannerCompany =
  | 'solo'
  | 'couple'
  | 'friends'
  | 'family'
  | 'celebration';

// Distance preference is a UX abstraction ("nearby" / "10 min" / …)
// rather than a raw km number. The planner maps it to a km ceiling
// in `planner.service.ts` (configurable per city).
export type PlannerDistance =
  | 'nearby' // ≤ 2 km
  | '10_min' // ≤ 5 km
  | '20_min' // ≤ 10 km
  | 'any'; // no limit

// ─── Preferences payload ─────────────────────────────────────
//
// The full input to `recommendNightPlan()`. Matches the body of
// POST /api/planner/recommend 1:1 (validated by `plannerSchema`
// in planner.schema.ts).
//
// DESIGN:
//   - `mood` is an array (multi-select, 1–2 items). Empty array is
//     rejected by Zod — at least one mood is required.
//   - `date` is "YYYY-MM-DD" (NOT an ISO datetime) so the planner
//     can resolve the day-of-week without timezone ambiguity.
//   - `startTime` is "HH:mm" (24h). The planner checks business
//     hours against this time on the given date.
//   - `guests` is a number (1–50). Capped at 50 to prevent abuse;
//     larger groups should call the venue directly.
//   - `citySlug` is required — the planner is city-scoped. Los
//     Teques is "los-teques".
//   - `zoneId` is optional — narrows the search to a zone within
//     the city (e.g. "Centro", "San Pedro").
//   - The three `wants*` flags toggle secondary features. They
//     don't filter candidates, they only shape scoring + the
//     response payload (e.g. `wantsRoute=true` enables the
//     night-route builder, which is a future sprint).
export interface NightPlannerPreferences {
  mood: PlannerMood[];
  company: PlannerCompany;
  budget: PlannerBudget;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm" (24h)
  guests: number;
  distance: PlannerDistance;
  citySlug: string;
  zoneId?: string;
  wantsReservation: boolean;
  wantsPromotions: boolean;
  wantsRoute: boolean;
}

// ─── Score breakdown ─────────────────────────────────────────
//
// Each factor is normalized to 0.0–1.0 BEFORE being multiplied by
// its weight. `total` is the final 0–100 score (sum of weighted
// factors × 100). This shape is what the UI renders as the
// "compatibility" percentage and the per-factor explanation.
//
// WEIGHTS (defined in planner.scoring.ts, documented here):
//   mood         25%  — does the venue match the user's vibe?
//   budget       15%  — does the venue's priceRange fit?
//   schedule     15%  — is the venue open at the requested time?
//   capacity     10%  — is the current load appropriate for the mood?
//   distance     10%  — is it within the user's distance preference?
//   company      10%  — is the venue suitable for the group type?
//   availability  5%  — is a reservation likely available?
//   promotion     5%  — does the venue have an active promo?
//   rating        5%  — is the venue well-reviewed?
//   ────────────────
//   total       100%
export interface PlannerScoreBreakdown {
  mood: number; // 0–1
  company: number; // 0–1
  budget: number; // 0–1
  schedule: number; // 0–1
  capacity: number; // 0–1
  distance: number; // 0–1
  rating: number; // 0–1
  promotion: number; // 0–1
  availability: number; // 0–1
  total: number; // 0–100
}

// ─── Availability (never promise falsely) ────────────────────
//
// The 4-state enum from blueprint FASE 10. The planner must NOT
// claim "AVAILABLE" unless it can prove it (confirmed reservations
// < operational capacity on that date/time). Otherwise it falls
// back to the softer signals.
export type PlannerAvailability =
  | 'AVAILABLE' // proven: confirmed reservations leave headroom
  | 'LIKELY_AVAILABLE' // no reservations recorded, venue is open
  | 'CHECK_REQUIRED' // ambiguous — venue is open but data is thin
  | 'UNAVAILABLE'; // confirmed full or closed

// ─── Promotion summary (subset of the full Promotion model) ──
//
// The planner only needs the display fields + a redemption signal.
// We don't ship the full `Offer` shape (which has status/code/etc.
// the planner UI doesn't need).
export interface PlannerPromotionSummary {
  id: string;
  title: string;
  discount: string | null;
  /** ISO date — when the promo ends. Null = no end date. */
  endDate: string | null;
}

// ─── Business summary (subset of Establishment) ──────────────
//
// The planner doesn't need the full `Establishment` shape (gallery,
// socials, etc.). It only needs the fields the result card renders
// + the fields the scoring engine consumes. This keeps the response
// payload small and the scoring input explicit.
//
// NOTE: we re-use `Establishment` for the full card on the detail
// page (the planner result card links to /{slug}, which fetches the
// full Establishment separately).
export interface PlannerBusinessSummary {
  id: string;
  name: string;
  slug: string;
  category: Establishment['category'];
  address: string;
  lat: number;
  lng: number;
  phone: string;
  priceRange: PriceRange;
  avgRating: number;
  reviewCount: number;
  currentCapacity: Establishment['currentCapacity'];
  /** Human-readable schedule for the requested day (e.g. "Abierto hasta 02:00"). */
  scheduleLabel: string;
}

// ─── Recommendation (one of the Top N results) ───────────────
export interface PlannerRecommendation {
  business: PlannerBusinessSummary;
  /** 0–100 compatibility score. */
  score: number;
  scoreBreakdown: PlannerScoreBreakdown;
  /** Human-readable reasons explaining the score (max 5, ordered by contribution). */
  reasons: string[];
  /** Distance from the user in km (null if user location is unknown). */
  distanceKm: number | null;
  /** True if the venue is open at the requested date/time. */
  openAtRequestedTime: boolean;
  availability: PlannerAvailability;
  /** Active promotion (null if the venue has no live promo). */
  activePromotion: PlannerPromotionSummary | null;
}

// ─── Night Route (multi-stop itinerary) ──────────────────────
//
// FASE 15 of the blueprint. The route builder is a SEPARATE sprint
// (post-MVP). We define the shape here so the response contract is
// stable from day one — `route` is always present, just `null` when
// `wantsRoute` is false or when there aren't enough compatible stops.
export interface NightRouteStop {
  businessId: string;
  businessName: string;
  businessSlug: string;
  /** "HH:mm" — suggested arrival time at this stop. */
  startTime: string;
  /** "HH:mm" — suggested departure time (null for the last stop). */
  endTime: string | null;
  /** Short explanation of why this stop is in the route. */
  reason: string;
}

export interface NightRoute {
  stops: NightRouteStop[];
  /** Estimated total budget range in USD (null if prices are unknown). */
  estimatedBudget: { min: number; max: number } | null;
  /** Total travel distance across all stops in km (null if no coords). */
  totalDistanceKm: number | null;
}

// ─── Response payload ────────────────────────────────────────
//
// The full response of POST /api/planner/recommend. `meta` carries
// debugging info (candidate count, scored count) so the admin
// dashboard can surface funnel metrics without an extra request.
export interface NightPlannerResult {
  query: {
    citySlug: string;
    date: string;
    startTime: string;
    guests: number;
    mood: PlannerMood[];
    company: PlannerCompany;
    budget: PlannerBudget;
    distance: PlannerDistance;
  };
  recommendations: PlannerRecommendation[];
  /** Present only when `preferences.wantsRoute === true` AND enough candidates exist. */
  route: NightRoute | null;
  meta: {
    candidateCount: number;
    scoredCount: number;
    /** ISO timestamp of when the planner ran (for analytics de-dup). */
    generatedAt: string;
    /** Wall-clock duration of the planner run in ms (for perf monitoring). */
    durationMs: number;
  };
}

// ─── Empty-result reason codes ───────────────────────────────
//
// The planner NEVER returns an empty `recommendations` array without
// explaining why. The UI maps each code to a tailored empty-state
// message (see PlannerEmptyState.tsx in the UI sprint).
export type PlannerEmptyReason =
  | 'NO_CANDIDATES_IN_CITY' // no ACTIVE businesses in the city at all
  | 'ALL_CLOSED_AT_TIME' // candidates exist, but all are closed at the requested time
  | 'DISTANCE_TOO_STRICT' // candidates exist + open, but none within the distance ceiling
  | 'BUDGET_TOO_STRICT' // candidates exist + open + in range, but none fit the budget
  | 'NO_MATCH_AT_ALL'; // fallback — should be very rare

export interface NightPlannerEmptyResult {
  query: NightPlannerResult['query'];
  recommendations: [];
  route: null;
  reason: PlannerEmptyReason;
  /** Suggested next action for the user (e.g. "try 1h later"). */
  suggestion: string;
  meta: NightPlannerResult['meta'];
}

// Union type for the endpoint response (success | empty). The route
// handler returns one or the other — the client distinguishes by the
// presence of `reason` (empty) vs `recommendations.length > 0` (success).
export type NightPlannerResponse =
  | NightPlannerResult
  | NightPlannerEmptyResult;
