// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/admin/reviews/[id]/status (Etapa 7.C.1)
//
// Change a review's status (PENDING / PUBLISHED / HIDDEN / FLAGGED).
// Both ADMIN and MODERATOR can use this (review moderation is the
// core moderator workflow).
//
// Body: { status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED' }
//
// Side effects (best-effort notify the review's author):
//   - non-PUBLISHED → PUBLISHED → "Tu reseña de X fue publicada"
//   - any → HIDDEN              → "Tu reseña de X fue oculta por un moderador"
//
// The client is responsible for invalidating ['admin', 'reviews'].
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { ReviewStatus as PrismaReviewStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';
import type { ReviewStatus } from '@/lib/types';

const VALID_STATUSES: ReadonlySet<ReviewStatus> = new Set([
  'PENDING',
  'PUBLISHED',
  'HIDDEN',
  'FLAGGED',
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const { id } = await params;

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
      !VALID_STATUSES.has(rawStatus as ReviewStatus)
    ) {
      return NextResponse.json(
        {
          error:
            'status inválido (se esperaba PENDING | PUBLISHED | HIDDEN | FLAGGED)',
        },
        { status: 400 },
      );
    }
    const status = rawStatus as ReviewStatus;

    // 404 if the review doesn't exist. We also fetch the prior status
    // + the business name + userId so we can fire the right notify.
    const existing = await db.review.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        business: { select: { name: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Reseña no encontrada' },
        { status: 404 },
      );
    }

    const updated = await db.review.update({
      where: { id },
      data: { status: status as PrismaReviewStatus },
      select: { id: true, status: true },
    });

    // ── Side effect: notify the review author (best-effort) ───────
    // Fire-and-forget — the status update itself has already committed.
    if (existing.userId) {
      try {
        if (
          status === 'PUBLISHED' &&
          existing.status !== 'PUBLISHED'
        ) {
          await notificationService.notify(
            existing.userId,
            'REVIEW_PUBLISHED',
            'Tu reseña fue publicada',
            `Tu reseña de ${existing.business.name} fue publicada.`,
          );
        } else if (status === 'HIDDEN') {
          await notificationService.notify(
            existing.userId,
            'SYSTEM',
            'Tu reseña fue oculta',
            `Tu reseña de ${existing.business.name} fue oculta por un moderador.`,
          );
        }
      } catch (e) {
        console.error('notify review author of status change failed:', e);
      }
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status as ReviewStatus,
    });
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/reviews/[id]/status error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
