// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Business Service Layer
// Transforms Prisma models → frontend types
// ─────────────────────────────────────────────────────────────

import type {
  Business,
  Category,
  BusinessHours,
  BusinessSocial,
  BusinessImage,
  Promotion,
  Review as PrismaReview,
  User,
} from '@prisma/client';
import type {
  Establishment,
  Offer,
  Review,
  Category as FrontendCategory,
  PriceRange,
  SocialMedia,
} from '@/lib/types';

// ─── Schedule helpers ──────────────────────────────────────

// 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
// Monday-first ordering so contiguous weekday runs format naturally
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Convert 24h "20:30" → 12h "08:30 PM" */
function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${mStr ?? '00'} ${period}`;
}

/** Format a list of dayOfWeek numbers as a Spanish day-range string */
function formatDayRange(days: number[]): string {
  if (days.length === 0) return '';
  const sorted = [...days].sort(
    (a, b) =>
      DAY_ORDER.indexOf(a as 0 | 1 | 2 | 3 | 4 | 5 | 6) -
      DAY_ORDER.indexOf(b as 0 | 1 | 2 | 3 | 4 | 5 | 6),
  );

  const first = sorted[0];
  if (first === undefined) return '';
  const runs: number[][] = [[first]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev === undefined || curr === undefined) continue;
    const prevIdx = DAY_ORDER.indexOf(prev as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    const currIdx = DAY_ORDER.indexOf(curr as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    const lastRun = runs[runs.length - 1];
    if (currIdx === prevIdx + 1 && lastRun !== undefined) {
      lastRun.push(curr);
    } else {
      runs.push([curr]);
    }
  }

  return runs
    .map((run) => {
      const start = run[0];
      const end = run[run.length - 1];
      if (start === undefined || end === undefined) return '';
      if (run.length === 1) return DAY_NAMES[start];
      return `${DAY_NAMES[start]}-${DAY_NAMES[end]}`;
    })
    .join(', ');
}

/**
 * Reconstruct the schedule display string from structured BusinessHours[].
 * - Empty hours → default "09:00 AM - 10:00 PM (Lun-Dom)"
 * - Single group covering all 7 days → "(Lun-Dom)"
 * - Multiple groups → comma-joined "(range1), (range2)"
 */
export function formatSchedule(hours: BusinessHours[]): string {
  if (hours.length === 0) return '09:00 AM - 10:00 PM (Lun-Dom)';

  // Group by openTime|closeTime|isClosed
  const groups = new Map<
    string,
    { openTime: string; closeTime: string; isClosed: boolean; days: number[] }
  >();
  for (const h of hours) {
    const key = `${h.openTime}|${h.closeTime}|${h.isClosed}`;
    if (!groups.has(key)) {
      groups.set(key, {
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
        days: [],
      });
    }
    groups.get(key)!.days.push(h.dayOfWeek);
  }

  // Single group covering all 7 days
  if (groups.size === 1) {
    const g = [...groups.values()][0];
    if (!g) return '09:00 AM - 10:00 PM (Lun-Dom)';
    if (g.days.length === 7) {
      if (g.isClosed) return 'Cerrado (Lun-Dom)';
      return `${to12h(g.openTime)} - ${to12h(g.closeTime)} (Lun-Dom)`;
    }
    const range = formatDayRange(g.days);
    if (g.isClosed) return `Cerrado (${range})`;
    return `${to12h(g.openTime)} - ${to12h(g.closeTime)} (${range})`;
  }

  // Multiple groups — join with comma
  const parts: string[] = [];
  for (const g of groups.values()) {
    const range = formatDayRange(g.days);
    if (g.isClosed) {
      parts.push(`Cerrado (${range})`);
    } else {
      parts.push(`${to12h(g.openTime)} - ${to12h(g.closeTime)} (${range})`);
    }
  }
  return parts.join(', ');
}

// ─── Social helpers ────────────────────────────────────────

/** Extract handle from URL: "https://instagram.com/licoreriadonsancho" → "@licoreriadonsancho" */
function extractInstagramHandle(url: string): string {
  if (!url) return '';
  const cleaned = url.replace(/\/+$/, '').replace(/\?.*$/, '');
  const parts = cleaned.split('/');
  const handle = parts[parts.length - 1];
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}

function buildSocialMedia(socials: BusinessSocial[]): SocialMedia {
  const result: SocialMedia = {};
  for (const s of socials) {
    if (s.type === 'INSTAGRAM') result.instagram = s.value;
    else if (s.type === 'TIKTOK') result.tiktok = s.value;
    else if (s.type === 'FACEBOOK') result.facebook = s.value;
  }
  return result;
}

// ─── Transformers ──────────────────────────────────────────

export function transformPromotion(prom: Promotion, businessId: string): Offer {
  return {
    id: prom.id,
    establishmentId: businessId,
    title: prom.title,
    description: prom.description,
    price: prom.price ?? '',
    discount: prom.discount ?? '',
    image: prom.image ?? '',
    code: prom.code ?? '',
  };
}

export function transformReview(
  review: PrismaReview & { user: User | null },
  businessId: string,
): Review {
  const userName = review.user?.name ?? 'Usuario Anónimo';
  const userAvatar = review.user?.image ?? userName.charAt(0).toUpperCase();
  return {
    id: review.id,
    establishmentId: businessId,
    userId: review.user?.id ?? 'unknown',
    userName,
    userAvatar,
    rating: review.rating,
    // Etapa 3: real per-dimension sub-ratings (1-5 each). The overall
    // `rating` above is the rounded average of these three, computed by
    // the review service when the review is upserted.
    ambienteRating: review.ambienteRating,
    servicioRating: review.servicioRating,
    precioCalidadRating: review.precioCalidadRating,
    comment: review.comment,
    date: review.createdAt.toISOString().slice(0, 10), // YYYY-MM-DD
  };
}

// Type alias for the full Business payload we expect (with all relations)
export type BusinessWithRelations = Business & {
  category: Category;
  hours: BusinessHours[];
  socials: BusinessSocial[];
  images: BusinessImage[];
  promotions: Promotion[];
  reviews: (PrismaReview & { user: User | null })[];
};

// The transformer output includes offers + reviews embedded on the Establishment
export type EstablishmentWithRelations = Establishment & {
  offers: Offer[];
  reviews: Review[];
};

/**
 * Transform a Prisma Business (with all relations) into the frontend
 * Establishment type, including embedded offers and reviews.
 */
export function transformBusiness(
  business: BusinessWithRelations,
): EstablishmentWithRelations {
  // ── Images ────────────────────────────────────────────────
  const galleryImages = business.images
    .filter((img) => img.type === 'GALLERY')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const coverImages = business.images
    .filter((img) => img.type === 'COVER')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const galleryUrls = galleryImages.map((img) => img.url);
  const coverUrls = coverImages.map((img) => img.url);

  // images[] — 2-3 photos, prefer GALLERY, fallback to COVER
  let imagesList: string[] = galleryUrls.slice(0, 3);
  if (imagesList.length < 3) {
    imagesList = [...imagesList, ...coverUrls].slice(0, 3);
  }
  if (imagesList.length === 0 && business.coverImage) {
    imagesList = [business.coverImage];
  }

  // gallery[] — up to 10 photos, pad by cycling existing
  const gallery: string[] = [];
  const sourcePool =
    galleryUrls.length > 0
      ? galleryUrls
      : coverUrls.length > 0
        ? coverUrls
        : business.coverImage
          ? [business.coverImage]
          : [];
  for (let i = 0; i < 10 && sourcePool.length > 0; i++) {
    const url = sourcePool[i % sourcePool.length];
    if (url !== undefined) gallery.push(url);
  }

  // coverImage — prefer business.coverImage, fallback to first COVER image, then first GALLERY
  const coverImage =
    business.coverImage ?? coverUrls[0] ?? galleryUrls[0] ?? '';

  // ── Phone ─────────────────────────────────────────────────
  const phoneSocial = business.socials.find((s) => s.type === 'PHONE');
  const phone = business.phone ?? phoneSocial?.value ?? '';

  // ── Instagram handle (legacy) ────────────────────────────
  const instagramSocial = business.socials.find((s) => s.type === 'INSTAGRAM');
  const instagram = instagramSocial
    ? extractInstagramHandle(instagramSocial.value)
    : '';

  // ── Website ───────────────────────────────────────────────
  const websiteSocial = business.socials.find((s) => s.type === 'WEBSITE');
  const website = websiteSocial?.value ?? undefined;

  // ── Social media object ───────────────────────────────────
  const socialMedia = buildSocialMedia(business.socials);

  // ── Schedule ──────────────────────────────────────────────
  const schedule = formatSchedule(business.hours);

  // ── Category (cast union) ────────────────────────────────
  const category = business.category.name as FrontendCategory;

  // ── Price range (cast union) ─────────────────────────────
  const priceRange = business.priceRange as PriceRange;

  // ── Reviews + offers ──────────────────────────────────────
  const reviews = business.reviews.map((r) => transformReview(r, business.id));
  const offers = business.promotions.map((p) =>
    transformPromotion(p, business.id),
  );

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    category,
    description: business.description,
    lat: business.lat,
    lng: business.lng,
    address: business.address,
    phone,
    instagram,
    coverImage,
    images: imagesList,
    avgRating: business.avgRating,
    reviewCount: business.reviewCount,
    priceRange,
    schedule,
    subRatings: {
      ambiente: business.ambienteRating,
      servicio: business.servicioRating,
      precioCalidad: business.precioCalidadRating,
    },
    specialty: business.specialty ?? '',
    valueProposition: business.valueProposition ?? '',
    gallery,
    website,
    socialMedia,
    activePromotion: undefined, // Etapa 3 feature
    offers,
    reviews,
  };
}
