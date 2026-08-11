// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — Distance Engine
//
// Pure Haversine distance calculation. NO DB calls, NO side effects.
//
// Used by:
//   - planner.service.ts → filter candidates by distance ceiling
//   - planner.scoring.ts → score the distance factor (closer = better)
//   - planner.route.ts (future Sprint 7) → compute total route distance
//
// Convention (blueprint FASE 7):
//   - Display distances with 1 decimal place (no false precision):
//       0.8 km, 2.4 km, 5.1 km
//   - Same coordinate = 0 km
//   - Missing coordinates → null (the planner doesn't fabricate a distance)
// ─────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Validation ──────────────────────────────────────────────
//
// Defensive check — lat/lng come from the DB (Float, can be 0 or
// out of range if seeded incorrectly). The planner treats invalid
// coordinates as "unknown location" → returns null distance.
export function isValidCoord(c: { lat: number; lng: number }): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

// ─── Haversine ───────────────────────────────────────────────
//
// Great-circle distance between two points on Earth using the
// Haversine formula. Returns the distance in KILOMETERS.
//
// Math:
//   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
//   c = 2 × atan2(√a, √(1−a))
//   d = R × c        (R = 6371 km)
//
// Why Haversine and not the simpler Equirectangular approximation?
//   - Distances in the planner are short (≤ 20 km), so the
//     approximation would be accurate enough, BUT Haversine is
//     only ~5 lines more code and is correct at any distance —
//     useful if we later expand to inter-city planning.
export function calculateDistanceKm(
  a: LatLng,
  b: LatLng,
): number | null {
  if (!isValidCoord(a) || !isValidCoord(b)) return null;

  // Same point → 0 (avoids floating-point noise from atan2)
  if (a.lat === b.lat && a.lng === b.lng) return 0;

  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return R * c;
}

// ─── Distance ceiling (per preference) ───────────────────────
//
// Maps a `PlannerDistance` enum value to a hard km ceiling.
// Candidates beyond this ceiling are filtered out by the service
// before scoring (hard filter, not a soft penalty).
//
// The mapping is calibrated for Los Teques (a small city ~15 km
// across). For other cities we'd swap this table — that's why the
// function is pure and easy to override per-city in the future.
export const DISTANCE_CEILING_KM: Record<string, number> = {
  nearby: 2,
  '10_min': 5,
  '20_min': 10,
  any: Number.MAX_SAFE_INTEGER,
};

export function getDistanceCeilingKm(preference: string): number {
  return DISTANCE_CEILING_KM[preference] ?? Number.MAX_SAFE_INTEGER;
}

// ─── Distance score (0–1) ────────────────────────────────────
//
// Used by the scoring engine. Maps the raw km distance to a 0–1
// score where 1 = very close and 0 = at or beyond the ceiling.
//
// The curve is linear WITHIN the ceiling:
//   - 0 km     → 1.0
//   - ceiling  → 0.0
//   - beyond   → 0.0 (filtered out by the hard filter anyway)
//
// A linear curve is the simplest defensible choice. We can later
// swap to a log/step curve without changing the call sites.
export function scoreDistance(
  distanceKm: number | null,
  ceilingKm: number,
): number {
  if (distanceKm === null) return 0.5; // unknown distance → neutral
  if (distanceKm <= 0) return 1;
  if (distanceKm >= ceilingKm) return 0;
  return 1 - distanceKm / ceilingKm;
}

// ─── Formatting ──────────────────────────────────────────────
//
// Display helper: 1.0 → "1.0 km", 0.832 → "0.8 km", 2.456 → "2.5 km".
// We round to 1 decimal place per the blueprint's "no false precision"
// rule. Returns "—" for unknown distances.
export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return '—';
  if (distanceKm < 0.1) return '0 km';
  return `${distanceKm.toFixed(1)} km`;
}
