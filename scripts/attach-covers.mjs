import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Portadas generadas (public/images/) para los 5 negocios sin cover
const covers = [
  { slug: 'bodegon-panamericana', cover: '/images/bodegon-panamericana.png' },
  { slug: 'licoreria-chuky',      cover: '/images/licoreria-chuky.png' },
  { slug: 'el-llanero',           cover: '/images/el-llanero.png' },
  { slug: 'licoreria-la-macarena', cover: '/images/licoreria-la-macarena.png' },
  { slug: 'licoreria-la-llovizna', cover: '/images/licoreria-la-llovizna.png' },
];

for (const c of covers) {
  const b = await p.business.update({
    where: { slug: c.slug },
    data: { coverImage: c.cover },
    select: { name: true, coverImage: true },
  });
  console.log(`✅ ${b.name} → ${b.coverImage}`);
}

// Verificación: quedan negocios sin cover?
const sin = await p.business.count({ where: { coverImage: null } });
console.log(`\nSin portada restantes: ${sin}`);
await p.$disconnect();
