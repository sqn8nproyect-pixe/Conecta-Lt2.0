// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/reviews (Etapa 7.C.1)
//
// List ALL reviews (including PENDING, HIDDEN, FLAGGED — not just
// PUBLISHED). Supports:
//   ?status=FLAGGED       filter by ReviewStatus
//   ?businessId=<id>      filter by business
//
// Auth: ADMIN or MODERATOR (requireRole).
//
// Returns each review with user + business info so the moderator can
// triage without an extra round-trip.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, ReviewStatus as PrismaReviewStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import type { AdminReview, ReviewStatus } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const businessId = searchParams.get('businessId');

    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status as PrismaReviewStatus;
    if (businessId) where.businessId = businessId;

    const rows = await db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        ambienteRating: true,
        servicioRating: true,
        precioCalidadRating: true,
        comment: true,
        status: true,
        createdAt: true,
        business: { select: { id: true, name: true, slug: true } },
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    const result: AdminReview[] = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      ambienteRating: r.ambienteRating,
      servicioRating: r.servicioRating,
      precioCalidadRating: r.precioCalidadRating,
      comment: r.comment,
      status: r.status as ReviewStatus,
      createdAt: r.createdAt.toISOString(),
      business: r.business,
      user: r.user,
    }));

    return NextResponse.json(result);
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/reviews error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
