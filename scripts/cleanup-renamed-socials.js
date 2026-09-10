/**
 * Limpieza post-rename: los 25 locales renombrados arrastraban socials de
 * plantilla (TikTok/Facebook/websites/whatsapp falsos). Se eliminan TODOS los
 * socials de los renombrados y se reponen únicamente los IG reales del roster.
 * Los 3 keepers y los 5 creates no se tocan.
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/cleanup-renamed-socials.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ROSTER = require('./real-venues-roster.js');
const RENAMES = ROSTER.filter((r) => r.mode === 'rename');

async function main() {
  let cleaned = 0;
  let igs = 0;
  for (const r of RENAMES) {
    const b = await prisma.business.findUnique({ where: { slug: r.slug }, select: { id: true, name: true } });
    if (!b) throw new Error(`no existe ${r.slug}`);
    const del = await prisma.businessSocial.deleteMany({ where: { businessId: b.id } });
    if (r.ig) {
      await prisma.businessSocial.create({
        data: { businessId: b.id, type: 'INSTAGRAM', value: `@${r.ig.replace(/^@/, '')}`, sortOrder: 0 },
      });
      igs++;
    }
    cleaned++;
    console.log(`🧹 ${r.name}: ${del.count} socials eliminados${r.ig ? `, IG @${r.ig} restaurado` : ''}`);
  }
  console.log(`\n${cleaned} locales limpiados, ${igs} IG reales restaurados`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('🔴 ERROR:', e.message.slice(0, 300)); process.exit(1); })
  .finally(() => prisma.$disconnect());
