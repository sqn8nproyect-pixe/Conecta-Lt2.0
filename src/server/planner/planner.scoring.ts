// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Scoring Engine
//
// Pure scoring functions. Each factor is normalized to 0.0–1.0
// BEFORE being multiplied by its weight. The total is the sum of
// weighted factors × 100 → 0–100.
//
// CRITICAL: this module is PURE. It takes a `PlannerScoringInput`
// (the business + preferences + context) and returns a
// `PlannerScoreBreakdown`. No DB, no I/O, no side effects.
//
// WEIGHTS (blueprint FASE 11):
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
// ─────────────────────────────────────────────────────────────

import type { CapacityLevel, PriceRange } from '@/lib/types';
import type {
  NightPlannerPreferences,
  PlannerAvailability,
  PlannerScoreBreakdown,
} from './types';

// ─── Scoring input ───────────────────────────────────────────
//
// The service assembles this object for each candidate business.
// It contains everything the scoring engine needs — no DB access
// inside the scoring functions.
export interface PlannerScoringInput {
  business: {
    id: string;
    category: 'licorería' | 'tasca' | 'discoteca';
    priceRange: PriceRange; // "$" | "$$" | "$$$"
    avgRating: number; // 0–5
    reviewCount: number;
    currentCapacity: CapacityLevel | null; // QUIET | MODERATE | FULL | null
  };
  preferences: NightPlannerPreferences;
  context: {
    isOpenAtRequestedTime: boolean;
    /** Remaining open minutes from the requested time (0 if closed). */
    remainingOpenMinutes: number;
    /** Distance from the user in km (null if unknown). */
    distanceKm: number | null;
    /** Distance ceiling in km (from the user's distance preference). */
    distanceCeilingKm: number;
    /** Reservation availability signal (from the reservation check). */
    availability: PlannerAvailability;
    /** True if the business has at least one active promotion. */
    hasActivePromotion: boolean;
  };
}

// ─── Factor weights (sum = 1.0) ──────────────────────────────
//
// Centralized so they can be tuned without touching the factor
// functions. The sum MUST equal 1.0 — the test suite checks this.
export const SCORE_WEIGHTS = {
  mood: 0.25,
  budget: 0.15,
  schedule: 0.15,
  capacity: 0.1,
  distance: 0.1,
  company: 0.1,
  availability: 0.05,
  promotion: 0.05,
  rating: 0.05,
} as const;

// ─── Factor: mood (25%) ──────────────────────────────────────
//
// Maps the user's mood selection(s) to the venue's category.
// The user can pick up to 2 moods — the score is the MAX of the
// per-mood compatibility (we want to know if the venue satisfies
// ANY of the requested moods, not all of them).
//
// Mapping (blueprint-intent, no hardcoded slugs):
//   relax          → tasca 1.0, licorería 0.7, discoteca 0.1
//   date           → tasca 1.0, licorería 0.8, discoteca 0.4
//   friends        → licorería 1.0, tasca 0.8, discoteca 0.7
//   party          → discoteca 1.0, licorería 0.4, tasca 0.2
//   celebration    → discoteca 0.9, tasca 0.8, licorería 0.7
//   live_music     → tasca 0.9, discoteca 0.7, licorería 0.5
//   food_drinks    → tasca 1.0, licorería 0.6, discoteca 0.3
//   drinks         → licorería 1.0, discoteca 0.7, tasca 0.6
const MOOD_CATEGORY_COMPAT: Record<
  NightPlannerPreferences['mood'][number],
  Record<PlannerScoringInput['business']['category'], number>
> = {
  relax: { tasca: 1.0, licorería: 0.7, discoteca: 0.1 },
  date: { tasca: 1.0, licorería: 0.8, discoteca: 0.4 },
  friends: { licorería: 1.0, tasca: 0.8, discoteca: 0.7 },
  party: { discoteca: 1.0, licorería: 0.4, tasca: 0.2 },
  celebration: { discoteca: 0.9, tasca: 0.8, licorería: 0.7 },
  live_music: { tasca: 0.9, discoteca: 0.7, licorería: 0.5 },
  food_drinks: { tasca: 1.0, licorería: 0.6, discoteca: 0.3 },
  drinks: { licorería: 1.0, discoteca: 0.7, tasca: 0.6 },
};

export function scoreMood(input: PlannerScoringInput): number {
  const { mood } = input.preferences;
  const category = input.business.category;
  if (mood.length === 0) return 0.5; // shouldn't happen (Zod prevents it)
  // MAX across selected moods — the venue satisfies ANY of them.
  let best = 0;
  for (const m of mood) {
    const compat = MOOD_CATEGORY_COMPAT[m]?.[category] ?? 0;
    if (compat > best) best = compat;
  }
  return best;
}

// ─── Factor: budget (15%) ────────────────────────────────────
//
// Maps the venue's `priceRange` ($/$$/$$$) to the user's budget
// preference. The matrix comes from the blueprint (FASE 8).
//
// A $ venue is a great match for an `under_20` budget (1.0) but a
// poor match for `100_plus` (0.2) — the user is expecting premium.
// A $$$ venue is a great match for `100_plus` (1.0) but impossible
// for `under_20` (0.1).
const BUDGET_COMPAT: Record<
  PriceRange,
  Record<NightPlannerPreferences['budget'], number>
