// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Night Planner v2 — POST /api/planner/recommend
//
// Public endpoint (no auth required) that generates a Top 3
// night-plan recommendation for the given preferences.
//
// Blueprint FASE 13:
//   - Validates body with Zod (planner.schema.ts)
//   - Calls recommendNightPlanSafe (the service)
//   - Tracks PLANNER_SEARCH_STARTED + PLANNER_RESULTS_SHOWN
//   - Rate-limited to 10 requests/min per IP (in-memory)
//
// Response shapes:
//   200 → NightPlannerResult | NightPlannerEmptyResult
//   400 → { error: string, details?: [{field, message}] }
//   429 → { error: "Too many requests" }
//   500 → { error: string }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth';
import { analyticsService } from '@/server/services/analytics.service';
import { validatePlannerInput } from '@/server/planner/planner.schema';
import { recommendNightPlanSafe } from '@/server/planner/planner.service';
import type { NightPlannerEmptyResult, NightPlannerResult } from '@/server/planner/types';

// ─── Rate limiting (in-memory, per-IP) ──────────────────────
//
// Simple sliding-window counter. We don't use Redis because:
//   1. The blueprint explicitly says "no Redis por anticipación".
//   2. The planner endpoint is public but not high-traffic yet.
//   3. In-memory is reset on each deploy, which is fine for abuse
//      prevention (a persistent attacker would be rate-limited
//      within each deploy window).
//
// Limit: 10 requests per minute per IP. The planner is expensive
// (multiple DB queries + scoring), so 10/min is generous for a
// single user but prevents scraping.

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(ip: string): { ok: boolean; resetAt: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateBuckets.set(ip, { count: 1, resetAt });
    return { ok: true, resetAt };
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, resetAt: bucket.resetAt };
}

// Periodically purge expired buckets to prevent memory growth.
// (Runs on each request — cheap because Map iteration is fast for
// small sizes. In production with high traffic we'd use a proper
// TTL cache, but this is fine for now.)
function purgeExpiredBuckets() {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) {
      rateBuckets.delete(ip);
    }
  }
}

// ─── Extract client IP ──────────────────────────────────────
//
// Behind Vercel's edge network, the real client IP is in
// `x-forwarded-for` (or `x-real-ip`). We take the first IP in
// the list (the original client) and fall back to 'unknown' if
// no header is present (local dev).
function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// ─── Route handler ──────────────────────────────────────────
export async function POST(req: Request) {
  // ── 1. Rate limit ───────────────────────────────────────────
  purgeExpiredBuckets();
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      {
        status: 429,
        headers: {
          'retry-after': String(retryAfter),
          'content-type': 'application/json',
        },
      },
    );
  }

  // ── 2. Parse body ───────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de la solicitud inválido (JSON esperado)' },
      { status: 400 },
    );
  }

  // ── 3. Validate with Zod ────────────────────────────────────
  const validation = validatePlannerInput(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: 'Datos de preferencias inválidos',
        details: validation.errors,
      },
      { status: 400 },
    );
  }

  // ── 4. Optional: attach userId if logged in ─────────────────
  // The planner is public, but if the user is signed in we attach
  // their id to the analytics events so we can build per-user
  // funnels (completion rate per user, etc.).
  const user = await getCurrentUser();

  // ── 5. Track PLANNER_SEARCH_STARTED (fire-and-forget) ───────
  // We track BEFORE calling the service so we know the request was
  // attempted even if the service throws.
  void analyticsService
    .trackEvent({
      type: 'PLANNER_SEARCH_STARTED',
      userId: user?.id ?? null,
      metadata: {
        mood: validation.data.mood,
        company: validation.data.company,
        budget: validation.data.budget,
        guests: validation.data.guests,
        date: validation.data.date,
        startTime: validation.data.startTime,
        distance: validation.data.distance,
        citySlug: validation.data.citySlug,
      },
    })
    .catch(() => {});

  // ── 6. Call the service ─────────────────────────────────────
  const result = await recommendNightPlanSafe(validation.data);

  // If the service threw, it returns a Response (500) — propagate.
  if (result instanceof Response) {
    return result;
  }

  // ── 7. Track PLANNER_RESULTS_SHOWN (fire-and-forget) ────────
  const topScore =
    'recommendations' in result && result.recommendations.length > 0
      ? result.recommendations[0]?.score ?? 0
      : 0;
  const resultCount =
    'recommendations' in result ? result.recommendations.length : 0;
  const emptyReason =
    'reason' in result ? result.reason : null;

  void analyticsService
    .trackEvent({
      type: 'PLANNER_RESULTS_SHOWN',
      userId: user?.id ?? null,
      metadata: {
        resultCount,
        topScore,
        emptyReason,
        durationMs: result.meta.durationMs,
        candidateCount: result.meta.candidateCount,
        scoredCount: result.meta.scoredCount,
      },
    })
    .catch(() => {});

  // ── 8. Return the result ────────────────────────────────────
  return NextResponse.json(result, { status: 200 });
}

// ─── GET handler (health check / docs) ──────────────────────
//
// A simple GET returns the API contract so developers can discover
// the endpoint without reading the source. Not required by the
// blueprint but useful for debugging.
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/planner/recommend',
    description:
      'Genera un plan de noche personalizado (Top 3 recomendaciones)',
    rateLimit: `${RATE_LIMIT_MAX} requests per minute per IP`,
    requestShape: {
      mood: 'string[] (1-2 items: relax|date|friends|party|celebration|live_music|food_drinks|drinks)',
      company: 'string (solo|couple|friends|family|celebration)',
      budget: 'string (under_20|20_50|50_100|100_plus)',
      date: 'string (YYYY-MM-DD)',
      startTime: 'string (HH:mm 24h)',
      guests: 'number (1-50)',
      distance: 'string (nearby|10_min|20_min|any)',
      citySlug: 'string (kebab-case, e.g. los-teques)',
      zoneId: 'string? (optional)',
      wantsReservation: 'boolean (default true)',
      wantsPromotions: 'boolean (default true)',
      wantsRoute: 'boolean (default false)',
    },
  });
}
