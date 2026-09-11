// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/admin/events/[id] (Sprint 8.6)
//
// PATCH  — edita cualquier subset de campos del evento (ADMIN).
// DELETE — elimina el evento (ADMIN). Los flyers no se archivan:
//          borrar es irreversible (por eso el UI pide confirmación).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  eventInclude,
  parseEventPayload,
  serializeEvent,
} from '@/server/services/event.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = parseEventPayload(body, /* partial */ true);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await db.businessEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Evento no encontrado.' },
        { status: 404 },
      );
    }

    if (typeof parsed.data.businessId === 'string') {
      const business = await db.business.findUnique({
        where: { id: parsed.data.businessId },
        select: { id: true },
      });
      if (!business) {
        return NextResponse.json(
          { error: 'El local seleccionado no existe.' },
          { status: 400 },
        );
      }
    }

    const updated = await db.businessEvent.update({
      where: { id },
      data: parsed.data as Prisma.BusinessEventUncheckedUpdateInput,
      include: eventInclude,
    });

    return NextResponse.json(serializeEvent(updated));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/events/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { id } = await params;
    const existing = await db.businessEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Evento no encontrado.' },
        { status: 404 },
      );
    }

    await db.businessEvent.delete({ where: { id } });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/admin/events/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
