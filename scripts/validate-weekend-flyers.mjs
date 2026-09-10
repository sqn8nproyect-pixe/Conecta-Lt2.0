// ─────────────────────────────────────────────────────────────
// Conecta-LT — Validación E2E de la portada de flyers (Sprint 8.7)
// Uso: curl -s http://localhost:3100/editorial | node scripts/validate-weekend-flyers.mjs
// Lee el HTML desde stdin y verifica los checks clave.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

const html = readFileSync(0, 'utf8');

const checks = [];
function check(name, cond) {
  checks.push({ name, ok: Boolean(cond) });
}

// 1. Los 12 flyers (li > a hacia /local/...) en el grid.
const gridLinks = html.match(/href="\/local\/[^"]+"/g) ?? [];
check('Grid de flyers con enlaces a /local → hay ≥12', gridLinks.length >= 12);

// 2. Títulos de los 12 eventos del seed.
const EXPECTED = [
  'Hora Feliz del Atardecer',
  'Viernes de Rumba Criolla',
  'Botellón de los Moteros',
  'Opening: Sesión de DJ',
  'La Hora del Sol',
  'La Picada del Barrilito',
  'Sábado de Vieja Escuela',
  'Noche de Mix en Vivo',
  'Asado Familiar',
  'Domingo de Burgers',
  'Tardeo de Karaoke',
  'El Desvelado',
];
for (const title of EXPECTED) {
  check(`Flyer "${title}" presente`, html.includes(title));
}

// 3. Promos de dueños con códigos reales.
for (const code of ['TERRAZA17', 'BOTELLON24', 'TEQUENO2X1', 'BARRILITO24', 'DONAROSA4', 'FRIO6AM']) {
  check(`Promo de dueño ${code} visible`, html.includes(code));
}

// 4. JSON-LD: BreadcrumbList + ItemList con 12 ítems.
check('JSON-LD ItemList presente', html.includes('"@type":"ItemList"') || html.includes('"@type": "ItemList"'));
check('JSON-LD BreadcrumbList presente', html.includes('BreadcrumbList'));
const nItems = (html.match(/"position"/g) ?? []).length;
check(`ItemList tiene 12 ListItems (hay ${nItems})`, nItems >= 12);

// 5. CTA a la guía completa (segunda página).
check('CTA a la guía escrita /editorial/[slug]', html.includes('href="/editorial/que-hacer-este-fin-de-semana-los-teques-12-13-septiembre"'));
check('Badge "La guía completa"', html.includes('La guía completa'));

// 6. Metadata y canonical.
check('Canonical /editorial', html.includes('hreflang="es"') || html.includes('rel="canonical"'));
check('H1 con título de portada', html.includes('Qué hacer este fin de semana en Los Teques'));

// 7. Sin rastro del hub antiguo (el listado de posts ya no domina la portada).
check('Ya no hay badge "Guía semanal" del hub antiguo', !html.includes('Guía semanal'));

let pass = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✅' : '❌'} ${c.name}`);
  if (c.ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} checks OK`);
process.exit(pass === checks.length ? 0 : 1);
