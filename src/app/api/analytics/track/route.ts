// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/analytics/track
// Public endpoint (no auth required) — fire-and-forget event tracking.
//
// If the user is logged in, their userId is attached to the event so
// we can later attribute views / clicks / searches to specific users
// (e.g. for a future "your recent activity" feature).
//
// Body shape:
//   {
//     type:          string,             // one of ANALYTICS_EVENT_TYPES
//     businessSlug?: string,             // optional — resolved to businessId
//     metadata?:     Record<string, unknown>,  // optional — arbitrary JSON
//   }
//
// Returns 200 with `{ ok: true }` on success.
// Returns 200 with `{ ok: false, reason: '...' }` on best-effort failures
//   (business not found, DB error) — tracking should never break the UX.
// Returns 400 with `{ error: 'Tipo de evento inválido' }` for an unknown
//   event type (this is a caller bug, not a transient issue).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth';
import { analyticsService } from '@/server/services/analytics.service';
import type { AnalyticsEventType } from '@/server/services/analytics.service';

/**
 * POST /api/analytics/track
 *
 * Public — anonymous tracking is supported (userId is attached only when
 * the user is logged in via getCurrentUser, which returns null instead
 * of throwing 401).
 */
export async function POST(request: Request) {
  try {
    // ── Parse JSON body ──────────────────────────────────────────────
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
    const rawType = b.type;
    if (typeof rawType !== 'string') {
      return NextResponse.json(
        { error: 'Tipo de evento inválido' },
        { status: 400 },
      );
    }

    // Cast through `string` so the service's runtime Set guard is the
    // single source of truth for which types are valid. The service
    // throws a 400 Response if the type is not in the allowed set.
    const type = rawType as AnalyticsEventType;

    const businessSlug =
      typeof b.businessSlug === 'string' ? b.businessSlug : null;
    const metadata =
      b.metadata && typeof b.metadata === 'object'
        ? (b.metadata as Record<string, unknown>)
        : undefined;

    // Attach userId when the user is logged in. Anonymous tracking is OK.
    const user = await getCurrentUser();

    const result = await analyticsService.trackEvent({
      type,
      businessSlug,
      userId: user?.id ?? null,
      metadata,
    });

    // Always 200 — even on best-effort failure (ok:false). The only
    // non-200 case is the 400 thrown by the service for an invalid type,
    // caught below as `e instanceof Response`.
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 400 from trackEvent validation
    console.error('POST /api/analytics/track error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
