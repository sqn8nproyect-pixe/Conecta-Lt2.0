// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/owner/businesses/[slug]/reservations (Etapa 7.C.2)
//
// List reservations for a business the user owns (or is ADMIN of).
//
// Query params (all optional, AND-combined):
//   ?status=PENDING          filter by ReservationStatus
//   ?date=2026-12-25         filter by exact date (YYYY-MM-DD)
//
// Returns the reservations with the user info attached so the owner
// dashboard can render the customer's name + phone in the table
// without a second round-trip.
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check (assertBusinessOwnership).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';
import {
  reservationBusinessSelect,
} from '@/server/repositories/reservation.repository';

// Owner-facing reservation include — same shape as the public
// reservation list PLUS the user's name/email/phone so the owner
// can contact the customer.
const ownerReservationInclude = {
  business: { select: reservationBusinessSelect },
  user: {
    select: { id: true, name: true, email: true, phone: true },
  },
  couponRedemption: {
    include: {
      promotion: {
        select: {
          id: true,
          title: true,
          code: true,
          image: true,
          discount: true,
          price: true,
        },
      },
    },
  },
} satisfies Prisma.ReservationInclude;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

    // Verify ownership — throws 404/403 Response on failure.
    const biz = await assertBusinessOwnership(user.id, slug);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const where: Prisma.ReservationWhereInput = { businessId: biz.id };
    if (status) where.status = status as Prisma.ReservationWhereInput['status'];
    if (date) where.date = date;

    const reservations = await db.reservation.findMany({
      where,
      include: ownerReservationInclude,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    // Project to the OwnerReservation shape the frontend expects.
    const result = reservations.map((r) => ({
      id: r.id,
      confirmationCode: r.confirmationCode,
      status: r.status,
      date: r.date,
      time: r.time,
      guests: r.guests,
      notes: r.notes,
      name: r.name,
      phone: r.phone,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      business: {
        id: r.business.id,
        name: r.business.name,
        slug: r.business.slug,
        address: r.business.address,
        coverImage: r.business.coverImage,
        phone: r.business.phone,
      },
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            phone: r.user.phone,
          }
        : null,
      coupon: r.couponRedemption
        ? {
            code: r.couponRedemption.promotion.code,
            title: r.couponRedemption.promotion.title,
            image: r.couponRedemption.promotion.image,
            discount: r.couponRedemption.promotion.discount,
          }
        : null,
    }));

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug]/reservations error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
