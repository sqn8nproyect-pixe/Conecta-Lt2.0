// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/favorites
//   GET  → list the authenticated user's favorited establishments.
//   POST → toggle a favorite on/off by business slug.
//
// All handlers require an authenticated session (requireUser()).
// requireUser() throws a Response(401) if no session — we propagate
// it by re-returning it from the catch block.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { favoriteService } from '@/server/services/favorite.service';

/**
 * GET /api/favorites
 * Returns: Establishment[] — the user's favorites, transformed with
 * offers + reviews embedded (same shape as /api/businesses).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const favorites = await favoriteService.listForUser(user.id);
    return NextResponse.json(favorites);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('GET /api/favorites error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/favorites
 * Body: { businessSlug: string }
 * Returns: { favorited: boolean, business: Establishment }
 *
 * Errors:
 *   400 — missing or non-string businessSlug
 *   401 — not authenticated
 *   404 — business slug doesn't match any row
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const businessSlug =
      typeof body === 'object' &&
      body !== null &&
      'businessSlug' in body &&
      typeof (body as { businessSlug?: unknown }).businessSlug === 'string'
        ? (body as { businessSlug: string }).businessSlug
        : null;

    if (!businessSlug) {
      return NextResponse.json(
        { error: 'Falta businessSlug en el cuerpo de la petición' },
        { status: 400 },
      );
    }

    const result = await favoriteService.toggle(user.id, businessSlug);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 404 thrown by service
    console.error('POST /api/favorites error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
