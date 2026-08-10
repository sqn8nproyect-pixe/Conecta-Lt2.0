// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/businesses/views
// Public endpoint — bulk-fetch view counts for a list of business
// slugs (used by the homepage to render "X vistas" badges on every
// card with a single round-trip).
//
// Body shape:
//   { slugs: string[] }   // capped at 100 slugs to avoid unbounded IN
//
// Returns 200 with Array<{ slug, viewCount }> — one entry per requested
// slug, in the same order. Slugs that don't resolve to a business get
// viewCount: 0 (no error — the homepage doesn't care if a slug is stale).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { analyticsService } from '@/server/services/analytics.service';

/** Hard cap on the number of slugs per request — protects the DB from
 *  unbounded IN-style scans. 100 is more than enough for the homepage
 *  (which currently renders ~21 cards). */
const MAX_SLUGS = 100;

/**
 * POST /api/businesses/views
 *
 * Public — no auth required (view counts are not sensitive).
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;
    const rawSlugs = b.slugs;

    if (!Array.isArray(rawSlugs)) {
      return NextResponse.json(
        { error: 'Se esperaba un array de slugs en el campo "slugs"' },
        { status: 400 },
      );
    }

    // Filter to strings + dedupe + cap.
    const slugs = Array.from(
      new Set(
        rawSlugs
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .slice(0, MAX_SLUGS),
      ),
    );

    const result = await analyticsService.getBulkViews(slugs);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/businesses/views error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
