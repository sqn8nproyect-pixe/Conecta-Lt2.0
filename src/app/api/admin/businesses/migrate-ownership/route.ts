// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/migrate-ownership
//
// One-time migration: assign admin user as owner of all businesses
// that currently have no owner (ownerId IS NULL).
// Returns { count: number } of updated businesses.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { ADMIN_EMAILS } from '@/lib/admin-config';

export async function POST() {
  try {
    await requireRole('ADMIN' as UserRole);

    // Find the admin user by the first ADMIN_EMAILS entry
    const adminEmail = ADMIN_EMAILS[0];
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'No hay emails de admin configurados' },
        { status: 500 },
      );
    }

    const admin = await db.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Usuario admin no encontrado' },
        { status: 404 },
      );
    }

    // Update all businesses with no owner
    const result = await db.business.updateMany({
      where: { ownerId: null },
      data: { ownerId: admin.id },
    });

    return NextResponse.json({ count: result.count });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/businesses/migrate-ownership error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
