// ─────────────────────────────────────────────────────────────
// CONECTA-LT — ad.service (Sprint 8.12)
//
// Validación + serialización del ABM de Advertisement (carrusel
// de publicidad de la portada). Usado por /api/admin/ads,
// /api/admin/ads/[id] y /api/ads.
//
// Reglas del anuncio:
//  - imageUrl SIEMPRE es una ruta interna del proxy
//    /api/images/ads/… (nunca URL externa) — el arte se sube a R2
//    vía presign con imageType AD.
//  - linkUrl acepta exactamente dos formas:
//      · "/local/<slug>" → ficha del negocio (se verifica que
//        exista al guardar).
//      · "https://…" | "http://…" → destino externo del
//        anunciante (WhatsApp, Instagram, web).
//  - Ventana opcional de campaña (startsAt/endsAt) — el carrusel
//    público solo sirve anuncios activos dentro de su ventana.
// ─────────────────────────────────────────────────────────────

import type { Prisma } from '@prisma/client';
import { deleteObject } from '@/lib/r2';
import type { AdminAd } from '@/lib/types';

const LIMITS = {
  title: 60,
  imageUrl: 500,
  imageKey: 300,
  linkUrl: 500,
} as const;

export type ParsedAd =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function asTrimmed(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() : undefined;
}

function checkLen(value: string, field: string, max: number): string | null {
  if (value.length < 1) return `${field} no puede quedar vacío.`;
  if (value.length > max)
    return `${field} no puede superar ${max} caracteres.`;
  return null;
}

/** Valida la forma del destino del clic. Devuelve error o null. */
function validateLinkUrl(linkUrl: string): string | null {
  if (linkUrl.startsWith('/')) {
    // Interno: ficha del negocio en el directorio.
    if (!/^\/local\/[a-z0-9-]+$/.test(linkUrl)) {
      return 'El link interno debe tener la forma /local/<slug> (ej: /local/discoteca-medusa).';
    }
    return null;
  }
  // Externo: solo http(s) explícito — nada de javascript:, data:, etc.
  try {
    const u = new URL(linkUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return 'El link externo debe empezar por https:// (o http://).';
    }
    return null;
  } catch {
    return 'El link externo debe ser una URL válida que empiece por https://';
  }
}

/** Convierte fechas ISO del body a Date, validando la ventana. */
function parseWindow(
  b: Record<string, unknown>,
  data: Record<string, unknown>,
  partial: boolean,
): string | null {
  const startsAt = asTrimmed(b.startsAt);
  const endsAt = asTrimmed(b.endsAt);

  if (startsAt !== undefined) {
    if (startsAt === '' || startsAt === 'null') {
      data.startsAt = null;
    } else {
      const d = new Date(startsAt);
      if (Number.isNaN(d.getTime())) {
        return 'La fecha de inicio no es válida.';
      }
      data.startsAt = d;
    }
  } else if (!partial) {
    data.startsAt = null;
  }

  if (endsAt !== undefined) {
    if (endsAt === '' || endsAt === 'null') {
      data.endsAt = null;
    } else {
      const d = new Date(endsAt);
      if (Number.isNaN(d.getTime())) {
        return 'La fecha de fin no es válida.';
      }
      data.endsAt = d;
    }
  } else if (!partial) {
    data.endsAt = null;
  }

  const s = data.startsAt as Date | null;
  const e = data.endsAt as Date | null;
  if (s && e && e.getTime() <= s.getTime()) {
    return 'La fecha de fin debe ser posterior a la de inicio.';
  }
  return null;
}

/**
 * Valida y normaliza el body de POST (partial=false) o PATCH
 * (partial=true). Devuelve un objeto listo para
 * db.advertisement.create/update (fechas ya convertidas a Date).
 */
