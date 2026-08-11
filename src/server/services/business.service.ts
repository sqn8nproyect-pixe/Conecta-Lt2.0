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
  SocialType,
} from '@prisma/client';
import type {
  CapacityLevel,
  Establishment,
  Offer,
  Review,
  Category as FrontendCategory,
  PriceRange,
  SocialMedia,
} from '@/lib/types';
import { db } from '@/lib/db';
import { isPromotionLive } from '@/server/repositories/promotion.repository';
import { businessRepository } from '@/server/repositories/business.repository';
import { analyticsRepository } from '@/server/repositories/analytics.repository';
import { notificationService } from '@/server/services/notification.service';

// ─── Etapa 3.6 — Service helpers ────────────────────────────

/**
 * Build a JSON Response (thrown from service → returned by route handler).
 * Throwing a Response is the same convention used by `requireUser()` and
 * the other services (favorite/review/promotion/reservation/analytics).
 */
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Etapa 3.6 — Update a business's current capacity.
 *
 * The user must be authenticated (the route handler enforces this via
 * `requireUser()` before calling this function — we receive the userId
 * so we can attach it to the analytics event).
 *
 * Validation: `capacity` must be one of `QUIET` / `MODERATE` / `FULL`.
 * Returns the updated `{ id, currentCapacity }` so the route handler
 * can echo it back to the client for the optimistic update.
 *
 * Side effect: records a `CAPACITY_REPORT` AnalyticsEvent (fire-and-forget)
 * so we can later build "X personas reportaron el aforo" signals. The
 * analytics insert is wrapped in `.catch(() => {})` so a transient DB
 * error never fails the report itself.
 */
export async function reportBusinessCapacity(
  userId: string,
  businessSlug: string,
  capacity: CapacityLevel,
): Promise<{ id: string; currentCapacity: CapacityLevel }> {
  // ── 1. Validate capacity ────────────────────────────────────────────
  if (!['QUIET', 'MODERATE', 'FULL'].includes(capacity)) {
    throw jsonError('Capacidad inválida', 400);
  }

  // ── 2. Resolve slug → business ──────────────────────────────────────
  const business = await db.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  });
  if (!business) {
    throw jsonError('Negocio no encontrado', 404);
  }

  // ── 3. Update capacity ──────────────────────────────────────────────
  const updated = await businessRepository.updateCapacity(
    business.id,
    capacity,
  );

  // ── 4. Analytics event (fire-and-forget) ────────────────────────────
  // 'CAPACITY_REPORT' is included in ANALYTICS_EVENT_TYPES (see
  // analytics.service.ts). The insert is best-effort and never awaited
  // — a DB error here must NOT fail the report itself.
  void analyticsRepository
    .createEvent({
      type: 'CAPACITY_REPORT',
      userId,
      businessId: business.id,
      metadata: { capacity },
    })
    .catch(() => {});

  return updated;
}

// ─── Etapa 7.B — Business claim flow ────────────────────────

/**
 * Etapa 7.B — A BUSINESS_OWNER (or ADMIN acting on their behalf) claims
 * an unclaimed business so they can manage its profile, promotions,
 * capacity, etc.
 *
 * Flow:
 *   1. Resolve slug → business (must exist + must be unclaimed)
 *   2. Update ownerId = userId, claimedAt = now()
 *   3. Best-effort notify every ADMIN + MODERATOR that a claim happened
 *      (so they can review it in the admin panel — Etapa 7.C)
 *
 * Auth/role enforcement happens in the route handler
 * (`requireRole('BUSINESS_OWNER', 'ADMIN')`) — this function trusts
 * its caller and only does the data work.
 *
 * Returns `{ id, name, ownerId, claimedAt }` (claimedAt as ISO string
 * for the client). Throws `jsonError('Response')` for the 404/400 cases
 * (caught by the route handler via `if (e instanceof Response) return e`).
 */
