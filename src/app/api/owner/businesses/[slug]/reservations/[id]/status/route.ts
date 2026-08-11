// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/owner/businesses/[slug]/reservations/[id]/status
// (Etapa 7.C.2)
//
// Change a reservation's status from the owner dashboard.
//
// Body: { status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' }
//
// Allowed transitions (owner-side):
//   PENDING    → CONFIRMED            (owner confirms the booking)
//   CONFIRMED  → COMPLETED            (customer showed up, visit done)
//   CONFIRMED  → NO_SHOW              (customer didn't show up)
//
// NOT allowed (owner-side):
//   * CANCELLED — owner shouldn't cancel on the user's behalf; if
//     they need to (e.g. an emergency closure), they should contact
//     the user directly. The user-side cancel flow remains in
//     /api/reservations/[id]/cancel.
//   * CONFIRMED → PENDING (don't un-confirm)
//   * COMPLETED / NO_SHOW → anything (terminal states)
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check on the BUSINESS
// (not just the reservation — the reservation must belong to a
// business the user owns).
//
// Side effect: notify the reservation's user (if any) of the
// status change. Best-effort, fire-and-forget.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { ReservationStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';
import { notificationService } from '@/server/services/notification.service';
import type { ReservationStatus as FrontendReservationStatus } from '@/lib/types';

const VALID_STATUSES: ReadonlySet<FrontendReservationStatus> = new Set([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
]);

// Map of allowed forward transitions. The owner can only move a
// reservation forward in the lifecycle (PENDING → CONFIRMED →
// COMPLETED | NO_SHOW). CANCELLED is user-only.
const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  PENDING: new Set(['CONFIRMED']),
  CONFIRMED: new Set(['COMPLETED', 'NO_SHOW']),
  COMPLETED: new Set(),
  NO_SHOW: new Set(),
  CANCELLED: new Set(),
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmada',
  COMPLETED: 'completada',
  NO_SHOW: 'no asistió',
  CANCELLED: 'cancelada',
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug, id } = await params;

    // Verify ownership — throws 404/403 Response on failure.
    const biz = await assertBusinessOwnership(user.id, slug);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const rawStatus = (body as Record<string, unknown> | null)?.status;
    if (
      typeof rawStatus !== 'string' ||
      !VALID_STATUSES.has(rawStatus as FrontendReservationStatus)
    ) {
      return NextResponse.json(
        {
          error:
            'status inválido (se esperaba PENDING | CONFIRMED | COMPLETED | NO_SHOW | CANCELLED)',
        },
        { status: 400 },
      );
    }
    const newStatus = rawStatus as FrontendReservationStatus;

    // CANCELLED is user-only — owner can't cancel on the user's behalf.
    if (newStatus === 'CANCELLED') {
      return NextResponse.json(
        {
          error:
            'No puedes cancelar una reserva en nombre del cliente. Contacta al cliente directamente.',
        },
        { status: 400 },
      );
    }

    // Fetch the reservation — must belong to the owned business.
    const reservation = await db.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        confirmationCode: true,
        status: true,
        userId: true,
        businessId: true,
        business: { select: { id: true, name: true } },
      },
    });
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 },
      );
    }
    if (reservation.businessId !== biz.id) {
      // Defense-in-depth: the reservation doesn't belong to the
      // owned business. Don't leak that the reservation exists —
      // return 404.
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 },
      );
    }

    // Validate the transition.
    const allowed = ALLOWED_TRANSITIONS[reservation.status] ?? new Set();
    if (!allowed.has(newStatus)) {
      return NextResponse.json(
        {
          error: `Transición inválida: ${reservation.status} → ${newStatus}`,
        },
        { status: 400 },
      );
    }

    const updated = await db.reservation.update({
      where: { id: reservation.id },
      data: { status: newStatus as ReservationStatus },
      select: { id: true, status: true },
    });

    // ── Side effect: notify the user (best-effort) ──────────────
    // Fire-and-forget — the status update itself has already committed,
    // so a notification DB error must NOT roll it back.
    if (reservation.userId) {
      try {
        const label = STATUS_LABELS[newStatus] ?? newStatus.toLowerCase();
        await notificationService.notify(
          reservation.userId,
          newStatus === 'CONFIRMED'
            ? 'RESERVATION_CONFIRMED'
            : 'SYSTEM',
          'Tu reserva fue actualizada',
          `Tu reserva ${reservation.confirmationCode} en ${reservation.business.name} fue ${label}.`,
        );
      } catch (e) {
        console.error('notify user of reservation status change failed:', e);
      }
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status as FrontendReservationStatus,
    });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('PATCH /api/owner/businesses/[slug]/reservations/[id]/status error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
