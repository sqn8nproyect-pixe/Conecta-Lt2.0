// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Promotion Service Layer
// Orchestrates the atomic "claim coupon + increment redemptionCount"
// flow inside a single Prisma transaction, plus the list / batch-check
// helpers used by the ProfilePage and the establishment detail page.
//
// Errors are thrown as `Response` objects (same convention as
// favorite.service.ts and review.service.ts) so route handlers can
// propagate them with `if (e instanceof Response) return e;`.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { Offer } from '@/lib/types';
import {
  promotionRepository,
  type CouponRedemptionWithPromotion,
} from '@/server/repositories/promotion.repository';
import { transformPromotion } from '@/server/services/business.service';

/**
 * Build a JSON Response (thrown from service → returned by route handler).
 * Throwing a Response is the same convention used by `requireUser()`.
 */
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Public shape returned by `redeemPromotion`. The route handler returns
 * this verbatim as the JSON body.
 *
 *   - `redemption`  — the freshly created CouponRedemption row.
 *   - `promotion`   — the updated Promotion (after increment).
 *   - `offer`       — the same promotion transformed to the frontend
 *                     `Offer` shape, so the UI can update its cached
 *                     establishment detail page without an extra fetch.
 *   - `code`        — convenience field: the human-readable coupon code
 *                     the user copies into the reservation / shows at
 *                     the venue. Mirrored from `promotion.code` so the
 *                     client doesn't have to dig into the nested object.
 */
export type RedeemPromotionResult = {
  redemption: {
    id: string;
    userId: string;
    promotionId: string;
    status: string;
    claimedAt: string;
  };
  promotion: {
    id: string;
    title: string;
    description: string;
    price: string | null;
    discount: string | null;
    image: string | null;
    code: string | null;
    startDate: string | null;
    endDate: string | null;
    maxRedemptions: number | null;
    redemptionCount: number;
    status: string;
  };
  offer: Offer;
  code: string;
};

/**
 * Public shape returned by `listMyRedemptions`.
 *
 * Matches the frontend `CouponRedemption` interface (src/lib/types.ts):
 *   - `promotion` carries the transformed `Offer` fields PLUS the parent
 *     business `{ id, name, slug, address }` so the ProfilePage can render
 *     the coupon card (title, code, image, countdown) AND link back to the
 *     establishment detail page without an extra fetch.
 *
 * NOTE: the frontend's `useRedemptionsSync` hook reads `r.promotion.id`
 * to mirror the claimed promotion IDs into the Zustand store, so `promotion`
 * MUST be present at the top level (not flattened to `promotionId` + `offer`).
 */
export type MyRedemptionEntry = {
  id: string;
  status: string;
  claimedAt: string;
  promotion: Offer & {
    business: {
      id: string;
      name: string;
      slug: string;
      address: string;
    };
  };
};

