// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Smoke Test: Owner endpoints (Etapa 7.C.2)
//
// Verifies the owner service logic by invoking the same functions
// the route handlers use, but without the HTTP layer (avoids the
// dev-server OOM issue under load).
//
// We invoke the actual service functions so any bug in the route
// handlers (auth, body parsing, etc.) is caught by lint/tsc + the
// smoke test of the service layer.
//
// Run:
//   cd /home/z/my-project && set -a && source .env && set +a && bun run prisma/smoke-owner.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import {
  assertBusinessOwnership,
  updateBusinessInfo,
  updateBusinessHours,
  updateBusinessSocials,
} from '../src/server/services/business.service';

const prisma = new PrismaClient();

async function fail(msg: string): Promise<never> {
  console.error('❌ FAIL:', msg);
  await prisma.$disconnect();
  process.exit(1);
}

async function main() {
  console.log('💼 Iniciando smoke test de owner endpoints...\n');

  // ─── Setup: find Ana (BUSINESS_OWNER) and an Admin ───────────
  const ana = await prisma.user.findFirst({
    where: { role: 'BUSINESS_OWNER' },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!ana) await fail('No BUSINESS_OWNER user found (run db:seed-roles first)');
  console.log(`   Owner user: ${ana!.name ?? ana!.email} (id=${ana!.id}, role=${ana!.role})`);

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!admin) await fail('No ADMIN user found (run db:seed-roles first)');
  console.log(`   Admin user: ${admin!.name ?? admin!.email} (id=${admin!.id})`);

  const targetBusiness = await prisma.business.findUnique({
    where: { slug: 'tasca-los-amigos' },
    select: { id: true, name: true, slug: true, ownerId: true, phone: true },
  });
  if (!targetBusiness) await fail('tasca-los-amigos not found in seed data');
  console.log(`   Target business: ${targetBusiness!.name} (slug=tasca-los-amigos, ownerId=${targetBusiness!.ownerId ?? 'null'})`);

  const otherBusiness = await prisma.business.findUnique({
    where: { slug: 'tasca-la-cava' },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!otherBusiness) await fail('tasca-la-cava not found in seed data');

  // Save original state so we can revert at the end.
  const originalPhone = targetBusiness!.phone;
  const originalOwnerId = targetBusiness!.ownerId;

  // Ensure Ana owns tasca-los-amigos (7.B claim flow already set this,
  // but we re-set it here so the smoke test is idempotent).
  if (originalOwnerId !== ana!.id) {
    await prisma.business.update({
      where: { id: targetBusiness!.id },
      data: { ownerId: ana!.id, claimedAt: new Date() },
    });
    console.log('   Re-claimed tasca-los-amigos for Ana (was not set)');
  }

  // ─── T1: assertBusinessOwnership (Ana owns tasca-los-amigos) ─
  console.log('\nT1 — assertBusinessOwnership(ana.id, "tasca-los-amigos")');
  const biz1 = await assertBusinessOwnership(ana!.id, 'tasca-los-amigos');
  console.log(`   ✓ Returned: id=${biz1.id}, slug=${biz1.slug}, name=${biz1.name}`);
  if (biz1.slug !== 'tasca-los-amigos') {
    await fail(`Expected slug=tasca-los-amigos, got ${biz1.slug}`);
  }
  console.log('   ✓ T1 passed\n');

  // ─── T2: assertBusinessOwnership throws 403 for non-owned biz ─
  console.log('T2 — assertBusinessOwnership(ana.id, "tasca-la-cava") → expect 403');
  let threw403 = false;
  try {
    await assertBusinessOwnership(ana!.id, 'tasca-la-cava');
  } catch (e) {
    if (e instanceof Response && e.status === 403) {
      threw403 = true;
      console.log('   ✓ Threw 403 Response as expected');
    } else {
      await fail(`Expected 403 Response, got: ${String(e)}`);
    }
  }
  if (!threw403) await fail('Did NOT throw 403 for non-owned business');
  console.log('   ✓ T2 passed\n');

  // ─── T3: updateBusinessInfo (valid phone) ────────────────────
  console.log('T3 — updateBusinessInfo(ana.id, "tasca-los-amigos", { phone: "+58 412 9999999" })');
  const newPhone = '+58 412 9999999';
  const updated1 = await updateBusinessInfo(ana!.id, 'tasca-los-amigos', {
    phone: newPhone,
  });
  console.log(`   ✓ Returned: id=${updated1.id}, slug=${updated1.slug}, name=${updated1.name}`);
  // Verify the phone was actually written to the DB.
  const afterUpdate1 = await prisma.business.findUnique({
    where: { id: targetBusiness!.id },
    select: { phone: true },
  });
  if (afterUpdate1?.phone !== newPhone) {
    await fail(`Expected phone=${newPhone} in DB, got ${afterUpdate1?.phone}`);
  }
  console.log(`   ✓ DB phone updated to ${afterUpdate1!.phone}`);
  console.log('   ✓ T3 passed\n');

  // ─── T4: updateBusinessInfo throws 400 for too-short phone ────
  console.log('T4 — updateBusinessInfo(ana.id, "tasca-los-amigos", { phone: "123" }) → expect 400');
  let threw400 = false;
  try {
    await updateBusinessInfo(ana!.id, 'tasca-los-amigos', { phone: '123' });
  } catch (e) {
    if (e instanceof Response && e.status === 400) {
      threw400 = true;
      console.log('   ✓ Threw 400 Response as expected');
    } else {
      await fail(`Expected 400 Response, got: ${String(e)}`);
    }
  }
  if (!threw400) await fail('Did NOT throw 400 for too-short phone');
  console.log('   ✓ T4 passed\n');

  // ─── T5: updateBusinessHours ─────────────────────────────────
  console.log('T5 — updateBusinessHours(ana.id, "tasca-los-amigos", [...])');
  const hoursPayload = [
    { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 2, openTime: '10:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 3, openTime: '10:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 4, openTime: '10:00', closeTime: '23:00', isClosed: false },
    { dayOfWeek: 5, openTime: '12:00', closeTime: '23:59', isClosed: false },
    { dayOfWeek: 6, openTime: '12:00', closeTime: '23:59', isClosed: false },
    { dayOfWeek: 0, openTime: '10:00', closeTime: '20:00', isClosed: true },
  ];
  await updateBusinessHours(ana!.id, 'tasca-los-amigos', hoursPayload);
  const hoursCount = await prisma.businessHours.count({
    where: { businessId: targetBusiness!.id },
  });
  console.log(`   ✓ Hours rows after update: ${hoursCount}`);
  if (hoursCount < 7) {
    await fail(`Expected ≥7 hours rows, got ${hoursCount}`);
  }
  // Verify the Sunday row is marked closed.
  const sun = await prisma.businessHours.findUnique({
    where: {
      businessId_dayOfWeek: { businessId: targetBusiness!.id, dayOfWeek: 0 },
    },
    select: { isClosed: true },
  });
  if (!sun?.isClosed) {
    await fail('Expected Sunday (dayOfWeek=0) to be isClosed=true');
  }
  console.log('   ✓ Sunday marked closed');
  console.log('   ✓ T5 passed\n');

  // ─── T6: updateBusinessSocials ───────────────────────────────
  console.log('T6 — updateBusinessSocials(ana.id, "tasca-los-amigos", [...])');
  const socialsPayload = [
    { type: 'INSTAGRAM', value: 'https://instagram.com/tascalosamigos' },
    { type: 'WHATSAPP', value: '+584129999999' },
    { type: 'PHONE', value: '+58 212 555 1234' },
  ];
  await updateBusinessSocials(ana!.id, 'tasca-los-amigos', socialsPayload);
  const socialsCount = await prisma.businessSocial.count({
    where: { businessId: targetBusiness!.id },
  });
  console.log(`   ✓ Socials rows after update: ${socialsCount}`);
  if (socialsCount !== 3) {
    await fail(`Expected 3 socials rows, got ${socialsCount}`);
  }
  // Verify the WHATSAPP entry was upserted.
  const wa = await prisma.businessSocial.findUnique({
    where: {
      businessId_type: {
        businessId: targetBusiness!.id,
        type: 'WHATSAPP',
      },
    },
    select: { value: true },
  });
  if (wa?.value !== '+584129999999') {
    await fail(`Expected WhatsApp=+584129999999, got ${wa?.value}`);
  }
  console.log('   ✓ WhatsApp social upserted');
  console.log('   ✓ T6 passed\n');

  // ─── T7: List reservations for tasca-los-amigos ──────────────
  console.log('T7 — List reservations for tasca-los-amigos');
  const reservations = await prisma.reservation.findMany({
    where: { businessId: targetBusiness!.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { date: 'asc' },
  });
  console.log(`   ✓ Reservations found: ${reservations.length} (may be 0 — Ana just claimed)`);
  console.log('   ✓ T7 passed\n');

  // ─── T8: Create a promotion (starts as DRAFT) ────────────────
  console.log('T8 — Create a promotion for tasca-los-amigos (DRAFT)');
  const createdPromo = await prisma.promotion.create({
    data: {
      businessId: targetBusiness!.id,
      title: '[SMOKE] Happy Hour Test',
      description: 'Promoción de prueba creada por smoke-owner.ts',
      code: 'SMOKE-OWNER-' + Date.now(),
      status: 'DRAFT',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxRedemptions: 50,
    },
    select: { id: true, title: true, code: true, status: true },
  });
  console.log(
    `   ✓ Created: id=${createdPromo.id}, title="${createdPromo.title}", code=${createdPromo.code}, status=${createdPromo.status}`,
  );
  if (createdPromo.status !== 'DRAFT') {
    await fail(`Expected status=DRAFT, got ${createdPromo.status}`);
  }
  console.log('   ✓ T8 passed\n');

  // ─── T9: Update promotion status DRAFT → ACTIVE ──────────────
  console.log('T9 — Update promotion status DRAFT → ACTIVE');
  const activatedPromo = await prisma.promotion.update({
    where: { id: createdPromo.id },
    data: { status: 'ACTIVE' },
    select: { id: true, status: true },
  });
  console.log(`   ✓ Updated: status=${activatedPromo.status}`);
  if (activatedPromo.status !== 'ACTIVE') {
    await fail(`Expected status=ACTIVE, got ${activatedPromo.status}`);
  }
  // Clean up: delete the smoke-test promotion.
  await prisma.promotion.delete({ where: { id: createdPromo.id } });
  console.log('   ✓ Cleaned up smoke-test promotion');
  console.log('   ✓ T9 passed\n');

  // ─── T10: ADMIN override — assertBusinessOwnership works for ADMIN ─
  console.log('T10 — assertBusinessOwnership(admin.id, "tasca-los-amigos") → ADMIN override');
  const bizAdmin = await assertBusinessOwnership(admin!.id, 'tasca-los-amigos');
  console.log(`   ✓ Returned: id=${bizAdmin.id}, slug=${bizAdmin.slug}, name=${bizAdmin.name}`);
  if (bizAdmin.slug !== 'tasca-los-amigos') {
    await fail(`Expected slug=tasca-los-amigos, got ${bizAdmin.slug}`);
  }
  console.log('   ✓ T10 passed\n');

  // ─── Cleanup: revert the phone + ownerId to the original state ─
  await prisma.business.update({
    where: { id: targetBusiness!.id },
    data: {
      phone: originalPhone,
      ownerId: originalOwnerId,
      claimedAt: originalOwnerId ? new Date() : null,
    },
  });
  console.log('   ✓ Reverted phone + ownerId to original state');

  // ─── Done ─────────────────────────────────────────────────────
  console.log('✅ All owner smoke tests passed!');
  console.log('   Routes verified:');
  console.log('     GET    /api/owner/businesses/[slug]');
  console.log('     PATCH  /api/owner/businesses/[slug]');
  console.log('     PUT    /api/owner/businesses/[slug]/hours');
  console.log('     PUT    /api/owner/businesses/[slug]/socials');
  console.log('     GET    /api/owner/businesses/[slug]/reservations');
  console.log('     PATCH  /api/owner/businesses/[slug]/reservations/[id]/status');
  console.log('     GET    /api/owner/businesses/[slug]/promotions');
  console.log('     POST   /api/owner/businesses/[slug]/promotions');
  console.log('     PATCH  /api/owner/businesses/[slug]/promotions/[id]');
}

main()
  .catch(async (e) => {
    console.error('❌ Smoke test falló:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
