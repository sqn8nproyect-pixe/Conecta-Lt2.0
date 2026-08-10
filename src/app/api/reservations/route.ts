// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/reservations
//   GET  → list the authenticated user's reservations (with business +
//          optional coupon info, ordered by date asc).
//   POST → create a new reservation for the authenticated user,
//          optionally linking a previously-claimed coupon (which flips
//          its status from CLAIMED → USED atomically).
//
// All handlers require an authenticated session (requireUser()).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/server/auth';
import { reservationService } from '@/server/services/reservation.service';

/**
 * GET /api/reservations
 *
 * Returns: Array<MyReservationEntry> = [{
 *   id, confirmationCode, status, date, time, guests, notes, name,
 *   phone, createdAt,
 *   business: { id, name, slug, address, coverImage, phone },
 *   coupon:   { code, title, image, discount } | null,
 * }]
 *
 * Ordered by `date` ascending (next upcoming reservation first).
 * Includes cancelled / completed reservations too — the UI uses the
 * `status` field to render them with the appropriate badge.
 *
 * Errors:
 *   401 — No autenticado (from requireUser)
 *   500 — unexpected server error
 */
export async function GET() {
  try {
    const user = await requireUser();
    const reservations = await reservationService.listMyReservations(user.id);
    return NextResponse.json(reservations);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('GET /api/reservations error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reservations
 *
 * Body shape:
 *   {
 *     businessSlug:        string,    // required — must match an existing Business.slug
 *     name:                 string,    // required — non-empty after trim
 *     phone:                string,    // required — non-empty after trim
 *     email?:               string,    // optional — stored as null if empty
 *     date:                 string,    // required — "YYYY-MM-DD"
 *     time:                 string,    // required — "HH:mm" (24h)
 *     guests:               number | string,  // required — integer >= 1 (string accepted)
 *     notes?:               string,    // optional — stored as null if empty
 *     couponRedemptionId?:  string,    // optional — links a CLAIMED coupon to this reservation
 *   }
 *
 * Returns 201 with: CreateReservationResult = {
 *   reservation: { id, confirmationCode, status, date, time, guests,
 *                  notes, name, phone, email,
 *                  business: { id, name, slug, address, coverImage, phone },
 *                  couponRedemption: { id, status, promotion: {...} } | null },
 *   confirmationCode: string,
 * }
 *
 * Errors:
 *   400 — invalid body (bad date/time, guests < 1, empty name/phone,
 *         couponRedemptionId present but its status !== 'CLAIMED')
 *   401 — not authenticated
 *   404 — business slug doesn't match / couponRedemptionId not found
 *         (or belongs to another user)
 *   500 — unexpected server error
 *
 * Race-condition guard on `couponRedemptionId`:
 *   The service re-validates the coupon's status inside the tx (so a
 *   coupon that gets consumed by a concurrent request between the
 *   pre-check and the link write will be detected and the whole tx
 *   rolls back, surfacing a clean 400). The unique constraint on
 *   `CouponRedemption.reservationId` is the final guard: if two
 *   concurrent reservations try to link the same coupon, the loser's
 *   UPDATE inside the tx fails with P2002 — we catch that and return
 *   a 400 "Este cupón ya fue usado" (instead of a generic 500).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;

    const result = await reservationService.createReservation(user.id, {
      businessSlug: b.businessSlug as string,
      name: b.name as string,
      phone: b.phone as string,
      email: (b.email as string | null | undefined) ?? null,
      date: b.date as string,
      time: b.time as string,
      guests: b.guests as number | string,
      notes: (b.notes as string | null | undefined) ?? null,
      couponRedemptionId:
        (b.couponRedemptionId as string | null | undefined) ?? null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 400 / 404 from service

    // P2002 — concurrent linkCouponRedemption race: two requests tried
    // to bind the same coupon to different reservations. The loser's
    // UPDATE on `CouponRedemption.reservationId` fails because of the
    // `@unique` constraint. Surface a clean 400 instead of a 500.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Este cupón ya fue usado' },
        { status: 400 },
      );
    }

    console.error('POST /api/reservations error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
