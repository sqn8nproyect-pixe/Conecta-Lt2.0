import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Dirección exacta copiada de Google Maps por el usuario:
// "9W78+WGQ, Via Principal de San Pedro, 1201, Miranda"
const updated = await p.business.update({
  where: { slug: 'tasca-san-pedro' },
  data: { address: '9W78+WGQ, Vía Principal de San Pedro, 1201, Miranda' },
  select: { slug: true, name: true, address: true, lat: true, lng: true, zone: { select: { name: true } } },
});
console.log(JSON.stringify(updated, null, 1));
await p.$disconnect();
