// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/admin/businesses/[id]/status (Etapa 7.C.1)
//
// Change a business's status (DRAFT / PENDING_REVIEW / ACTIVE /
// SUSPENDED / ARCHIVED). ADMIN-ONLY — MODERATOR can view the list
// but cannot change business status (defensive: status changes are
// the most destructive admin op, so we lock them to ADMIN).
//
// Body: { status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' }
//
// Side effect: if the business has an owner, notify them:
//   - status === 'SUSPENDED' → "Tu local X fue suspendido" /
//                              "Contacta al equipo de soporte para más información."
//   - status === 'ACTIVE' (from PENDING_REVIEW) → "¡Tu local X fue aprobado!" /
//                              "Ya es visible en el directorio público."
//
// The client is responsible for invalidating the relevant React Query
// caches (['businesses'], ['business', slug], ['admin', 'businesses']).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { BusinessStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';
import type { BusinessStatus as FrontendBusinessStatus } from '@/lib/types';

const VALID_STATUSES: ReadonlySet<FrontendBusinessStatus> = new Set([
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED',
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

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
      !VALID_STATUSES.has(rawStatus as FrontendBusinessStatus)
    ) {
      return NextResponse.json(
        {
          error:
            'status inválido (se esperaba DRAFT | PENDING_REVIEW | ACTIVE | SUSPENDED | ARCHIVED)',
        },
        { status: 400 },
      );
    }
    const status = rawStatus as FrontendBusinessStatus;

    // 404 if the business doesn't exist (fetch the prior status too so
    // we can decide whether to fire the "approved!" notification).
    const existing = await db.business.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, ownerId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    const updated = await db.business.update({
      where: { id },
      data: { status: status as BusinessStatus },
      select: { id: true, status: true },
    });

    // ── Side effect: notify the owner (best-effort) ──────────────
    // Fire-and-forget — the status update itself has already committed,
    // so a notification DB error must NOT roll it back.
    if (existing.ownerId) {
      try {
        const owner = await db.user.findUnique({
          where: { id: existing.ownerId },
          select: { id: true },
        });
        if (owner) {
          if (status === 'SUSPENDED') {
            await notificationService.notify(
              owner.id,
              'SYSTEM',
              'Tu local fue suspendido',
              `Tu local ${existing.name} fue suspendido. Contacta al equipo de soporte para más información.`,
            );
          } else if (
            status === 'ACTIVE' &&
            existing.status === 'PENDING_REVIEW'
          ) {
            await notificationService.notify(
              owner.id,
              'SYSTEM',
              '¡Tu local fue aprobado!',
              `Tu local ${existing.name} fue aprobado. Ya es visible en el directorio público.`,
            );
          }
        }
      } catch (e) {
        console.error('notify owner of business status change failed:', e);
      }
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status as FrontendBusinessStatus,
    });
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/businesses/[id]/status error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
