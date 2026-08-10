'use client';

/**
 * useReservationActions — Lightweight hook that gives components access to
 * `createReservation` and `cancelReservation` actions WITHOUT mounting
 * any of the bootstrap effects. Safe to mount in any number of components.
 *
 * The actual server sync (fetching + mirroring into the Zustand store)
 * is done by `useReservationsSync()` mounted once in the Navbar.
 *
 * Pattern (mirrors useRedemptionActions from Etapa 4):
 *   1. Fire the POST /api/reservations (or /cancel) request.
 *   2. On success: invalidate the relevant React Query caches so
 *      ProfilePage / EstablishmentPage re-fetch fresh data; notify
 *      with the confirmation code.
 *   3. On error: surface the server's error message (e.g.
 *      "No autenticado", "Negocio no encontrado", validation messages).
 *
 * Cancelling uses an optimistic update of the in-store reservation list
 * (status → CANCELLED) with a rollback if the API call fails. The query
 * invalidation then refreshes from the server as the source of truth.
 */

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useAppStore } from '@/lib/store';
import {
  createReservation as createReservationApi,
  cancelReservation as cancelReservationApi,
} from '@/lib/api';
import type { Reservation } from '@/lib/types';
import { RESERVATIONS_QUERY_KEY } from './use-reservations-sync';

type CreateReservationInput = {
  businessSlug: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  couponRedemptionId?: string;
};

type CreateReservationResult = {
  reservation: Reservation;
  confirmationCode: string;
};

export function useReservationActions() {
  const { status } = useSession();
  const queryClient = useQueryClient();

  const addNotification = useAppStore((s) => s.addNotification);

  // Per-instance set of reservation IDs currently being cancelled — drives
  // the "CANCELANDO…" + spinner state on the CANCELAR button.
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  // Per-instance "creating" flag — drives the loading state inside the
  // booking modal while the POST /api/reservations is in flight.
  const [isCreating, setIsCreating] = useState(false);

  const createReservation = useCallback(
    async (
      input: CreateReservationInput,
    ): Promise<CreateReservationResult | null> => {
      if (status !== 'authenticated') {
        addNotification('Inicia sesión para reservar.', 'info');
        return null;
      }
      setIsCreating(true);
      try {
        const data = await createReservationApi(input);
        // Invalidate every cache that could be affected:
        //  - ['my-reservations'] → ProfilePage MIS RESERVAS section + store
        //  - ['business', slug]  → EstablishmentPage (offer counters, etc.)
        //  - ['businesses']      → HomePage (offer counters, favorites)
        queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
        if (input.businessSlug) {
          queryClient.invalidateQueries({
            queryKey: ['business', input.businessSlug],
          });
        }
        queryClient.invalidateQueries({ queryKey: ['businesses'] });
        addNotification(
          `¡Reserva confirmada! Código: ${data.confirmationCode}`,
        );
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        addNotification(
          msg === 'NOT_AUTHENTICATED'
            ? 'Inicia sesión para reservar.'
            : msg || 'No se pudo crear la reserva. Intenta de nuevo.',
          'info',
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [status, addNotification, queryClient],
  );

  const cancelReservation = useCallback(
    async (id: string): Promise<boolean> => {
      if (status !== 'authenticated') {
        addNotification('Inicia sesión para reservar.', 'info');
        return false;
      }

      // Optimistic update — flip the in-store reservation to CANCELLED
      // so the UI updates instantly. Roll back on error.
      const prev = useAppStore.getState().reservations;
      const optimistic = prev.map((r) =>
        r.id === id ? { ...r, status: 'CANCELLED' as const } : r,
      );
      useAppStore.getState().setReservations(optimistic);

      setCancellingIds((prevSet) => {
        const next = new Set(prevSet);
        next.add(id);
        return next;
      });

      try {
        await cancelReservationApi(id);
        queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
        addNotification('Reserva cancelada', 'info');
        return true;
      } catch (err) {
        // Roll back the optimistic update.
        useAppStore.getState().setReservations(prev);
        const msg = err instanceof Error ? err.message : '';
        addNotification(
          msg === 'NOT_AUTHENTICATED'
            ? 'Inicia sesión para reservar.'
            : msg || 'No se pudo cancelar la reserva. Intenta de nuevo.',
          'info',
        );
        return false;
      } finally {
        setCancellingIds((prevSet) => {
          if (!prevSet.has(id)) return prevSet;
          const next = new Set(prevSet);
          next.delete(id);
          return next;
        });
      }
    },
    [status, addNotification, queryClient],
  );

  const isCancelling = useCallback(
    (id: string) => cancellingIds.has(id),
    [cancellingIds],
  );

  return {
    createReservation,
    cancelReservation,
    isCancelling,
    isCreating,
  };
}
