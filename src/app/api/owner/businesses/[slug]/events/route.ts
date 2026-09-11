// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug]/events (Sprint 8.9)
//
// Propuestas de flyers del dueño (BusinessEvent) con flujo
// dueño→admin: lo que el dueño crea nace PENDING_REVIEW y SOLO
// el admin lo publica (portada /editorial) o lo rechaza.
//
// GET   → lista TODOS los eventos del local (los 4 estados) para
//         que el dueño siga el estado de sus propuestas.
// POST  → crea una propuesta (status forzado PENDING_REVIEW,
//         sortOrder 0, reviewNote null). Body: título, frase,
//         fecha/hora (startsAt + weekOf derivados en el cliente),
//         labels, tema, emoji y notas — MISMO formato que el ABM
//         admin, SIN businessId (viene del slug verificado) ni
//         status/sortOrder/reviewNote (reservados al admin).
//
// Auth: BUSINESS_OWNER o ADMIN + assertBusinessOwnership.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { assertBusinessOwnership } from '@/server/services/business.service';
import {
  eventInclude,
  parseOwnerEventPayload,
  serializeEvent,
} from '@/server/services/event.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

    // Verifica propiedad — lanza Response 404/403 si no es suyo.
    const biz = await assertBusinessOwnership(user.id, slug);

    const events = await db.businessEvent.findMany({
      where: { businessId: biz.id },
      include: eventInclude,
      orderBy: [{ weekOf: 'desc' }, { sortOrder: 'asc' }, { startsAt: 'asc' }],
    });

    return NextResponse.json(events.map(serializeEvent));
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug]/events error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

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

    const biz = await assertBusinessOwnership(user.id, slug);

    const body = await request.json().catch(() => null);
    const parsed = parseOwnerEventPayload(
      body,
      /* partial */ false,
      biz.id,
      // Sprint 8.10: valida que la imagen adjunta venga de la carpeta
      // R2 del propio local (events/<slug>/).
      biz.slug,
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const created = await db.businessEvent.create({
      data: {
        ...(parsed.data as Prisma.BusinessEventUncheckedCreateInput),
        status: 'PENDING_REVIEW',
        sortOrder: 0,
        reviewNote: null,
      },
      include: eventInclude,
    });

    return NextResponse.json(serializeEvent(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/owner/businesses/[slug]/events error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
