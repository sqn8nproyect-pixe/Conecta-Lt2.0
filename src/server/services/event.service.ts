// ─────────────────────────────────────────────────────────────
// CONECTA-LT — event.service (Sprint 8.6)
//
// Validación + serialización del ABM de BusinessEvent (flyers).
// Usado por las rutas /api/admin/events y /api/admin/events/[id].
//
// Convenciones del modelo (heredadas del seed 8.7):
//  - startsAt: instante real (el seed lo construye con offset
//    -04:00 = Caracas). Solo se usa para ORDENAR la portada.
//  - dayLabel/dateLabel/timeLabel: strings pre-renderizados en
//    español a partir del wall clock Caracas — la portada los
//    muestra tal cual, sin Intl en runtime.
//  - weekOf: Date @db.Date — el sábado de la semana cubierta;
//    la portada agrupa/muestra la semana más reciente.
// ─────────────────────────────────────────────────────────────

import type { Prisma } from '@prisma/client';
import { EVENT_THEME_KEYS } from '@/lib/event-themes';
import type { AdminEvent } from '@/lib/types';

const LIMITS = {
  title: 80,
  tagline: 140,
  emoji: 8,
  dayLabel: 20,
  dateLabel: 20,
  timeLabel: 40,
  priceNote: 80,
  promoNote: 140,
  reviewNote: 280,
} as const;

/** Estados válidos del ciclo completo (admin puede mover entre todos). */
const ALL_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'] as const;

export type ParsedEvent =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function asTrimmed(v: unknown): string | undefined {
  return typeof v === 'string' ? v.trim() : undefined;
}

function checkLen(
  value: string,
  field: string,
  max: number,
): string | null {
  if (value.length < 1) return `${field} no puede quedar vacío.`;
  if (value.length > max)
    return `${field} no puede superar ${max} caracteres.`;
  return null;
}

/**
 * Valida y normaliza el body de POST (partial=false) o PATCH
 * (partial=true). Devuelve un objeto listo para
 * db.businessEvent.create/update (fechas ya convertidas a Date).
 */
export function parseEventPayload(
  body: unknown,
  partial: boolean,
): ParsedEvent {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Cuerpo de la petición inválido.' };
  }
  const b = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  // ── businessId (obligatorio en POST) ─────────────────────────
  const businessId = asTrimmed(b.businessId);
  if (businessId !== undefined) {
    data.businessId = businessId;
  } else if (!partial) {
    return { ok: false, error: 'Debes seleccionar el local del evento.' };
  }

  // ── strings obligatorios con límite de largo ──────────────────
  const requiredStrings: Array<{
    key: 'title' | 'tagline' | 'dayLabel' | 'dateLabel' | 'timeLabel';
    label: string;
  }> = [
    { key: 'title', label: 'El título' },
    { key: 'tagline', label: 'La frase del flyer' },
    { key: 'dayLabel', label: 'La etiqueta del día' },
    { key: 'dateLabel', label: 'La etiqueta de fecha' },
    { key: 'timeLabel', label: 'La etiqueta de hora' },
  ];
  for (const { key, label } of requiredStrings) {
    const value = asTrimmed(b[key]);
    if (value !== undefined) {
      const err = checkLen(value, label, LIMITS[key]);
      if (err) return { ok: false, error: err };
      data[key] = value;
    } else if (!partial) {
      return { ok: false, error: `${label} es obligatorio.` };
    }
  }

  // ── startsAt (obligatorio en POST) ───────────────────────────
  if (b.startsAt !== undefined) {
    const d = new Date(String(b.startsAt));
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: 'La fecha/hora de inicio es inválida.' };
    }
    data.startsAt = d;
  } else if (!partial) {
    return { ok: false, error: 'La fecha y hora del evento son obligatorias.' };
  }

  // ── weekOf "YYYY-MM-DD" (obligatorio en POST) ────────────────
  if (b.weekOf !== undefined) {
    const w = String(b.weekOf);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) {
      return { ok: false, error: 'La semana del evento es inválida.' };
    }
    data.weekOf = new Date(`${w}T00:00:00.000Z`);
  } else if (!partial) {
    return { ok: false, error: 'La semana del evento es obligatoria.' };
  }

  // ── theme (clave válida de las 12) ───────────────────────────
  const theme = asTrimmed(b.theme);
  if (theme !== undefined) {
    if (!EVENT_THEME_KEYS.includes(theme)) {
      return { ok: false, error: 'El tema seleccionado no existe.' };
    }
    data.theme = theme;
  }

  // ── emoji ─────────────────────────────────────────────────────
  const emoji = asTrimmed(b.emoji);
  if (emoji !== undefined) {
    if (emoji.length > LIMITS.emoji) {
      return { ok: false, error: 'El emoji es demasiado largo.' };
    }
    data.emoji = emoji.length === 0 ? '🎉' : emoji;
  }

  // ── notas opcionales (string vacío → null) ───────────────────
  for (const key of ['priceNote', 'promoNote'] as const) {
    const value = asTrimmed(b[key]);
    if (value !== undefined) {
      if (value.length > LIMITS[key]) {
        return {
          ok: false,
          error:
            key === 'priceNote'
              ? 'La nota de precio es demasiado larga.'
              : 'La nota de promoción es demasiado larga.',
        };
      }
      data[key] = value.length === 0 ? null : value;
    } else if (!partial) {
      data[key] = null;
    }
  }

  // ── sortOrder ─────────────────────────────────────────────────
  if (b.sortOrder !== undefined && b.sortOrder !== null && b.sortOrder !== '') {
    const n = Number(b.sortOrder);
    if (!Number.isInteger(n)) {
      return { ok: false, error: 'El orden debe ser un número entero.' };
    }
    data.sortOrder = n;
  }

  // ── status ────────────────────────────────────────────────────
  // Sprint 8.9: el admin puede mover un evento a cualquiera de los
  // 4 estados (aprobar/rechazar propuestas). El flujo del DUEÑO se
  // valida en su propio parser (parseOwnerEventPayload) — aquí solo
  // se llega vía /api/admin/events.
  const status = asTrimmed(b.status);
  if (status !== undefined) {
    if (!(ALL_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: 'El estado del evento es inválido.' };
    }
    data.status = status;
  }

  // ── reviewNote (nota del admin, Sprint 8.9) ────────────────────
  const reviewNote = asTrimmed(b.reviewNote);
  if (reviewNote !== undefined) {
    if (reviewNote.length > LIMITS.reviewNote) {
      return {
        ok: false,
        error: `La nota de revisión no puede superar ${LIMITS.reviewNote} caracteres.`,
      };
    }
    data.reviewNote = reviewNote.length === 0 ? null : reviewNote;
  }

  return { ok: true, data };
}

