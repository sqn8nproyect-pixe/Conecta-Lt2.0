// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/businesses (Etapa 7.C.1)
//
// List ALL businesses (including DRAFT, PENDING_REVIEW, SUSPENDED,
// ARCHIVED — not just ACTIVE) with their owner info included.
//
// Query params (all optional, AND-combined):
//   ?status=PENDING_REVIEW  filter by BusinessStatus
//   ?claimed=true|false     filter by ownerId presence
//   ?ownerId=<id>           filter by owner
//   ?search=<text>          case-insensitive name/slug contains
//
// Auth: ADMIN or MODERATOR (requireRole) — both can view the list.
// Mutating endpoints (PATCH status) are ADMIN-only (see [id]/status).
//
// Returns the same Establishment shape as the public endpoint but
// with the admin-only `status` and `owner` fields added on top.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  businessInclude,
} from '@/server/repositories/business.repository';
import {
  transformBusiness,
  type BusinessWithRelations,
} from '@/server/services/business.service';
import type { AdminBusiness, BusinessStatus } from '@/lib/types';

// Extended include — `businessInclude` doesn't bring the owner
// relation (the public transformBusiness doesn't need it). We layer it
// on top so the admin response can populate the `owner` column without
// a separate fetch.
const adminBusinessInclude = {
  ...businessInclude,
  owner: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.BusinessInclude;

type AdminBusinessRow = BusinessWithRelations & {
  owner: { id: string; name: string | null; email: string; image: string | null } | null;
  status: BusinessStatus;
};

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const claimed = searchParams.get('claimed');
    const ownerId = searchParams.get('ownerId');
    const search = searchParams.get('search');

    const where: Prisma.BusinessWhereInput = {};
    if (status) where.status = status as BusinessStatus;
    if (ownerId) where.ownerId = ownerId;
    if (claimed === 'true') where.ownerId = { not: null };
    else if (claimed === 'false') where.ownerId = null;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = (await db.business.findMany({
      where,
      include: adminBusinessInclude,
      orderBy: { createdAt: 'desc' },
    })) as AdminBusinessRow[];

    const result: AdminBusiness[] = rows.map((b) => ({
      ...transformBusiness(b),
      status: b.status,
      owner: b.owner,
    }));

    return NextResponse.json(result);
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/businesses error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
