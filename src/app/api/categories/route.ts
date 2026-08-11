// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/categories
// Returns the list of business categories ordered by sortOrder.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { categoryRepository } from '@/server/repositories/business.repository';

export async function GET() {
  try {
    const categories = await categoryRepository.findAll();
    return NextResponse.json(categories);
  } catch (err) {
    console.error('[GET /api/categories] DB query failed:', err);
    return NextResponse.json(
      { error: 'DATABASE_UNAVAILABLE', message: 'No se pudieron cargar las categorías.' },
      { status: 503 },
    );
  }
}
