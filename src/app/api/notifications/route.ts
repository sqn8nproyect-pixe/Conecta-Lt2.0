// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/notifications (Etapa 7.A)
//   GET  → list the authenticated user's persistent notifications
//          (newest first, capped at 50 by the service).
//   POST → bulk actions: `{ action: 'markAllRead' }` flips every
//          unread notification for the user to read.
//
// All handlers require an authenticated session (requireUser()).
//
// The GET response also carries the unread count in the
// `X-Unread-Count` response header so the navbar can fetch the badge
// count in a single round-trip (the client can alternatively derive it
// from the response body — both are supported, the header is a
// convenience for callers that only need the count).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { notificationService } from '@/server/services/notification.service';

/**
 * GET /api/notifications
 *
 * Returns: NotificationEntry[] = [{
 *   id, type, title, message, read, createdAt (ISO string)
 * }]
 *
 * Headers:
 *   X-Unread-Count: number — count of unread notifications (for the
 *                  navbar badge). The client can also derive this from
 *                  the response body, but the header is a convenient
 *                  single source of truth.
 *
 * Errors:
 *   401 — No autenticado (from requireUser)
 *   500 — unexpected server error
 */
export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listMyNotifications(user.id),
      notificationService.countUnread(user.id),
    ]);
    return NextResponse.json(notifications, {
      headers: { 'X-Unread-Count': String(unreadCount) },
    });
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('GET /api/notifications error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications
 *
 * Body: { action: 'markAllRead' }
 *
 * Marks every unread notification for the user as read in a single
 * UPDATE. Returns `{ count }` — the number of rows actually flipped.
 *
 * Errors:
 *   400 — body missing or `action` not 'markAllRead'
 *   401 — No autenticado (from requireUser)
 *   500 — unexpected server error
 *
 * We deliberately don't support other actions yet (no DELETE, no
 * "mark all unread"). Adding a new action is a one-line change here +
 * a new service method — keep the body schema narrow on purpose so
 * the API surface stays small.
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

    if (
      typeof body !== 'object' ||
      body === null ||
      (body as Record<string, unknown>).action !== 'markAllRead'
    ) {
      return NextResponse.json(
        { error: 'Acción no soportada (se esperaba { action: "markAllRead" })' },
        { status: 400 },
      );
    }

    const result = await notificationService.markAllAsRead(user.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('POST /api/notifications error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
