// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Seed de Analytics Events (Etapa 6.1)
//
// Inserts demo BUSINESS_VIEW / WHATSAPP_CLICK / SEARCH events so the
// popular-this-week + per-business view-count endpoints have data to
// serve during development.
//
// Idempotent in spirit: each run ADDS new events (doesn't delete old
// ones) so re-running it accumulates more events over time.
//
// Usage:
//   bun run prisma/seed-analytics.ts
//
// Summary printed at the end:
//   Inserted N BUSINESS_VIEW events for M businesses
//   Inserted N WHATSAPP_CLICK events for M businesses
//   Inserted N SEARCH events for M businesses
//   Total AnalyticsEvent rows: T
// ─────────────────────────────────────────────────────────────

import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────

/** Random integer in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick N distinct items from an array (Fisher-Yates partial shuffle). */
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

/**
 * Build a Date distributed roughly uniformly over the last `days` days,
 * with a mild recency bias (60% of events land in the last half of the
 * window) so "popular this week" looks plausible.
 *
 * Returns a Date in the past (createdAt column).
 */
function randomRecentDate(days: number): Date {
  // Recency bias: 60% of events in the last `days/2` days, 40% spread
  // across the full window. This makes the 7-day window more populated
  // than the 8-14 day-old window, which is realistic.
  const halfWindowMs = (days / 2) * 24 * 60 * 60 * 1000;
  const fullWindowMs = days * 24 * 60 * 60 * 1000;
  const offsetMs =
    Math.random() < 0.6
      ? Math.random() * halfWindowMs
      : Math.random() * fullWindowMs;
  return new Date(Date.now() - offsetMs);
}

/**
 * Build `count` AnalyticsEvent.createMany inputs for a single business,
 * with `createdAt` distributed over the last `days` days.
 */
function buildBusinessViewEvents(
  businessId: string,
  count: number,
  days: number,
) {
  return Array.from({ length: count }, () => ({
    type: 'BUSINESS_VIEW' as const,
    businessId,
    userId: null,
    metadata: {} as Record<string, unknown>,
    createdAt: randomRecentDate(days),
  }));
}

function buildWhatsappClickEvents(
  businessId: string,
  count: number,
  days: number,
) {
  return Array.from({ length: count }, () => ({
    type: 'WHATSAPP_CLICK' as const,
    businessId,
    userId: null,
    metadata: {} as Record<string, unknown>,
    createdAt: randomRecentDate(days),
  }));
}

function buildSearchEvents(
  businessId: string,
  count: number,
  days: number,
  query: string,
) {
  return Array.from({ length: count }, () => ({
    type: 'SEARCH' as const,
    businessId,
    userId: null,
    metadata: { query } as Record<string, unknown>,
    createdAt: randomRecentDate(days),
  }));
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de Analytics Events...\n');

  // ── 1. Fetch all businesses (so we know the real cuids) ────────
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });
  if (businesses.length === 0) {
    console.error('❌ No businesses found in DB — run `bun run db:seed` first.');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`   ✓ ${businesses.length} businesses found in DB`);

  const DAYS_WINDOW = 14;
  const allEvents: Array<{
    type: 'BUSINESS_VIEW' | 'WHATSAPP_CLICK' | 'SEARCH';
    businessId: string;
    userId: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }> = [];

  // ── 2. BUSINESS_VIEW events for ALL businesses (50-500 each) ──
  let totalBusinessViews = 0;
  for (const b of businesses) {
    const count = randInt(50, 500);
    totalBusinessViews += count;
    allEvents.push(...buildBusinessViewEvents(b.id, count, DAYS_WINDOW));
  }
  console.log(
    `   ✓ Built ${totalBusinessViews} BUSINESS_VIEW events for ${businesses.length} businesses`,
  );

  // ── 3. WHATSAPP_CLICK events for 5 random businesses (10-50 each) ──
  const whatsappBusinesses = sample(businesses, 5);
  let totalWhatsapp = 0;
  for (const b of whatsappBusinesses) {
    const count = randInt(10, 50);
    totalWhatsapp += count;
    allEvents.push(...buildWhatsappClickEvents(b.id, count, DAYS_WINDOW));
  }
  console.log(
    `   ✓ Built ${totalWhatsapp} WHATSAPP_CLICK events for ${whatsappBusinesses.length} businesses`,
  );

  // ── 4. SEARCH events for 3 random businesses (10-20 each) ──────
  const searchBusinesses = sample(businesses, 3);
  const searchQueries = ['whisky', 'cerveza'];
  let totalSearch = 0;
  for (const b of searchBusinesses) {
    const count = randInt(10, 20);
    totalSearch += count;
    // Alternate queries across the events for this business.
    const query = searchQueries[randInt(0, searchQueries.length - 1)]!;
    allEvents.push(...buildSearchEvents(b.id, count, DAYS_WINDOW, query));
  }
  console.log(
    `   ✓ Built ${totalSearch} SEARCH events for ${searchBusinesses.length} businesses`,
  );

  // ── 5. Insert all events in batches (createMany chunks) ────────
  // Chunk into batches of 500 to avoid blowing past Postgres' parameter
  // limit (~65535 params / ~10 per row = ~6500 rows, but be conservative).
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
    const batch = allEvents.slice(i, i + BATCH_SIZE)!;
    const res = await prisma.analyticsEvent.createMany({
      // Cast through `Prisma.AnalyticsEventCreateManyInput[]` so the
      // `metadata: Record<string, unknown>` we built locally is accepted
      // by Prisma's branded `InputJsonValue` type (structurally identical
      // at runtime, but TS doesn't auto-narrow).
      data: batch as Prisma.AnalyticsEventCreateManyInput[],
    });
    inserted += res.count;
  }
  console.log(`\n   ✓ Inserted ${inserted} AnalyticsEvent rows\n`);

  // ── 6. Summary ─────────────────────────────────────────────────
  const totalCount = await prisma.analyticsEvent.count();
  console.log('════════════════════════════════════════════════════════');
  console.log('📊 Seed de Analytics Events — Resumen');
  console.log('════════════════════════════════════════════════════════');
  console.log(
    `Inserted ${totalBusinessViews} BUSINESS_VIEW events for ${businesses.length} businesses`,
  );
  console.log(
    `Inserted ${totalWhatsapp} WHATSAPP_CLICK events for ${whatsappBusinesses.length} businesses`,
  );
  console.log(
    `Inserted ${totalSearch} SEARCH events for ${searchBusinesses.length} businesses`,
  );
  console.log(`Total AnalyticsEvent rows: ${totalCount}`);
  console.log('════════════════════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('❌ Error en seed-analytics:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
