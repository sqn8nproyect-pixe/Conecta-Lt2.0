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
//
//   OPTIMIZACIÓN (PSI 2026-10-08): las imágenes se re-codifican a
//   WebP (máx 1600px, q80) con sharp antes de servirlas. Los arte
//   subidos podían pesar >900KB en PNG — así se entregan en ~10x
//   menos. Fallback: si sharp falla, se sirve el original tal cual.
//   Excepciones: GIF (animación se rompería) y SVG (vector) pasan
//   sin tocar; audio de notas de voz no es image/* → intacto.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getR2Object } from '@/lib/r2';

/** Prefijos de clave permitidos (defensa contra path traversal).
 *  `events/` = flyers personalizados de la portada fin de semana (8.10).
 *  `ads/`    = arte de anuncios del carrusel de publicidad (8.12).
 *  `chat/`   = medios de chat (voz/imágenes, Sprint 9). Las claves son
 *              UUID (no adivinables); el medio se sirve público igual
 *              que hoy events/ads — aceptado en el plan de chat. */
const ALLOWED_PREFIXES = ['businesses/', 'promotions/', 'events/', 'ads/', 'chat/'];

/** Imágenes inmutables (keys contienen UUID) → caché agresiva. */
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

/** Tipos que NO se re-codifican: animación (gif) y vector (svg). */
const SKIP_TRANSFORM = new Set(['image/gif', 'image/svg+xml']);

/**
 * Re-codifica un buffer de imagen a WebP (máx 1600px, q80).
 * Devuelve null si la imagen no se puede procesar → servir original.
 */
async function toOptimizedWebp(buf: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buf, { failOn: 'none' })
      .rotate() // respetar orientación EXIF antes de redimensionar
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch (e) {
    console.error('sharp: fallo al optimizar, sirviendo original:', e);
    return null;
  }
}

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
    let contentType = object.contentType;
    if (!contentType) {
      // Fallback por extensión
      const ext = key.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      if (ext && mimeMap[ext]) contentType = mimeMap[ext];
    }

    // ── Optimización a WebP (raster re-codificable) ──
    if (contentType?.startsWith('image/') && !SKIP_TRANSFORM.has(contentType)) {
      const raw = Buffer.from(
        await new Response(object.body as unknown as BodyInit).arrayBuffer(),
      );
      const optimized = await toOptimizedWebp(raw);
      if (optimized && optimized.length < raw.length) {
        headers.set('Content-Type', 'image/webp');
        headers.set('Content-Length', String(optimized.length));
        return new Response(
          new Uint8Array(optimized), // Buffer genérico → BodyInit válido
          { status: 200, headers },
        );
      }
      // La optimización no redujo (ya era eficiente) → original
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', String(raw.length));
      return new Response(new Uint8Array(raw), { status: 200, headers });
    }

    // ── Sin transformación (gif/svg/audio/otros) → passthrough ──
    if (contentType) headers.set('Content-Type', contentType);
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
