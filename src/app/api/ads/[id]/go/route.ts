// ─────────────────────────────────────────────────────────────
// CONECTA-LT — /api/ads/[id]/go (GET) — Sprint 8.12
//
// Destino de los clics del carrusel: incrementa el contador de
// clics del anuncio y redirige (302) a su linkUrl.
//
// Ventajas del redirect vs. contar en el cliente: funciona con
// <a href> puro (sin JS), no cuenta bots que nunca navegan, y
// centraliza la validación del destino.
//
// Auth: pública. Solo cuenta/redirige si el anuncio está VIVO
// (activo y dentro de su ventana); si no, 404.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdLive } from '@/server/services/ad.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ad = await db.advertisement.findUnique({
      where: { id },
      select: {
        linkUrl: true,
        active: true,
        startsAt: true,
        endsAt: true,
      },
    });

    if (!ad || !isAdLive(ad)) {
      return NextResponse.json(
        { error: 'Anuncio no disponible' },
        { status: 404 },
      );
    }

    // Seguridad: el linkUrl almacenado solo puede ser interno
    // (/local/…) o http(s) — validado en ad.service al guardar.
    // Re-verificación barata por si el dato cambiara fuera del API.
    const safe =
      ad.linkUrl.startsWith('/') ||
      ad.linkUrl.startsWith('https://') ||
      ad.linkUrl.startsWith('http://');
    if (!safe) {
      return NextResponse.json(
        { error: 'Destino del anuncio no permitido' },
        { status: 400 },
      );
    }

    await db.advertisement.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.redirect(new URL(ad.linkUrl, request.url), 302);
  } catch (e) {
    console.error('GET /api/ads/[id]/go error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
