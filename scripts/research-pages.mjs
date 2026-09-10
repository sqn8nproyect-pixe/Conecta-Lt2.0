// Page reader batch: verify aggregator pages with venue details
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve(process.cwd(), 'scripts/research-raw/pages');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['cybo-discotecas-losteques', 'https://galego.cybo.com/VE/los-teques/danceterias-e-discotecas'],
  ['tiktok-discotecas-losteques', 'https://www.tiktok.com/discover/discotecas-en-los-teques-venezuela'],
  ['infoguia-licorerias-losteques', 'https://infoguia.com/ct.asp?key=licorerias-los-teques&cat=874&ciud=67'],
  ['guiapana-bares-carrizal', 'https://guiapana.com/restaurantes/miranda/carrizal-miranda/bar'],
  ['guiapana-scandalo', 'https://guiapana.com/restaurantes/scandalo-gastrobar'],
  ['guiapana-paracotos-lunch', 'https://guiapana.com/restaurantes/paracotos-lunch-ca'],
  ['alcastars-barbecho', 'https://www.alcastars.com.ve/miranda/los-teques/licoreria-el-barbecho'],
  ['alcastars-lama', 'https://www.alcastars.com.ve/miranda/los-teques/licoreria-lama'],
  ['alcastars-alto-antonio', 'https://www.alcastars.com.ve/miranda/san-antonio-de-los-altos/licoreria-alto-antonio'],
  ['todainfo-dimartino', 'https://todainfo.com/negocio/dimartino-licores'],
  ['tripadvisor-sa-restaurants', 'https://www.tripadvisor.com/Restaurants-g2205378-San_Antonio_de_los_Altos_Capital_Region.html'],
  ['waze-club-campestre-paracotos', 'https://www.waze.com/es-419/live-map/directions/ve/miranda/paracotos/club-campestre-paracotos?to=place.ChIJm9zXvcAKKowRzM1FR6Aq1Mo'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function htmlToText(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function main() {
  const zai = await ZAI.create();
  for (const [slug, url] of PAGES) {
    const file = path.join(OUT, `${slug}.txt`);
    if (fs.existsSync(file)) { console.log(`SKIP: ${slug}`); continue; }
    try {
      const result = await zai.functions.invoke('page_reader', { url });
      const text = `URL: ${url}\nTITLE: ${result?.data?.title || ''}\n\n` + htmlToText(result?.data?.html);
      fs.writeFileSync(file, text.slice(0, 60000));
      console.log(`OK ${slug} (${text.length} chars)`);
    } catch (err) {
      console.error(`ERR ${slug}: ${err.message}`);
    }
    await sleep(700);
  }
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
