// CONECTA-LT — Type definitions

export type Category = 'licorería' | 'tasca' | 'discoteca';

export type PriceRange = '$' | '$$' | '$$$';

export interface SubRatings {
  ambiente: number;
  servicio: number;
  precioCalidad: number;
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
  instagram: string;
  coverImage: string;
  images: string[];
  avgRating: number;
  reviewCount: number;
  priceRange: PriceRange;
  schedule: string;
  subRatings: SubRatings;
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

export type View = 'home' | 'map' | 'detail';

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
