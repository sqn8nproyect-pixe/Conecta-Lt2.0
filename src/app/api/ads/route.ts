// ─────────────────────────────────────────────────────────────
// CONECTA-LT — /api/ads (GET) — Sprint 8.12
//
// Lista pública de anuncios VIVOS para el carrusel de la portada:
// activos y dentro de su ventana de campaña (si definieron una),
// ordenados por sortOrder y antigüedad.
//
// Auth: pública (el carrusel es contenido público del sitio).
// No expone métricas ni imageKey — solo lo mínimo para renderizar.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();

    const ads = await db.advertisement.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
      },
    });

    return NextResponse.json(
      { ads },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('GET /api/ads error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
