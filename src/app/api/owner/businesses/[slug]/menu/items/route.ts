// ─────────────────────────────────────────────────────────────
// CONECTA-LT — POST /api/owner/businesses/[slug]/menu/items
//
// Crea un ítem de la carta. Body: { sectionId, name, description?,
// price (USD), featured? }. La sección debe pertenecer al local.
// sortOrder se asigna al final. Máx 60 ítems por sección.
//
// Auth: BUSINESS_OWNER o ADMIN + ownership check.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { createItem } from '@/server/services/menu.service';

export async function POST(
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

    const item = await createItem(user.id, slug, b);
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('POST /api/owner/businesses/[slug]/menu/items error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
