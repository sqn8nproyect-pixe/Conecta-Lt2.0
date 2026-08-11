// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Notification Repository Layer (Etapa 7.A)
// Thin Prisma accessors for the Notification model.
//
// Persistent notifications = an "inbox" of important events for the
// user (reservation confirmed, coupon redeemed, review published…).
// These survive across sessions (unlike the ephemeral toast array in
// the Zustand store, which is for transient feedback only).
//
// All write paths accept an optional `tx` so the service can wrap them
// in a single db.$transaction() alongside the operation that triggered
// the notification (e.g. reservation insert + notification insert).
// In practice we currently fire them OUTSIDE the tx so a failure to
// record the notification can never roll back the user's actual write,
// but the option is here for future use.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/db';
import { Prisma, PrismaClient, type Notification } from '@prisma/client';

// Accept either the singleton client or a transaction client so the
// service layer can wrap write operations in db.$transaction().
type DbOrTx = PrismaClient | Prisma.TransactionClient;

// `Notification` row shape without relations — the model has no
// relations we currently expose to the service (the optional `user`
// relation is only used for `onDelete: Cascade` cleanup).
// `{}` is required by Prisma's `GetPayload` generics shape (the type
// parameter expects an object-literal shape describing the include/
// select clause) — we genuinely want the "no relations selected"
// payload here, so the `no-empty-object-type` rule is disabled for
// this line only.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type NotificationWithUser = Prisma.NotificationGetPayload<{}>;

export const notificationRepository = {
  /**
   * Create one notification row.
   *
   * `userId` is the recipient — the user whose inbox this notification
   * lands in. `type` is a string (e.g. 'RESERVATION_CONFIRMED',
   * 'COUPON_REDEEMED') so the schema stays flexible for future types
   * without a Prisma enum migration.
   *
   * Accepts an optional transaction client so the caller can wrap this
   * insert alongside the operation that triggered it (though in
   * practice we call this fire-and-forget outside any tx — see
   * `notificationService.notify`).
   */
  create: async (
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
    },
    tx?: DbOrTx,
  ): Promise<Notification> => {
    const client = tx ?? db;
    return client.notification.create({ data });
  },

  /**
   * List all notifications for a user, newest first, capped at 50 so
   * the inbox dropdown never grows unbounded. The UI further truncates
   * to the latest 10 in the dropdown itself.
   *
   * `read` is NOT filtered — both read and unread notifications are
   * returned so the user can scroll through their history.
   */
  listByUser: async (userId: string): Promise<Notification[]> => {
    return db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  /**
   * Count unread notifications for a user (for the navbar badge).
   *
   * Uses the `@@index([userId, read])` from the Prisma schema so the
   * query is a covering index scan — cheap even with thousands of
   * notifications per user.
   */
  countUnread: async (userId: string): Promise<number> => {
    return db.notification.count({
      where: { userId, read: false },
    });
  },

  /**
   * Mark a single notification as read.
   *
   * Scoped by BOTH `id` AND `userId` so user A can never flip user B's
   * notification (defense in depth — the route handler also resolves
   * the user from the session, but this prevents a malicious payload
   * like `{ "id": "<other-user's-notif-id>" }` from succeeding).
   *
   * Returns the freshly updated row (or null if no row matched, which
   * the service surfaces as a 404).
   *
   * Implementation note: we use `updateMany` (scoped by userId) instead
   * of `update` because `update` would throw P2025 if the id doesn't
   * exist OR if the id exists but belongs to another user. `updateMany`
   * silently no-ops in both cases, which is exactly the behavior we
   * want — the service then does a `findUnique` to either return the
   * updated row or null.
   */
  markAsRead: async (
    id: string,
    userId: string,
  ): Promise<Notification | null> => {
    await db.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return db.notification.findUnique({ where: { id } });
  },

  /**
   * Mark all unread notifications for a user as read.
   *
   * Returns `{ count }` — the number of rows actually flipped — so the
   * UI can show a toast like "3 notificaciones marcadas como leídas".
   */
  markAllAsRead: async (userId: string): Promise<{ count: number }> => {
    const result = await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { count: result.count };
  },
};
