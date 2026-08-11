// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/users (Etapa 7.C.1)
//
// List all users with id / name / email / image / role / createdAt.
// Supports:
//   ?role=ADMIN         filter by UserRole
//   ?search=<text>      case-insensitive name/email contains
//
// Auth: ADMIN or MODERATOR (requireRole).
//
// Returns the array directly (no password hashes — there are none
// anyway since OAuth — and no `accounts` or `sessions` relations).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import type { AdminUser } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as UserRole;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const rows = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    const result: AdminUser[] = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role as AdminUser['role'],
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/users error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
