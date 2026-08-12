'use client';

import { create } from 'zustand';
import type {
  AppNotification,
  BookingData,
  Establishment,
  PersistentNotification,
  Reservation,
  User,
  View,
} from './types';

interface AppState {
  // Navigation
  view: View;
  selectedEstablishmentSlug: string | null;
  selectedMapEstablishment: Establishment | null;

  // Auth — hydrated from NextAuth useSession() in the Navbar.
  // `authUserId` is set when logged in; null when logged out.
  user: User | null;

  // Favorites — keyed by business SLUG (stable across re-seeds).
  // When logged out, this is session-only memory.
  // When logged in, the Navbar hydrates it from /api/favorites on mount
  // and toggleFavorite() fires the API mutation.
  favorites: string[];

  // Redeemed promotion IDs — Etapa 4 persistent coupons.
  // Mirrors the user's CouponRedemption rows on the server (hydrated by
  // useRedemptionsSync in the Navbar). Used by EstablishmentPage to mark
  // an offer as already claimed without an extra round-trip, and to drive
  // the optimistic update while the redeem() request is in flight.
  redeemedPromotionIds: string[];

  // Reservations — Etapa 5 persistent bookings.
  // Mirrors the user's Reservation rows on the server (hydrated by
  // useReservationsSync in the Navbar). Drives the MIS RESERVAS section
  // in the ProfilePage so a reload / re-login keeps the user's bookings.
  reservations: Reservation[];

  // Notifications — ephemeral toasts (auto-dismiss after 4s).
  // Used for transient feedback like "¡Reserva confirmada!" — NOT
  // for the persistent inbox (see `persistentNotifications` below).
  notifications: AppNotification[];

  // Persistent notifications (Etapa 7.A) — DB-backed inbox of important
  // events for the user (reservation confirmed, coupon redeemed, review
  // published…). Hydrated by `useNotificationsSync` in the Navbar.
  // Survives across sessions (unlike the ephemeral `notifications`
  // array above). The Navbar's bell icon shows the unread count badge
  // and a dropdown with the latest entries.
  persistentNotifications: PersistentNotification[];

  // Actions: navigation
  setView: (view: View) => void;
  goToDetail: (slug: string) => void;
  setSelectedMapEstablishment: (est: Establishment | null) => void;

  // Actions: auth — called by the Navbar after useSession resolves.
  setUser: (user: User | null) => void;
  setFavorites: (slugs: string[]) => void;
  addFavoriteLocal: (slug: string) => void;
  removeFavoriteLocal: (slug: string) => void;

  // Actions: coupon redemptions (Etapa 4) — same pattern as favorites.
  setRedeemedPromotionIds: (ids: string[]) => void;
  addRedeemedPromotionId: (id: string) => void;
  removeRedeemedPromotionId: (id: string) => void;

  // Actions: reservations (Etapa 5) — singleton bootstrap hydrates the
  // array from /api/reservations on login. createReservation() and
  // cancelReservation() invalidate the query so the array re-syncs.
  setReservations: (r: Reservation[]) => void;

  // Actions: notifications (ephemeral)
  addNotification: (message: string, type?: 'success' | 'info') => void;
  dismissNotification: (id: number) => void;

  // Actions: persistent notifications (Etapa 7.A)
  setPersistentNotifications: (n: PersistentNotification[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  selectedEstablishmentSlug: null,
  selectedMapEstablishment: null,
  user: null,
  favorites: [],
  redeemedPromotionIds: [],
  reservations: [],
  notifications: [],
  persistentNotifications: [],

  setView: (view) => set({ view }),
  goToDetail: (slug) =>
    set({ view: 'detail', selectedEstablishmentSlug: slug }),
  setSelectedMapEstablishment: (est) => set({ selectedMapEstablishment: est }),

  setUser: (user) => {
    const prev = get().user;
    if (prev?.id === user?.id) {
      // same user — just update fields (e.g. avatar refresh).
      // Preserve `role` if the incoming user object omitted it
      // (defensive: multiple hooks mirror the session into the store
      // and not all of them remember to pass `role` — see Etapa 7.C
      // where this race caused the "Mis Locales" nav item to disappear).
      if (user) {
        const merged = prev?.role && !user.role ? { ...user, role: prev.role } : user;
        set({ user: merged });
      }
      return;
    }
    // user changed (login/logout/switch) — clear local favorites AND
    // redeemed promotion IDs AND reservations AND persistent
    // notifications so the Navbar's useQuery hooks can re-hydrate
    // from /api/favorites, /api/promotions/redeemed, /api/reservations
    // and /api/notifications.
    set({
      user,
      favorites: [],
      redeemedPromotionIds: [],
      reservations: [],
      persistentNotifications: [],
    });
  },
  setFavorites: (slugs) => set({ favorites: slugs }),
  addFavoriteLocal: (slug) =>
    set((s) =>
      s.favorites.includes(slug)
        ? s
        : { favorites: [...s.favorites, slug] },
    ),
  removeFavoriteLocal: (slug) =>
    set((s) => ({ favorites: s.favorites.filter((f) => f !== slug) })),

  setRedeemedPromotionIds: (ids) => set({ redeemedPromotionIds: ids }),
  addRedeemedPromotionId: (id) =>
    set((s) =>
      s.redeemedPromotionIds.includes(id)
        ? s
        : { redeemedPromotionIds: [...s.redeemedPromotionIds, id] },
    ),
  removeRedeemedPromotionId: (id) =>
    set((s) => ({
      redeemedPromotionIds: s.redeemedPromotionIds.filter((x) => x !== id),
    })),

  setReservations: (r) => set({ reservations: r }),

  addNotification: (message, type = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((s) => ({ notifications: [...s.notifications, { id, message, type }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
      }, 4000);
    }
  },

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setPersistentNotifications: (n) => set({ persistentNotifications: n }),
}));

// ── Favorites selector (used by cards) ──────────────────────
// Components call useAppStore(isFavorite(slug)) to read the heart state.

export function isFavorite(slug: string): (s: AppState) => boolean {
  return (s) => s.favorites.includes(slug);
}

export function generateReservationCode(): string {
  return (
    'LT-' +
    Math.floor(1000 + Math.random() * 9000) +
    '-' +
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  );
}

export function defaultBookingData(user: User | null): BookingData {
  return {
    name: user ? user.name : '',
    phone: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0] ?? '',
    time: '20:00',
    guests: '2',
    notes: '',
    dealId: '',
    dealTitle: '',
  };
}
