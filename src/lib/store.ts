'use client';

import { create } from 'zustand';
import type {
  AppNotification,
  BookingData,
  Establishment,
  MatchAnswers,
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

  // Notifications
  notifications: AppNotification[];

  // Actions: navigation
  setView: (view: View) => void;
  goToDetail: (slug: string) => void;
  setSelectedMapEstablishment: (est: Establishment | null) => void;

  // Actions: auth — called by the Navbar after useSession resolves.
  setUser: (user: User | null) => void;
  setFavorites: (slugs: string[]) => void;
  addFavoriteLocal: (slug: string) => void;
  removeFavoriteLocal: (slug: string) => void;

  // Actions: notifications
  addNotification: (message: string, type?: 'success' | 'info') => void;
  dismissNotification: (id: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  selectedEstablishmentSlug: null,
  selectedMapEstablishment: null,
  user: null,
  favorites: [],
  notifications: [],

  setView: (view) => set({ view }),
  goToDetail: (slug) =>
    set({ view: 'detail', selectedEstablishmentSlug: slug }),
  setSelectedMapEstablishment: (est) => set({ selectedMapEstablishment: est }),

  setUser: (user) => {
    const prev = get().user;
    if (prev?.id === user?.id) {
      // same user — just update fields (e.g. avatar refresh)
      if (user) set({ user });
      return;
    }
    // user changed (login/logout/switch) — clear local favorites so
    // the Navbar's useQuery can re-hydrate from /api/favorites.
    set({ user, favorites: [] });
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
}));

// ── Favorites selector (used by cards) ──────────────────────
// Components call useAppStore(isFavorite(slug)) to read the heart state.

export function isFavorite(slug: string): (s: AppState) => boolean {
  return (s) => s.favorites.includes(slug);
}

// ── Matchmaker helpers (pure functions) ─────────────────────
// Etapa 5.2 reemplazará esto con scoring real basado en datos.

export function calculateMatch(
  ans: MatchAnswers,
  allEstablishments: Establishment[],
): Establishment {
  if (ans.mood === 'party') {
    const clubs = allEstablishments.filter((e) => e.category === 'discoteca');
    if (ans.budget === 'premium') {
      return clubs.find((c) => c.slug === 'discoteca-eclipse' || c.slug === 'discoteca-royal') ?? clubs[0]!;
    }
    return clubs.find((c) => c.slug === 'discoteca-glamour' || c.slug === 'discoteca-noche-eterna') ?? clubs[0]!;
  }
  // chill
  if (ans.company === 'couple') {
    const tascas = allEstablishments.filter((e) => e.category === 'tasca');
    return tascas.find((t) => t.slug === 'tasca-la-cava' || t.slug === 'tasca-el-patio') ?? tascas[0]!;
  }
  // friends / group
  if (ans.budget === 'premium') {
    return allEstablishments.find((e) => e.slug === 'licoreria-vinos-del-valle' || e.slug === 'licoreria-selecta') ?? allEstablishments[0]!;
  }
  return (
    allEstablishments.find((e) => e.slug === 'tasca-los-amigos' || e.slug === 'tasca-el-sabor' || e.slug === 'licoreria-don-sancho') ??
    allEstablishments[0]!
  );
}

export function getRecommendedDrink(
  ans: MatchAnswers,
  est: Establishment,
): string {
  if (est.category === 'licorería') {
    return ans.budget === 'premium'
      ? 'Whisky Single Malt Escocés 18 años'
      : 'Ron Añejo Reserva Extra Seco';
  }
  if (est.category === 'tasca') {
    return ans.company === 'couple'
      ? 'Jarra de Sangría Frutal Premium en Copa Templada'
      : 'Tobito de Cervezas Polar Negrita Glacial';
  }
  // discoteca
  return ans.budget === 'premium'
    ? 'Servicio de Vodka Premium con Bebida Energizante'
    : 'Cóctel Glamour Blue de la Casa';
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
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0] ?? '',
    time: '20:00',
    guests: '2',
    dealId: '',
  };
}
