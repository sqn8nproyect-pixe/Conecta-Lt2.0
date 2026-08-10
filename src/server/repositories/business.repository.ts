// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Business Repository Layer
// Thin Prisma accessors — single source of truth for find queries
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// Shared include object — keeps the relation shape consistent across queries
const businessInclude = {
  category: true,
  hours: true,
  socials: true,
  images: { orderBy: { sortOrder: 'asc' } },
  promotions: {
    where: { status: 'ACTIVE' as const },
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
