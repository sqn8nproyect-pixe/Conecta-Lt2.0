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
import { mockGoogleUser } from './data';

interface AppState {
  // Navigation
  view: View;
  selectedEstablishmentSlug: string | null;
  selectedMapEstablishment: Establishment | null;

  // Auth (mock — Etapa 2 reemplaza con Auth.js + Google OAuth)
  user: User | null;

  // Favorites (local state — Etapa 2 persiste en DB)
  favorites: string[];

  // Notifications
  notifications: AppNotification[];

  // Actions: navigation
  setView: (view: View) => void;
  goToDetail: (slug: string) => void;
  setSelectedMapEstablishment: (est: Establishment | null) => void;

  // Actions: auth
  loginWithGoogle: () => void;
  logout: () => void;

  // Actions: favorites
  toggleFavorite: (id: string, name?: string) => void;
  isFavorite: (id: string) => boolean;

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

  loginWithGoogle: () => {
    set({ user: mockGoogleUser });
    get().addNotification('¡Sesión iniciada con éxito via Google!');
  },
  logout: () => {
    set({ user: null });
    get().addNotification('Sesión cerrada correctamente.', 'info');
  },

  toggleFavorite: (id, name) => {
    const { favorites, addNotification } = get();
    const isFav = favorites.includes(id);
    set({
      favorites: isFav
        ? favorites.filter((f) => f !== id)
        : [...favorites, id],
    });
    if (name) {
      addNotification(
        isFav
          ? `Eliminado de favoritos: ${name}`
          : `¡Añadido a favoritos!: ${name}`,
        isFav ? 'info' : 'success',
      );
    }
  },

  isFavorite: (id) => get().favorites.includes(id),

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
