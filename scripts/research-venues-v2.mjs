// Batch 2: per-candidate verification searches
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'scripts/research-raw');
fs.mkdirSync(OUT, { recursive: true });

const QUERIES = [
  // Discotecas candidatos
  'Discoteca Donato Los Teques',
  'discoteca Nonna Los Teques',
  'Koko Frappe Los Teques',
  'Discoteca Medusa Los Teques La Matica',
  'Tasca Discoteca Moreno Los Teques',
  'Puerta Negra discoteca Carrizal',
  'Evolution Las Minas San Antonio de Los Altos discoteca',
  'Prestige Game 8 Club Carrizal',
  'View Disco Lounge San Antonio de Los Altos',
  'Club Centro de Amigos Los Teques salsa',
  'The Q AfterRoom Los Teques',
  'Hippocampus Show Room Los Teques',
  'Chapis Club Los Teques',
  'Jungla Bar Los Teques',
  'salón baile eventos Los Teques Guaicaipuro',
  // Bares / licobares / tascas candidatos
  'Scandalo Gastrobar San Antonio de los Altos teléfono',
  'Ranch Grill Carrizal Altos Mirandinos',
  'Pasatiempos Grill Carrizal',
  'Daws Lounge Delicious Food San Antonio de los Altos',
  'Tequilibrio San Antonio de los Altos',
  'Café Racer Bar San Antonio de los Altos Venezuela',
  'La Tasca de Chila Los Teques',
  'Bar de Pancho Paracotos',
  'Club Campestre Paracotos restaurante',
  'Meson de Andres San Antonio de los Altos',
  'Maute Grill San Antonio de los Altos',
  // Licorerías candidatos
  'Licorería Don Sancho Los Teques Bolívar',
  'Licorería El Búnker Los Teques',
  'Licorería Mi Peldaño Los Teques',
  'Licorería La Botella de Oro Los Teques teléfono',
  'Licorería El Barbecho Los Teques Acueducto',
  'Licorería Madalena Los Teques El Paso',
  'Licorería Los Picachos San Antonio de los Altos',
  'Licorería Alto Antonio San Antonio',
  'Licorería Las Dalias Los Teques Lagunetica',
  'Licorería Lama Los Teques Camatagua',
  'Licoreria Droopys Carrizal',
  'Dimartino Licores Carrizal',
  'Licorería La Estación de la Birra y el Licor Los Teques',
  'Licorería El Cartujo Los Teques',
  // Artículo de prensa
  'eltequeño.com 10 licorerías tequeñas lunes a lunes',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const zai = await ZAI.create();
  const index = [];
  for (const q of QUERIES) {
    const slug = 'v2-' + q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const file = path.join(OUT, `${slug}.json`);
    if (fs.existsSync(file)) {
      console.log(`SKIP: ${q}`);
      index.push({ query: q, file });
      continue;
    }
    let results = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        results = await zai.functions.invoke('web_search', { query: q, num: 8 });
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
    await sleep(500);
  }
  fs.writeFileSync(path.join(OUT, '_index-v2.json'), JSON.stringify(index, null, 2));
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
