// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/favorites/check
//   POST → batch-check which of a list of business slugs the current
//          user has favorited.
//
// Useful for hydrating "favorite" heart states across a list of cards
// in a single round-trip (Home / Map / Profile pages).
//
// Body:    { businessSlugs: string[] }
// Returns: Record<string, boolean>  (slug → favorited)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { favoriteService } from '@/server/services/favorite.service';

const MAX_SLUGS = 200; // sanity cap to avoid unbounded IN-style scans

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

    const rawSlugs =
      typeof body === 'object' &&
      body !== null &&
      'businessSlugs' in body &&
      Array.isArray((body as { businessSlugs?: unknown }).businessSlugs)
        ? (body as { businessSlugs: unknown[] }).businessSlugs
        : null;

    if (!rawSlugs) {
      return NextResponse.json(
        { error: 'Falta businessSlugs (array de strings) en el cuerpo' },
        { status: 400 },
      );
    }

    // Filter to strings and dedupe to keep the lookup lean.
    const slugs = Array.from(
      new Set(
        rawSlugs.filter(
          (s): s is string => typeof s === 'string' && s.length > 0,
        ),
      ),
    );

    if (slugs.length === 0) {
      return NextResponse.json({} as Record<string, boolean>);
    }

    if (slugs.length > MAX_SLUGS) {
      return NextResponse.json(
        {
          error: `Demasiados slugs (máximo ${MAX_SLUGS} por petición)`,
        },
        { status: 400 },
      );
    }

    const result = await favoriteService.checkSlugs(user.id, slugs);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('POST /api/favorites/check error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
