// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/[slug]/approve-owner
//
// Admin approves a proposed owner for a business.
// Sets ownerId = proposedOwnerId, clears proposedOwnerId,
// sets ownerStatus = APPROVED.
// Notifies the new owner.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

interface BusinessOwnerRow {
  id: string;
  name: string;
  proposedOwnerId: string | null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);
    const { slug } = await params;

    // Verify business exists and has a proposed owner (raw SQL — proposedOwnerId not in Prisma schema)
    const rows = await db.$queryRawUnsafe<BusinessOwnerRow[]>(
      `SELECT "id", "name", "proposedOwnerId" FROM "Business" WHERE "slug" = $1`,
      slug,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    const business = rows[0]!;

    if (!business.proposedOwnerId) {
      return NextResponse.json(
        { error: 'No hay un dueño propuesto para este negocio' },
        { status: 400 },
      );
    }

    // Transfer ownership via raw SQL
    await db.$executeRawUnsafe(
      `UPDATE "Business" SET "ownerId" = "proposedOwnerId", "proposedOwnerId" = NULL, "ownerStatus" = 'APPROVED' WHERE "slug" = $1`,
      slug,
    );

    // Notify the new owner (best-effort)
    await notificationService.notify(
      business.proposedOwnerId,
      'SYSTEM',
      '¡Aprobado como dueño!',
      `¡Aprobado! Ahora gestionas ${business.name}`,
    );

    // Refetch via Prisma to return full business object
    const updated = await db.business.findUnique({ where: { slug } });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/businesses/[slug]/approve-owner error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
