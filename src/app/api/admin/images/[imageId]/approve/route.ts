// ─────────────────────────────────────────────────────────────
// CONECTA-LT — POST /api/admin/images/[imageId]/approve
//
// Aprueba una imagen PENDING → APPROVED. La hace visible al público.
// Si es COVER, también actualiza business.coverImage.
//
// Auth: ADMIN only.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  try {
    const user = await requireRole('ADMIN' as UserRole);
    const { imageId } = await params;

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

    if (image.approvalStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Esta imagen ya está aprobada' },
        { status: 409 },
      );
    }

    // Actualizar a APPROVED
    const updated = await db.businessImage.update({
      where: { id: imageId },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    // Si es COVER, actualizar business.coverImage
    if (image.type === 'COVER') {
      await db.business.update({
        where: { id: image.businessId },
        data: { coverImage: image.url },
      });
    }

    // Notificar al dueño (best-effort)
    if (image.business.ownerId) {
      try {
        await notificationService.notify(
          image.business.ownerId,
          'SYSTEM',
          'Foto aprobada',
          `Tu foto de ${image.business.name} fue aprobada y ya es visible al público.`,
        );
      } catch (err) {
        console.error('[approve-image] notify owner failed:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403
    console.error('POST /api/admin/images/[imageId]/approve error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
