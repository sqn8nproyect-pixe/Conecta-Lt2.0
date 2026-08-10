// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/reviews
//   GET  → list the authenticated user's reviews (with establishment).
//   POST → create or update a review for a business (by slug).
//
// All handlers require an authenticated session (requireUser()).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/server/auth';
import { reviewService } from '@/server/services/review.service';

// ─── Validation helpers ────────────────────────────────────────

const MIN_COMMENT_LEN = 10;
const MAX_COMMENT_LEN = 1000;

type ValidationError = { ok: false; error: string };
type ReviewInput = {
  ok: true;
  businessSlug: string;
  ambienteRating: number;
  servicioRating: number;
  precioCalidadRating: number;
  comment: string;
};

/**
 * Type guard: an integer between 1 and 5 (inclusive), the only valid
 * value for any sub-rating dimension.
 */
function isValidSubRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

/**
 * Validate the JSON body of POST /api/reviews.
 *
 * Required shape:
 *   - businessSlug:        non-empty string
 *   - ambienteRating:      integer 1-5
 *   - servicioRating:      integer 1-5
 *   - precioCalidadRating: integer 1-5
 *   - comment:             non-empty string, trimmed length 10..1000 chars
 *
 * The overall `rating` is NOT accepted from the client — the service
 * layer computes it as the rounded average of the 3 sub-ratings so the
 * server stays the single source of truth.
 *
 * Validation errors (all 400):
 *   - Missing any of the 3 sub-ratings → "Debes calificar ambiente, servicio y precio-calidad"
 *   - Any sub-rating present but not an integer 1-5 → per-field message
 */
function validateReviewBody(body: unknown): ValidationError | ReviewInput {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Cuerpo de la petición inválido (se esperaba JSON)' };
  }

  const b = body as Record<string, unknown>;

  // businessSlug
  if (typeof b.businessSlug !== 'string' || b.businessSlug.trim().length === 0) {
    return { ok: false, error: 'Falta businessSlug (string no vacío)' };
  }
  const businessSlug = b.businessSlug;

  // Sub-ratings — first check presence, then validity.
  const hasAmbiente = b.ambienteRating !== undefined && b.ambienteRating !== null;
  const hasServicio = b.servicioRating !== undefined && b.servicioRating !== null;
  const hasPrecio =
    b.precioCalidadRating !== undefined && b.precioCalidadRating !== null;

  if (!hasAmbiente || !hasServicio || !hasPrecio) {
    return {
      ok: false,
      error: 'Debes calificar ambiente, servicio y precio-calidad',
    };
  }

  if (
    !isValidSubRating(b.ambienteRating) ||
    !isValidSubRating(b.servicioRating) ||
    !isValidSubRating(b.precioCalidadRating)
  ) {
    return {
      ok: false,
      error:
        'Cada sub-rating (ambiente, servicio, precio-calidad) debe ser un número entero entre 1 y 5',
    };
  }

  const ambienteRating = b.ambienteRating;
  const servicioRating = b.servicioRating;
  const precioCalidadRating = b.precioCalidadRating;

  // comment
  if (typeof b.comment !== 'string') {
    return { ok: false, error: 'Falta comment (string)' };
  }
  const comment = b.comment.trim();
  if (comment.length < MIN_COMMENT_LEN) {
    return {
      ok: false,
      error: `El comentario debe tener al menos ${MIN_COMMENT_LEN} caracteres`,
    };
  }
  if (comment.length > MAX_COMMENT_LEN) {
    return {
      ok: false,
      error: `El comentario no puede exceder los ${MAX_COMMENT_LEN} caracteres`,
    };
  }

  return {
    ok: true,
    businessSlug,
    ambienteRating,
    servicioRating,
    precioCalidadRating,
    comment,
  };
}

// ─── Route handlers ────────────────────────────────────────────

/**
 * GET /api/reviews?userId=me
 *
 * For security, only `userId=me` is supported — callers cannot list
 * another user's reviews. Returns the current user's reviews, each
 * annotated with the transformed `establishment: Establishment`.
 *
 * Returns: Array<Review & { establishment: Establishment }>
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    // Only allow listing the current user's reviews.
    if (userIdParam && userIdParam !== 'me') {
      return NextResponse.json(
        { error: 'Solo se permite listar las reseñas del usuario actual (userId=me)' },
        { status: 403 },
      );
    }

    const reviews = await reviewService.listForUser(user.id);
    return NextResponse.json(reviews);
  } catch (e) {
    if (e instanceof Response) return e; // 401 from requireUser()
    console.error('GET /api/reviews error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reviews
 * Body: {
 *   businessSlug: string,
 *   ambienteRating: number (1-5),
 *   servicioRating: number (1-5),
 *   precioCalidadRating: number (1-5),
 *   comment: string
 * }
 *
 * The overall `rating` is computed by the service as the rounded average
 * of the 3 sub-ratings; it is NOT accepted from the client.
 *
 * Returns: { review: Review, business: Establishment }
 *   - `business` carries the freshly recalculated avgRating / reviewCount
 *     and the 3 per-dimension averages (ambienteRating, servicioRating,
 *     precioCalidadRating).
 *
 * Errors:
 *   400 — invalid body (missing sub-ratings, sub-rating out of range, comment too short/long)
 *   401 — not authenticated
 *   404 — business slug doesn't match any row
 *
 * Note: even though the service uses Prisma's `upsert`, we still guard
 * against PrismaClientKnownRequestError P2002 (unique constraint) in
 * case of a race between the upsert's internal SELECT and INSERT.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const validated = validateReviewBody(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const result = await reviewService.create({
      businessSlug: validated.businessSlug,
      userId: user.id,
      ambienteRating: validated.ambienteRating,
      servicioRating: validated.servicioRating,
      precioCalidadRating: validated.precioCalidadRating,
      comment: validated.comment,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 404 thrown by service

    // P2002 (unique constraint on [businessId, userId]) — race condition
    // between the upsert's internal SELECT and INSERT. Treat as success
    // by re-reading the (now-existing) review through the service.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      // We can't easily rebuild the full response here without re-running
      // the create flow; the cleanest path is to return a 409 and let the
      // client retry (the retry will hit the update branch of the upsert
      // and succeed). This is documented and intentional.
      return NextResponse.json(
        {
          error:
            'Conflicto al guardar la reseña (carrera de escritura). Reintenta la petición.',
        },
        { status: 409 },
      );
    }

    console.error('POST /api/reviews error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
