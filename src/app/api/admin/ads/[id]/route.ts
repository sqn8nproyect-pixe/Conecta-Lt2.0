// ─────────────────────────────────────────────────────────────
// CONECTA-LT — /api/admin/ads/[id] (PATCH/DELETE) — Sprint 8.12
//
// PATCH  — edición parcial (título, imagen, link, fechas, orden,
//          activo). Si cambia la imagen, la anterior se purga de
//          R2 (best-effort).
// DELETE — borra el anuncio y purga su arte en R2 (best-effort).
//
// Auth: ADMIN only. 404 con mensaje claro si el id no existe.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  parseAdPayload,
  purgeAdImage,
  serializeAd,
} from '@/server/services/ad.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { id } = await params;

    const existing = await db.advertisement.findUnique({
      where: { id },
      select: { id: true, imageKey: true, linkUrl: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Anuncio no encontrado.' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = parseAdPayload(body, /* partial */ true);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Link interno: verificar que el negocio exista (slug exacto).
    const linkUrl = parsed.data.linkUrl as string | undefined;
    if (linkUrl !== undefined) {
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
    }

    const updated = await db.advertisement.update({
      where: { id },
      data: parsed.data as Prisma.AdvertisementUncheckedUpdateInput,
    });

    // Si la imagen cambió, purgar el arte anterior de R2.
    const newImageKey = (parsed.data.imageKey as string | undefined) ?? undefined;
    if (
      newImageKey !== undefined &&
      existing.imageKey &&
      existing.imageKey !== newImageKey
    ) {
      await purgeAdImage(existing.imageKey);
    }

    return NextResponse.json(serializeAd(updated));
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/ads/[id] error:', e);
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

    const existing = await db.advertisement.findUnique({
      where: { id },
      select: { id: true, imageKey: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Anuncio no encontrado.' },
        { status: 404 },
      );
    }

    await db.advertisement.delete({ where: { id } });

    // Purgar el arte en R2 — best-effort, después del borrado DB.
    await purgeAdImage(existing.imageKey);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/admin/ads/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
