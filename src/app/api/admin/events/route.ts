// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/admin/events (Sprint 8.6)
//
// ABM de los flyers del fin de semana (BusinessEvent).
//
// GET   — lista TODOS los eventos (DRAFT + PUBLISHED) con su local.
//         Query opcional: ?status=DRAFT|PUBLISHED · ?weekOf=YYYY-MM-DD
// POST  — crea un evento (ADMIN only).
//
// Auth: GET ADMIN/MODERATOR · mutaciones ADMIN (mismo criterio que
// /api/admin/businesses). El check de que el local exista se hace
// en el handler (400 con mensaje claro si no).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { caracasParts, deriveFrom } from '@/lib/event-labels';
import {
  eventInclude,
  parseEventPayload,
  purgeEventImage,
  serializeEvent,
} from '@/server/services/event.service';

/** Reflejo inmediato en el sitio público (portada + todas las guías). */
function revalidateWeekendPages() {
  revalidatePath('/editorial');
  revalidatePath('/editorial/[slug]', 'page');
}

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const weekOf = searchParams.get('weekOf');

    const where: Prisma.BusinessEventWhereInput = {};
    if (
      status === 'DRAFT' ||
      status === 'PUBLISHED' ||
      // Sprint 8.9 — flujo dueño→admin
      status === 'PENDING_REVIEW' ||
      status === 'REJECTED'
    ) {
      where.status = status;
    }
    if (weekOf && /^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
      where.weekOf = new Date(`${weekOf}T00:00:00.000Z`);
    }

    const rows = await db.businessEvent.findMany({
      where,
      include: eventInclude,
      orderBy: [{ weekOf: 'desc' }, { sortOrder: 'asc' }, { startsAt: 'asc' }],
    });

    return NextResponse.json(rows.map(serializeEvent));
  } catch (e) {
    // 401 / 403 de requireRole() se propagan como Response.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/events error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole);

    const body = await request.json().catch(() => null);
    const parsed = parseEventPayload(body, /* partial */ false);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const businessId = parsed.data.businessId as string;
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'El local seleccionado no existe.' },
        { status: 400 },
      );
    }

    const created = await db.businessEvent.create({
      data: parsed.data as Prisma.BusinessEventUncheckedCreateInput,
      include: eventInclude,
    });

    revalidateWeekendPages();

    return NextResponse.json(serializeEvent(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/events error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// Sprint 8.11 — DELETE ?weekOf=YYYY-MM-DD — "limpiar semana": borra
// de UNA VEZ todos los flyers de una semana vencida (sábado del
// weekOf), incluido su arte en R2 (best-effort). Solo semanas
// ESTRICTAMENTE pasadas — la en curso y las futuras se rechazan.
export async function DELETE(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { searchParams } = new URL(request.url);
    const weekOf = searchParams.get('weekOf');
    if (!weekOf || !/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
      return NextResponse.json(
        { error: 'Query weekOf requerida (YYYY-MM-DD, sábado de la semana).' },
        { status: 400 },
      );
    }

    // Guardía server-side: la semana debe ser pasada (wall clock Caracas).
    const todayWeek = deriveFrom(
      caracasParts(new Date().toISOString()).date,
    )?.weekOf;
    if (todayWeek && weekOf >= todayWeek) {
      return NextResponse.json(
        { error: 'Solo se pueden limpiar semanas pasadas.' },
        { status: 400 },
      );
    }

    const weekDate = new Date(`${weekOf}T00:00:00.000Z`);

    // 1) Localizar los flyers de esa semana (para purgar su arte R2).
    const rows = await db.businessEvent.findMany({
      where: { weekOf: weekDate },
      select: { id: true, imageKey: true },
    });
    if (rows.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // 2) Borrado físico en DB.
    const result = await db.businessEvent.deleteMany({
      where: { weekOf: weekDate },
    });

    // 3) Purgar imágenes en R2 — best-effort, en paralelo.
    await Promise.allSettled(
      rows.map((r) => purgeEventImage(r.imageKey)),
    );

    // 4) La portada y las guías se actualizan AL INSTANTE.
    revalidateWeekendPages();

    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/admin/events error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
