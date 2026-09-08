// ─────────────────────────────────────────────────────────────
// CONECTA-LT — GET /api/admin/images/pending
//
// Lista todas las imágenes con approvalStatus=PENDING para que el
// admin las revise y apruebe/rechace.
//
// Auth: ADMIN only.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await requireRole('ADMIN' as UserRole);

    const pending = await db.businessImage.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        business: {
          select: { id: true, slug: true, name: true },
        },
      },
      orderBy: { sortOrder: 'asc' }, // más antiguas primero por sortOrder
    });

    return NextResponse.json({ images: pending, count: pending.length });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403
    console.error('GET /api/admin/images/pending error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
