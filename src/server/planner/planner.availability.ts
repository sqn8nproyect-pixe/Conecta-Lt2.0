// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Availability Engine
//
// Pure functions for checking whether a business is open at a
// requested date/time. NO DB calls, NO side effects — fully
// testable in isolation.
//
// Handles the midnight-crossing case explicitly:
//   openTime = "22:00", closeTime = "02:00"
//   → open from 22:00 (day D) to 02:00 (day D+1)
//
// Convention (blueprint FASE 9):
//   open <= requestedTime < close   (close is exclusive)
// ─────────────────────────────────────────────────────────────

import type { BusinessHours } from '@prisma/client';

// ─── Time parsing ────────────────────────────────────────────
//
// Convert "HH:mm" → minutes since midnight (0–1439).
//   "00:00" → 0
//   "08:30" → 510
//   "23:59" → 1439
//
// Returns `null` for malformed strings (defensive — the Zod schema
// already validates the shape, but this protects against bad DB data).
export function parseTimeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

// ─── Day-of-week resolution ──────────────────────────────────
//
// Resolve "YYYY-MM-DD" → 0–6 (0=Sun, 6=Sat) WITHOUT timezone
// surprises. We construct the date in UTC at noon to avoid DST
// edge cases flipping the day around midnight.
//
// `new Date('2026-08-15')` parses as UTC midnight, but
// `getUTCDay()` is safe here because we explicitly want the
// calendar day, not the local day.
export function getDayOfWeek(date: string): number | null {
  // Validate shape first (defensive — Zod already enforces this).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDay();
}

// ─── Hours lookup ────────────────────────────────────────────
//
// Find the BusinessHours row for a specific date among a business's
// hours array. Returns `null` if the business has no hours entry
// for that day (treated as "closed").
export function findHoursForDate(
  hours: BusinessHours[],
  date: string,
): BusinessHours | null {
  const dayOfWeek = getDayOfWeek(date);
  if (dayOfWeek === null) return null;
  return (
    hours.find((h) => h.dayOfWeek === dayOfWeek) ?? null
  );
}

// ─── Core: is the business open at this exact time? ──────────
//
// The main pure predicate. Returns `true` if the business is
// operating at `date` + `time`.
//
// Rules (blueprint FASE 9):
//   1. If `isClosed === true` on that day → closed.
//   2. If no hours entry for that day → closed (defensive).
//   3. If `closeTime > openTime` (normal case, e.g. 08:00→20:00):
//        open if openMinutes <= reqMinutes < closeMinutes
//   4. If `closeTime < openTime` (midnight crossing, e.g. 22:00→02:00):
//        open if reqMinutes >= openMinutes OR reqMinutes < closeMinutes
//        (the requested time is "tonight after opening" or "tomorrow
//         before closing" — both count as open for the requested date)
//   5. If `closeTime === openTime` → treated as 24h (always open).
//        This is a rare edge case but some venues operate 24/7.
//   6. close is EXCLUSIVE: a business closing at 02:00 is NOT open
//      at exactly 02:00. This matches the blueprint's recommendation.
export function isBusinessOpenAt(
  hours: BusinessHours[],
  date: string,
  time: string,
): boolean {
  const dayHours = findHoursForDate(hours, date);
  if (!dayHours || dayHours.isClosed) return false;

  const openMin = parseTimeToMinutes(dayHours.openTime);
  const closeMin = parseTimeToMinutes(dayHours.closeTime);
  const reqMin = parseTimeToMinutes(time);

  if (openMin === null || closeMin === null || reqMin === null) {
    return false;
  }

  // 24h edge case
  if (openMin === closeMin) return true;

  if (closeMin > openMin) {
    // Normal: openTime < closeTime (e.g. 08:00 → 20:00)
    return reqMin >= openMin && reqMin < closeMin;
  }

  // Midnight crossing: openTime > closeTime (e.g. 22:00 → 02:00)
  // Open if the requested time is >= opening (tonight) OR
  // < closing (early morning, counted as still being "that night").
  return reqMin >= openMin || reqMin < closeMin;
}

