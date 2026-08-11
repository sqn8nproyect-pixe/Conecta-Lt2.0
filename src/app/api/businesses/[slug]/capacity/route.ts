// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/businesses/[slug]/capacity
// Etapa 3.6 — Aforo en tiempo real.
//
// Auth required (any logged-in user can report). The most recent
// report wins (per-business) — there's no per-user vote history in
// this iteration.
//
// Body: { capacity: 'QUIET' | 'MODERATE' | 'FULL' }
//
// Returns:
//   200 { id, currentCapacity }     — report accepted
//   400 { error: 'Capacidad inválida' }
//   401 { error: 'No autenticado' }
//   404 { error: 'Negocio no encontrado' }
//   500 { error: 'Error interno del servidor' }
//
// Side effect: inserts a CAPACITY_REPORT AnalyticsEvent (best-effort,
// fire-and-forget — never blocks the response).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { reportBusinessCapacity } from '@/server/services/business.service';
import type { CapacityLevel } from '@/lib/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireUser();
    const { slug } = await params;

    // Parse body defensively — a missing/empty body or wrong shape
    // surfaces as a 400 'Capacidad inválida' rather than a 500.
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Capacidad inválida' },
        { status: 400 },
      );
    }
    const capacity = (body as { capacity?: unknown } | null)?.capacity;
    if (
      capacity !== 'QUIET' &&
      capacity !== 'MODERATE' &&
      capacity !== 'FULL'
    ) {
      return NextResponse.json(
        { error: 'Capacidad inválida' },
        { status: 400 },
      );
    }

    const result = await reportBusinessCapacity(
      user.id,
      slug,
      capacity as CapacityLevel,
    );
    return NextResponse.json(result);
  } catch (e) {
    // Service throws `Response` for 400/404 — propagate directly.
    if (e instanceof Response) return e;
    console.error('POST /api/businesses/[slug]/capacity error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
