// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug]/images
//   GET    → listar imágenes del negocio (ordenadas por sortOrder)
//   POST   → registrar URL de imagen en la DB después de upload exitoso
//   DELETE → eliminar imagen de la DB y de R2 (query param: imageId)
//
// Auth: BUSINESS_OWNER o ADMIN + verificación de propiedad.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { ImageType } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { deleteObject, isR2Configured } from '@/lib/r2';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';

/** Tipos de imagen aceptados en el body POST */
type ImageTypeParam = 'COVER' | 'GALLERY';
const VALID_IMAGE_TYPES: ReadonlySet<string> = new Set<ImageTypeParam>([
  'COVER',
  'GALLERY',
]);

// ─── GET — Listar imágenes del negocio ──────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole('BUSINESS_OWNER', 'ADMIN');
    const { slug } = await params;

    // Verificar propiedad — lanza 404/403 Response en caso de error.
    const biz = await assertBusinessOwnership(user.id, slug);

    const images = await db.businessImage.findMany({
      where: { businessId: biz.id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(images);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug]/images error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// ─── POST — Registrar imagen en la DB ───────────────────────
// Se llama después de que el frontend sube exitosamente a R2.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole('BUSINESS_OWNER', 'ADMIN');
    const { slug } = await params;

    // Verificar propiedad — lanza 404/403 Response en caso de error.
    const biz = await assertBusinessOwnership(user.id, slug);

    // ── Parsear body ───────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;

    // ── Validar campos requeridos ───────────────────────────
    if (typeof b.url !== 'string' || b.url.trim().length === 0) {
      return NextResponse.json(
        { error: 'url es requerida' },
        { status: 400 },
      );
    }

    if (
      typeof b.type !== 'string' ||
      !VALID_IMAGE_TYPES.has(b.type)
    ) {
      return NextResponse.json(
        { error: 'type debe ser COVER o GALLERY' },
        { status: 400 },
      );
    }

    const imageUrl = b.url.trim();
    const imageType = b.type as ImageTypeParam;
    const storageKey = typeof b.storageKey === 'string' ? b.storageKey.trim() : null;
    const sortOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;

    // ── Si es COVER: actualizar existente o crear nueva ─────
    if (imageType === 'COVER') {
      // Buscar si ya existe una imagen COVER para este negocio
      const existingCover = await db.businessImage.findFirst({
        where: {
          businessId: biz.id,
          type: 'COVER' as ImageType,
        },
      });

      if (existingCover) {
        // Actualizar la COVER existente
        const updated = await db.businessImage.update({
          where: { id: existingCover.id },
          data: {
            url: imageUrl,
            storageKey: storageKey ?? undefined,
            sortOrder,
          },
        });

        // Actualizar también business.coverImage
        await db.business.update({
          where: { id: biz.id },
          data: { coverImage: imageUrl },
        });

        return NextResponse.json(updated);
      }
    }

    // ── Crear nueva imagen ──────────────────────────────────
    const created = await db.businessImage.create({
      data: {
        businessId: biz.id,
        url: imageUrl,
        type: imageType as ImageType,
        storageKey: storageKey ?? undefined,
        sortOrder,
      },
    });

    // Si es COVER, también actualizar business.coverImage
    if (imageType === 'COVER') {
      await db.business.update({
        where: { id: biz.id },
        data: { coverImage: imageUrl },
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('POST /api/owner/businesses/[slug]/images error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

// ─── DELETE — Eliminar imagen de la DB y de R2 ──────────────
// Query param: imageId

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole('BUSINESS_OWNER', 'ADMIN');
    const { slug } = await params;

    // Verificar propiedad — lanza 404/403 Response en caso de error.
    const biz = await assertBusinessOwnership(user.id, slug);

    // ── Obtener imageId del query param ─────────────────────
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId || imageId.trim().length === 0) {
      return NextResponse.json(
        { error: 'imageId es requerido (query param)' },
        { status: 400 },
      );
    }

    // ── Buscar la imagen en la DB ───────────────────────────
    const image = await db.businessImage.findUnique({
      where: { id: imageId.trim() },
    });

    if (!image || image.businessId !== biz.id) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
        { status: 404 },
      );
    }

    // ── Eliminar de R2 (si hay storageKey y R2 está configurado) ─
    if (image.storageKey && isR2Configured()) {
      try {
        await deleteObject(image.storageKey);
      } catch (r2Err) {
        // Loguear pero no fallar — la imagen puede ya no existir en R2
        console.warn(
          `No se pudo eliminar de R2 la clave ${image.storageKey}:`,
          r2Err,
        );
      }
    }

    // ── Eliminar de la DB ───────────────────────────────────
    await db.businessImage.delete({
      where: { id: image.id },
    });

    // ── Si era COVER, limpiar business.coverImage ───────────
    if (image.type === 'COVER') {
      const business = await db.business.findUnique({
        where: { id: biz.id },
        select: { coverImage: true },
      });
      // Solo limpiar si la coverImage del negocio apunta a la URL eliminada
      if (business && business.coverImage === image.url) {
        await db.business.update({
          where: { id: biz.id },
          data: { coverImage: null },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('DELETE /api/owner/businesses/[slug]/images error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
