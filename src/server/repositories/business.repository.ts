// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Business Repository Layer
// Thin Prisma accessors — single source of truth for find queries
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

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
};

export const categoryRepository = {
  findAll: async () => {
    return db.category.findMany({ orderBy: { sortOrder: 'asc' } });
  },
};
