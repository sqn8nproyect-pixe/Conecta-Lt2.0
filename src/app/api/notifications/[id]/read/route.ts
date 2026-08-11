// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/notifications/[id]/read (Etapa 7.A)
// Marks a single notification as read for the authenticated user.
//
// The ownership check is enforced by the repository (the `updateMany`
// is scoped by BOTH `id` AND `userId`), so a malicious payload like
// `{ id: "<someone else's notif>" }` silently no-ops and is then
// surfaced as a 404 by the service.
//
// Returns 200 with `{ ok: true }` on success.
// Errors:
//   401 — No autenticado (from requireUser)
//   404 — Notificación no encontrada (doesn't exist or belongs to another user)
//   500 — unexpected server error
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { notificationService } from '@/server/services/notification.service';

/**
 * POST /api/notifications/[id]/read
 *
 * Path param: `id` — the Notification id (cuid).
 * Body: ignored (the user identity comes from the session).
 *
 * Returns: { ok: true }
 *
 * Errors:
 *   401 — No autenticado                         (from requireUser)
 *   404 — Notificación no encontrada             (doesn't exist OR
 *                                                  belongs to another user)
 *   500 — unexpected server error
 *
 * Idempotent: marking an already-read notification as read is a no-op
 * that still returns 200 `{ ok: true }` (the underlying `updateMany`
 * matches the row but the `data` is identical — no rows are actually
 * changed, but the subsequent `findUnique` still returns the row).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    await notificationService.markAsRead(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 404 from service
    console.error('POST /api/notifications/[id]/read error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
