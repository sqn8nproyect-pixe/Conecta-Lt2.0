import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const biz = await db.business.findMany({
  where: { status: 'ACTIVE' },
  select: { name: true, slug: true, phone: true, priceRange: true,
    category: { select: { name: true } }, zone: { select: { name: true } },
    promotions: { where: { status: 'ACTIVE', endDate: { gte: new Date('2026-09-11') } },
      select: { title: true, discount: true, code: true } } },
  orderBy: { name: 'asc' },
});
for (const b of biz) {
  const promos = b.promotions.map(p => `${p.title}${p.discount ? ' ['+p.discount+']' : ''}${p.code ? ' ('+p.code+')' : ''}`).join(' | ');
  console.log(`${b.name} · ${b.category.name} · ${b.zone?.name ?? 'sin zona'} · ${b.slug} · tel:${b.phone ?? '-'} · PROMOS: ${promos || '—'}`);
}
await db.$disconnect();
