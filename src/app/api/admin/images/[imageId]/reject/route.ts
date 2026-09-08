// ─────────────────────────────────────────────────────────────
// CONECTA-LT — POST /api/admin/images/[imageId]/reject
//
// Rechaza una imagen PENDING → REJECTED. No se elimina de la DB
// (el dueño la ve como rechazada en su panel) pero no es visible
// al público.
//
// Body opcional: { reason?: string } — motivo del rechazo (para
// la notificación al dueño).
//
// Auth: ADMIN only.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  try {
    const user = await requireRole('ADMIN' as UserRole);
    const { imageId } = await params;

    // Body opcional con motivo
    let reason: string | undefined;
    try {
      const body = await request.json();
      if (typeof body === 'object' && body !== null && typeof body.reason === 'string') {
        reason = body.reason.trim().slice(0, 200) || undefined;
      }
    } catch {
      // body vacío es válido
    }

    const image = await db.businessImage.findUnique({
      where: { id: imageId },
      include: { business: { select: { id: true, name: true, ownerId: true } } },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
        { status: 404 },
      );
    }

    if (image.approvalStatus === 'REJECTED') {
      return NextResponse.json(
        { error: 'Esta imagen ya está rechazada' },
        { status: 409 },
      );
    }

    const updated = await db.businessImage.update({
      where: { id: imageId },
      data: {
        approvalStatus: 'REJECTED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    // Notificar al dueño (best-effort)
    if (image.business.ownerId) {
      try {
        const msg = reason
          ? `Tu foto de ${image.business.name} fue rechazada: ${reason}`
          : `Tu foto de ${image.business.name} fue rechazada. Revisa las normas de CONECTA-LT.`;
        await notificationService.notify(
          image.business.ownerId,
          'SYSTEM',
          'Foto rechazada',
          msg,
        );
      } catch (err) {
        console.error('[reject-image] notify owner failed:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403
    console.error('POST /api/admin/images/[imageId]/reject error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
