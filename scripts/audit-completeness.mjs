import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const biz = await p.business.findMany({
  select: {
    slug: true, name: true, lat: true, lng: true, address: true,
    phone: true, coverImage: true, description: true,
    zone: { select: { name: true } },
    category: { select: { name: true } },
    socials: { select: { type: true, value: true } },
  },
  orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
});

// Pines exactos verificados por el usuario (fuente: worklog)
const verifiedPins = {
  'tasca-el-patio': true, 'bodegon-el-toro': true, 'discoteca-medusa': true,
  'ranch-grill': true, 'mercaplus-la-fortaleza': true, 'la-estacion-de-la-birra': true,
  'la-casita-de-maikel': true, 'tasca-san-pedro': true,
};
// Direcciones con respaldo real (usuario / Google Maps / corrección del usuario)
const verifiedAddr = {
  'tasca-san-pedro': true,             // 9W78+WGQ, Vía Principal de San Pedro (Google Maps)
  'licobar-punto-de-encuentro': true,  // Calle Carabobo, diagonal al CC Hito (usuario)
  'la-estacion-de-la-birra': true,     // Av. Bertorelli Cisneros, El Cabotaje (corrección usuario)
  'jungla-bar': true,                  // Mercado Municipal El Paso (corrección usuario)
};

for (const b of biz) {
  const ig = b.socials.find(s => s.type === 'INSTAGRAM');
  const hasDesc = !!(b.description && b.description.length > 20);
  console.log(JSON.stringify({
    slug: b.slug, name: b.name, cat: b.category?.name, zone: b.zone?.name,
    lat: b.lat, lng: b.lng,
    pin: verifiedPins[b.slug] ? 'EXACTO' : 'aprox',
    addr: b.address ?? '(sin dirección)',
    addrOk: verifiedAddr[b.slug] ? 'REAL' : 'aprox',
    phone: b.phone ?? null,
    ig: ig ? ig.value.replace('https://instagram.com/', '@') : null,
    cover: b.coverImage ? 'sí' : 'NO',
    desc: hasDesc ? 'sí' : 'NO',
  }));
}
console.log('TOTAL:', biz.length);
await p.$disconnect();
