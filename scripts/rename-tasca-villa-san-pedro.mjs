import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Renombrar al nombre real confirmado por el usuario:
// "Tasca - Bodegón San Pedro" -> "Tasca Restaurante La Villa de San Pedro"
// (el slug se mantiene estable: tasca-san-pedro, para no romper enlaces existentes)
const before = await p.business.findUnique({
  where: { slug: 'tasca-san-pedro' },
  select: { slug: true, name: true, lat: true, lng: true, address: true, zone: { select: { name: true } } },
});
console.log('=== ANTES ===');
console.log(JSON.stringify(before, null, 1));

const after = await p.business.update({
  where: { slug: 'tasca-san-pedro' },
  data: { name: 'Tasca Restaurante La Villa de San Pedro' },
  select: { slug: true, name: true, lat: true, lng: true, zone: { select: { name: true } } },
});
console.log('\n=== DESPUÉS ===');
console.log(JSON.stringify(after, null, 1));

// Verificar que no quede otro negocio con el mismo nombre
const dup = await p.business.findMany({ where: { name: { contains: 'Villa', mode: 'insensitive' } }, select: { slug: true, name: true } });
console.log('\nNegocios con "Villa":', JSON.stringify(dup));

await p.$disconnect();
