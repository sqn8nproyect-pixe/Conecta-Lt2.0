// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Seed de Notificaciones persistentes (Etapa 7.A)
//
// Populates the Notification table with realistic demo entries for
// Ana Rodríguez (the demo user) so the bell icon + dropdown have
// something to show on first load.
//
// 5 notifications total, 2 unread (drives the badge count):
//   1. RESERVATION_CONFIRMED  — LT-1429-A, Licolería Don Sancho (READ)
//   2. RESERVATION_CONFIRMED  — LT-5485-X, Licolería Don Sancho (UNREAD)
//   3. COUPON_REDEEMED        — SANCHO18,    Licolería Don Sancho (READ)
//   4. REVIEW_PUBLISHED       — Licolería Vinos del Valle        (READ)
//   5. SYSTEM welcome         — "¡Bienvenida a Conecta-LT!"      (UNREAD)
//
// Idempotent-ish: each run DELETES all existing notifications for the
// demo user, then re-inserts the 5 entries. Other users' notifications
// are left untouched (in case other demo accounts exist).
//
// Usage:
//   bun run prisma/seed-notifications.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ana's identity. The `id` is verified at seed time by looking up the
// email — if the user row is missing, the seed aborts with a clear
// error rather than inserting orphan notifications (userId pointing at
// a non-existent user, which the FK constraint would reject anyway).
const ANA_EMAIL = 'ana.rodriguez@gmail.com';

async function main() {
  console.log('🔔 Iniciando seed de Notifications...\n');

  // ── 1. Look up Ana by email ────────────────────────────────────
  const ana = await prisma.user.findFirst({
    where: { email: ANA_EMAIL },
    select: { id: true, name: true, email: true },
  });
  if (!ana) {
    console.error(
      `❌ No user found with email "${ANA_EMAIL}" — run \`bun run db:seed\` first.`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`   ✓ Found demo user: ${ana.name} <${ana.email}> (id=${ana.id})`);

  // ── 2. Pull Ana's real reservations + redemptions + reviews ────
  // We pull only the fields needed for the notification messages so
  // the seed stays cheap. Each query is limited to 5 rows — we only
  // need a couple for the seed entries.
  const reservations = await prisma.reservation.findMany({
    where: { userId: ana.id },
    select: {
      confirmationCode: true,
      business: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const redemptions = await prisma.couponRedemption.findMany({
    where: { userId: ana.id },
    select: {
      promotion: {
        select: {
          code: true,
          title: true,
          business: { select: { name: true } },
        },
      },
    },
    orderBy: { claimedAt: 'desc' },
    take: 5,
  });

  const reviews = await prisma.review.findMany({
    where: { userId: ana.id },
    select: { business: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(
    `   ✓ Ana has ${reservations.length} reservations, ${redemptions.length} redemptions, ${reviews.length} reviews`,
  );

  // ── 3. Build the 5 seed entries ────────────────────────────────
  // Stagger createdAt so the dropdown looks realistic (newest first).
  // Anchored to "now" so the relative-time labels ("hace 1 h", "ayer"…)
  // stay accurate regardless of when the seed is run.
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  // Helper: resolve a confirmation code from Ana's existing
  // reservations, falling back to a sensible placeholder if she has
  // no reservations yet.
  const pickReservation = (idx: number) =>
    reservations[idx] ?? {
      confirmationCode: 'LT-XXXX-X',
      business: { name: 'un local' },
    };
  const pickRedemption = (idx: number) =>
    redemptions[idx] ?? {
      promotion: {
        code: 'PROMO',
        title: 'Promoción',
        business: { name: 'un local' },
      },
    };
  const pickReview = (idx: number) =>
    reviews[idx] ?? { business: { name: 'un local' } };

  type SeedEntry = {
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
  };

  const entries: SeedEntry[] = [
    // Oldest → newest. We'll insert in this order; the dropdown sorts
    // by createdAt desc so the LAST entry in this array will appear
    // at the TOP of the dropdown.
    {
      type: 'RESERVATION_CONFIRMED',
      title: 'Reserva confirmada',
      message: `Tu reserva ${pickReservation(3).confirmationCode} en ${pickReservation(3).business.name} fue confirmada.`,
      read: true,
      createdAt: new Date(now - 3 * DAY),
    },
    {
      type: 'RESERVATION_CONFIRMED',
      title: 'Reserva confirmada',
      message: `Tu reserva ${pickReservation(2).confirmationCode} en ${pickReservation(2).business.name} fue confirmada.`,
      read: false, // UNREAD #1
      createdAt: new Date(now - 2 * DAY),
    },
    {
      type: 'COUPON_REDEEMED',
      title: 'Cupón reclamado',
      message: `Reclamaste el cupón ${pickRedemption(1).promotion.code ?? ''} para ${pickRedemption(1).promotion.business.name}.`,
      read: true,
      createdAt: new Date(now - 1 * DAY),
    },
    {
      type: 'REVIEW_PUBLISHED',
      title: 'Reseña publicada',
      message: `Tu reseña de ${pickReview(0).business.name} fue publicada.`,
      read: true,
      createdAt: new Date(now - 2 * HOUR),
    },
    {
      type: 'SYSTEM',
      title: '¡Bienvenida a Conecta-LT!',
      message:
        'Explora los locales, reclama cupones y reserva tu mesa.',
      read: false, // UNREAD #2 — sits at the top of the dropdown
      createdAt: new Date(now - 1 * HOUR),
    },
  ];

  // ── 4. Wipe Ana's existing notifications, then insert ──────────
  // Idempotent: re-running the seed doesn't pile up duplicate rows.
  // Other users' notifications are left alone.
  const deleted = await prisma.notification.deleteMany({
    where: { userId: ana.id },
  });
  console.log(
    `   ✓ Cleared ${deleted.count} existing notifications for Ana`,
  );

  for (const e of entries) {
    await prisma.notification.create({
      data: {
        userId: ana.id,
        type: e.type,
        title: e.title,
        message: e.message,
        read: e.read,
        createdAt: e.createdAt,
      },
    });
    console.log(
      `   + ${e.type.padEnd(22)} read=${e.read ? 'Y' : 'n'}  "${e.title}"`,
    );
  }

  // ── 5. Summary ─────────────────────────────────────────────────
  const totalCount = await prisma.notification.count({
    where: { userId: ana.id },
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: ana.id, read: false },
  });

  console.log('\n════════════════════════════════════════════════════════');
  console.log('🔔 Seed de Notifications — Resumen');
  console.log('════════════════════════════════════════════════════════');
  console.log(`User:           ${ana.name} <${ana.email}>`);
  console.log(`  id:           ${ana.id}`);
  console.log(`Total notifs:   ${totalCount}`);
  console.log(`Unread:         ${unreadCount} (badge will show "${unreadCount > 99 ? '99+' : unreadCount}")`);
  console.log('════════════════════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('❌ Error en seed-notifications:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
