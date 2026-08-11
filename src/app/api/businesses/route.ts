// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/businesses
// Returns list of active establishments, optionally filtered.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { businessRepository } from '@/server/repositories/business.repository';
import { transformBusiness } from '@/server/services/business.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // 'licorería' | 'tasca' | 'discoteca'
  const priceRange = searchParams.get('priceRange'); // '$' | '$$' | '$$$'
  const q = searchParams.get('q');

  const where: Prisma.BusinessWhereInput = {};
  if (category) where.category = { name: category };
  if (priceRange) where.priceRange = priceRange;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { specialty: { contains: q } },
    ];
  }

  try {
    const businesses = await businessRepository.findAll(where);
    return NextResponse.json(businesses.map(transformBusiness));
  } catch (err) {
    // Graceful JSON error so the client's `res.json()` never throws.
    // This matters on serverless hosts (e.g. Vercel) where the SQLite
    // file may be unavailable — the frontend can then show a retry
    // state instead of hanging on a parse failure.
    console.error('[GET /api/businesses] DB query failed:', err);
    return NextResponse.json(
      {
        error: 'DATABASE_UNAVAILABLE',
        message: 'No se pudo consultar la base de datos de locales.',
      },
      { status: 503 },
    );
  }
}
