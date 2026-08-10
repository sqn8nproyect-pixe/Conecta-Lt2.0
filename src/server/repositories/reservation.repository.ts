// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Reservation Repository Layer
// Thin Prisma accessors for the Reservation model.
//
// All write paths (create, updateStatus, linkCouponRedemption,
// unlinkCouponRedemption) accept an optional `tx` so the service can
// wrap them in a single db.$transaction() (same pattern as
// promotion.repository.ts).
//
// The relation shape (business minimal select + couponRedemption with
// promotion select) is defined once in `reservationInclude` and reused
// by every read so the service receives a consistent payload.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import {
  Prisma,
  PrismaClient,
  type CouponRedemption,
  type Reservation,
  type ReservationStatus,
} from '@prisma/client';

// Accept either the singleton client or a transaction client so the
// service layer can wrap write operations in db.$transaction().
type DbOrTx = PrismaClient | Prisma.TransactionClient;

// Minimal business shape used by reservation endpoints.
//
// We deliberately DON'T reuse `businessInclude` from
// business.repository.ts here because that pulls in hours/socials/
// images/promotions/reviews — none of which the reservation list or
// detail response needs. Selecting only the 6 fields the UI shows
// keeps the response payload small and the query cheap.
export const reservationBusinessSelect = {
  id: true,
  name: true,
  slug: true,
  address: true,
  coverImage: true,
  phone: true,
} satisfies Prisma.BusinessSelect;

