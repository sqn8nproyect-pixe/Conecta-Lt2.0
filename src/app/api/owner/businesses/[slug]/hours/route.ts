// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PUT /api/owner/businesses/[slug]/hours (Etapa 7.C.2)
//
// Replace the entire BusinessHours array for a business. Body:
//   Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
//
// The PUT is implemented as an upsert-per-day inside a single
// `db.$transaction()` so a 7-day update is atomic. Days not in the
// payload keep their existing row (the owner dashboard always sends
// all 7 days, so this is fine).
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check (assertBusinessOwnership).
// Returns `{ ok: true }` on success.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { updateBusinessHours } from '@/server/services/business.service';

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
        { error: 'Se esperaba un array de horarios' },
        { status: 400 },
      );
    }

    const hours: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    }> = [];
    for (const raw of body) {
      if (typeof raw !== 'object' || raw === null) {
        return NextResponse.json(
          { error: 'Entrada de horario inválida' },
          { status: 400 },
        );
      }
      const r = raw as Record<string, unknown>;
      if (
        typeof r.dayOfWeek !== 'number' ||
        typeof r.openTime !== 'string' ||
        typeof r.closeTime !== 'string' ||
        typeof r.isClosed !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Entrada de horario inválida (faltan campos o tipos incorrectos)' },
          { status: 400 },
        );
      }
      hours.push({
        dayOfWeek: r.dayOfWeek,
        openTime: r.openTime,
        closeTime: r.closeTime,
        isClosed: r.isClosed,
      });
    }

    await updateBusinessHours(user.id, slug, hours);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('PUT /api/owner/businesses/[slug]/hours error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
