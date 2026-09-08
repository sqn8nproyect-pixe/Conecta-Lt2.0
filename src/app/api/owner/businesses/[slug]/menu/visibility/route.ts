// ─────────────────────────────────────────────────────────────
// CONECTA-LT — PATCH /api/owner/businesses/[slug]/menu/visibility
//
// El botón ON/OFF del dueño: hace la carta visible (u oculta) al
// público. Body: { menuVisible: boolean }. Efecto inmediato — el
// endpoint público GET /api/businesses/[slug]/menu respeta este
// flag sin caché.
//
// Auth: BUSINESS_OWNER o ADMIN + ownership check.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { setMenuVisible } from '@/server/services/menu.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }
    const b = body as Record<string, unknown>;
    if (typeof b?.menuVisible !== 'boolean') {
      return NextResponse.json(
        { error: 'menuVisible debe ser true o false' },
        { status: 400 },
      );
    }

    const updated = await setMenuVisible(user.id, slug, b.menuVisible);
    return NextResponse.json({ visible: updated.menuVisible });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error(
      'PATCH /api/owner/businesses/[slug]/menu/visibility error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