export async function claimBusiness(
  userId: string,
  businessSlug: string,
): Promise<{
  id: string;
  name: string;
  ownerId: string;
  claimedAt: string;
}> {
  // ── 1. Resolve slug → business (only need id/name/ownerId for the check) ──
  const business = await db.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, name: true, ownerId: true },
  });
  if (!business) {
    throw jsonError('Negocio no encontrado', 404);
  }
  if (business.ownerId) {
    throw jsonError('Este local ya tiene un dueño gestionando', 400);
  }

  // ── 2. Update ownerId + claimedAt atomically ────────────────────────────
  const updated = await businessRepository.claimBusiness(business.id, userId);

  // ── 3. Best-effort notify all ADMIN + MODERATOR users ──────────────────
  // Fire-and-forget: a notification DB error must NOT fail the claim.
  // The notification message names the claimer + the business so the
  // admin can quickly decide whether to approve/revoke in the 7.C panel.
  try {
    const [admins, claimer] = await Promise.all([
      db.user.findMany({
        where: { role: { in: ['ADMIN', 'MODERATOR'] } },
        select: { id: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
    ]);
    const claimerName = claimer?.name ?? claimer?.email ?? 'Un usuario';
    await Promise.all(
      admins.map((a) =>
        notificationService.notify(
          a.id,
          'SYSTEM',
          'Solicitud de claim',
          `${claimerName} reclamó el local ${business.name}.`,
        ),
      ),
    );
  } catch (e) {
    // Best-effort — log and move on. The claim itself already succeeded.
    console.error('notify admins of claim failed:', e);
  }

  return {
    id: updated.id,
    name: updated.name,
    ownerId: updated.ownerId,
    claimedAt: updated.claimedAt.toISOString(),
  };
}

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
    // Etapa 4: campos de vigencia + redenciones
    endDate: prom.endDate?.toISOString() ?? null,
    startDate: prom.startDate?.toISOString() ?? null,
    maxRedemptions: prom.maxRedemptions,
    redemptionCount: prom.redemptionCount,
    status: prom.status,
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
  // Live promotions (status ACTIVE + within date range + not sold out).
  // Frontend renders these as claimable coupon cards on the detail page.
  offers: Offer[];
  // Non-live promotions (EXPIRED, PAUSED, DRAFT, sold-out, future-dated).
  // Frontend renders these with "EXPIRADO" / "AGOTADO" / "PRÓXIMAMENTE"
  // badges so the user can see what used to be available without being
  // able to claim them.
  expiredPromotions: Offer[];
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
  // Etapa 4: split promotions into `offers` (live — claimable) and
  // `expiredPromotions` (everything else — EXPIRED, PAUSED, DRAFT,
  // sold-out, future-dated). The frontend renders both lists but with
  // different visual treatment (active = "RECLAMAR" button, expired =
  // "EXPIRADO" / "AGOTADO" badge, no action).
  const now = new Date();
  const reviews = business.reviews.map((r) => transformReview(r, business.id));
  const livePromos: Promotion[] = [];
  const expiredPromos: Promotion[] = [];
  for (const p of business.promotions) {
    if (isPromotionLive(p, now)) {
      livePromos.push(p);
    } else {
      expiredPromos.push(p);
    }
  }
  const offers = livePromos.map((p) => transformPromotion(p, business.id));
  const expiredPromotions = expiredPromos.map((p) =>
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
    expiredPromotions,
    reviews,
    // Etapa 3.6 — Aforo en tiempo real. The Prisma column is a
    // `CapacityLevel?` enum, so the runtime value is already
    // 'QUIET' | 'MODERATE' | 'FULL' | null. We cast through
    // `CapacityLevel` purely for TS — the DB enum matches our
    // frontend type 1:1 (mirrors how `priceRange` is cast above).
    currentCapacity: (business.currentCapacity ?? null) as CapacityLevel | null,

    // Etapa 7.B — Business claim flow. Expose the owner + claim date
    // so the EstablishmentPage can show "Gestionando este local" (if
    // the current user is the owner) or a "Reclamar este local" button
    // (if the business is unclaimed AND the user is a BUSINESS_OWNER).
    // Both are nullable on the schema — null means no one has claimed
    // the business yet.
    ownerId: business.ownerId ?? null,
    claimedAt: business.claimedAt?.toISOString() ?? null,
  };
}

// ─── Etapa 7.C.2 — Panel de Dueño (owner service) ────────────
//
// The owner dashboard ("Mis Locales") lets a BUSINESS_OWNER manage the
// businesses they claimed in Etapa 7.B. The service layer enforces:
//
//   - assertBusinessOwnership(userId, businessIdOrSlug) → throws 404 if
//     not found, 403 if the user isn't the owner (or ADMIN). Returns
//     `{ id, slug, name }` so callers don't need a second fetch.
//
//   - updateBusinessInfo(userId, businessSlug, data)   → patches the
//     editable Business fields (name, description, address, phone,
//     priceRange, coverImage, specialty, valueProposition). Validates
//     phone length, priceRange enum, name min length.
//
//   - updateBusinessHours(userId, businessSlug, hours) → replaces the
//     BusinessHours rows for the business. Validates dayOfWeek range
//     (0-6) and HH:mm format on entries that aren't isClosed.
//
//   - updateBusinessSocials(userId, businessSlug, socials) → replaces
//     BusinessSocial rows. Validates the `type` is in the SocialType
//     enum and that `value` isn't empty. Deletes socials not in the
//     new payload (so the PUT is a true replace).
//
// Auth/role enforcement happens in the route handler via
// `requireRole('BUSINESS_OWNER', 'ADMIN')` — these functions trust
// their caller and only do the data + ownership work.

const OWNER_VALID_SOCIAL_TYPES: ReadonlySet<SocialType> = new Set([
  'INSTAGRAM',
  'WHATSAPP',
  'TIKTOK',
  'FACEBOOK',
  'TWITTER',
  'WEBSITE',
  'PHONE',
]);

const OWNER_VALID_PRICE_RANGES = new Set(['$', '$$', '$$$']);

/**
 * Resolve a business id-or-slug to its `{ id, slug, name, ownerId }`
 * and verify the user owns it (or is ADMIN). Throws `jsonError()`
 * (Response) for 404 / 403 — the route handler propagates it via
 * `if (e instanceof Response) return e`.
 *
 * ADMIN override: an ADMIN can edit any business (e.g. to fix a typo
 * flagged by a moderator). This mirrors the 7.B claim flow's
 * `requireRole('BUSINESS_OWNER', 'ADMIN')` policy.
 */
export async function assertBusinessOwnership(
  userId: string,
  businessIdOrSlug: string,
): Promise<{ id: string; slug: string; name: string }> {
  // Try slug first, fall back to id (so callers can pass either).
  const business = await db.business.findFirst({
    where: {
      OR: [{ slug: businessIdOrSlug }, { id: businessIdOrSlug }],
    },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!business) throw jsonError('Negocio no encontrado', 404);

  if (business.ownerId !== userId) {
    // Allow ADMIN override (admin can edit any business).
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      throw jsonError('No tienes permisos para gestionar este local', 403);
    }
  }
  return { id: business.id, slug: business.slug, name: business.name };
}

/**
 * Patch the editable Business fields. `data` is a partial — only the
 * provided keys are written. Validation:
 *   - name: ≥ 3 chars (after trim) when provided
 *   - phone: ≥ 7 chars when provided and non-empty (we accept empty/null
 *     to clear it; a non-empty value must look like a phone number)
 *   - priceRange: must be `$` / `$$` / `$$$` when provided
 */
export async function updateBusinessInfo(
  userId: string,
  businessSlug: string,
  data: {
    name?: string;
    description?: string;
    address?: string;
    phone?: string | null;
    priceRange?: string;
    coverImage?: string | null;
    specialty?: string | null;
    valueProposition?: string | null;
  },
): Promise<{ id: string; slug: string; name: string }> {
  const biz = await assertBusinessOwnership(userId, businessSlug);

  // Validate phone if provided (basic check — non-empty values must be
  // at least 7 chars to look like a real phone number).
  if (
    data.phone !== undefined &&
    data.phone !== null &&
    data.phone.length > 0 &&
    data.phone.length < 7
  ) {
    throw jsonError('Teléfono inválido', 400);
  }
  // Validate priceRange if provided.
  if (
    data.priceRange !== undefined &&
    !OWNER_VALID_PRICE_RANGES.has(data.priceRange)
  ) {
    throw jsonError('Rango de precio inválido', 400);
  }
  // Validate name if provided.
  if (
    data.name !== undefined &&
    data.name.trim().length < 3
  ) {
    throw jsonError('El nombre debe tener al menos 3 caracteres', 400);
  }

  await businessRepository.updateBasicInfo(biz.id, data);
  // If the name was updated, return the new name so the route can echo
  // it back to the client (otherwise return the prior name).
  return {
    id: biz.id,
    slug: biz.slug,
    name: data.name !== undefined ? data.name : biz.name,
  };
}

/**
 * Replace the BusinessHours rows for a business. The PUT is a true
 * upsert-per-day: each entry in `hours` is upserted by
 * [businessId, dayOfWeek], and any day not in the payload keeps its
 * existing row (we don't delete — the owner dashboard always sends
 * all 7 days so this is fine).
 *
 * Validation:
 *   - dayOfWeek must be 0-6 (Dom-Sáb)
 *   - openTime / closeTime must match `HH:mm` (24h) when !isClosed
 *     (when isClosed we still accept the time fields but they're
 *     irrelevant — the frontend's "Cerrado" checkbox hides them)
 */
export async function updateBusinessHours(
  userId: string,
  businessSlug: string,
  hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>,
): Promise<void> {
  const biz = await assertBusinessOwnership(userId, businessSlug);

  for (const h of hours) {
    if (h.dayOfWeek < 0 || h.dayOfWeek > 6) {
      throw jsonError('Día de la semana inválido', 400);
    }
    if (!h.isClosed) {
      if (!/^\d{2}:\d{2}$/.test(h.openTime) || !/^\d{2}:\d{2}$/.test(h.closeTime)) {
        throw jsonError('Formato de hora inválido (debe ser HH:mm)', 400);
      }
    }
  }

  // Wrap in a $transaction so a 7-day PUT is atomic — if any upsert
  // fails, none of them land. We call db.businessHours.upsert directly
  // (instead of going through businessRepository.upsertHours) because
  // $transaction's array form requires raw PrismaPromises, and the
  // repository wrapper would convert them to plain Promises.
  await db.$transaction(
    hours.map((h) =>
      db.businessHours.upsert({
        where: { businessId_dayOfWeek: { businessId: biz.id, dayOfWeek: h.dayOfWeek } },
        create: {
          businessId: biz.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        },
        update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed },
      }),
    ),
  );
}

