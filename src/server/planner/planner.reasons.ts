// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Reason Builder
//
// Pure function: takes a score breakdown + preferences + context
// and produces the human-readable explanations shown on the result
// card (e.g. "+ Excelente para rumba", "+ Abierto a la hora elegida").
//
// Blueprint FASE 11:
//   "El score debe ser explicable. No retornar solamente 94."
//
// Rules:
//   - Maximum 5 reasons (ordered by score contribution)
//   - Each reason is a short, positive statement (≤60 chars)
//   - Never invent reasons that aren't backed by the data
//   - Negative signals are phrased as "less ideal for X" not as harsh
//     criticism (we already filtered hard-fail cases out before scoring)
// ─────────────────────────────────────────────────────────────

import type {
  NightPlannerPreferences,
  PlannerRecommendation,
  PlannerScoreBreakdown,
} from './types';
import type { PlannerScoringInput } from './planner.scoring';

// ─── Reason labels per factor ────────────────────────────────
//
// Each factor can contribute 0, 1, or 2 reasons depending on score:
//   - score ≥ 0.8 → strong positive reason ("Excelente para X")
//   - 0.5 ≤ score < 0.8 → mild positive ("Bueno para X")
//   - score < 0.5 → no reason (we don't surface weaknesses on the card)
//
// EXCEPTION: schedule factor with score 0 → "Cerrado a esta hora"
// (this is informative, not a positive reason — the card shows it
// as a warning badge instead, but we still surface it as a reason
// so the user understands why the score is low).

interface ReasonTemplate {
  factor: keyof Omit<PlannerScoreBreakdown, 'total'>;
  weight: number;
  score: number;
  /** Strong reason (score ≥ 0.8). */
  strong: string;
  /** Mild reason (0.5 ≤ score < 0.8). */
  mild: string;
  /** Warning reason (score < 0.5, only shown for selected factors). */
  warning?: string;
}

// ─── Mood labels ─────────────────────────────────────────────
const MOOD_LABELS: Record<NightPlannerPreferences['mood'][number], string> = {
  relax: 'relajarse',
  date: 'una cita',
  friends: 'salir con amigos',
  party: 'rumba',
  celebration: 'celebrar',
  live_music: 'música en vivo',
  food_drinks: 'comer y beber',
  drinks: 'tomar algo',
};

// ─── Company labels ──────────────────────────────────────────
const COMPANY_LABELS: Record<NightPlannerPreferences['company'], string> = {
  solo: 'salir solo',
  couple: 'parejas',
  friends: 'grupos de amigos',
  family: 'familias',
  celebration: 'celebraciones',
};

// ─── Availability labels ─────────────────────────────────────
const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: 'Reserva disponible',
  LIKELY_AVAILABLE: 'Reserva probablemente disponible',
  CHECK_REQUIRED: 'Confirmar disponibilidad',
  UNAVAILABLE: 'Sin disponibilidad',
};

