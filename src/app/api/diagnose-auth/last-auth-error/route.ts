// /api/diagnose-auth/last-auth-error — Lee los últimos errores de Auth.js
// capturados desde logger.error (tabla AuthErrorLog en Neon).
//
// Contexto: los errores reales del flujo OAuth solo van al log de funciones
// de Vercel (inaccesible desde el sandbox de desarrollo). Esta tabla los
// persiste para poder diagnosticar fallos como error=Configuration sin
// pedirle screenshots de logs al dueño.
//
// Nota: no expone secretos — solo mensajes/stacks de errores de auth.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rows = await db.authErrorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        message: true,
        stack: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        count: rows.length,
        errors: rows,
        hint: 'Últimos 5 errores de Auth.js (más recientes primero). Si count=0, aún no se registra ningún fallo desde el último deploy.',
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'read_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
