// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/promotions/[id]/redeem
// Claims a coupon for the authenticated user.
//
// Returns 200 with `{ redemption, promotion, offer, code }` on success.
// Errors:
//   401 — not authenticated (from requireUser)
//   404 — promotion not found
//   400 — promo not ACTIVE / expired / not yet begun / sold out
//   409 — user already claimed this coupon
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/server/auth';
import { promotionService } from '@/server/services/promotion.service';

/**
 * POST /api/promotions/[id]/redeem
 *
 * Path param: `id` — the Promotion id (cuid).
 * Body: ignored (the user identity comes from the session).
 *
 * Returns: RedeemPromotionResult = {
 *   redemption: { id, userId, promotionId, status, claimedAt },
 *   promotion:  { id, title, description, price, discount, image, code,
 *                 startDate, endDate, maxRedemptions, redemptionCount,
 *                 status },
 *   offer:      Offer,           // frontend-transformed promotion
 *   code:       string,          // human-readable coupon code (e.g. "SANCHO18")
 * }
 *
 * Errors:
 *   401 — No autenticado               (from requireUser)
 *   404 — Promoción no encontrada
 *   400 — Esta promoción no está disponible / ya expiró / aún no ha comenzado / está agotada
 *   409 — Ya has reclamado este cupón
 *
 * Race-condition guard:
 *   The service checks `findRedemptionByUser` BEFORE the transaction to
 *   fail fast on the common double-click case. If two concurrent requests
 *   both pass that check, the unique constraint [userId, promotionId]
 *   guarantees the loser's INSERT inside the tx fails with P2002 — we
 *   catch that and return a clean 409 instead of a 500.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const result = await promotionService.redeemPromotion(user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 404 / 400 / 409 thrown by service

    // P2002 — race condition between the pre-tx existence check and the
    // INSERT inside the tx. Treat as a clean 409 ("already claimed").
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ya has reclamado este cupón' },
        { status: 409 },
      );
    }

    console.error('POST /api/promotions/[id]/redeem error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
