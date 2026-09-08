// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/upload/presign (POST)
//   Genera una URL firmada (presigned PUT) para subir una imagen
//   directamente desde el navegador a Cloudflare R2.
//
// Auth: BUSINESS_OWNER o ADMIN + verificación de propiedad del negocio.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { isAdminEmail } from '@/lib/admin-config';
import {
  isR2Configured,
  generatePresignedUploadUrl,
  ALLOWED_TYPES,
} from '@/lib/r2';
import { randomUUID } from 'crypto';

/** Extensiones mapeadas desde contentType */
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Tipos de imagen aceptados en el body */
type ImageTypeParam = 'COVER' | 'GALLERY' | 'PROMOTION';

const VALID_IMAGE_TYPES: ReadonlySet<string> = new Set<ImageTypeParam>([
  'COVER',
  'GALLERY',
  'PROMOTION',
]);

export async function POST(request: Request) {
  try {
    // ── Auth ───────────────────────────────────────────────
    const user = await requireRole('BUSINESS_OWNER', 'ADMIN');

    // ── Verificar R2 configurado ───────────────────────────
    if (!isR2Configured()) {
      throw new Response(
        JSON.stringify({
          error:
            'R2 no configurado. Configura las variables R2_* en .env',
        }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      );
    }

    // ── Parsear body ───────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new Response(
        JSON.stringify({
          error: 'Cuerpo de la petición inválido (se esperaba JSON)',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    if (typeof body !== 'object' || body === null) {
      throw new Response(
        JSON.stringify({
          error: 'Cuerpo de la petición inválido (se esperaba JSON)',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const b = body as Record<string, unknown>;

    // ── Validar campos requeridos ───────────────────────────
    if (
      typeof b.businessSlug !== 'string' ||
      b.businessSlug.trim().length === 0
    ) {
      throw new Response(
        JSON.stringify({ error: 'businessSlug es requerido' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    if (
      typeof b.fileType !== 'string' ||
      !ALLOWED_TYPES.includes(b.fileType as (typeof ALLOWED_TYPES)[number])
    ) {
      throw new Response(
        JSON.stringify({
          error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_TYPES.join(', ')}`,
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    if (
      typeof b.imageType !== 'string' ||
      !VALID_IMAGE_TYPES.has(b.imageType)
    ) {
      throw new Response(
        JSON.stringify({
          error: 'imageType debe ser COVER, GALLERY o PROMOTION',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const businessSlug = b.businessSlug.trim();
    const fileType = b.fileType as string;
    const imageType = b.imageType as ImageTypeParam;

    // ── Verificar propiedad del negocio ─────────────────────
    const business = await db.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true, slug: true, ownerId: true },
    });

    if (!business) {
      throw new Response(
        JSON.stringify({ error: 'Negocio no encontrado' }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }

    // Verificar que el usuario es dueño o admin
    const isAdmin = isAdminEmail(user.email);
    if (business.ownerId !== user.id && !isAdmin) {
      throw new Response(
        JSON.stringify({
          error: 'No tienes permisos para gestionar este local',
        }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      );
    }

    // ── Construir clave R2 ──────────────────────────────────
    const ext = EXT_MAP[fileType] || 'jpg';
    const uuid = randomUUID();
    let key: string;

    switch (imageType) {
      case 'PROMOTION':
        key = `promotions/${businessSlug}/${uuid}.${ext}`;
        break;
      case 'COVER':
        key = `businesses/${businessSlug}/cover/${uuid}.${ext}`;
        break;
      case 'GALLERY':
        key = `businesses/${businessSlug}/gallery/${uuid}.${ext}`;
        break;
      default:
        throw new Response(
          JSON.stringify({
            error: 'imageType debe ser COVER, GALLERY o PROMOTION',
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
    }

    // ── Generar URL firmada ─────────────────────────────────
    const result = await generatePresignedUploadUrl(key, fileType);

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400 / 503
    console.error('POST /api/upload/presign error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
