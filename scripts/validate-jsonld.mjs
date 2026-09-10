// Validación E2E del JSON-LD de las fichas /local/[slug]
// Uso: (server en :3100) node scripts/validate-jsonld.mjs
const BASE = 'http://localhost:3100';

// bodegon-el-toro: 24 reviews → debe traer aggregateRating.
// licoreria-la-macarena: revisar teléfono/horarios.
// Slug inexistente → 404.
const CASES = ['bodegon-el-toro', 'tasca-san-pedro', 'discoteca-medusa', 'no-existe-xyz'];

let failures = 0;

for (const slug of CASES) {
  const res = await fetch(`${BASE}/local/${slug}`);
  if (slug === 'no-existe-xyz') {
    console.log(`[${slug}] HTTP ${res.status} ${res.status === 404 ? '✅ 404 esperado' : '❌ se esperaba 404'}`);
    if (res.status !== 404) failures++;
    continue;
  }
  const html = await res.text();
  const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!m) {
    console.log(`[${slug}] ❌ sin JSON-LD`);
    failures++;
    continue;
  }
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch (e) {
    console.log(`[${slug}] ❌ JSON inválido: ${e.message}`);
    failures++;
    continue;
  }
  const graph = data['@graph'] ?? [];
  const local = graph.find((n) => n['@id']?.endsWith('#local'));
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
  const checks = {
    contexto: data['@context'] === 'https://schema.org',
    tipo: local?.['@type'],
    geo: local?.geo && local.geo.latitude && local.geo.longitude,
    direccion: local?.address?.streetAddress,
    horarios: local?.openingHoursSpecification?.length ?? 0,
    rating: local?.aggregateRating
      ? `${local.aggregateRating.ratingValue} (${local.aggregateRating.reviewCount})`
      : '— (sin reviews, omitido)',
    breadcrumb: crumbs?.itemListElement?.length ?? 0,
    imagen: local?.image ?? '—',
    ig: local?.sameAs?.[0] ?? '—',
  };
  console.log(`[${slug}] HTTP ${res.status} — tipo=${checks.tipo} horarios=${checks.horarios} rating=${checks.rating} breadcrumb=${checks.breadcrumb}`);
  console.log(`   dir: ${checks.direccion} | geo: ${checks.geo ? 'OK' : 'FALTA'} | ig: ${checks.ig}`);
  if (!checks.contexto || !local || !checks.geo || !checks.direccion || !checks.breadcrumb) failures++;
}

// La home NO debe traer JSON-LD de negocio (no duplicar bloques).
const home = await fetch(`${BASE}/`);
const homeLd = (await home.text()).match(/application\/ld\+json/g);
console.log(`[home] bloques JSON-LD: ${homeLd ? homeLd.length : 0} (esperado 0)`);

console.log(failures === 0 ? '\n✅ JSON-LD válido en todas las fichas' : `\n❌ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
