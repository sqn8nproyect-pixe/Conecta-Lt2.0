'use client';

import { create } from 'zustand';
import type {
  AppNotification,
  BookingData,
  Establishment,
  MatchAnswers,
  Review,
  User,
  View,
} from './types';
import { establishments, initialReviews, mockGoogleUser } from './data';

interface DynamicRating {
  avg: number;
  count: number;
}

interface AppState {
  // Navigation
  view: View;
  selectedEstablishmentId: number | null;
  selectedMapEstablishment: Establishment | null;

  // Auth
  user: User | null;

  // Reviews
  reviews: Review[];

  // Favorites
  favorites: number[];

  // Notifications
  notifications: AppNotification[];

  // Actions: navigation
  setView: (view: View) => void;
  goToDetail: (id: number) => void;
  setSelectedMapEstablishment: (est: Establishment | null) => void;

  // Actions: auth
  loginWithGoogle: () => void;
  logout: () => void;

  // Actions: reviews
  addReview: (estId: number, rating: number, comment: string) => boolean;
  getDynamicRating: (estId: number) => DynamicRating;

  // Actions: favorites
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;

  // Actions: notifications
  addNotification: (message: string, type?: 'success' | 'info') => void;
  dismissNotification: (id: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home',
  selectedEstablishmentId: null,
  selectedMapEstablishment: null,
  user: null,
  reviews: initialReviews,
  favorites: [],
  notifications: [],

  setView: (view) => set({ view }),
  goToDetail: (id) =>
    set({ view: 'detail', selectedEstablishmentId: id }),
  setSelectedMapEstablishment: (est) => set({ selectedMapEstablishment: est }),

  loginWithGoogle: () => {
    set({ user: mockGoogleUser });
    get().addNotification('¡Sesión iniciada con éxito via Google!');
  },
  logout: () => {
    set({ user: null });
    get().addNotification('Sesión cerrada correctamente.', 'info');
  },

  addReview: (estId, rating, comment) => {
    const { user, reviews } = get();
    if (!user) return false;

    const existing = reviews.find(
      (r) => r.establishmentId === estId && r.userId === user.id,
    );
    if (existing) return false;

    const newReview: Review = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      establishmentId: estId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      rating,
      comment,
      date: new Date().toISOString().split('T')[0],
    };

    set({ reviews: [newReview, ...reviews] });
    get().addNotification('¡Reseña publicada! Gracias por tu opinión.');
    return true;
  },

  getDynamicRating: (estId) => {
    const { reviews } = get();
    const estReviews = reviews.filter((r) => r.establishmentId === estId);
    const est = establishments.find((e) => e.id === estId);
    if (!est) return { avg: 0, count: 0 };
    if (estReviews.length === 0) {
      return { avg: est.avgRating, count: est.reviewCount };
    }
    const totalRating = estReviews.reduce((sum, r) => sum + r.rating, 0);
    const weightedAvg =
      (est.avgRating * est.reviewCount + totalRating) /
      (est.reviewCount + estReviews.length);
    return {
      avg: parseFloat(weightedAvg.toFixed(1)),
      count: est.reviewCount + estReviews.length,
    };
  },

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

  toggleFavorite: (id) => {
    const { favorites, addNotification } = get();
    const est = establishments.find((e) => e.id === id);
    const isFav = favorites.includes(id);
    set({
      favorites: isFav
        ? favorites.filter((f) => f !== id)
        : [...favorites, id],
    });
    if (est) {
      addNotification(
        isFav
          ? `Eliminado de favoritos: ${est.name}`
          : `¡Añadido a favoritos!: ${est.name}`,
        isFav ? 'info' : 'success',
      );
    }
  },

  isFavorite: (id) => get().favorites.includes(id),

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));

// Matchmaker helpers (pure functions, no state needed)
export function calculateMatch(
  ans: MatchAnswers,
  allEstablishments: Establishment[],
): Establishment {
  if (ans.mood === 'party') {
    const clubs = allEstablishments.filter((e) => e.category === 'discoteca');
    if (ans.budget === 'premium') {
      return clubs.find((c) => c.id === 3 || c.id === 21) || clubs[0];
    }
    return clubs.find((c) => c.id === 15 || c.id === 6) || clubs[0];
  }
  // chill
  if (ans.company === 'couple') {
    const tascas = allEstablishments.filter((e) => e.category === 'tasca');
    return tascas.find((t) => t.id === 2 || t.id === 17) || tascas[0];
  }
  // friends / group
  if (ans.budget === 'premium') {
    return allEstablishments.find((e) => e.id === 7 || e.id === 19) || allEstablishments[0];
  }
  return (
    allEstablishments.find((e) => e.id === 5 || e.id === 11 || e.id === 1) ||
    allEstablishments[0]
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
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '20:00',
    guests: '2',
    dealId: '',
  };
}
