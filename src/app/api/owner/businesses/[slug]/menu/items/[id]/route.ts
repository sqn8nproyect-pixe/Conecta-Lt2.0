// ─────────────────────────────────────────────────────────────
// CONECTA-LT — PATCH/DELETE /api/owner/businesses/[slug]/menu/items/[id]
//
// PATCH  → editar ítem. Body: { name?, description?, price?,
//          available?, featured?, sortOrder? }.
//          `available: false` = "No disponible" (no se borra).
// DELETE → elimina el ítem.
//
// Auth: BUSINESS_OWNER o ADMIN + ownership check (el ítem debe
// pertenecer a una sección del local del dueño).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { deleteItem, updateItem } from '@/server/services/menu.service';

async function parseBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
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

    const body = await parseBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const item = await updateItem(user.id, slug, id, body);
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error(
      'PATCH /api/owner/businesses/[slug]/menu/items/[id] error:',
      e,
    );
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

    await deleteItem(user.id, slug, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error(
      'DELETE /api/owner/businesses/[slug]/menu/items/[id] error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
