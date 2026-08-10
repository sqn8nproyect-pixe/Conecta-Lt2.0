// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/reservations/[id]/cancel
// Cancels a reservation owned by the authenticated user.
//
// If the reservation had a linked coupon, the coupon is unlinked and
// reverted from USED back to CLAIMED (atomically, inside the same
// transaction as the status flip) so the user can reuse it on a future
// reservation.
//
// Returns 200 with `{ reservation: { id, status } }`.
// Errors:
//   401 — not authenticated (from requireUser)
//   404 — reservation id doesn't match any row
//   403 — reservation exists but belongs to a different user
//   400 — status not in {PENDING, CONFIRMED} → "ya no puede cancelarse"
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { reservationService } from '@/server/services/reservation.service';

/**
 * POST /api/reservations/[id]/cancel
 *
 * Path param: `id` — the Reservation id (cuid).
 * Body: ignored (the user identity comes from the session).
 *
 * Returns: { reservation: { id, status } }
 *   where `status` is always 'CANCELLED' on success.
 *
 * Errors:
 *   401 — No autenticado                       (from requireUser)
 *   404 — Reserva no encontrada
 *   403 — No tienes permiso para cancelar esta reserva
 *   400 — Esta reserva ya no puede cancelarse
 *
 * Atomicity:
 *   The status flip + the optional coupon unlink both run inside a
 *   single db.$transaction() in the service, so the coupon can never
 *   be left in USED state while the reservation is CANCELLED (or
 *   vice versa).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const result = await reservationService.cancelReservation(user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 404 / 403 / 400 from service
    console.error('POST /api/reservations/[id]/cancel error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
