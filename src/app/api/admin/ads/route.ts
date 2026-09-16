// ─────────────────────────────────────────────────────────────
// CONECTA-LT — /api/admin/ads (GET/POST) — Sprint 8.12
//
// ABM de los anuncios del carrusel de publicidad (Advertisement).
//
// GET   — lista TODOS los anuncios (activos e inactivos) con sus
//         métricas de vistas/clics — el argumento de venta ante
//         el anunciante.
// POST  — crea un anuncio (ADMIN only).
//
// Auth: GET ADMIN/MODERATOR · mutaciones ADMIN (mismo criterio
// que /api/admin/events). Validación en ad.service.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  parseAdPayload,
  serializeAd,
} from '@/server/services/ad.service';

export async function GET() {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const rows = await db.advertisement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(rows.map(serializeAd));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/admin/ads error:', e);
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
    const parsed = parseAdPayload(body, /* partial */ false);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Link interno: verificar que el negocio exista (slug exacto).
    const linkUrl = parsed.data.linkUrl as string;
    const internalMatch = /^\/local\/([a-z0-9-]+)$/.exec(linkUrl);
    if (internalMatch) {
      const business = await db.business.findUnique({
        where: { slug: internalMatch[1] },
        select: { id: true },
      });
      if (!business) {
        return NextResponse.json(
          { error: 'El local seleccionado no existe.' },
          { status: 400 },
        );
      }
    }

    const created = await db.advertisement.create({
      data: parsed.data as Prisma.AdvertisementUncheckedCreateInput,
    });

    return NextResponse.json(serializeAd(created), { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/ads error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
