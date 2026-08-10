// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/categories
// Returns the list of business categories ordered by sortOrder.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { categoryRepository } from '@/server/repositories/business.repository';

export async function GET() {
  const categories = await categoryRepository.findAll();
  return NextResponse.json(categories);
}
