// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/promotions/redeemed
// Lists all coupons claimed by the authenticated user, with the
// transformed parent `Offer` + `Establishment` for each.
//
// Used by the ProfilePage to render the "MIS CUPONES" section.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { promotionService } from '@/server/services/promotion.service';

/**
 * GET /api/promotions/redeemed
 *
 * Returns: Array<MyRedemptionEntry> = [{
 *   id, status, claimedAt,
 *   promotion: Offer & { business: { id, name, slug, address } },
 * }]
 *
 * Ordered by claimedAt desc (most recently claimed first).
 *
 * Errors:
 *   401 — No autenticado (from requireUser)
 *   500 — unexpected server error
 */
export async function GET() {
  try {
    const user = await requireUser();
    const redemptions = await promotionService.listMyRedemptions(user.id);
    return NextResponse.json(redemptions);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('GET /api/promotions/redeemed error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
