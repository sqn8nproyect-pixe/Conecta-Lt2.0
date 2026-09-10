// Research script: real nightlife venues in Municipio Guaicaipuro, Miranda, Venezuela
// Uses z-ai-web-dev-sdk web_search. Saves raw results per query to research-raw/
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'scripts/research-raw');
fs.mkdirSync(OUT, { recursive: true });

const QUERIES = [
  // Licorerías
  'licorerías en Los Teques',
  'licorería Los Teques Miranda Venezuela teléfono',
  'licorería San Antonio de Los Altos Miranda',
  'licorería Carrizal Miranda Venezuela',
  'whisky licorería Los Teques',
  'botellas Los Teques licor expendio',
  'licorería Las Brisas de Los Teques',
  'site:instagram.com licoreria Los Teques',
  // Bares / licobares
  'bares Los Teques Miranda Venezuela',
  'licobar Los Teques',
  'bar San Antonio de Los Altos',
  'botellas San Antonio de Los Altos',
  'bar Carrizal Altos Mirandinos',
  'mejores bares Los Teques rumba',
  'site:instagram.com bar Los Teques',
  // Discotecas / salones de baile
  'discotecas Los Teques',
  'discoteca Los Teques Miranda',
  'salón de baile Los Teques Miranda',
  'discoteca Carrizal Miranda',
  'discoteca San Antonio de Los Altos',
  'rumba Los Teques donde bailar',
  'site:instagram.com discoteca Los Teques',
  // Tascas / restaurantes con barra
  'tascas Los Teques',
  'tasca San Antonio de Los Altos',
  'restaurante bar San Antonio de Los Altos',
  'restaurantes San Pedro de Los Altos Miranda',
  'bar restaurante Paracotos Miranda',
  'comida y tragos Los Teques recomendado',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const zai = await ZAI.create();
  const index = [];
  for (const q of QUERIES) {
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const file = path.join(OUT, `${slug}.json`);
    if (fs.existsSync(file)) {
      console.log(`SKIP (ya existe): ${q}`);
      index.push({ query: q, file });
      continue;
    }
    let results = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        results = await zai.functions.invoke('web_search', { query: q, num: 10 });
        if (!Array.isArray(results)) throw new Error('respuesta no es array');
        break;
      } catch (err) {
        console.error(`ERROR intento ${attempt} [${q}]: ${err.message}`);
        if (attempt < 3) await sleep(1500 * attempt);
      }
    }
    fs.writeFileSync(file, JSON.stringify({ query: q, results }, null, 2));
    index.push({ query: q, file });
    console.log(`OK (${Array.isArray(results) ? results.length : 0}) resultados: ${q}`);
    await sleep(600);
  }
  fs.writeFileSync(path.join(OUT, '_index.json'), JSON.stringify(index, null, 2));
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
