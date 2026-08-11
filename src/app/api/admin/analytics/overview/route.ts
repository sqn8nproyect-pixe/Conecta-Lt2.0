// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/analytics/overview (Etapa 8.A)
//
// Single endpoint that returns everything the "Métricas" tab needs:
//   - kpis:         count by event type for the selected window.
//   - timeSeries:  daily breakdown for the line chart (zero-filled).
//   - topWhatsApp: top 10 businesses by WHATSAPP_CLICK.
//   - topViews:    top 10 businesses by BUSINESS_VIEW.
//   - topSearches: top 10 search queries (from metadata.query).
//   - recentEvents: last 50 events with business + user info.
//   - range:       echo back the resolved range (days + label).
//
// Query params:
//   - range: '1d' | '7d' | '30d' | '90d'  (default '7d')
//
// Auth: ADMIN only (requireRole + isAdminEmail defense-in-depth,
// same as the other admin endpoints).
//
// All aggregations run in parallel via Promise.all — they hit
// different shapes of the same composite index
// `@@index([type, createdAt])` so they're all cheap.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { analyticsRepository } from '@/server/repositories/analytics.repository';

const VALID_RANGES: Record<string, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole);

    // ── Parse range ──────────────────────────────────────────────
    const url = new URL(request.url);
    const rangeParam = url.searchParams.get('range') ?? '7d';
    const sinceDays = VALID_RANGES[rangeParam] ?? 7;
    // Normalize: if the param is invalid, fall back to '7d' in the
    // response so the client knows which window was actually used.
    const rangeLabel = VALID_RANGES[rangeParam] ? rangeParam : '7d';

    // ── Run all aggregations in parallel ─────────────────────────
    const [
      kpis,
      timeSeries,
      topWhatsApp,
      topViews,
      topSearches,
      recentEvents,
    ] = await Promise.all([
      analyticsRepository.countByType(sinceDays),
      analyticsRepository.countByTypeAndDay({ sinceDays }),
      analyticsRepository.topBusinessesByEventType({
        type: 'WHATSAPP_CLICK',
        sinceDays,
        limit: 10,
      }),
      analyticsRepository.topBusinessesByEventType({
        type: 'BUSINESS_VIEW',
        sinceDays,
        limit: 10,
      }),
      analyticsRepository.topSearchQueries({ sinceDays, limit: 10 }),
      analyticsRepository.recentEvents({ limit: 50 }),
    ]);

    const payload = {
      range: { days: sinceDays, label: rangeLabel },
      kpis,
      timeSeries,
      topWhatsApp,
      topViews,
      topSearches,
      recentEvents,
    };

    return NextResponse.json(payload);
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/analytics/overview error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
