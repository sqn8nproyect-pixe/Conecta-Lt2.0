// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Zod Schema
//
// Validates the body of POST /api/planner/recommend BEFORE it
// reaches the service layer. This is the server-side security
// boundary — the client can send anything, but only well-formed
// `NightPlannerPreferences` reach `recommendNightPlan()`.
//
// Zod v4 is used (see package.json). The schema is defined with
// `z.object()` so we get both runtime validation AND a static type
// (`PlannerSchemaInput`) that matches `NightPlannerPreferences` 1:1.
// ─────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── Enums (mirror the unions in types.ts) ───────────────────
//
// Zod enums are stricter than `z.union([z.literal(), …])` — they
// produce a better error message ("Expected one of: relax, date, …")
// and the type narrows correctly. We define them once here and the
// service imports them as the canonical runtime check.

export const plannerMoodEnum = z.enum([
  'relax',
  'date',
  'friends',
  'party',
  'celebration',
  'live_music',
  'food_drinks',
  'drinks',
]);

export const plannerBudgetEnum = z.enum([
  'under_20',
  '20_50',
  '50_100',
  '100_plus',
]);

export const plannerCompanyEnum = z.enum([
  'solo',
  'couple',
  'friends',
  'family',
  'celebration',
]);

export const plannerDistanceEnum = z.enum([
  'nearby',
  '10_min',
  '20_min',
  'any',
]);

// ─── Date + time validation ──────────────────────────────────
//
// We use regex instead of `z.coerce.date()` because:
//   1. The planner works with calendar dates, not instants. A
//      "YYYY-MM-DD" string + a separate "HH:mm" string lets us
//      resolve the day-of-week in the venue's local timezone
//      without DST/UTC ambiguity.
//   2. Zod's `z.string().datetime()` expects an ISO 8601 instant,
//      which is the wrong shape for a calendar date.
//   3. The regex is strict (no leap-year validation, but the
//      planner doesn't need it — a user picking Feb 30 is a UX
//      bug, not a security issue, and the hours check will just
//      say "closed" for that date).

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm, 24h, 00:00–23:59

// ─── Slug validation ────────────────────────────────────────
//
// City slugs in the DB are lowercase-kebab-case ("los-teques").
// We validate the shape (not existence) here — the service does
// the existence check against the DB and returns a 404 if needed.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── The schema ─────────────────────────────────────────────
//
// Every field is documented inline so the error messages + the
// generated type are self-explanatory. The `message` option on
// each field is what the client sees in the 400 response.

export const plannerSchema = z.object({
  mood: z
    .array(plannerMoodEnum)
    .min(1, 'Selecciona al menos un ambiente')
    .max(2, 'Máximo 2 ambientes por búsqueda'),
  company: plannerCompanyEnum,
  budget: plannerBudgetEnum,
  date: z
    .string()
    .regex(dateRegex, 'La fecha debe estar en formato YYYY-MM-DD'),
  startTime: z
    .string()
    .regex(timeRegex, 'La hora debe estar en formato HH:mm (24h)'),
  guests: z
    .number()
    .int('La cantidad de personas debe ser un número entero')
    .min(1, 'Debe ser al menos 1 persona')
    .max(50, 'Para más de 50 personas contacta al local directamente'),
  distance: plannerDistanceEnum,
  citySlug: z
    .string()
    .min(1, 'La ciudad es requerida')
    .regex(slugRegex, 'Slug de ciudad inválido'),
  zoneId: z.string().optional(),
  wantsReservation: z.boolean().default(true),
  wantsPromotions: z.boolean().default(true),
  wantsRoute: z.boolean().default(false),
});

// Static type — should match `NightPlannerPreferences` 1:1.
// If you change the schema, run `bun run lint` to catch drift.
export type PlannerSchemaInput = z.infer<typeof plannerSchema>;

// ─── Safe-parse helper ──────────────────────────────────────
//
// Wraps `plannerSchema.safeParse` with a normalized error shape
// so the route handler can return a clean 400 without dealing with
// Zod's raw `ZodError` structure.
export interface PlannerValidationOk {
  ok: true;
  data: PlannerSchemaInput;
}
export interface PlannerValidationErr {
  ok: false;
  /** Flat array of `{ field, message }` — one per failed field. */
  errors: Array<{ field: string; message: string }>;
}

export function validatePlannerInput(
  raw: unknown,
): PlannerValidationOk | PlannerValidationErr {
  const result = plannerSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  // Flatten issues into `{ field, message }`. Nested fields (e.g. an
  // invalid item inside `mood[]`) get their path joined with `.`.
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || '_',
    message: issue.message,
  }));
  return { ok: false, errors };
}
