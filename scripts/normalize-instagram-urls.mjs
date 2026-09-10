import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Normaliza TODOS los socials INSTAGRAM a formato URL completa:
//   https://instagram.com/<handle>
// Razon: SocialContactPanel usa el valor crudo como href y hace
// value.split('instagram.com/')[1] para el sublabel — solo funciona
// con URL completa. '@handle' y 'handle' crudo generan links rotos.
const socials = await p.businessSocial.findMany({
  where: { type: 'INSTAGRAM' },
  select: { id: true, value: true, business: { select: { slug: true, name: true } } },
  orderBy: { business: { name: 'asc' } },
});

const toUrl = (v) => {
  let t = (v || '').trim();
  if (!t) return null;
  t = t.replace(/^@/, '').replace(/\/+$/, '');
  // ya es URL?
  if (/^https?:\/\//i.test(v)) {
    // normalizar dominio y quitar query/params
    return 'https://instagram.com/' + t.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[?#].*$/, '');
  }
  return 'https://instagram.com/' + t.replace(/[?#].*$/, '');
};

let fixed = 0, ok = 0;
for (const s of socials) {
  const norm = toUrl(s.value);
  if (!norm) {
    console.log(`⚠️ VACÍO  ${s.business.slug}: "${s.value}"`);
    continue;
  }
  if (norm !== s.value) {
    await p.businessSocial.update({ where: { id: s.id }, data: { value: norm } });
    console.log(`🔧 ${s.business.slug}: "${s.value}" → "${norm}"`);
    fixed++;
  } else {
    ok++;
  }
}

console.log(`\nTotal: ${socials.length} | ya OK: ${ok} | normalizados: ${fixed}`);
await p.$disconnect();
