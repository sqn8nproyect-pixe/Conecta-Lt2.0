// Batch 3: final gap-filling verification
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'scripts/research-raw');
fs.mkdirSync(OUT, { recursive: true });

const QUERIES = [
  'Tasca Discoteca Moreno Altos Mirandinos',
  'Club Copacabana Los Teques rumba',
  'Gulfstream Park Carrizal food park',
  'Bar Restaurant Shiang Lon San Antonio de Los Altos',
  'Show de Carnes Brasil La Cascada Carrizal',
  'Discoteca El Emperador La Cascada Carrizal',
  'Bodegón El Toro Los Teques Panamericana',
  'Ranch Grill Los Cerritos Los Teques',
  'Jungla Bar Los Teques dirección Panamericana',
  'La Casita de Maikel Los Teques',
  'Discoteca Koko Frappe Los Teques dirección',
  'Evolution Bar Restaurant Las Minas San Antonio',
  'Licorería Abastos La Matica Los Teques',
  'Licorería La Botella de Oro Los Teques dirección',
  'Discoteca Copacabana Los Teques Panamericana',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const zai = await ZAI.create();
  for (const q of QUERIES) {
    const slug = 'v3-' + q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const file = path.join(OUT, `${slug}.json`);
    if (fs.existsSync(file)) { console.log(`SKIP: ${q}`); continue; }
    let results = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        results = await zai.functions.invoke('web_search', { query: q, num: 6 });
        if (!Array.isArray(results)) throw new Error('respuesta no es array');
        break;
      } catch (err) {
        console.error(`ERROR intento ${attempt} [${q}]: ${err.message}`);
        if (attempt < 3) await sleep(3000 * attempt);
      }
    }
    fs.writeFileSync(file, JSON.stringify({ query: q, results }, null, 2));
    console.log(`OK (${results.length}): ${q}`);
    await sleep(2500);
  }
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
