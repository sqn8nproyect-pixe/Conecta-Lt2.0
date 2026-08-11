// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PUT /api/owner/businesses/[slug]/socials (Etapa 7.C.2)
//
// Replace the BusinessSocial array for a business. Body:
//   Array<{ type: string; value: string }>
//
// The PUT deletes any social whose `type` isn't in the new payload,
// then upserts each entry by [businessId, type]. This makes it a
// true "replace" operation — the owner dashboard sends the full
// list of socials (after add/remove actions in the UI).
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check (assertBusinessOwnership).
// Returns `{ ok: true }` on success.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { updateBusinessSocials } from '@/server/services/business.service';

export async function PUT(
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
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Se esperaba un array de redes sociales' },
        { status: 400 },
      );
    }

    const socials: Array<{ type: string; value: string }> = [];
    for (const raw of body) {
      if (typeof raw !== 'object' || raw === null) {
        return NextResponse.json(
          { error: 'Entrada de red social inválida' },
          { status: 400 },
        );
      }
      const r = raw as Record<string, unknown>;
      if (
        typeof r.type !== 'string' ||
        typeof r.value !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Entrada de red social inválida (faltan campos o tipos incorrectos)' },
          { status: 400 },
        );
      }
      socials.push({ type: r.type, value: r.value });
    }

    await updateBusinessSocials(user.id, slug, socials);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('PUT /api/owner/businesses/[slug]/socials error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
