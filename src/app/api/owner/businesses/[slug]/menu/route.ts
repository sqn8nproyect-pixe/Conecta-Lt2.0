// ─────────────────────────────────────────────────────────────
// CONECTA-LT — GET /api/owner/businesses/[slug]/menu (Etapa Menú)
//
// GET → carta completa del local + estado del switch
//       `menuVisible`. A diferencia del endpoint público, aquí el
//       dueño ve SIEMPRE su carta (aunque esté oculta al público).
//
// Auth: BUSINESS_OWNER o ADMIN + ownership check
// (assertBusinessOwnership, con override ADMIN).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { assertBusinessOwnership } from '@/server/services/business.service';
import { getBusinessMenu } from '@/server/services/menu.service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

    // Verify ownership — throws 404/403 Response on failure.
    const biz = await assertBusinessOwnership(user.id, slug);

    const [sections, business] = await Promise.all([
      getBusinessMenu(biz.id),
      db.business.findUnique({
        where: { id: biz.id },
        select: { menuVisible: true },
      }),
    ]);

    return NextResponse.json({
      visible: business?.menuVisible ?? false,
      sections,
    });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug]/menu error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