> = {
  $: { under_20: 1.0, '20_50': 0.8, '50_100': 0.4, '100_plus': 0.2 },
  $$: { under_20: 0.5, '20_50': 1.0, '50_100': 0.8, '100_plus': 0.6 },
  $$$: { under_20: 0.1, '20_50': 0.6, '50_100': 1.0, '100_plus': 1.0 },
};

export function scoreBudget(input: PlannerScoringInput): number {
  return BUDGET_COMPAT[input.business.priceRange]?.[
    input.preferences.budget
  ] ?? 0.5;
}

// ─── Factor: schedule (15%) ──────────────────────────────────
//
// Hard component: if the business is CLOSED at the requested time,
// the schedule score is 0 (and the service will likely filter the
// business out before scoring, but we still score 0 defensively).
//
// Soft component: if open, the score scales with how long the venue
// will remain open. A venue open for 4+ more hours scores 1.0; one
// closing in 30 min scores ~0.2. This prefers venues where the
// user can actually spend time, not ones about to close.
const MIN_IDEAL_OPEN_MINUTES = 240; // 4h — full score threshold
const MIN_VIABLE_OPEN_MINUTES = 30; // 30min — below this scores ~0

export function scoreSchedule(input: PlannerScoringInput): number {
  if (!input.context.isOpenAtRequestedTime) return 0;
  const remaining = input.context.remainingOpenMinutes;
  if (remaining <= 0) return 0;
  if (remaining >= MIN_IDEAL_OPEN_MINUTES) return 1;
  // Linear ramp from MIN_VIABLE to MIN_IDEAL
  if (remaining <= MIN_VIABLE_OPEN_MINUTES) {
    return remaining / MIN_VIABLE_OPEN_MINUTES * 0.2;
  }
  // 30 min → 0.2, 240 min → 1.0
  return (
    0.2 +
    ((remaining - MIN_VIABLE_OPEN_MINUTES) /
      (MIN_IDEAL_OPEN_MINUTES - MIN_VIABLE_OPEN_MINUTES)) *
      0.8
  );
}

// ─── Factor: capacity (10%) ──────────────────────────────────
//
// Contextual scoring (blueprint FASE 6):
//   - User wants relax/date → QUIET is great, FULL is bad
//   - User wants party/celebration → MODERATE/FULL is great, QUIET is meh
//   - User wants friends/food_drinks → MODERATE is ideal
//
// `currentCapacity === null` → neutral 0.5 (no signal, no penalty).
const CAPACITY_RULES: Record<
  NightPlannerPreferences['mood'][number],
  Record<CapacityLevel, number>
> = {
  relax: { QUIET: 1.0, MODERATE: 0.6, FULL: 0.1 },
  date: { QUIET: 0.9, MODERATE: 0.7, FULL: 0.2 },
  friends: { QUIET: 0.6, MODERATE: 1.0, FULL: 0.5 },
  party: { QUIET: 0.3, MODERATE: 0.9, FULL: 0.8 },
  celebration: { QUIET: 0.5, MODERATE: 0.8, FULL: 0.7 },
  live_music: { QUIET: 0.5, MODERATE: 0.9, FULL: 0.6 },
  food_drinks: { QUIET: 0.7, MODERATE: 1.0, FULL: 0.4 },
  drinks: { QUIET: 0.5, MODERATE: 0.9, FULL: 0.6 },
};

export function scoreCapacity(input: PlannerScoringInput): number {
  const cap = input.business.currentCapacity;
  if (cap === null) return 0.5; // unknown → neutral

  // Take the MAX across selected moods (same logic as mood factor):
  // if the user picked ["food_drinks", "party"], we want the more
  // permissive of the two capacity rules.
  let best = 0;
  for (const m of input.preferences.mood) {
    const rule = CAPACITY_RULES[m]?.[cap] ?? 0.5;
    if (rule > best) best = rule;
  }
  return best;
}

// ─── Factor: distance (10%) ──────────────────────────────────
//
// Delegates to `scoreDistance` from planner.distance.ts.
// Linear decay from 1.0 (at user's location) to 0.0 (at ceiling).
export function scoreDistance(input: PlannerScoringInput): number {
  const { distanceKm, distanceCeilingKm } = input.context;
  if (distanceKm === null) return 0.5; // unknown → neutral
  if (distanceKm <= 0) return 1;
  if (distanceKm >= distanceCeilingKm) return 0;
  return 1 - distanceKm / distanceCeilingKm;
}

// ─── Factor: company (10%) ───────────────────────────────────
//
// Maps the group type to the venue's category. Same shape as the
// mood factor, but with different rules (a couple usually wants a
// tasca; a friends group is flexible; a family gathering leans
// tasca/food_drinks).
const COMPANY_CATEGORY_COMPAT: Record<
  NightPlannerPreferences['company'],
  Record<PlannerScoringInput['business']['category'], number>
