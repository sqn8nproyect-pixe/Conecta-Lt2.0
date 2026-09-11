// /api/diagnose-auth/db-schema — Verificación del esquema de la DB
// para el flujo de propuestas de flyers (Sprint 8.9).
//
// ¿Por qué existe? El auto-DDL corre en src/instrumentation.ts al
// arranque del server (el sandbox no tiene acceso a Neon). Este
// endpoint permite CONFIRMAR desde fuera que la migración
// 20260912000000_event_submission aplicó en producción:
// valores del enum BusinessEventStatus + existencia de reviewNote.
//
// No expone datos: solo valores del enum y booleanos de columnas.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const enumRows = await db.$queryRawUnsafe<{ val: string }[]>(
      'SELECT unnest(enum_range(NULL::"BusinessEventStatus"))::text AS val',
    );
    const colRows = await db.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'BusinessEvent' AND column_name = 'reviewNote'
       )::bool AS exists`,
    );
    // Sprint 8.10 — columnas del flyer personalizado.
    const imageRows = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'BusinessEvent'
         AND column_name IN ('imageUrl', 'imageKey')`,
    );
    const imageCols = imageRows.map((r) => r.column_name);

    const valores = enumRows.map((r) => r.val);
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        businessEventStatus: valores,
        reviewNoteColumn: colRows[0]?.exists ?? false,
        eventImageColumns: imageCols,
        migracion:
          valores.includes('PENDING_REVIEW') &&
          valores.includes('REJECTED') &&
          (colRows[0]?.exists ?? false)
            ? '✅ 20260912000000_event_submission APLICADA'
            : '⏳ aún no aplicada (el bootstrap corre al arrancar el server)',
        migracionImagen:
          imageCols.includes('imageUrl') && imageCols.includes('imageKey')
            ? '✅ 20260912120000_event_image APLICADA'
            : '⏳ aún no aplicada (el bootstrap corre al arrancar el server)',
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
