// ─────────────────────────────────────────────────────────────
// CONECTA-LT — POST /api/owner/businesses/[slug]/menu/sections
//
// Crea una sección de la carta (ej. "Cervezas", "Rones y Whisky",
// "Parrilla"). Body: { name }. El sortOrder se asigna al final
// automáticamente. Máx 20 secciones por local.
//
// Auth: BUSINESS_OWNER o ADMIN + ownership check.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { createSection } from '@/server/services/menu.service';

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

    const section = await createSection(user.id, slug, b?.name);
    return NextResponse.json(section, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error(
      'POST /api/owner/businesses/[slug]/menu/sections error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
