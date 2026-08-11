'use client';

/**
 * useReservationsSync — Bootstrap hook that syncs the Zustand
 * `reservations` array with the backend. MUST be mounted exactly
 * ONCE per page tree (the Navbar does this) so the store stays
 * hydrated with the server's view of the user's bookings.
 *
 * Other components that need to create/cancel reservations should use
 * `useReservationActions()` instead — it has no side effects and is
 * safe to mount anywhere.
 *
 * When the user is not logged in, `reservations` stays empty.
 *
 * Mirrors the patterns already established by `useFavoritesSync`
 * (Etapa 2) and `useRedemptionsSync` (Etapa 4).
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import { fetchMyReservations } from '@/lib/api';

export const RESERVATIONS_QUERY_KEY = ['my-reservations'] as const;

export function useReservationsSync() {
  const { data: session, status } = useSession();

  const setUser = useAppStore((s) => s.setUser);
  const setReservations = useAppStore((s) => s.setReservations);

  // ── 1. Mirror the NextAuth session into the Zustand store ──────────
  // (useFavoritesSync already does this, but mounting this hook without
  // the same mirror would cause a render-order race on first paint:
  // actions in useReservationActions() check store.user, so we need it
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
        role: u.role ?? 'USER',
      });
    } else {
      setUser(null);
    }
  }, [session, status, setUser]);

  // ── 2. Fetch reservations when the user is authenticated ──────────
  const { data: serverReservations = [] } = useQuery({
    queryKey: RESERVATIONS_QUERY_KEY,
    queryFn: fetchMyReservations,
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  // Sync server reservations → store. Only fire when the set of IDs
  // actually changes (compare as a sorted string) to avoid render loops
  // when multiple components mount useReservationsSync.
  useEffect(() => {
    if (status !== 'authenticated') {
      const current = useAppStore.getState().reservations;
      if (current.length > 0) setReservations([]);
      return;
    }
    const incoming = serverReservations
      .map((r) => r.id)
      .sort()
      .join('|');
    const currentSorted = useAppStore.getState().reservations
      .map((r) => r.id)
      .sort()
      .join('|');
    if (incoming !== currentSorted) {
      setReservations(serverReservations);
    }
  }, [serverReservations, status, setReservations]);
}
