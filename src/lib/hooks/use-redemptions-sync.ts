'use client';

/**
 * useRedemptionsSync — Bootstrap hook that syncs the Zustand
 * `redeemedPromotionIds` array with the backend. MUST be mounted exactly
 * ONCE per page tree (the Navbar does this) so the store stays hydrated
 * with the server's view of the user's claimed coupons.
 *
 * Other components that need to claim/read coupons should use
 * `useRedemptionActions()` instead — it has no side effects and is safe
 * to mount anywhere.
 *
 * When the user is not logged in, `redeemedPromotionIds` stays empty.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import { fetchMyRedemptions } from '@/lib/api';

export const REDEMPTIONS_QUERY_KEY = ['my-redemptions'] as const;

export function useRedemptionsSync() {
  const { data: session, status } = useSession();

  const setUser = useAppStore((s) => s.setUser);
  const setRedeemedPromotionIds = useAppStore((s) => s.setRedeemedPromotionIds);

  // ── 1. Mirror the NextAuth session into the Zustand store ──────────
  // (useFavoritesSync already does this, but mounting this hook without
  // the same mirror would cause a render-order race on first paint:
  // actions in useRedemptionActions() check store.user, so we need it
  // hydrated here too. zustand dedupes the set, so it's a no-op when
  // the favorites hook already ran.)
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated' && session?.user) {
      const u = session.user;
      setUser({
        id: u.id,
        name: u.name ?? '',
        email: u.email ?? '',
        avatar: u.image ?? '',
      });
    } else {
      setUser(null);
    }
  }, [session, status, setUser]);

  // ── 2. Fetch redemptions when the user is authenticated ───────────
  const { data: serverRedemptions = [] } = useQuery({
    queryKey: REDEMPTIONS_QUERY_KEY,
    queryFn: fetchMyRedemptions,
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  // Sync server redemption IDs → store. Only fire when the set of IDs
  // actually changes (compare as a sorted string) to avoid render loops
  // when multiple components mount useRedemptionsSync.
  useEffect(() => {
    if (status !== 'authenticated') {
      const current = useAppStore.getState().redeemedPromotionIds;
      if (current.length > 0) setRedeemedPromotionIds([]);
      return;
    }
    const incoming = serverRedemptions
      .map((r) => r.promotion.id)
      .sort()
      .join('|');
    const currentSorted = useAppStore.getState().redeemedPromotionIds
      .slice()
      .sort()
      .join('|');
    if (incoming !== currentSorted) {
      setRedeemedPromotionIds(serverRedemptions.map((r) => r.promotion.id));
    }
  }, [serverRedemptions, status, setRedeemedPromotionIds]);
}
