import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const slug = 'la-casita-de-maikel';

// Ver estado actual (zona incluida)
const before = await p.business.findUnique({
  where: { slug },
  select: {
    slug: true, name: true, lat: true, lng: true,
    zone: { select: { id: true, name: true } },
  },
});
console.log('=== ANTES ===');
console.log(JSON.stringify(before, null, 1));

// Pin real de Google Maps: https://maps.app.goo.gl/pFcwfsTxg4VAa83A7
// !3d10.3267369!4d-67.1443813
const updated = await p.business.update({
  where: { slug },
  data: { lat: 10.3267369, lng: -67.1443813 },
  select: {
    slug: true, name: true, lat: true, lng: true,
    zone: { select: { name: true } },
  },
});
console.log('\n=== DESPUÉS ===');
console.log(JSON.stringify(updated, null, 1));

// Zonas cercanas para validar coherencia (distancia aproximada km)
const biz = await p.business.findMany({
  where: { zoneId: { not: null }, slug: { not: slug } },
  select: { name: true, lat: true, lng: true, zone: { select: { name: true } } },
});
const R = 6371;
const d = (a, b, c, e) => {
  const dLat = (c - a) * Math.PI / 180, dLng = (e - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const nearby = {};
for (const b of biz) {
  if (b.lat == null || b.lng == null) continue;
  const dist = d(10.3267369, -67.1443813, b.lat, b.lng);
  const z = b.zone?.name ?? '?';
  if (!nearby[z]) nearby[z] = { min: Infinity, n: 0 };
  nearby[z].n++;
  nearby[z].min = Math.min(nearby[z].min, dist);
}
console.log('\n=== Distancia del nuevo pin a cada zona (km, negocio más cercano) ===');
console.log(JSON.stringify(nearby, null, 1));

await p.$disconnect();
