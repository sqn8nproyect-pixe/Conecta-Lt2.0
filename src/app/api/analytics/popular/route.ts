// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/analytics/popular
// Public endpoint — returns the top-N most-viewed businesses in the
// last 7 days, with their full transformed Establishment shape and
// viewCount.
//
// Used by the homepage "Populares esta semana" section (Etapa 6.2).
//
// Query params:
//   ?limit=8  — integer 1-20 (clamped). Defaults to 8.
//
// Returns 200 with Array<{ business: Establishment; viewCount: number }>.
// Returns `[]` if no BUSINESS_VIEW events exist in the last 7 days.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { analyticsService } from '@/server/services/analytics.service';

/**
 * GET /api/analytics/popular?limit=8
 *
 * Public — no auth required.
 */
export async function GET(request: Request) {
  try {
    // ── Parse + clamp `limit` query param ────────────────────────────
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get('limit');
    let limit = 8;
    if (rawLimit !== null) {
      const parsed = Number.parseInt(rawLimit, 10);
      if (!Number.isNaN(parsed)) {
        limit = Math.min(20, Math.max(1, parsed));
      }
    }

    const result = await analyticsService.getPopularThisWeek(limit);
    return NextResponse.json(result);
  } catch (e) {
    // getPopularThisWeek doesn't throw Response, but keep the convention
    // for symmetry with other route handlers.
    if (e instanceof Response) return e;
    console.error('GET /api/analytics/popular error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