/**
 * Validación para el flujo del DUEÑO (Sprint 8.9): el dueño propone
 * un flyer para su local — nunca puede tocar businessId, status ni
 * sortOrder (esos los decide el server/admin). El alta nace
 * PENDING_REVIEW; la edición reenvía a revisión.
 *
 * @param businessId id VERIFICADO por assertBusinessOwnership — se
 *   inyecta aquí para reutilizar las reglas del parser admin.
 */
export function parseOwnerEventPayload(
  body: unknown,
  partial: boolean,
  businessId: string,
): ParsedEvent {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Cuerpo de la petición inválido.' };
  }
  const b = body as Record<string, unknown>;

  // Defense in depth: el dueño no define campos reservados al admin.
  for (const forbidden of ['status', 'sortOrder', 'businessId', 'reviewNote']) {
    if (b[forbidden] !== undefined) {
      return {
        ok: false,
        error: `El campo ${forbidden} no se puede definir desde el panel del dueño.`,
      };
    }
  }

  // Mismas reglas de forma/límites que el admin (strings, startsAt,
  // weekOf, theme, emoji, notas) con el local inyectado por la ruta.
  const clone: Record<string, unknown> = { ...b, businessId };
  return parseEventPayload(clone, partial);
}

export type EventWithBusiness = Prisma.BusinessEventGetPayload<{
  include: { business: { select: { id: true; name: true; slug: true } } };
}>;

export const eventInclude = {
  business: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.BusinessEventInclude;

/** Fila DB → payload JSON para el cliente (fechas ISO / YYYY-MM-DD). */
export function serializeEvent(ev: EventWithBusiness): AdminEvent {
  return {
    id: ev.id,
    businessId: ev.businessId,
    business: ev.business,
    title: ev.title,
    tagline: ev.tagline,
    emoji: ev.emoji,
    theme: ev.theme,
    dayLabel: ev.dayLabel,
    dateLabel: ev.dateLabel,
    timeLabel: ev.timeLabel,
    startsAt: ev.startsAt.toISOString(),
    priceNote: ev.priceNote,
    promoNote: ev.promoNote,
    // @db.Date se lee como medianoche UTC → slice da el YYYY-MM-DD
    weekOf: ev.weekOf.toISOString().slice(0, 10),
    sortOrder: ev.sortOrder,
    status: ev.status,
    reviewNote: ev.reviewNote,
    createdAt: ev.createdAt.toISOString(),
  };
}
