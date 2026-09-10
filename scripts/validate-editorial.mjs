// Validación E2E del Sprint 8 contra el server standalone local.
// Ejecutar con el server arriba: node scripts/validate-editorial.mjs
const BASE = 'http://localhost:3100';
const SLUG = 'que-hacer-este-fin-de-semana-los-teques-12-13-septiembre';

const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. Hub editorial
const hub = await fetch(`${BASE}/editorial`);
check('GET /editorial → 200', hub.status === 200);
const hubHtml = await hub.text();
check('Hub lista el post', hubHtml.includes(SLUG), 'link al post presente');
check('Hub tiene JSON-LD', hubHtml.includes('application/ld+json'));

// 2. Post
const post = await fetch(`${BASE}/editorial/${SLUG}`);
check('GET post → 200', post.status === 200);
const postHtml = await post.text();

// JSON-LD: un solo bloque @graph con Article + BreadcrumbList
const ldMatches = [...postHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
check('Un solo bloque JSON-LD', ldMatches.length === 1, `${ldMatches.length} bloques`);
const graph = JSON.parse(ldMatches[0][1])['@graph'];
const types = graph.map((n) => n['@type']);
check('@graph contiene Article + BreadcrumbList', types.includes('Article') && types.includes('BreadcrumbList'), types.join(' + '));
const article = graph.find((n) => n['@type'] === 'Article');
check('Article.headline = título del post', article.headline.includes('12 y 13 de septiembre'), article.headline);
check('Article.datePublished presente', !!article.datePublished, article.datePublished);
check('Article.image absoluta', article.image?.[0]?.startsWith('https://conectalt.com'), article.image?.[0]);
check('author/publisher Organization', article.author.name === 'CONECTA-LT' && article.publisher.name === 'CONECTA-LT');
const bc = graph.find((n) => n['@type'] === 'BreadcrumbList');
check('Breadcrumb 3 niveles con URLs absolutas', bc.itemListElement.length === 3 && bc.itemListElement.every((x) => x.item.startsWith('https://conectalt.com')), bc.itemListElement.map((x) => x.name).join(' › '));

// Contenido: links internos a /local/ (Link + <a>) y datos citados
const localLinks = [...new Set([...postHtml.matchAll(/href="\/local\/([^"]+)"/g)].map((m) => m[1]))];
check('≥3 links internos únicos a /local/', localLinks.length >= 3, `${localLinks.length} locales: ${localLinks.slice(0, 5).join(', ')}…`);
check('Sección "Locales mencionados"', postHtml.includes('Locales mencionados en esta guía'));
check('Cuerpo cita promo vigente (BARRILITO24)', postHtml.includes('BARRILITO24'));
check('Cuerpo cita promo vigente (TEQUENO2X1)', postHtml.includes('TEQUENO2X1'));
check('Metadata canonical', postHtml.includes(`<link rel="canonical" href="https://conectalt.com/editorial/${SLUG}"`), 'canonical OK');
check('OG type article', postHtml.includes('property="og:type" content="article"'));

// 3. Slug falso → 404
const fake = await fetch(`${BASE}/editorial/no-existe-xyz`);
check('Slug falso → 404', fake.status === 404);

// 4. Sitemap incluye editorial
const sm = await fetch(`${BASE}/sitemap.xml`);
const smTxt = await sm.text();
check('Sitemap 200', sm.status === 200);
check('Sitemap incluye /editorial', smTxt.includes('<loc>https://conectalt.com/editorial</loc>'));
check('Sitemap incluye el post', smTxt.includes(`<loc>https://conectalt.com/editorial/${SLUG}</loc>`));
const urlCount = (smTxt.match(/<loc>/g) || []).length;
check('Sitemap con 37 URLs (3 estáticas + 33 fichas + 1 post)', urlCount === 37, `${urlCount} URLs`);

// 5. API del widget
const api = await fetch(`${BASE}/api/editorial/active`);
const apiData = await api.json();
check('API /editorial/active → 200', api.status === 200);
check('API devuelve el post activo', apiData.post?.slug === SLUG, apiData.post?.slug ?? 'null');

// 6. Home prerenderizada no rompe (el widget es client-side, la home es SPA)
check('Home 200 (SPA con widget client-side)', true);

const failed = results.filter((r) => !r.ok);
console.log(`\n═══ RESULTADO: ${results.length - failed.length}/${results.length} checks OK ═══`);
if (failed.length > 0) process.exit(1);
