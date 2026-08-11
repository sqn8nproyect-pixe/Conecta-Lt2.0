// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Seed de Roles (Etapa 7.B — RBAC + Claim flow)
//
// Promotes Ana Rodríguez (the demo user that logs in via the demo
// NextAuth provider) to BUSINESS_OWNER so she can claim businesses
// from the UI. Also creates two extra demo users for the admin panel
// (Etapa 7.C):
//
//   - moderator@conecta.lt → MODERATOR
//   - admin@conecta.lt     → ADMIN
//
// These two extra users don't need to be able to log in via Google
// OAuth (their emails aren't real Google accounts) — they just need
// to exist in the DB so the admin panel can list them and so the
// claim-flow notifications have ADMIN/MODERATOR recipients to fire
// at. (Today only Ana's role change matters — she's the one who can
// log in via the demo NextAuth callback.)
//
// Idempotent: each run upserts all three rows by email so re-running
// the script is safe. Existing users keep their id + relations; only
// the `role` column is updated.
//
// Usage:
//   bun run prisma/seed-roles.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔑 Iniciando seed de Roles (RBAC)...\n');

  // ── 1. Promote Ana to BUSINESS_OWNER ────────────────────────────
  // Ana is the demo user used by the demo NextAuth provider. Promoting
  // her lets her see the "Reclamar este local" button on unclaimed
  // businesses and the "MIS LOCALES" section in her profile.
  const ana = await prisma.user.upsert({
    where: { email: 'ana.rodriguez@gmail.com' },
    update: { role: UserRole.BUSINESS_OWNER },
    create: {
      email: 'ana.rodriguez@gmail.com',
      name: 'Ana Rodríguez',
      image: 'https://i.pravatar.cc/150?img=47',
      role: UserRole.BUSINESS_OWNER,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log(
    `   ✓ Promoted "${ana.name}" <${ana.email}> to ${ana.role} (id=${ana.id})`,
  );

  // ── 2. Create "Moderador Demo" with role MODERATOR ──────────────
  // Real email isn't required — these users exist solely for the
  // admin panel to query (e.g. "list all moderators") and to receive
  // SYSTEM notifications when a claim happens. The image uses a
  // pravatar fallback so the admin panel renders an avatar.
  const mod = await prisma.user.upsert({
    where: { email: 'moderator@conecta.lt' },
    update: { role: UserRole.MODERATOR, name: 'Moderador Demo' },
    create: {
      email: 'moderator@conecta.lt',
      name: 'Moderador Demo',
      image: 'https://i.pravatar.cc/150?img=12',
      role: UserRole.MODERATOR,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log(
    `   ✓ Upserted "${mod.name}" <${mod.email}> as ${mod.role} (id=${mod.id})`,
  );

  // ── 3. Create "Admin Demo" with role ADMIN ──────────────────────
  // Same rationale — exists for the admin panel + claim notifications.
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conecta.lt' },
    update: { role: UserRole.ADMIN, name: 'Admin Demo' },
    create: {
      email: 'admin@conecta.lt',
      name: 'Admin Demo',
      image: 'https://i.pravatar.cc/150?img=68',
      role: UserRole.ADMIN,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log(
    `   ✓ Upserted "${admin.name}" <${admin.email}> as ${admin.role} (id=${admin.id})`,
  );

  // ── 4. Summary ──────────────────────────────────────────────────
  console.log('\n📊 Roles summary:');
  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });
  for (const row of counts) {
    console.log(`   ${row.role.padEnd(20)} ${row._count._all} user(s)`);
  }
  console.log(
    '\n✅ Seed de Roles completado. Ana ya puede reclamar locales desde la UI.',
  );
  console.log(
    '   Para que el cambio de rol de Ana tome efecto en su sesión actual,',
  );
  console.log(
    '   debe cerrar sesión y volver a entrar (el rol se cachea en el JWT).',
  );
}

main()
  .catch(async (e) => {
    console.error('❌ Seed de Roles falló:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