export const promotionService = {
  /**
   * Redeem (claim) a promotion for the authenticated user.
   *
   * Validation flow (each throws a 4xx Response on failure):
   *   1. 404 if the promotion doesn't exist.
   *   2. 400 if status !== 'ACTIVE' → "Esta promoción no está disponible"
   *   3. 400 if endDate < now       → "Esta promoción ya expiró"
   *   4. 400 if startDate > now     → "Esta promoción aún no ha comenzado"
   *   5. 400 if sold out            → "Esta promoción está agotada"
   *   6. 409 if already claimed     → "Ya has reclamado este cupón"
   *
   * Atomic write flow inside a single Prisma transaction:
   *   a. createRedemption({ userId, promotionId }, tx) — inserts the
   *      CouponRedemption row in CLAIMED status.
   *   b. incrementRedemptionCount(promotionId, tx) — atomic SQL UPDATE
   *      that bumps `redemptionCount` by 1.
   *
   * Both writes commit together or roll back together, so the count can
   * never drift out of sync with the number of redemption rows.
   *
   * Returns `{ redemption, promotion, offer, code }` — see the type above.
   */
  redeemPromotion: async (
    userId: string,
    promotionId: string,
  ): Promise<RedeemPromotionResult> => {
    // ── 1. Look up the promotion with its parent business ──────────
    const promotion = await promotionRepository.findById(promotionId);
    if (!promotion) {
      throw jsonError('Promoción no encontrada', 404);
    }

    const now = new Date();

    // ── 2. status must be ACTIVE ────────────────────────────────────
    if (promotion.status !== 'ACTIVE') {
      throw jsonError('Esta promoción no está disponible', 400);
    }

    // ── 3. endDate in the past → expired ────────────────────────────
    // (Checked before startDate so the user sees the most relevant reason
    // first: a promo that has both started-and-ended is "expired", not
    // "not yet begun".)
    if (promotion.endDate !== null && promotion.endDate < now) {
      throw jsonError('Esta promoción ya expiró', 400);
    }

    // ── 4. startDate in the future → not yet begun ──────────────────
    if (promotion.startDate !== null && promotion.startDate > now) {
      throw jsonError('Esta promoción aún no ha comenzado', 400);
    }

    // ── 5. Sold out (redemptionCount >= maxRedemptions) ─────────────
    if (
      promotion.maxRedemptions !== null &&
      promotion.redemptionCount >= promotion.maxRedemptions
    ) {
      throw jsonError('Esta promoción está agotada', 400);
    }

    // ── 6. Already claimed by this user → 409 ───────────────────────
    // We check BEFORE the transaction so the common "double-click" case
    // fails fast without opening a tx. The unique constraint
    // [userId, promotionId] is the final guard against races: if two
    // concurrent requests both pass this check, the loser's INSERT
    // inside the tx will fail with P2002 and the whole tx rolls back.
    const existing = await promotionRepository.findRedemptionByUser(
      userId,
      promotionId,
    );
    if (existing) {
      throw jsonError('Ya has reclamado este cupón', 409);
    }

    // ── Atomic write: createRedemption + incrementRedemptionCount ──
    // Both writes are inside the same tx so they commit together or roll
    // back together — the count can never drift from the number of rows.
    const { redemption, updatedPromotion } = await db.$transaction(async (tx) => {
      const redemption = await promotionRepository.createRedemption(
        { userId, promotionId },
        tx,
      );
      const updatedPromotion = await promotionRepository.incrementRedemptionCount(
        promotionId,
        tx,
      );
      return { redemption, updatedPromotion };
    });

    // `updatedPromotion` is the row AFTER the increment. We map it to the
    // public Offer shape so the client can patch its cached establishment
    // detail page (offers[].redemptionCount went up by 1).
    const businessId = promotion.business.id;
    const offer = transformPromotion(updatedPromotion, businessId);

    return {
      redemption: {
        id: redemption.id,
        userId: redemption.userId,
        promotionId: redemption.promotionId,
        status: redemption.status,
        claimedAt: redemption.claimedAt.toISOString(),
      },
      promotion: {
        id: updatedPromotion.id,
        title: updatedPromotion.title,
        description: updatedPromotion.description,
        price: updatedPromotion.price,
        discount: updatedPromotion.discount,
        image: updatedPromotion.image,
        code: updatedPromotion.code,
        startDate: updatedPromotion.startDate
          ? updatedPromotion.startDate.toISOString()
          : null,
        endDate: updatedPromotion.endDate
          ? updatedPromotion.endDate.toISOString()
          : null,
        maxRedemptions: updatedPromotion.maxRedemptions,
        redemptionCount: updatedPromotion.redemptionCount,
        status: updatedPromotion.status,
      },
      offer,
      code: updatedPromotion.code ?? '',
    };
  },

  /**
   * List all coupons claimed by the user, each annotated with the
   * transformed `offer` (frontend Offer shape) and `establishment`
   * (frontend Establishment shape) so the ProfilePage can render
   * the coupon card with the business name + a link back to the
   * detail page.
   *
   * Returns: Array<MyRedemptionEntry>
   */
  listMyRedemptions: async (
    userId: string,
  ): Promise<MyRedemptionEntry[]> => {
    const redemptions = await promotionRepository.listRedemptionsByUser(userId);
    return redemptions.map((r: CouponRedemptionWithPromotion) => ({
      id: r.id,
      status: r.status,
      claimedAt: r.claimedAt.toISOString(),
      promotion: {
        ...transformPromotion(r.promotion, r.promotion.business.id),
        business: {
          id: r.promotion.business.id,
          name: r.promotion.business.name,
          slug: r.promotion.business.slug,
          address: r.promotion.business.address,
        },
      },
    }));
  },

  /**
   * Batch check: given a list of promotion IDs, return a
   * `Record<promotionId, boolean>` indicating which ones the user has
   * already claimed.
   *
   * Implementation: a single DB round-trip with an IN-clause on
   * promotionId (see `findClaimedPromotionIds`), then map each requested
   * id to a boolean. Cap at 200 IDs to avoid unbounded IN-style scans
   * (same cap as `/api/favorites/check`).
   */
  checkRedemptions: async (
    userId: string,
    promotionIds: string[],
  ): Promise<Record<string, boolean>> => {
    if (promotionIds.length === 0) return {};
    const claimedSet = await promotionRepository.findClaimedPromotionIds(
      userId,
      promotionIds,
    );
    const result: Record<string, boolean> = {};
    for (const id of promotionIds) {
      result[id] = claimedSet.has(id);
    }
    return result;
  },
};
