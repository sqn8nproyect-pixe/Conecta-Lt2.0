import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Pines verificados por el usuario (Google Maps, resueltos 2026-09-11)
const updates = [
  // slug | lat | lng | dirección nueva (null = solo pin)
  { slug: 'bodegon-bicentenario',   lat: 10.3399733, lng: -67.0462708,
    addr: 'Local 1, frente sector El Rincón, Av. Juan Germán Roscio, esq. C. Flor de Mayo, Los Teques 1201, Miranda' },
  { slug: 'bodegon-naikel',         lat: 10.3416974, lng: -67.0394664,
    addr: 'C.C. Ambrosi, C. Boyacá, Los Teques 1201, Miranda' },
  { slug: 'bodegon-panamericana',   lat: 10.3433268, lng: -67.0295853,
    addr: '8XVC+955, Carr. Panamericana, Los Teques 1201, Miranda' },
  { slug: 'club-centro-de-amigos',  lat: 10.335632,  lng: -67.0511182, addr: null }, // CAPEM
  { slug: 'discoteca-koko-frappe',  lat: 10.3524877, lng: -67.0624853, addr: null },
  { slug: 'jungla-bar',             lat: 10.3534872, lng: -67.0590708, addr: null }, // conserva Mercado Municipal El Paso
  { slug: 'licoreria-chuky',        lat: 10.3504442, lng: -67.0503921,
    addr: '9W2X+5RH, Av. Víctor Batista, Los Teques 1201, Miranda' },
  { slug: 'licoreria-curametono',   lat: 10.3416056, lng: -67.0437958, addr: null },
];

const R = 6371;
const dist = (a, b, c, e) => {
  const dLat = (c - a) * Math.PI / 180, dLng = (e - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

for (const u of updates) {
  const before = await p.business.findUnique({
    where: { slug: u.slug },
    select: { name: true, lat: true, lng: true },
  });
  const data = { lat: u.lat, lng: u.lng };
  if (u.addr) data.address = u.addr;
  const after = await p.business.update({ where: { slug: u.slug }, data });
  const d = dist(before.lat, before.lng, u.lat, u.lng).toFixed(1);
  console.log(`✅ ${after.name}: (${before.lat},${before.lng}) → (${u.lat},${u.lng}) [Δ${d} km]${u.addr ? ' + dirección' : ''}`);
}

console.log('\nActualizados:', updates.length);
await p.$disconnect();
