// ─────────────────────────────────────────────────────────────
// CONECTA-LT — scripts/cleanup-expired-promos.ts
//
// Marca como EXPIRED todas las promociones que:
//   - status = 'ACTIVE'
//   - endDate < now()
//
// Higiene de base de datos: las promos vencidas no deberían
// seguir marcadas como ACTIVE (aunque la API las filtre en
// runtime, ensucian los listados admin y el panel del dueño).
//
// IDEMPOTENTE: seguro de re-correr. Solo toca las que cumplan
// ambas condiciones; las que ya están EXPIRED/PAUSED/DRAFT
// no se modifican.
//
// Uso:
//   DATABASE_URL="$NEON" bun run scripts/cleanup-expired-promos.ts
// ─────────────────────────────────────────────────────────────

import { db } from '../src/lib/db';

async function main() {
  const now = new Date();

  // 1. Snapshot antes
  const expiredActive = await db.promotion.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    select: {
      id: true,
      title: true,
      endDate: true,
      business: { select: { slug: true, name: true } },
    },
  });

  console.log(`[cleanup-expired-promos] Encontradas ${expiredActive.length} promo(s) ACTIVE con endDate < ${now.toISOString()}`);
  if (expiredActive.length === 0) {
    console.log('[cleanup-expired-promos] Nada que hacer. DB ya está limpia.');
    return;
  }

  expiredActive.forEach((p) => {
    console.log(`  - ${p.business.slug}: "${p.title}" → venció ${p.endDate.toISOString().slice(0, 10)}`);
  });

  // 2. Bulk update → EXPIRED
  const result = await db.promotion.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  console.log(`[cleanup-expired-promos] ✅ ${result.count} promo(s) marcadas como EXPIRED.`);

  // 3. Verificación post-update
  const remaining = await db.promotion.count({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
  });
  console.log(`[cleanup-expired-promos] Verificación: quedan ${remaining} promo(s) ACTIVE vencidas (debería ser 0).`);

  // 4. Resumen final por estado
  const byStatus = await db.promotion.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.log('[cleanup-expired-promos] Distribución final por status:');
  byStatus.forEach((s) => console.log(`  - ${s.status}: ${s._count._all}`));
}

main()
  .catch((err) => {
    console.error('[cleanup-expired-promos] ❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