// ─── Schedule label (for the result card) ────────────────────
//
// Produces a human-readable summary of the business's hours for
// the requested date. Used by the result card under the business
// name so the user sees at a glance when the place is open.
//
// Examples:
//   "Abierto hasta 02:00"
//   "Cerrado los domingos"
//   "Sin horario registrado"
//   "Abierto 24 horas"
export function buildScheduleLabel(
  hours: BusinessHours[],
  date: string,
): string {
  const dayHours = findHoursForDate(hours, date);
  if (!dayHours) return 'Sin horario registrado';
  if (dayHours.isClosed) return 'Cerrado este día';

  const openMin = parseTimeToMinutes(dayHours.openTime);
  const closeMin = parseTimeToMinutes(dayHours.closeTime);
  if (openMin === null || closeMin === null) {
    return 'Horario inválido';
  }

  if (openMin === closeMin) return 'Abierto 24 horas';

  // For midnight-crossing hours, the closeTime is technically
  // "tomorrow" — but we still display it as "02:00" because that's
  // what the user cares about ("abierto hasta las 2").
  return `Abierto de ${dayHours.openTime} a ${dayHours.closeTime}`;
}

// ─── Open-at-or-after helper ─────────────────────────────────
//
// Used by the planner when the user's requested time is BEFORE the
// opening time. Instead of hard-filtering the business out, the
// service can use this to compute "opens in X minutes" signals.
//
// Returns the minutes-from-midnight when the business opens on
// `date`, or `null` if closed / no hours / malformed.
export function getOpeningTime(
  hours: BusinessHours[],
  date: string,
): number | null {
  const dayHours = findHoursForDate(hours, date);
  if (!dayHours || dayHours.isClosed) return null;
  return parseTimeToMinutes(dayHours.openTime);
}

// ─── Closing time (handles midnight crossing) ────────────────
//
// Returns the minutes-from-midnight when the business closes.
// For midnight-crossing hours (22:00 → 02:00), the close time is
// technically on the NEXT day, but we still return 120 (02:00 in
// minutes) because the planner needs to know "how long until close"
// relative to the requested time — and that calculation depends on
// whether the requested time is before or after midnight.
//
// The planner uses this to compute the remaining open window:
//   - If reqMin >= openMin (after opening, before midnight):
//       remaining = (closeMin + 1440) - reqMin
//   - If reqMin < closeMin (after midnight, before closing):
//       remaining = closeMin - reqMin
export function getClosingTime(
  hours: BusinessHours[],
  date: string,
): number | null {
  const dayHours = findHoursForDate(hours, date);
  if (!dayHours || dayHours.isClosed) return null;
  return parseTimeToMinutes(dayHours.closeTime);
}

// ─── Remaining open minutes ──────────────────────────────────
//
// How many more minutes the business will be open, counting from
// `time` on `date`. Returns 0 if the business is closed at that
// moment, and a positive number otherwise.
//
// Used by the scoring engine: a venue that's open for another 4
// hours is more attractive than one closing in 15 minutes.
export function getRemainingOpenMinutes(
  hours: BusinessHours[],
  date: string,
  time: string,
): number {
  if (!isBusinessOpenAt(hours, date, time)) return 0;

  const dayHours = findHoursForDate(hours, date);
  if (!dayHours) return 0;

  const openMin = parseTimeToMinutes(dayHours.openTime);
  const closeMin = parseTimeToMinutes(dayHours.closeTime);
  const reqMin = parseTimeToMinutes(time);
  if (openMin === null || closeMin === null || reqMin === null) return 0;

  if (openMin === closeMin) {
    // 24h venue — return a large number (the rest of the day)
    return 1440 - reqMin;
  }

  if (closeMin > openMin) {
    // Normal: close is later same day
    return Math.max(0, closeMin - reqMin);
  }

  // Midnight crossing: close is next day
  if (reqMin >= openMin) {
    // We're after opening (before midnight) — close is tomorrow
    return closeMin + 1440 - reqMin;
  }
  // We're after midnight (before closing)
  return Math.max(0, closeMin - reqMin);
}
