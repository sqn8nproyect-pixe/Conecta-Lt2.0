// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/admin/businesses/[slug]/status
//
// Change a business's status (DRAFT / PENDING_REVIEW / ACTIVE /
// SUSPENDED / ARCHIVED). ADMIN-ONLY.
//
// NOTE: This route accepts the business id via the `slug` URL param
// (kept the param name `slug` for consistency with the other admin
// business routes, even though we treat it as an id here).
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
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { slug: id } = await params;

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
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/businesses/[slug]/status error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
