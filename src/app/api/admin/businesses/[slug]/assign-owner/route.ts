// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/[slug]/assign-owner
//
// Admin proposes a user as the owner of a business.
// Body: { email: string, force?: boolean }
//
// - Finds user by email (404 if not found)
// - Promotes user to BUSINESS_OWNER if needed
// - Sets business.proposedOwnerId + ownerStatus = PENDING
// - If the business already has a confirmed owner: 409 unless
//   `force: true` (explicit admin transfer → releases the current
//   owner first, then proposes the new one)
// - Notifies the proposed owner (and the replaced owner, if any)
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

    let body: { email?: string; force?: boolean };
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
      select: { id: true, name: true, ownerId: true },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    // Conflict guard — never silently overwrite a confirmed owner.
    // With `force: true` the admin explicitly transfers ownership:
    // the current owner is released and the new one goes to PENDING.
    let replacedOwnerId: string | null = null;
    if (business.ownerId) {
      if (body.force !== true) {
        return NextResponse.json(
          {
            error:
              'Este local ya tiene un dueño gestionando. No se puede asignar otro dueño.',
          },
          { status: 409 },
        );
      }
      replacedOwnerId = business.ownerId;
    }

    // Same-user guard — the target already proposed and pending:
    // idempotent re-assignment is allowed (re-notifies), so no 409 here.

    // Set proposed owner (releasing the replaced owner when forcing)
    const updated = await db.business.update({
      where: { slug },
      data: {
        proposedOwnerId: targetUser.id,
        ownerStatus: 'PENDING',
        ...(replacedOwnerId
          ? { ownerId: null, claimedAt: null }
          : {}),
      },
    });

    // Notify the replaced owner (best-effort)
    if (replacedOwnerId) {
      try {
        await notificationService.notify(
          replacedOwnerId,
          'SYSTEM',
          'Gestión transferida',
          `La gestión de ${business.name} fue transferida a otro dueño`,
        );
      } catch (err) {
        console.error('[assign-owner] notify replaced owner failed:', err);
      }
    }

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
