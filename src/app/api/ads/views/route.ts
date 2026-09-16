// ─────────────────────────────────────────────────────────────
// CONECTA-LT — /api/ads/views (POST) — Sprint 8.12
//
// Contador de impresiones del carrusel: el cliente informa en UNA
// petición los ids de anuncios recién mostrados (batch) y el
// servidor incrementa views para cada uno.
//
// El cliente deduplica por sesión (sessionStorage) para que
// refrescos/navegaciones de la SPA no inflen la métrica.
//
// Auth: pública (medición anónima de impresiones). Tope de 30 ids
// por llamada para evitar abuso trivial.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      ids?: unknown;
    } | null;

    const ids = Array.isArray(body?.ids)
      ? (body.ids as unknown[])
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 30)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, counted: 0 });
    }

    const result = await db.advertisement.updateMany({
      where: { id: { in: ids } },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, counted: result.count });
  } catch (e) {
    console.error('POST /api/ads/views error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
