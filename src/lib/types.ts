// CONECTA-LT — Type definitions

export type Category = 'licorería' | 'tasca' | 'discoteca';

export type PriceRange = '$' | '$$' | '$$$';

export interface SubRatings {
  ambiente: number;
  servicio: number;
  precioCalidad: number;
}

export interface SocialMedia {
  /** Full URL to the Instagram profile (https://instagram.com/handle) */
  instagram?: string;
  /** Full URL to the TikTok profile */
  tiktok?: string;
  /** Full URL to the Facebook page */
  facebook?: string;
}

export interface ActivePromotion {
  /** Short label, e.g. "2x1 en Cócteles" */
  label: string;
  /** ISO date string (YYYY-MM-DD) until which the promo is valid */
  validUntil: string;
}

export interface Establishment {
  id: number;
  name: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  /** Legacy handle (e.g. "@eldoradolt"). Kept for backwards-compat with existing UI. */
  instagram: string;
  coverImage: string;
  /** Legacy array (2-3 photos). Kept for backwards-compat with the hero slider. */
  images: string[];
  avgRating: number;
  reviewCount: number;
  priceRange: PriceRange;
  schedule: string;
  subRatings: SubRatings;

  // ─── NEW: enriched fields (Fichas Enriquecidas) ─────────────────────────
  /** Distinctive specialty tag, e.g. "Coctelería de Autor", "Whiskies Añejos" */
  specialty: string;
  /** Hook phrase that differentiates this establishment from the competition */
  valueProposition: string;
  /** Exactly 10 photo URLs used by the immersive PhotoGallery component */
  gallery: string[];
  /** Official website URL (optional) */
  website?: string;
  /** Social media profile URLs (each one optional) */
  socialMedia: SocialMedia;
  /** If present, the home card shows a pulsing "PROMO ACTIVA" badge */
  activePromotion?: ActivePromotion;
}

export interface Offer {
  id: number;
  establishmentId: number;
  title: string;
  description: string;
  price: string;
  discount: string;
  image: string;
  code: string;
}

export interface Review {
  id: number;
  establishmentId: number;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export type View = 'home' | 'map' | 'detail' | 'profile';

export type NotificationType = 'success' | 'info';

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
}

export interface MatchAnswers {
  mood: '' | 'chill' | 'party';
  company: '' | 'couple' | 'friends';
  budget: '' | 'low' | 'premium';
}

export interface BookingData {
  name: string;
  date: string;
  time: string;
  guests: string;
  dealId: string;
}
