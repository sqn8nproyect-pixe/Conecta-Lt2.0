'use client';

/**
 * useFavoriteActions — Lightweight hook that gives components access to
 * the favorite `toggle` action and `isFav` reader WITHOUT mounting any
 * of the bootstrap effects. Safe to mount in any number of components.
 *
 * The actual server sync (fetching + mirroring into the Zustand store)
 * is done by `useFavoritesSync()` mounted once in the Navbar.
 *
 * This hook reads `favorites` and `addNotification` from the store, and
 * fires the API mutation directly. On success it updates the local
 * store optimistically; on error it rolls back and notifies.
 */

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import { toggleFavorite } from '@/lib/api';

const FAVORITES_QUERY_KEY = ['favorites'] as const;

export function useFavoriteActions() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  const addFavoriteLocal = useAppStore((s) => s.addFavoriteLocal);
  const removeFavoriteLocal = useAppStore((s) => s.removeFavoriteLocal);
  const addNotification = useAppStore((s) => s.addNotification);

  const toggle = useCallback(
    async (slug: string, name?: string) => {
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
      // Optimistic local update
      if (isFav) {
        removeFavoriteLocal(slug);
      } else {
        addFavoriteLocal(slug);
      }
      try {
        const data = await toggleFavorite(slug);
        // Reconcile the React Query cache so ProfilePage sees the change
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
      } catch (err) {
        // Roll back the optimistic update
        if (isFav) {
          addFavoriteLocal(slug);
        } else {
          removeFavoriteLocal(slug);
        }
        const msg = err instanceof Error ? err.message : '';
        addNotification(
          msg === 'NOT_AUTHENTICATED'
            ? 'Inicia sesión para guardar favoritos.'
            : 'No se pudo actualizar el favorito. Intenta de nuevo.',
          'info',
        );
      }
    },
    [status, addNotification, addFavoriteLocal, removeFavoriteLocal, queryClient],
  );

  const isFav = useCallback(
    (slug: string) => useAppStore.getState().favorites.includes(slug),
    [],
  );

  return { toggle, isFav };
}
