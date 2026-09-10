'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — usePendingIntent (Sprint 7B: retorno post-login)
//
// Montado UNA vez en page.tsx. Cuando el usuario aterriza con
// sesión activa y existe una intención pendiente en sessionStorage
// (guardada al pedir el login contextual), la completa:
//
//   - favorite → toggle del favorito (auto-ejecutado)
//   - redeem   → canje del cupón (auto-ejecutado)
//   - reserve  → navega a la ficha del local (el usuario reenvía
//                el formulario, que ya viene con sus datos)
//
// Los hooks de acción son "safe to mount in any number of
// components" (ver use-favorite-actions.ts) — se montan aquí para
// ejecutar la mutación sin tocar el Navbar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore, readPendingIntent, savePendingIntent } from '@/lib/store';
import { useFavoriteActions } from '@/lib/hooks/use-favorite-actions';
import { useRedemptionActions } from '@/lib/hooks/use-redemption-actions';

export function usePendingIntent() {
  const { status } = useSession();
  const goToDetail = useAppStore((s) => s.goToDetail);
  const addNotification = useAppStore((s) => s.addNotification);
  const { toggle: toggleFavorite } = useFavoriteActions();
  const { redeem } = useRedemptionActions();
  const processing = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || processing.current) return;

    const intent = readPendingIntent();
    if (!intent) return;

    processing.current = true;
    // Limpiar primero: si la mutación falla, el usuario reintenta
    // manualmente (mejor que un bucle de auto-reintentos).
    savePendingIntent(null);

    switch (intent.type) {
      case 'favorite':
        void toggleFavorite(intent.slug, intent.name);
        break;
      case 'redeem':
        void redeem(intent.promotionId, intent.title);
        break;
      case 'reserve':
        // La reserva necesita nombre/teléfono/fecha del formulario:
        // llevamos al usuario a la ficha para reenviarla (2 clicks),
        // ya autenticado y con sus datos guardados.
        goToDetail(intent.slug);
        addNotification(
          'Sesión iniciada. Completa los datos para confirmar tu reserva.',
          'info',
        );
        break;
    }
  }, [status, goToDetail, addNotification, toggleFavorite, redeem]);
}
