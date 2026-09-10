import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// 5 pins resueltos de Google Maps (2026-09-11)
const pins = [
  { name: 'Medusa',           lat: 10.337378,  lng: -67.0394874 },
  { name: 'Ranch Grill',      lat: 10.347115,  lng: -67.019501 },
  { name: 'Mercaplus',        lat: 10.332984,  lng: -67.0424898 },
  { name: 'La Estación',      lat: 10.3338621, lng: -67.04263 },
  { name: 'La Casita Maikel', lat: 10.3267369, lng: -67.1443813 },
];

const candidates = await p.business.findMany({
  where: {
    OR: [
      { slug: { in: ['discoteca-medusa', 'ranch-grill', 'mercaplus-la-fortaleza', 'la-estacion-de-la-birra'] } },
      { name: { contains: 'maikel', mode: 'insensitive' } },
      { name: { contains: 'casita', mode: 'insensitive' } },
    ],
  },
  select: { slug: true, name: true, lat: true, lng: true },
});
console.log('=== Encontrados en DB ===');
console.log(JSON.stringify(candidates, null, 1));

console.log('\n=== Pins objetivo ===');
console.log(JSON.stringify(pins, null, 1));

await p.$disconnect();
