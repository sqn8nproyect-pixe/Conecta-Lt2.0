// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Business Repository Layer
// Thin Prisma accessors — single source of truth for find queries
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { Prisma, SocialType } from '@prisma/client';

// Shared include object — keeps the relation shape consistent across queries.
// Exported so other repositories (favorite, review, promotion) can reuse
// the same shape when they need to include a Business with all its relations.
//
// NOTE (Etapa 4 — Cupones): `promotions` is fetched WITHOUT a status filter
// so the service transformer (business.service.ts → transformBusiness) can
// split them into `offers` (live promotions: ACTIVE + within date range +
// not sold out) and `expiredPromotions` (everything else — EXPIRED, PAUSED,
// sold-out, etc.) so the frontend can render "EXPIRADO" / "AGOTADO" badges.
// The actual live-vs-expired classification lives in
// `promotion.repository.ts → isPromotionLive()`.
export const businessInclude = {
  category: true,
  hours: true,
  socials: true,
  images: { orderBy: { sortOrder: 'asc' } },
  promotions: {
    orderBy: { createdAt: 'asc' },
  },
  reviews: {
    where: { status: 'PUBLISHED' as const },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.BusinessInclude;

export const businessRepository = {
  findAll: async (where?: Prisma.BusinessWhereInput) => {
    return db.business.findMany({
      where: { status: 'ACTIVE', ...(where ?? {}) },
      include: businessInclude,
      orderBy: { avgRating: 'desc' },
    });
  },

  findBySlug: async (slug: string) => {
    return db.business.findUnique({
      where: { slug },
      include: businessInclude,
    });
  },

  findById: async (id: string) => {
    return db.business.findUnique({
      where: { id },
      include: businessInclude,
    });
  },

  /**
   * Etapa 3.6 — Aforo en tiempo real.
   *
   * Persist a new `currentCapacity` value for a business. The most recent
   * report wins (per-business) — callers are not differentiated by source
   * (any logged-in user can update the value; there's no per-user vote
   * history in this iteration).
   *
   * Returns only `{ id, currentCapacity }` so the route handler can echo
   * it back to the client without leaking any other Business column.
   */
  updateCapacity: async (
    businessId: string,
    capacity: 'QUIET' | 'MODERATE' | 'FULL',
  ): Promise<{ id: string; currentCapacity: 'QUIET' | 'MODERATE' | 'FULL' }> => {
    const updated = await db.business.update({
      where: { id: businessId },
      data: { currentCapacity: capacity },
      select: { id: true, currentCapacity: true },
    });
    // Prisma types `currentCapacity` as `CapacityLevel | null` because the
    // column is nullable, but we just set it to a non-null value, so the
    // runtime is guaranteed to be one of the three enum values. Cast
    // through `unknown` to satisfy the stricter return type.
    return {
      id: updated.id,
      currentCapacity: updated.currentCapacity as unknown as
        | 'QUIET'
        | 'MODERATE'
        | 'FULL',
    };
  },

  // ─── Etapa 7.B — Business claim flow ───────────────────────
  //
  // claimBusiness(businessId, userId)
  //   Atomically sets `ownerId = userId` and `claimedAt = now()`. Used
  //   by the claim service when a BUSINESS_OWNER asserts ownership of
  //   an unclaimed business. The service layer is responsible for
  //   pre-checking `ownerId` is null (so two concurrent claims on the
  //   same business are caught at the read step before this update
  //   runs — for the scale of CONECTA-LT this is fine; we don't need
  //   a SELECT-FOR-UPDATE lock).
  //
  //   Returns `{ id, ownerId, claimedAt, name }` so the service can
  //   return the name back to the client without an extra fetch.
  //
  // unclaimBusiness(businessId)
  //   The reverse — clears `ownerId` and `claimedAt`. Reserved for the
  //   admin panel (Etapa 7.C) where an admin can revoke a claim (e.g.
  //   if the wrong person claimed it). The owner field is nullable so
  //   this is a clean UPDATE.
  //
  // listClaimedByOwner(userId)
  //   Returns all businesses claimed by a given owner, newest first.
  //   Drives the "MIS LOCALES" section on the ProfilePage. Includes
  //   the full relation shape so the same EstablishmentTransformer
  //   can render each row as a card.
  claimBusiness: async (
    businessId: string,
    userId: string,
  ): Promise<{
    id: string;
    ownerId: string;
    claimedAt: Date;
    name: string;
  }> => {
    const updated = await db.business.update({
      where: { id: businessId },
      data: { ownerId: userId, claimedAt: new Date() },
      select: { id: true, ownerId: true, claimedAt: true, name: true },
    });
    // `ownerId` and `claimedAt` are nullable on the schema, but we just
    // set both to non-null values, so cast through unknown to satisfy
    // the stricter return type (same pattern as updateCapacity above).
    return {
      id: updated.id,
      ownerId: updated.ownerId as unknown as string,
      claimedAt: updated.claimedAt as unknown as Date,
      name: updated.name,
    };
  },

  unclaimBusiness: async (
    businessId: string,
  ): Promise<{
    id: string;
    ownerId: string | null;
    claimedAt: Date | null;
  }> => {
    return db.business.update({
      where: { id: businessId },
      data: { ownerId: null, claimedAt: null },
      select: { id: true, ownerId: true, claimedAt: true },
    });
  },

  listClaimedByOwner: async (userId: string) => {
    return db.business.findMany({
      where: { ownerId: userId },
      include: businessInclude,
      orderBy: { claimedAt: 'desc' },
    });
  },

  // ─── Etapa 7.C.2 — Panel de Dueño (owner mutations) ────────
  //
  // These accessors power the owner dashboard ("Mis Locales"):
  //   - updateBasicInfo  → patch editable fields of the Business row
  //     (name, description, address, phone, priceRange, coverImage,
  //     specialty, valueProposition). Returns `{ id, name, slug }` so
  //     the route handler can echo it back without leaking extra cols.
  //   - upsertHours      → upsert a single BusinessHours row by
  //     [businessId, dayOfWeek] (the unique constraint). Called in a
  //     `db.$transaction()` array by the service so a 7-day PUT is
  //     atomic.
  //   - upsertSocial     → upsert a BusinessSocial row by
  //     [businessId, type] (the unique constraint).
  //   - deleteSocial     → delete by [businessId, type]. Used by the
  //     service to drop socials not in the new PUT payload.
  updateBasicInfo: async (
    businessId: string,
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
  ): Promise<{ id: string; name: string; slug: string }> => {
    return db.business.update({
      where: { id: businessId },
      data,
      select: { id: true, name: true, slug: true },
    });
  },

  upsertHours: async (
    businessId: string,
    dayOfWeek: number,
    openTime: string,
    closeTime: string,
    isClosed: boolean,
  ) => {
    return db.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
      create: { businessId, dayOfWeek, openTime, closeTime, isClosed },
      update: { openTime, closeTime, isClosed },
    });
  },

  upsertSocial: async (
    businessId: string,
    type: SocialType,
    value: string,
  ) => {
    return db.businessSocial.upsert({
      where: { businessId_type: { businessId, type } },
      create: { businessId, type, value },
      update: { value },
    });
  },

  deleteSocial: async (businessId: string, type: SocialType) => {
    return db.businessSocial.deleteMany({
      where: { businessId, type },
    });
  },
};

export const categoryRepository = {
  findAll: async () => {
    return db.category.findMany({ orderBy: { sortOrder: 'asc' } });
  },
};
