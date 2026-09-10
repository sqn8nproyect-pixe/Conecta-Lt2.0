import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Pin real de Google Maps: https://maps.app.goo.gl/iWifVVGP9cvYt7ew8
// Place: "Tasca Restaurante La Villa De San Pedro"
// !3d10.3648294!4d-67.0836514
const updated = await p.business.update({
  where: { slug: 'tasca-san-pedro' },
  data: { lat: 10.3648294, lng: -67.0836514 },
  select: {
    slug: true, name: true, lat: true, lng: true, address: true,
    zone: { select: { name: true } },
  },
});
console.log(JSON.stringify(updated, null, 1));

// Sanity check: distancia del pin viejo al nuevo
const R = 6371;
const dist = (a, b, c, e) => {
  const dLat = (c - a) * Math.PI / 180, dLng = (e - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
console.log(`\nCorrección: ${dist(10.4068, -66.9035, 10.3648294, -67.0836514).toFixed(1)} km`);
console.log(`Distancia al centro de Los Teques (10.344,-67.043): ${dist(10.344, -67.043, 10.3648294, -67.0836514).toFixed(1)} km`);

await p.$disconnect();
