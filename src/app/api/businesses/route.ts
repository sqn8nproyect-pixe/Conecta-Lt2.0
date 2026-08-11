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

  const businesses = await businessRepository.findAll(where);
  return NextResponse.json(businesses.map(transformBusiness));
}