export function parseAdPayload(body: unknown, partial: boolean): ParsedAd {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Cuerpo de la petición inválido.' };
  }
  const b = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  // ── title (obligatorio en POST) ──────────────────────────────
  const title = asTrimmed(b.title);
  if (title !== undefined) {
    const err = checkLen(title, 'El nombre interno', LIMITS.title);
    if (err) return { ok: false, error: err };
    data.title = title;
  } else if (!partial) {
    return { ok: false, error: 'El nombre interno es obligatorio.' };
  }

  // ── imageUrl (obligatorio en POST): solo proxy de anuncios ──
  const imageUrl = asTrimmed(b.imageUrl);
  if (imageUrl !== undefined) {
    const err = checkLen(imageUrl, 'La imagen del anuncio', LIMITS.imageUrl);
    if (err) return { ok: false, error: err };
    if (!imageUrl.startsWith('/api/images/ads/')) {
      return {
        ok: false,
        error:
          'La imagen debe subirse con el cargador del panel (ruta /api/images/ads/…).',
      };
    }
    data.imageUrl = imageUrl;
  } else if (!partial) {
    return { ok: false, error: 'La imagen del anuncio es obligatoria.' };
  }

  // ── imageKey (opcional): clave R2 del objeto subido ─────────
  const imageKey = asTrimmed(b.imageKey);
  if (imageKey !== undefined) {
    const err = checkLen(imageKey, 'La clave de imagen', LIMITS.imageKey);
    if (err) return { ok: false, error: err };
    if (!imageKey.startsWith('ads/')) {
      return { ok: false, error: 'Clave de imagen inválida.' };
    }
    data.imageKey = imageKey;
  }

  // ── linkUrl (obligatorio en POST) ────────────────────────────
  const linkUrl = asTrimmed(b.linkUrl);
  if (linkUrl !== undefined) {
    const err = checkLen(linkUrl, 'El link del anuncio', LIMITS.linkUrl);
    if (err) return { ok: false, error: err };
    const linkErr = validateLinkUrl(linkUrl);
    if (linkErr) return { ok: false, error: linkErr };
    data.linkUrl = linkUrl;
  } else if (!partial) {
    return { ok: false, error: 'El link del anuncio es obligatorio.' };
  }

  // ── active (opcional, default true) ──────────────────────────
  if (typeof b.active === 'boolean') {
    data.active = b.active;
  } else if (b.active === 'true') {
    data.active = true;
  } else if (b.active === 'false') {
    data.active = false;
  } else if (!partial && b.active !== undefined) {
    return { ok: false, error: 'El estado activo no es válido.' };
  }

  // ── sortOrder (opcional, 0-999) ──────────────────────────────
  if (b.sortOrder !== undefined) {
    const n = Number(b.sortOrder);
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      return {
        ok: false,
        error: 'El orden debe ser un número entero entre 0 y 999.',
      };
    }
    data.sortOrder = n;
  }

  // ── ventana de campaña ───────────────────────────────────────
  const windowErr = parseWindow(b, data, partial);
  if (windowErr) return { ok: false, error: windowErr };

  return { ok: true, data };
}

/** Serializa una fila para el panel admin (fechas ISO). */
export function serializeAd(
  row: Prisma.AdvertisementGetPayload<Record<string, never>>,
): AdminAd {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    imageKey: row.imageKey,
    linkUrl: row.linkUrl,
    active: row.active,
    sortOrder: row.sortOrder,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    views: row.views,
    clicks: row.clicks,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * ¿Está "vivo" el anuncio ahora mismo? (activo y dentro de su
 * ventana de campaña). Usado por el redirect de clics.
 */
export function isAdLive(row: {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (!row.active) return false;
  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) return false;
  if (row.endsAt && row.endsAt.getTime() < now) return false;
  return true;
}

/** Borra el arte del anuncio en R2 — best-effort (un fallo de R2
 *  no bloquea el borrado del registro en DB). */
export async function purgeAdImage(
  imageKey: string | null | undefined,
): Promise<void> {
  if (!imageKey) return;
  try {
    await deleteObject(imageKey);
  } catch (e) {
    console.error('[ad.service] purge R2 image failed:', imageKey, e);
  }
}
