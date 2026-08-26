// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/[slug]/reject-owner
//
// Admin rejects a proposed owner for a business.
// Clears proposedOwnerId, sets ownerStatus = REJECTED.
// Notifies the rejected user.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);
    const { slug } = await params;

    // Verify business exists and has a proposed owner
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, proposedOwnerId: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    if (!business.proposedOwnerId) {
      return NextResponse.json(
        { error: 'No hay un dueño propuesto para este negocio' },
        { status: 400 },
      );
    }

    const rejectedUserId = business.proposedOwnerId;

    // Reject the proposal
    const updated = await db.business.update({
      where: { slug },
      data: {
        proposedOwnerId: null,
        ownerStatus: 'REJECTED',
      },
    });

    // Notify the rejected user (best-effort)
    await notificationService.notify(
      rejectedUserId,
      'SYSTEM',
      'Solicitud de dueño rechazada',
      `Tu solicitud de dueño para ${business.name} fue rechazada`,
    );

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/businesses/[slug]/reject-owner error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
