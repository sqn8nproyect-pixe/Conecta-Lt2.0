import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// 1) Formato usado en businessSocial (muestra)
const sample = await p.businessSocial.findMany({
  where: { type: 'INSTAGRAM' },
  take: 5,
  select: { type: true, value: true, business: { select: { slug: true } } },
});
console.log('=== Muestra de formato INSTAGRAM existente ===');
console.log(JSON.stringify(sample, null, 1));

// 2) Social actual de la tasca (si existe)
const slug = 'tasca-san-pedro';
const biz = await p.business.findUnique({
  where: { slug },
  select: { id: true, name: true, socials: true },
});
console.log('\n=== Social actual de', slug, '===');
console.log(JSON.stringify(biz.socials, null, 1));

// 3) Upsert Instagram @lavilladesanpedroclub
const VALUE = 'lavilladesanpedroclub'; // handle sin @, igual que el resto
const existing = biz.socials.find(s => s.type === 'INSTAGRAM');
if (existing) {
  const u = await p.businessSocial.update({ where: { id: existing.id }, data: { value: VALUE } });
  console.log('\nActualizado:', JSON.stringify(u));
} else {
  const c = await p.businessSocial.create({
    data: { type: 'INSTAGRAM', value: VALUE, businessId: biz.id },
  });
  console.log('\nCreado:', JSON.stringify(c));
}

// 4) Verificación final
const final = await p.business.findUnique({
  where: { slug },
  select: { name: true, socials: true },
});
console.log('\n=== FINAL ===');
console.log(JSON.stringify(final, null, 1));

await p.$disconnect();
