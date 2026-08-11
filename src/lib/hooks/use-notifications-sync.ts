'use client';

/**
 * useNotificationsSync — Bootstrap hook that syncs the Zustand
 * `persistentNotifications` array with the backend. MUST be mounted
 * exactly ONCE per page tree (the Navbar does this) so the store stays
 * hydrated with the server's view of the user's notification inbox.
 *
 * Other components that need to mark notifications as read should use
 * `useNotificationActions()` instead — it has no side effects and is
 * safe to mount anywhere.
 *
 * When the user is not logged in, `persistentNotifications` stays empty.
 *
 * Mirrors the patterns established by `useFavoritesSync` (Etapa 2),
 * `useRedemptionsSync` (Etapa 4) and `useReservationsSync` (Etapa 5).
 *
 * Two extra behaviors vs. the other sync hooks:
 *   - 30s staleTime (same as the others) keeps the badge fresh.
 *   - On `window.focus` we invalidate the query so the user sees new
 *     notifications without manually refreshing — important for an
 *     "inbox" surface that the user might keep open in a background tab.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';

export const NOTIFICATIONS_QUERY_KEY = ['my-notifications'] as const;

export function useNotificationsSync() {
  const { status } = useSession();
  const setPersistentNotifications = useAppStore(
    (s) => s.setPersistentNotifications,
  );
  const queryClient = useQueryClient();

  // ── 1. Fetch notifications when the user is authenticated ───────
  // 30s staleTime so the badge stays reasonably fresh without
  // hammering the server. The window-focus handler below covers the
  // "user comes back to the tab after 10 minutes" case.
  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchMyNotifications,
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  // ── 2. Sync server → store ─────────────────────────────────────
  // Whenever the query resolves (or refetches with new data), mirror
  // the result into the Zustand store so the Navbar dropdown can read
  // it without subscribing to React Query directly.
  useEffect(() => {
    if (data) setPersistentNotifications(data);
  }, [data, setPersistentNotifications]);

  // ── 3. Clear on logout ────────────────────────────────────────
  // When the user logs out (or the session is still loading), reset
  // both the store and the React Query cache so a subsequent login
  // by a different user doesn't briefly show the previous user's
  // notifications.
  useEffect(() => {
    if (status !== 'authenticated') {
      setPersistentNotifications([]);
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, []);
    }
  }, [status, setPersistentNotifications, queryClient]);

  // ── 4. Refetch on window focus ────────────────────────────────
  // An "inbox" surface benefits from freshness: if the user keeps the
  // tab open in the background and comes back 5 minutes later, we
  // want them to see any new notifications without a manual refresh.
  useEffect(() => {
    const handler = () => {
      if (status === 'authenticated') {
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      }
    };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [status, queryClient]);
}

/**
 * useNotificationActions — Lightweight hook that gives the Navbar
 * dropdown (or any other component) access to `markAsRead(id)` and
 * `markAllAsRead()` WITHOUT mounting any of the bootstrap effects.
 * Safe to mount in any number of components.
 *
 * Both actions are optimistic:
 *   1. Flip the `read` flag in the store IMMEDIATELY so the UI
 *      updates without waiting for the network.
 *   2. Fire the POST request.
 *   3. On success: invalidate the `['my-notifications']` query so the
 *      server's source of truth replaces our optimistic snapshot.
 *   4. On error: roll back to the previous snapshot and surface the
 *      error (the caller decides how — typically via the ephemeral
 *      `addNotification` toast).
 */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const persistentNotifications = useAppStore(
    (s) => s.persistentNotifications,
  );
  const setPersistentNotifications = useAppStore(
    (s) => s.setPersistentNotifications,
  );

  const markAsRead = async (id: string) => {
    // Snapshot for rollback.
    const snapshot = persistentNotifications;

    // Optimistic update — flip the matched notification to read=true
    // in the store so the gold dot disappears instantly.
    setPersistentNotifications(
      snapshot.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    try {
      await markNotificationRead(id);
      // Invalidate so the server's source of truth replaces our
      // optimistic snapshot (catches any drift, e.g. a concurrent
      // "mark all read" from another tab).
      await queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
    } catch (e) {
      // Roll back on error — restore the exact previous array.
      setPersistentNotifications(snapshot);
      // Re-throw so the caller can surface the error (typically via
      // the ephemeral addNotification toast).
      throw e;
    }
  };

  const markAllAsRead = async () => {
    // Snapshot for rollback.
    const snapshot = persistentNotifications;

    // Optimistic — flip every unread notification to read=true.
    setPersistentNotifications(snapshot.map((n) => ({ ...n, read: true })));

    try {
      await markAllNotificationsRead();
      await queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
    } catch (e) {
      setPersistentNotifications(snapshot);
      throw e;
    }
  };

  return { markAsRead, markAllAsRead };
}
