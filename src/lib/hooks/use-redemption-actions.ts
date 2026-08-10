'use client';

/**
 * useRedemptionActions — Lightweight hook that gives components access to
 * the `redeem` action and `isRedeemed` / `isRedeeming` readers WITHOUT
 * mounting any of the bootstrap effects. Safe to mount in any number of
 * components.
 *
 * The actual server sync (fetching + mirroring into the Zustand store)
 * is done by `useRedemptionsSync()` mounted once in the Navbar.
 *
 * Pattern (mirrors useFavoriteActions):
 *   1. Optimistically add the promotionId to the store.
 *   2. Fire the POST /api/promotions/[id]/redeem request.
 *   3. On success: invalidate the relevant React Query caches so
 *      EstablishmentPage / ProfilePage / HomePage re-fetch fresh
 *      `redemptionCount` values; notify with the code.
 *   4. On error: roll back the optimistic add and surface the server's
 *      error message (e.g. "Ya has reclamado este cupón", "Esta
 *      promoción ya expiró", "está agotada").
 */

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import { redeemPromotion } from '@/lib/api';
import { REDEMPTIONS_QUERY_KEY } from './use-redemptions-sync';

export function useRedemptionActions() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  const addRedeemedPromotionId = useAppStore((s) => s.addRedeemedPromotionId);
  const removeRedeemedPromotionId = useAppStore(
    (s) => s.removeRedeemedPromotionId,
  );
  const addNotification = useAppStore((s) => s.addNotification);

  // Per-instance set of promotion IDs currently being redeemed — drives the
  // "RECLAMANDO…" + spinner state on the offer buttons.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const redeem = useCallback(
    async (promotionId: string, promoTitle: string): Promise<boolean> => {
      if (status !== 'authenticated') {
        addNotification('Inicia sesión para reclamar cupones.', 'info');
        return false;
      }
      // Already claimed? Short-circuit (defensive — the UI hides the button).
      if (useAppStore.getState().redeemedPromotionIds.includes(promotionId)) {
        return true;
      }

      // Optimistic update + mark as pending.
      addRedeemedPromotionId(promotionId);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(promotionId);
        return next;
      });

      try {
        const data = await redeemPromotion(promotionId);
        // The backend returns the updated promotion with the bumped
        // redemptionCount. Invalidate the business caches so the
        // AGOTADO badge (if any) and the X/Y counter refresh.
        queryClient.invalidateQueries({ queryKey: ['businesses'] });
        queryClient.invalidateQueries({ queryKey: ['business'] });
        queryClient.invalidateQueries({ queryKey: REDEMPTIONS_QUERY_KEY });
        const code = data?.promotion?.code ?? data?.redemption?.promotion?.code;
        addNotification(
          code
            ? `¡Cupón activado!: ${code}`
            : `¡Cupón activado!: ${promoTitle}`,
        );
        return true;
      } catch (err) {
        // Roll back the optimistic add.
        removeRedeemedPromotionId(promotionId);
        const msg = err instanceof Error ? err.message : '';
        addNotification(
          msg === 'NOT_AUTHENTICATED'
            ? 'Inicia sesión para reclamar cupones.'
            : msg || 'No se pudo reclamar el cupón. Intenta de nuevo.',
          'info',
        );
        return false;
      } finally {
        setPendingIds((prev) => {
          if (!prev.has(promotionId)) return prev;
          const next = new Set(prev);
          next.delete(promotionId);
          return next;
        });
      }
    },
    [
      status,
      addNotification,
      addRedeemedPromotionId,
      removeRedeemedPromotionId,
      queryClient,
    ],
  );

  const isRedeemed = useCallback(
    (promotionId: string) =>
      useAppStore.getState().redeemedPromotionIds.includes(promotionId),
    [],
  );

  const isRedeeming = useCallback(
    (promotionId: string) => pendingIds.has(promotionId),
    [pendingIds],
  );

  return { redeem, isRedeemed, isRedeeming };
}