// ─── Build the reason templates for a scored business ────────
//
// Maps each factor's score to a `{ strong, mild, warning? }` template
// using the preferences + context to pick the right label.
function buildTemplates(input: PlannerScoringInput): ReasonTemplate[] {
  const { preferences: prefs, context, business } = input;
  const primaryMood = prefs.mood[0] ?? 'relax';
  const moodLabel = MOOD_LABELS[primaryMood] ?? 'tu ambiente';

  return [
    {
      factor: 'mood',
      weight: 0.25,
      score: input.context.isOpenAtRequestedTime ? 1 : 0, // placeholder, replaced below
      strong: `Excelente para ${moodLabel}`,
      mild: `Bueno para ${moodLabel}`,
    },
    {
      factor: 'budget',
      weight: 0.15,
      score: 0,
      strong: 'Dentro de tu presupuesto',
      mild: 'Presupuesto razonable',
    },
    {
      factor: 'schedule',
      weight: 0.15,
      score: 0,
      strong: 'Abierto a la hora que elegiste',
      mild: 'Abierto ahora',
      warning: 'Cierra pronto',
    },
    {
      factor: 'capacity',
      weight: 0.1,
      score: 0,
      strong: 'Aforo ideal para tu plan',
      mild: 'Aforo aceptable',
    },
    {
      factor: 'distance',
      weight: 0.1,
      score: 0,
      strong: 'Cerca de ti',
      mild: 'A distancia razonable',
      warning: 'Un poco lejos',
    },
    {
      factor: 'company',
      weight: 0.1,
      score: 0,
      strong: `Ideal para ${COMPANY_LABELS[prefs.company] ?? 'tu grupo'}`,
      mild: `Apto para ${COMPANY_LABELS[prefs.company] ?? 'tu grupo'}`,
    },
    {
      factor: 'availability',
      weight: 0.05,
      score: 0,
      strong: AVAILABILITY_LABELS[context.availability] ?? 'Disponible',
      mild: 'Probablemente disponible',
    },
    {
      factor: 'promotion',
      weight: 0.05,
      score: 0,
      strong: 'Tiene promoción activa',
      mild: 'Promoción disponible',
    },
    {
      factor: 'rating',
      weight: 0.05,
      score: 0,
      strong: business.avgRating >= 4.5
        ? `Muy bien valorado (${business.avgRating.toFixed(1)}★)`
        : 'Bien valorado',
      mild: `Valoración positiva (${business.avgRating.toFixed(1)}★)`,
    },
  ];
}

// ─── Main entry: build reasons for a recommendation ──────────
//
// Picks up to 5 reasons, ordered by weighted score contribution
// (factor_score × weight). This ensures the reasons shown are the
// ones that actually moved the needle on the total score.
export function buildReasons(
  input: PlannerScoringInput,
  breakdown: PlannerScoreBreakdown,
): PlannerRecommendation['reasons'] {
  const templates = buildTemplates(input);

  // Replace placeholder scores with the real ones from the breakdown.
  const withScores = templates.map((t) => ({
    ...t,
    score: breakdown[t.factor],
    // Weighted contribution = score × weight. This is what we sort by.
    contribution: breakdown[t.factor] * t.weight,
  }));

  // ── Pick reasons ───────────────────────────────────────────
  // Strategy:
  //   1. Always include strong reasons (score ≥ 0.8), sorted by contribution.
  //   2. Fill remaining slots with mild reasons (0.5 ≤ score < 0.8).
  //   3. If we still have <3 reasons AND there's a warning reason with
  //      score < 0.5, include ONE warning (the highest-contribution one)
  //      so the user gets an honest picture.
  //   4. Cap at 5 reasons total.

  const strong = withScores
    .filter((t) => t.score >= 0.8)
    .sort((a, b) => b.contribution - a.contribution);
  const mild = withScores
    .filter((t) => t.score >= 0.5 && t.score < 0.8)
    .sort((a, b) => b.contribution - a.contribution);
  const warnings = withScores
    .filter((t) => t.score < 0.5 && t.warning)
    .sort((a, b) => b.contribution - a.contribution);

  const reasons: string[] = [];
  const MAX = 5;

  for (const t of strong) {
    if (reasons.length >= MAX) break;
    reasons.push(t.strong);
  }
  for (const t of mild) {
    if (reasons.length >= MAX) break;
    reasons.push(t.mild);
  }
  // Only add a warning if we have room AND we already have ≥2 positives
  // (don't show a card with only warnings — that business should have
  // been filtered out by the hard filters).
  if (reasons.length >= 2 && reasons.length < MAX) {
    const topWarning = warnings[0];
    if (topWarning?.warning) {
      reasons.push(topWarning.warning);
    }
  }

  // Edge case: if we ended up with 0 reasons (shouldn't happen for a
  // scored candidate, but defensive), add a generic fallback.
  if (reasons.length === 0) {
    reasons.push('Opción compatible con tu búsqueda');
  }

  return reasons;
}