> = {
  solo: { licorería: 1.0, tasca: 0.8, discoteca: 0.4 },
  couple: { tasca: 1.0, licorería: 0.8, discoteca: 0.5 },
  friends: { licorería: 1.0, discoteca: 0.8, tasca: 0.7 },
  family: { tasca: 1.0, licorería: 0.5, discoteca: 0.3 },
  celebration: { discoteca: 1.0, tasca: 0.8, licorería: 0.7 },
};

export function scoreCompany(input: PlannerScoringInput): number {
  return (
    COMPANY_CATEGORY_COMPAT[input.preferences.company]?.[
      input.business.category
    ] ?? 0.5
  );
}

// ─── Factor: availability (5%) ───────────────────────────────
//
// Maps the 4-state `PlannerAvailability` to a 0–1 score.
//   AVAILABLE        → 1.0 (proven headroom)
//   LIKELY_AVAILABLE → 0.8 (no reservations recorded, open)
//   CHECK_REQUIRED   → 0.5 (ambiguous)
//   UNAVAILABLE      → 0.0 (full or closed)
//
// Weight is low (5%) because availability is a soft signal — we
// never want it to dominate the score, but it should be a tiebreaker.
const AVAILABILITY_SCORE: Record<PlannerAvailability, number> = {
  AVAILABLE: 1.0,
  LIKELY_AVAILABLE: 0.8,
  CHECK_REQUIRED: 0.5,
  UNAVAILABLE: 0.0,
};

export function scoreAvailability(input: PlannerScoringInput): number {
  return AVAILABILITY_SCORE[input.context.availability] ?? 0.5;
}

// ─── Factor: promotion (5%) ──────────────────────────────────
//
// Binary signal: +1.0 if the venue has an active promotion, 0 otherwise.
//
// The blueprint suggested a 3-tier (+3/+5) but we don't yet have a
// "relevance" score for promotions. The simpler binary version is
// honest about what we know — a promo exists or it doesn't. We can
// upgrade to tiered scoring when promotions get a `relevance` field.
export function scorePromotion(input: PlannerScoringInput): number {
  return input.context.hasActivePromotion ? 1.0 : 0.0;
}

// ─── Factor: rating (5%) ─────────────────────────────────────
//
// Maps the venue's avgRating (0–5) to a 0–1 score.
//
// We use a slightly sub-linear curve so that a 4.5 venue doesn't
// score much higher than a 4.3 venue (avoiding rating dictatorship).
// The curve:
//   - <2.0 → 0.0 (avoid)
//   - 2.0  → 0.2
//   - 3.0  → 0.5
//   - 4.0  → 0.85
//   - 4.5  → 0.95
//   - 5.0  → 1.0
//
// We also factor in `reviewCount` — a 5.0 with 1 review is much
// less trustworthy than a 4.5 with 50 reviews. Venues with <3
// reviews get a small penalty to the rating score.
export function scoreRating(input: PlannerScoringInput): number {
  const { avgRating, reviewCount } = input.business;
  if (avgRating <= 0) return 0.3; // no reviews yet → mild neutral

  // Sub-linear: rating^1.5 / 5^1.5 maps [0,5] → [0,1]
  // but we shift the floor so <2.0 → 0
  let score: number;
  if (avgRating < 2) {
    score = 0;
  } else {
    score = Math.pow((avgRating - 2) / 3, 1.2) * 0.8 + 0.2;
  }

  // Trust penalty for very few reviews
  if (reviewCount < 3) {
    score *= 0.7; // -30% — we don't trust a 5.0 from 1 review
  } else if (reviewCount < 10) {
    score *= 0.9; // -10% — mild penalty
  }

  return Math.min(1, Math.max(0, score));
}

// ─── Compose: full breakdown ─────────────────────────────────
//
// Runs all 9 factors, multiplies by weights, and sums to a 0–100
// total. This is the single entry point the service calls.
export function calculateScore(input: PlannerScoringInput): PlannerScoreBreakdown {
  const mood = scoreMood(input);
  const budget = scoreBudget(input);
  const schedule = scoreSchedule(input);
  const capacity = scoreCapacity(input);
  const distance = scoreDistance(input);
  const company = scoreCompany(input);
  const availability = scoreAvailability(input);
  const promotion = scorePromotion(input);
  const rating = scoreRating(input);

  const total =
    mood * SCORE_WEIGHTS.mood +
    budget * SCORE_WEIGHTS.budget +
    schedule * SCORE_WEIGHTS.schedule +
    capacity * SCORE_WEIGHTS.capacity +
    distance * SCORE_WEIGHTS.distance +
    company * SCORE_WEIGHTS.company +
    availability * SCORE_WEIGHTS.availability +
    promotion * SCORE_WEIGHTS.promotion +
    rating * SCORE_WEIGHTS.rating;

  return {
    mood,
    budget,
    schedule,
    capacity,
    distance,
    company,
    availability,
    promotion,
    rating,
    // Convert 0–1 → 0–100, rounded to 1 decimal for display.
    total: Math.round(total * 1000) / 10,
  };
}
