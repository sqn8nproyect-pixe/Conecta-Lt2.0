// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/[slug]/assign-owner
//
// Admin proposes a user as the owner of a business.
// Body: { email: string }
//
// - Finds user by email (404 if not found)
// - Promotes user to BUSINESS_OWNER if needed
// - Sets business.proposedOwnerId + ownerStatus = PENDING
// - Notifies the proposed owner
// - Returns the updated business
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole('ADMIN' as UserRole);
    const { slug } = await params;

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json(
        { error: 'email es requerido' },
        { status: 400 },
      );
    }

    // Find user by email
    const targetUser = await db.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
      select: { id: true, role: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 },
      );
    }

    // Promote to BUSINESS_OWNER if needed
    if (targetUser.role !== 'BUSINESS_OWNER') {
      await db.user.update({
        where: { id: targetUser.id },
        data: { role: 'BUSINESS_OWNER' },
      });
    }

    // Verify business exists
    const business = await db.business.findUnique({
      where: { slug },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    // Set proposed owner
    const updated = await db.business.update({
      where: { slug },
      data: {
        proposedOwnerId: targetUser.id,
        ownerStatus: 'PENDING',
      },
    });

    // Notify proposed owner (best-effort)
    await notificationService.notify(
      targetUser.id,
      'SYSTEM',
      'Propuesta de dueño',
      `Has sido propuesto como dueño de ${business.name}`,
    );

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/businesses/[slug]/assign-owner error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
