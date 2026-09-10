// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/editorial/active
//
// Endpoint público que devuelve el post editorial PUBLISHED más
// reciente (por weekOf). Lo consume el widget "Este fin de
// semana" de la HomePage. Si no hay posts o la DB no responde,
// devuelve post: null y el widget simplemente no se renderiza.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const post = await db.editorialPost.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { weekOf: 'desc' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        weekOf: true,
      },
    });
    return NextResponse.json({ post });
  } catch (err) {
    console.error('[GET /api/editorial/active] DB query failed:', err);
    return NextResponse.json(
      { post: null, error: 'DATABASE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
