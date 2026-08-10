// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/businesses/[slug]/views
// Public endpoint — returns the BUSINESS_VIEW count for a single
// business in the last 7 days.
//
// Used by the establishment detail page to render "X vistas esta
// semana" next to the rating (Etapa 6.2).
//
// Returns 200 with `{ slug, viewCount }`.
// Returns 404 with `{ error: 'Negocio no encontrado' }` if the slug
// doesn't match any business.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { analyticsService } from '@/server/services/analytics.service';

/**
 * GET /api/businesses/[slug]/views
 *
 * Path param: `slug` — the Business.slug.
 * Public — no auth required.
 *
 * Note (Next.js 16): `params` is now a Promise and must be awaited.
 * Same pattern as /api/reservations/[id]/cancel/route.ts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await analyticsService.getBusinessViews(slug);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 404 from getBusinessViews
    console.error('GET /api/businesses/[slug]/views error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
