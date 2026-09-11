// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug]/events/[id]
//                 (Sprint 8.9)
//
// El dueño edita o cancela SUS propuestas de flyer. Reglas:
//  - Solo puede tocar eventos de SU local (ownership check).
//  - Solo PENDING_REVIEW y REJECTED son editables/borrables: lo
//    ya publicado o en borrador del admin es territorio editorial
//    (para cambios el dueño habla con el admin).
//  - PATCH devuelve la propuesta a PENDING_REVIEW (re-submit).
//
// PATCH  → edita y re-envía a revisión. Mismo cuerpo que POST.
// DELETE → cancela la propuesta (borrado físico; el UI pide
//          confirmación).
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

async function loadOwnedEvent(
  userId: string,
  slug: string,
  id: string,
): Promise<
  | { ok: true; businessId: string; slug: string }
  | { ok: false; response: NextResponse }
> {
  const biz = await assertBusinessOwnership(userId, slug);

  const ev = await db.businessEvent.findUnique({
    where: { id },
    select: { id: true, businessId: true, status: true },
  });
  if (!ev || ev.businessId !== biz.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Evento no encontrado.' },
        { status: 404 },
      ),
    };
  }
  if (ev.status !== 'PENDING_REVIEW' && ev.status !== 'REJECTED') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Esta propuesta ya fue procesada por el administrador y no se puede modificar. Escríbele si necesitas un cambio.',
        },
        { status: 409 },
      ),
    };
  }
  return { ok: true, businessId: biz.id, slug: biz.slug };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug, id } = await params;

    const owned = await loadOwnedEvent(user.id, slug, id);
    if (!owned.ok) return owned.response;

    const body = await request.json().catch(() => null);
    const parsed = parseOwnerEventPayload(
      body,
      /* partial */ true,
      owned.businessId,
      // Sprint 8.10: valida que la imagen adjunta venga de la carpeta
      // R2 del propio local (events/<slug>/).
      owned.slug,
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = await db.businessEvent.update({
      where: { id },
      data: {
        ...(parsed.data as Prisma.BusinessEventUncheckedUpdateInput),
        // Re-submit: vuelve a la fila de revisión del admin.
        status: 'PENDING_REVIEW',
      },
      include: eventInclude,
    });

    return NextResponse.json(serializeEvent(updated));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PATCH /api/owner/businesses/[slug]/events/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug, id } = await params;

    const owned = await loadOwnedEvent(user.id, slug, id);
    if (!owned.ok) return owned.response;

    await db.businessEvent.delete({ where: { id } });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/owner/businesses/[slug]/events/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