// Shared include object — keeps the relation shape consistent across
// findById / listByUser / create. Exported so the
// `ReservationWithRelations` type can be derived from it via
// Prisma.ReservationGetPayload.
//
// Shape:
//   business          → { id, name, slug, address, coverImage, phone }
//   couponRedemption  → { id, status, usedAt, claimedAt,
//                         promotion: { id, title, code, image,
//                                      discount, price } } | null
//
// `couponRedemption` is a 1:1 optional relation (the CouponRedemption
// row holds the FK `reservationId @unique`). When no coupon is linked
// the field is `null`.
export const reservationInclude = {
  business: { select: reservationBusinessSelect },
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

// Re-exported type so callers don't need to redeclare the include shape.
// Used as the return type of findById / listByUser / create.
export type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

export const reservationRepository = {
  /**
   * Find a reservation by id, with its minimal business payload and
   * (optional) linked couponRedemption + promotion included.
   *
   * Accepts an optional transaction client (used by the cancel flow,
   * which needs to read the reservation + its linked coupon inside the
   * same tx as the status update + coupon unlink).
   *
   * Returns null if no row matches. Never throws.
   */
  findById: async (
    id: string,
    tx: DbOrTx = db,
  ): Promise<ReservationWithRelations | null> => {
    return tx.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });
  },

  /**
   * Look up a reservation by its confirmation code.
   *
   * Used by `generateUniqueConfirmationCode()` to detect collisions
   * before INSERT — the unique constraint on `confirmationCode` is the
   * final guard, but a pre-check lets us retry with a new code instead
   * of throwing P2002.
   *
   * Returns only `{ id }` (we don't need the full payload for a
   * uniqueness check) or null if no row matches.
   */
  findByConfirmationCode: async (
    code: string,
    tx: DbOrTx = db,
  ): Promise<{ id: string } | null> => {
    return tx.reservation.findUnique({
      where: { confirmationCode: code },
      select: { id: true },
    });
  },

  /**
   * List all reservations for a user, ordered by `date` ascending.
   *
   * Includes the minimal business payload + the linked couponRedemption
   * (with promotion) so the service can transform each row into the
   * frontend `MyReservationEntry` shape in a single round-trip.
   *
   * NOTE: we don't filter by status — cancelled / completed
   * reservations are returned too so the UI can render the user's
   * full reservation history (with status badges).
   */
  listByUser: async (
    userId: string,
  ): Promise<ReservationWithRelations[]> => {
    return db.reservation.findMany({
      where: { userId },
      include: reservationInclude,
      orderBy: { date: 'asc' },
    });
  },

  /**
   * Create a reservation row in PENDING status.
   *
   * The caller supplies the full data shape (confirmationCode is
   * generated upstream by the service's uniqueness-retry helper).
   * Returns the freshly created row with business + couponRedemption
   * relations included (so the service can build the response without
   * an extra round-trip).
   *
   * Accepts an optional transaction client so the service can wrap
   * this insert + the optional `linkCouponRedemption` write in a
   * single transaction (commit together or roll back together).
   */
  create: async (
    data: {
      confirmationCode: string;
      businessId: string;
      userId: string;
      name: string;
      phone: string;
      email: string | null;
      date: string;
      time: string;
      guests: number;
      notes: string | null;
    },
    tx: DbOrTx = db,
  ): Promise<ReservationWithRelations> => {
    return tx.reservation.create({
      data: {
        confirmationCode: data.confirmationCode,
        businessId: data.businessId,
        userId: data.userId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        date: data.date,
        time: data.time,
        guests: data.guests,
        notes: data.notes,
        status: 'PENDING',
      },
      include: reservationInclude,
    });
  },

  /**
   * Update a reservation's status (e.g. PENDING → CANCELLED).
   *
   * Returns the bare updated row (no relations) — callers that need
   * the relations after the update should call `findById` separately.
   *
   * Accepts an optional transaction client so the service can wrap
   * this update + the optional `unlinkCouponRedemption` write in a
   * single transaction.
   */
  updateStatus: async (
    id: string,
    status: ReservationStatus,
    tx: DbOrTx = db,
  ): Promise<Reservation> => {
    return tx.reservation.update({
      where: { id },
      data: { status },
    });
  },

  /**
   * Link a CouponRedemption to a reservation (1:1).
   *
   * Atomically:
   *   - sets `reservationId` on the CouponRedemption row
   *   - flips its `status` from CLAIMED → USED
   *   - stamps `usedAt = now()` so the UI can show "canjeado en reserva"
   *
   * The unique constraint on `CouponRedemption.reservationId`
   * guarantees a coupon can only ever be linked to ONE reservation —
   * if two concurrent reservations try to claim the same coupon, the
   * loser's UPDATE fails with P2002 (the service catches this and
   * surfaces a clean 400 "Este cupón ya fue usado").
   *
   * Accepts an optional transaction client so the service can wrap
   * this update + the reservation INSERT in a single transaction.
   */
  linkCouponRedemption: async (
    reservationId: string,
    couponRedemptionId: string,
    tx: DbOrTx = db,
  ): Promise<CouponRedemption> => {
    return tx.couponRedemption.update({
      where: { id: couponRedemptionId },
      data: {
        reservationId,
        status: 'USED',
        usedAt: new Date(),
      },
    });
  },

  /**
   * Unlink a CouponRedemption from its reservation, reverting it back
   * to a claimable state.
   *
   * Atomically:
   *   - clears `reservationId` (sets it to null)
   *   - reverts `status` from USED → CLAIMED
   *   - clears `usedAt` (sets it to null)
   *
   * Called by `cancelReservation` when a reservation with a linked
   * coupon is cancelled — this lets the user reuse the coupon on a
   * future reservation (the Etapa 4 "MIS CUPONES" list will show it
   * as CLAIMED again, not USED).
   *
   * Accepts an optional transaction client so the service can wrap
   * this update + the reservation status update in a single transaction.
   */
  unlinkCouponRedemption: async (
    couponRedemptionId: string,
    tx: DbOrTx = db,
  ): Promise<CouponRedemption> => {
    return tx.couponRedemption.update({
      where: { id: couponRedemptionId },
      data: {
        reservationId: null,
        status: 'CLAIMED',
        usedAt: null,
      },
    });
  },

  /**
   * Find a CouponRedemption by id, scoped to a user.
   *
   * Used by `createReservation` to validate that a couponRedemptionId
   * supplied by the client actually belongs to the current user before
   * linking it to the new reservation. If the coupon belongs to a
   * different user (or doesn't exist) we return null and the service
   * surfaces a 404 "Cupón no encontrado" (without leaking whose coupon
   * it actually is).
   *
   * Uses `findFirst` (not `findUnique`) because the compound
   * `(id, userId)` is NOT a unique constraint on CouponRedemption —
   * only `id` alone and `[userId, promotionId]` are.
   *
   * Returns the bare CouponRedemption row (no relations) — the caller
   * only needs `status` and `userId` for validation.
   *
   * Accepts an optional transaction client so the check happens inside
   * the same tx as the eventual linkCouponRedemption write.
   */
  findCouponRedemptionByUser: async (
    couponRedemptionId: string,
    userId: string,
    tx: DbOrTx = db,
  ): Promise<CouponRedemption | null> => {
    return tx.couponRedemption.findFirst({
      where: { id: couponRedemptionId, userId },
    });
  },
};
