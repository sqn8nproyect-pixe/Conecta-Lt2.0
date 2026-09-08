// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/images/[...key] (GET)
//   Proxy de lectura de imágenes almacenadas en Cloudflare R2.
//
//   La URL pública r2.dev del bucket está desactivada (TLS
//   handshake failure), por lo que las imágenes subidas por los
//   dueños se sirven a través de la app usando las credenciales
//   S3 del servidor.
//
//   Ejemplo: GET /api/images/businesses/tasca-los-amigos/cover/uuid.png
//   Auth: pública (las imágenes son contenido público del sitio).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2';

/** Prefijos de clave permitidos (defensa contra path traversal). */
const ALLOWED_PREFIXES = ['businesses/', 'promotions/'];

/** Imágenes inmutables (keys contienen UUID) → caché agresiva. */
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: keySegments } = await params;
    const key = keySegments.join('/');

    // ── Validaciones de seguridad ──────────────────────────
    if (!key || key.includes('..') || key.startsWith('/')) {
      return NextResponse.json({ error: 'Clave inválida' }, { status: 400 });
    }
    if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
      return NextResponse.json({ error: 'Clave no permitida' }, { status: 403 });
    }

    // ── Leer objeto desde R2 ───────────────────────────────
    const object = await getR2Object(key);
    if (!object) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
        { status: 404 },
      );
    }

    // ── Devolver el stream con el Content-Type correcto ────
    const headers = new Headers(CACHE_HEADERS);
    if (object.contentType) {
      headers.set('Content-Type', object.contentType);
    } else {
      // Fallback por extensión
      const ext = key.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      if (ext && mimeMap[ext]) headers.set('Content-Type', mimeMap[ext]);
    }
    if (object.contentLength !== null) {
      headers.set('Content-Length', String(object.contentLength));
    }

    return new Response(object.body as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error('GET /api/images error:', e);
    return NextResponse.json(
      { error: 'Error al obtener la imagen' },
      { status: 500 },
    );
  }
}
