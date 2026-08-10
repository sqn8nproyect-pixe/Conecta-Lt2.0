'use client';

/**
 * useFavoritesSync — Bootstrap hook that syncs the Zustand `favorites`
 * array with the backend. MUST be mounted exactly ONCE per page tree
 * (the Navbar does this) so the store stays hydrated with the server's
 * view of the user's favorites.
 *
 * Other components that just need to toggle/read favorites should use
 * `useFavoriteActions()` instead — it has no side effects and is safe
 * to mount anywhere.
 *
 * When the user is not logged in, `favorites` stays empty.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import { fetchFavorites, toggleFavorite } from '@/lib/api';

const FAVORITES_QUERY_KEY = ['favorites'] as const;

export function useFavoritesSync() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const setUser = useAppStore((s) => s.setUser);
  const setFavorites = useAppStore((s) => s.setFavorites);
  const addFavoriteLocal = useAppStore((s) => s.addFavoriteLocal);
  const removeFavoriteLocal = useAppStore((s) => s.removeFavoriteLocal);
  const addNotification = useAppStore((s) => s.addNotification);

  // ── 1. Mirror the NextAuth session into the Zustand store ────────
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

  // ── 2. Fetch favorites when the user is authenticated ────────────
  const { data: serverFavorites = [] } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: fetchFavorites,
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  // Sync server favorites → store. Only fire when the set of slugs
  // actually changes (compare as a sorted string) to avoid render loops
  // when multiple components mount useFavoritesSync.
  useEffect(() => {
    if (status !== 'authenticated') {
      // Clear when logged out
      const current = useAppStore.getState().favorites;
      if (current.length > 0) setFavorites([]);
      return;
    }
    // Stable comparison: sorted comma-joined string of slugs.
    const incoming = serverFavorites
      .map((b) => b.slug)
      .sort()
      .join('|');
    const currentSorted = useAppStore.getState().favorites.slice().sort().join('|');
    if (incoming !== currentSorted) {
      setFavorites(serverFavorites.map((b) => b.slug));
    }
  }, [serverFavorites, status, setFavorites]);

  // ── 3. Toggle mutation with optimistic update ────────────────────
  const toggleMutation = useMutation({
    mutationFn: (slug: string) => toggleFavorite(slug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const snapshot = queryClient.getQueryData<{ slug: string }[]>(
        FAVORITES_QUERY_KEY,
      );
      const isFav = useAppStore.getState().favorites.includes(slug);
      if (isFav) {
        removeFavoriteLocal(slug);
      } else {
        addFavoriteLocal(slug);
      }
      return { snapshot, wasFavorited: isFav };
    },
    onError: (_err, slug, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, ctx.snapshot);
      }
      if (ctx?.wasFavorited) {
        addFavoriteLocal(slug);
      } else {
        removeFavoriteLocal(slug);
      }
      addNotification(
        _err.message === 'NOT_AUTHENTICATED'
          ? 'Inicia sesión para guardar favoritos.'
          : 'No se pudo actualizar el favorito. Intenta de nuevo.',
        'info',
      );
    },
    onSuccess: (data, slug) => {
      queryClient.setQueryData<{ slug: string }[]>(
        FAVORITES_QUERY_KEY,
        (old = []) => {
          const exists = old.some((b) => b.slug === slug);
          if (data.favorited) {
            if (exists) return old;
            return [...old, { slug }];
          }
          return old.filter((b) => b.slug !== slug);
        },
      );
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  // Exposed for the Navbar to forward to children via React context if
  // needed. Most components should use useFavoriteActions() instead.
  return {
    toggle: (slug: string, name?: string) => {
      if (status !== 'authenticated') {
        addNotification('Inicia sesión para guardar tus favoritos.', 'info');
        return;
      }
      const isFav = useAppStore.getState().favorites.includes(slug);
      addNotification(
        isFav
          ? `Eliminado de favoritos${name ? `: ${name}` : ''}`
          : `¡Añadido a favoritos!${name ? `: ${name}` : ''}`,
        isFav ? 'info' : 'success',
      );
      toggleMutation.mutate(slug);
    },
    isPending: toggleMutation.isPending,
  };
}
