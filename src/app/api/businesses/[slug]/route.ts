// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/businesses/[slug]
// Returns a single establishment by its slug, 404 if not found.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { businessRepository } from '@/server/repositories/business.repository';
import { transformBusiness } from '@/server/services/business.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const business = await businessRepository.findBySlug(slug);
    if (!business) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(transformBusiness(business));
  } catch (err) {
    // Graceful JSON error so the client's res.json() never throws on
    // a serverless DB failure (returns clean 503 instead of HTML 500).
    console.error(`[GET /api/businesses/${slug}] DB query failed:`, err);
    return NextResponse.json(
      { error: 'DATABASE_UNAVAILABLE', message: 'No se pudo obtener el local.' },
      { status: 503 },
    );
  }
}
