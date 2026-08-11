// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Notification Service Layer (Etapa 7.A)
//
// Orchestrates the persistent-notification "inbox" flow:
//
//   - notify(userId, type, title, message)
//       Fire-and-forget helper called by other services (reservation,
//       promotion, review) after a successful operation. NEVER throws
//       — notifications are best-effort. If the DB write fails, we log
//       it and move on; the user's actual operation (reserving a
//       table, claiming a coupon, etc.) must NEVER be rolled back just
//       because we couldn't record a notification.
//
//   - listMyNotifications(userId)  → Array<NotificationEntry>
//       Returns the user's last 50 notifications, newest first.
//
//   - countUnread(userId)          → number
//       Used by the navbar badge (but the client can also derive it
//       from `listMyNotifications` — this is the canonical source).
//
//   - markAsRead(userId, id)       → void
//       Mark one notification as read. Throws a 404 Response if the
//       notification doesn't exist or belongs to another user (so the
//       route handler can propagate it via the standard
//       `if (e instanceof Response) return e` pattern).
//
//   - markAllAsRead(userId)        → { count: number }
//       Flip every unread notification for the user to read in a
//       single UPDATE. Returns the number of rows actually changed.
//
// Errors (other than the 404 from markAsRead) are NEVER thrown — they
// are caught and logged so the calling service's flow is uninterrupted.
// ─────────────────────────────────────────────────────────────

import { notificationRepository } from '@/server/repositories/notification.repository';

/**
 * The set of notification types we currently emit.
 *
 * The Prisma schema stores `type` as a plain `String` (not an enum) so
 * we can add new types without a migration. This union is the
 * compile-time contract for the callers (reservation / promotion /
 * review services) — anything else would be a bug.
 *
 * `SYSTEM` is the catch-all for generic messages (welcome, announcements).
 * `CAPACITY_REPORTED` is reserved for future use (owner/admin flow).
 */
export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'COUPON_REDEEMED'
  | 'REVIEW_PUBLISHED'
  | 'CAPACITY_REPORTED' // future (owner/admin flow)
  | 'SYSTEM'; // generic / catch-all

/**
 * Public shape returned by `listMyNotifications` — JSON-safe (Date → ISO
 * string) and stripped of `userId` (the caller already knows who they
 * are). Mirrors the frontend `PersistentNotification` interface in
 * `src/lib/types.ts`.
 */
export interface NotificationEntry {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO
}

/**
 * Map a Prisma Notification row to the JSON-safe `NotificationEntry`.
 * Centralized so the three list/mark handlers all return the same shape.
 */
function toEntry(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}): NotificationEntry {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

/**
 * Build a JSON Response (thrown from service → returned by route handler).
 * Throwing a Response is the same convention used by `requireUser()`
 * and the other services in this codebase.
 */
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const notificationService = {
  /**
   * Internal helper — used by reservation / promotion / review services
   * to record a persistent notification after a successful operation.
   *
   * Fire-and-forget contract:
   *   - NEVER throws (notifications are best-effort).
   *   - If the DB write fails, log and move on — the user's actual
   *     operation must NEVER be rolled back because of this.
   *   - Returns `Promise<void>` (resolved after the insert) so callers
   *     CAN `await` it if they want to ensure the notification lands
   *     before responding (the reservation service does this), but
   *     they don't HAVE to.
   */
  notify: async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> => {
    try {
      await notificationRepository.create({ userId, type, title, message });
    } catch (e) {
      // Best-effort — never propagate. The user's operation already
      // succeeded; a missing notification is a degraded experience,
      // not a failure.
      console.error('notification.create failed:', e);
    }
  },

  /**
   * List the authenticated user's last 50 notifications, newest first.
   *
   * Returns an empty array (not an error) when the user has no
   * notifications yet — the navbar dropdown renders its empty state.
   */
  listMyNotifications: async (
    userId: string,
  ): Promise<NotificationEntry[]> => {
    const rows = await notificationRepository.listByUser(userId);
    return rows.map(toEntry);
  },

  /**
   * Count the user's unread notifications — drives the navbar badge.
   *
   * The client can also derive this from `listMyNotifications` (filter
   * by `read === false` and count), but this endpoint is cheaper when
   * the user has lots of notifications (a single `count` vs. fetching
   * 50 rows). We expose it via the `X-Unread-Count` response header on
   * GET /api/notifications.
   */
  countUnread: async (userId: string): Promise<number> => {
    return notificationRepository.countUnread(userId);
  },

  /**
   * Mark a single notification as read.
   *
   * Throws a 404 Response if the notification doesn't exist OR belongs
   * to another user — the route handler catches that and propagates it
   * via the standard `if (e instanceof Response) return e` pattern.
   *
   * The ownership check lives in the repository (`updateMany` scoped by
   * `userId`), so a malicious payload like `{ "id": "<someone else's
   * notif>" }` silently no-ops and is then surfaced as a 404 here.
   */
  markAsRead: async (
    userId: string,
    notificationId: string,
  ): Promise<void> => {
    const updated = await notificationRepository.markAsRead(
      notificationId,
      userId,
    );
    if (!updated) {
      throw jsonError('Notificación no encontrada', 404);
    }
  },

  /**
   * Mark all unread notifications for the user as read in a single
   * UPDATE. Returns `{ count }` — the number of rows actually flipped
   * (0 if the user had no unread notifications, in which case the UI
   * hides the "Marcar todo como leído" button anyway).
   */
  markAllAsRead: async (
    userId: string,
  ): Promise<{ count: number }> => {
    return notificationRepository.markAllAsRead(userId);
  },
};