/**
 * Replace the BusinessSocial rows for a business. Deletes any social
 * whose `type` is not in the new payload, then upserts each entry in
 * the payload by [businessId, type].
 *
 * Validation:
 *   - type must be one of the 7 SocialType enum values
 *   - value must be non-empty after trim
 */
export async function updateBusinessSocials(
  userId: string,
  businessSlug: string,
  socials: Array<{ type: string; value: string }>,
): Promise<void> {
  const biz = await assertBusinessOwnership(userId, businessSlug);

  for (const s of socials) {
    if (!OWNER_VALID_SOCIAL_TYPES.has(s.type as SocialType)) {
      throw jsonError(`Tipo de red social inválido: ${s.type}`, 400);
    }
    if (s.value.trim().length === 0) {
      throw jsonError('El valor de la red social no puede estar vacío', 400);
    }
  }

  // Delete existing socials not in the new list, then upsert the rest.
  // The deleteMany uses a NOT-in filter so the upserts below can run
  // without P2002 (we'd hit P2002 if we tried to upsert a type that
  // already existed and we hadn't cleared it first — but upsert
  // handles that natively; the deleteMany is just to drop removed ones).
  const types = socials.map((s) => s.type as SocialType);
  await db.businessSocial.deleteMany({
    where: {
      businessId: biz.id,
      ...(types.length > 0 ? { NOT: { type: { in: types } } } : {}),
    },
  });
  // Same pattern as updateBusinessHours — call db.businessSocial.upsert
  // directly inside $transaction's array form (the repository wrapper
  // would convert the PrismaPromise to a plain Promise).
  await db.$transaction(
    socials.map((s) =>
      db.businessSocial.upsert({
        where: { businessId_type: { businessId: biz.id, type: s.type as SocialType } },
        create: { businessId: biz.id, type: s.type as SocialType, value: s.value },
        update: { value: s.value },
      }),
    ),
  );
}
