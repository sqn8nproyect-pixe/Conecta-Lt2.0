// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Seed de Aforo en tiempo real (Etapa 3.6)
//
// Assigns a random `currentCapacity` (QUIET / MODERATE / FULL) to ~10
// of the 21 businesses so the homepage cards aren't all empty on the
// first load. The other businesses keep `currentCapacity = null` so
// the "Reportar aforo" widget can still be exercised end-to-end.
//
// Idempotent in spirit: each run picks a fresh random 10-subset and
// overwrites their capacity. Businesses NOT in the random subset are
// left untouched (so if you've manually reported a venue from the UI
// and it wasn't picked this run, its value persists).
//
// Usage:
//   bun run prisma/seed-capacity.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient, CapacityLevel } from '@prisma/client';

const prisma = new PrismaClient();

const LEVELS: CapacityLevel[] = ['QUIET', 'MODERATE', 'FULL'];

/** Fisher-Yates partial shuffle — returns a new array of length `n`. */
function sample<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n[seed-capacity] found ${businesses.length} businesses`);

  // Pick 10 random businesses (or all if fewer than 10).
  const target = sample(businesses, Math.min(10, businesses.length));
  console.log(
    `[seed-capacity] assigning random capacity to ${target.length} of them:\n`,
  );

  for (const b of target) {
    const level = LEVELS[Math.floor(Math.random() * LEVELS.length)]!;
    await prisma.business.update({
      where: { id: b.id },
      data: { currentCapacity: level },
    });
    console.log(`  ${b.name.padEnd(36)} → ${level}`);
  }

  // Quick summary of the full table post-seed.
  const counts = await prisma.business.groupBy({
    by: ['currentCapacity'],
    _count: { _all: true },
  });
  console.log('\n[seed-capacity] distribution after seed:');
  for (const row of counts) {
    const label = row.currentCapacity ?? '(sin reportar)';
    console.log(`  ${label.padEnd(14)} → ${row._count._all}`);
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error('[seed-capacity] error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
