// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/promotions/check
// Batch-checks which of a list of promotion IDs the current user
// has already claimed.
//
// Useful for hydrating "RECLAMADO" badge states across a list of
// coupons in a single round-trip (establishment detail page /
// ProfilePage).
//
// Body:    { promotionIds: string[] }
// Returns: Record<string, boolean>  (promotionId → claimed)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { promotionService } from '@/server/services/promotion.service';

const MAX_IDS = 200; // sanity cap to avoid unbounded IN-style scans

/**
 * POST /api/promotions/check
 *
 * Body: { promotionIds: string[] }
 *
 * Returns: Record<string, boolean> — promotionId → claimed (true if the
 * user has a CouponRedemption row for that promotion).
 *
 * Errors:
 *   400 — missing/invalid body, or too many IDs
 *   401 — No autenticado (from requireUser)
 *   500 — unexpected server error
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

    const rawIds =
      typeof body === 'object' &&
      body !== null &&
      'promotionIds' in body &&
      Array.isArray((body as { promotionIds?: unknown }).promotionIds)
        ? (body as { promotionIds: unknown[] }).promotionIds
        : null;

    if (!rawIds) {
      return NextResponse.json(
        { error: 'Falta promotionIds (array de strings) en el cuerpo' },
        { status: 400 },
      );
    }

    // Filter to strings and dedupe to keep the IN-clause lean.
    const promotionIds = Array.from(
      new Set(
        rawIds.filter(
          (s): s is string => typeof s === 'string' && s.length > 0,
        ),
      ),
    );

    if (promotionIds.length === 0) {
      return NextResponse.json({} as Record<string, boolean>);
    }

    if (promotionIds.length > MAX_IDS) {
      return NextResponse.json(
        {
          error: `Demasiados promotionIds (máximo ${MAX_IDS} por petición)`,
        },
        { status: 400 },
      );
    }

    const result = await promotionService.checkRedemptions(user.id, promotionIds);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('POST /api/promotions/check error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
