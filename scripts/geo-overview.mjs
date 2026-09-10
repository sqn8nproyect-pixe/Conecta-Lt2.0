import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Todas las coordenadas de referencia conocidas y verificadas:
const anchors = {
  'Centro Los Teques': { lat: 10.344, lng: -67.043 },
  'Africa Burguers (pin real)': { lat: 10.3587, lng: -67.0346 },
  'El Toro (pin real)': { lat: 10.3311, lng: -67.0411 },
  'Medusa (pin real)': { lat: 10.337378, lng: -67.0394874 },
  'Ranch Grill (pin real)': { lat: 10.347115, lng: -67.019501 },
  'Mercaplus (pin real)': { lat: 10.332984, lng: -67.0424898 },
  'La Estacion (pin real)': { lat: 10.3338621, lng: -67.04263 },
  'Casita Maikel (pin real)': { lat: 10.3267369, lng: -67.1443813 },
};

const R = 6371;
const dist = (a, b, c, e) => {
  const dLat = (c - a) * Math.PI / 180, dLng = (e - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const biz = await p.business.findMany({
  select: { slug: true, name: true, lat: true, lng: true, zone: { select: { name: true } } },
  orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
});

console.log('ZONA | negocio | lat | lng | d(Centro) km | d(CasitaMaikel pin) km');
for (const b of biz) {
  const dC = dist(anchors['Centro Los Teques'].lat, anchors['Centro Los Teques'].lng, b.lat, b.lng).toFixed(1);
  const dM = dist(10.3267369, -67.1443813, b.lat, b.lng).toFixed(1);
  console.log(`${b.zone?.name ?? '-'} | ${b.name} | ${b.lat} | ${b.lng} | ${dC} | ${dM}`);
}

await p.$disconnect();
