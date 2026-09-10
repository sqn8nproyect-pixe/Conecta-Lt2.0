/**
 * SANEAMIENTO COORDENADAS v2 — el seed original geocodificó Los Teques
 * ~18km al este (lng -66.83/-66.85 en vez de -67.03/-67.05).
 *
 * Referencia real (Wikipedia/geodatos/123coordenadas):
 *   Los Teques centro: 10.344, -67.043
 *   SALOS: 10.390, -66.950 | San Pedro: 10.407, -66.903
 *   Carrizal (Corralito): ~10.31, -66.99
 *
 * Estrategia:
 *   - Africa Burguers: pin EXACTO del usuario (Google Maps 9X58+F5J)
 *   - Don Sancho: restaurar seed original (10.3473, -67.0430 — era correcto)
 *   - Licobar JJ: aprox. bloque CC Hito (10.345, -67.033)
 *   - Panamericana Km 23/25/26: interpolación SALOS→centro (ver script)
 *   - Resto: aproximación por calle/sector con ancla Plaza Bolívar,
 *     documentadas como "pendiente pin exacto"
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Interpolación Panamericana: Km 13 (SALOS) → Km 27 (centro Los Teques)
const KM = (km) => ({
  lat: 10.39 + ((km - 13) / 14) * (10.344 - 10.39),
  lng: -66.95 + ((km - 13) / 14) * (-67.043 + 66.95),
});
const km23 = KM(23), km25 = KM(25), km26 = KM(26);

const FIXES = {
  // --- Centro (anclas: Plaza Bolívar 10.3442,-67.0344; Av. Bolívar; calles céntricas) ---
  'tasca-el-patio': { lat: 10.3587125, lng: -67.0346094, nota: 'PIN EXACTO usuario (maps.app.goo.gl/f1QaZQ276pPnk9f48, Plus Code 9X58+F5J)' },
  'licoreria-don-sancho': { lat: 10.347347, lng: -67.042951, nota: 'restaura seed original (Av. Bolívar con Ayacucho — era correcto)' },
  'licobar-punto-de-encuentro': { lat: 10.345, lng: -67.033, nota: 'aprox. bloque CC Hito (Calle Carabobo × Bulevar Bermúdez)' },
  'bodegon-bicentenario': { lat: 10.3415, lng: -67.044, nota: 'aprox. Av. Roscio / sector El Rincón' },
  'bodegon-bravamar': { lat: 10.3455, lng: -67.036, nota: 'aprox. Calle Ribas centro' },
  'bodegon-naikel': { lat: 10.3465, lng: -67.033, nota: 'aprox. CC Ambrosi, Calle Boyacá' },
  'bodegon-panamericana': { lat: 10.342, lng: -67.02, nota: 'aprox. tramo urbano Panamericana' },
  'club-centro-de-amigos': { lat: 10.344, lng: -67.038, nota: 'aprox. sector Centro' },
  'discoteca-donato': { lat: 10.348, lng: -67.035, nota: 'aprox. Av. Boyacá, Edif. Parayauta' },
  'discoteca-koko-frappe': { lat: 10.346, lng: -67.04, nota: 'aprox. Av. Víctor Baptista' },
  'el-llanero': { lat: 10.344, lng: -67.028, nota: 'aprox. Calle El Carmen' },
  'jungla-bar': { lat: 10.3465, lng: -67.037, nota: 'aprox. Mercado Municipal El Paso' },
  'licoreria-chuky': { lat: 10.346, lng: -67.04, nota: 'aprox. Av. Víctor Baptista' },
  'licoreria-curametono': { lat: 10.3442, lng: -67.0344, nota: 'aprox. Casco Central (Plaza Bolívar)' },
  'licoreria-el-barbecho': { lat: 10.352, lng: -67.045, nota: 'aprox. Urb. El Barbecho' },
  'licoreria-la-botella-de-oro': { lat: 10.343, lng: -67.03, nota: 'aprox. sector El Llano' },
  'licoreria-la-macarena': { lat: 10.335, lng: -67.01, nota: 'aprox. sector La Macarena, entrada Panamericana' },
  'licoreria-mis-amores': { lat: 10.343, lng: -67.03, nota: 'aprox. sector El Llano' },
  'new-copacabana': { lat: 10.3442, lng: -67.0344, nota: 'aprox. sector Centro (Plaza Bolívar)' },

  // --- Panamericana Sur (interpolación Km 13→27) ---
  'ranch-grill': { lat: km23.lat, lng: km23.lng, nota: 'interpolado Km 23 Los Cerritos' },
  'discoteca-medusa': { lat: km25.lat, lng: km25.lng, nota: 'interpolado Km 25 CC La Matica' },
  'bodegon-el-toro': { lat: km26.lat, lng: km26.lng, nota: 'interpolado Km 26' },
  'la-estacion-de-la-birra': { lat: 10.345, lng: -67.04, nota: 'aprox. Av. Bertorelli Cisneros, El Cabotaje' },
  'mercaplus-la-fortaleza': { lat: 10.352, lng: -67.04, nota: 'aprox. Av. Bertorelli Cisneros, Camatagua' },

  // --- Laguneta y La Llovizna (vía El Jarillo, SW) ---
  'la-casita-de-maikel': { lat: 10.325, lng: -67.065, nota: 'aprox. Laguneta de la Montaña' },
  'licoreria-la-llovizna': { lat: 10.332, lng: -67.055, nota: 'aprox. vía Los Teques-Lagunetica' },

  // --- Carrizal: mis fixes previos eran plausibles, se mantienen ---
  // --- SALOS (4) y San Pedro (1): estaban correctos, no se tocan ---
};

// Rangos de sanidad CORRECTOS (post-auditoría)
const RANGOS = {
  Centro: { lat: [10.33, 10.37], lng: [-67.06, -67.01] },
  'Panamericana Sur': { lat: [10.32, 10.38], lng: [-67.05, -66.98] }, // corredor sur (pin El Toro 10.331,-67.041 confirma lat baja) + Bertorelli (pins pendientes)
  'San Antonio de Los Altos': { lat: [10.37, 10.41], lng: [-66.97, -66.93] },
  Carrizal: { lat: [10.29, 10.33], lng: [-67.02, -66.97] },
  'San Pedro de los Altos': { lat: [10.39, 10.43], lng: [-66.92, -66.88] },
  'Laguneta y La Llovizna': { lat: [10.30, 10.35], lng: [-67.08, -67.04] },
};

async function main() {
  console.log(`[1] Aplicando ${Object.keys(FIXES).length} coordenadas...\n`);
  for (const [slug, f] of Object.entries(FIXES)) {
    const antes = await prisma.business.findUnique({
      where: { slug },
      select: { name: true, lat: true, lng: true },
    });
    if (!antes) throw new Error('No existe: ' + slug);
    await prisma.business.update({ where: { slug }, data: { lat: f.lat, lng: f.lng } });
    console.log(
      `✓ ${antes.name}: ${antes.lat.toFixed(4)},${antes.lng.toFixed(4)} → ${f.lat.toFixed(4)},${f.lng.toFixed(4)}\n    (${f.nota})`
    );
  }

  console.log('\n[2] Escaneo de sanidad con rangos correctos:');
  const negocios = await prisma.business.findMany({ include: { zone: true } });
  let ok = 0;
  for (const b of negocios) {
    const r = RANGOS[b.zone?.name];
    const fuera =
      !r || b.lat < r.lat[0] || b.lat > r.lat[1] || b.lng < r.lng[0] || b.lng > r.lng[1];
    if (fuera) {
      console.log(`  ⚠ ${b.name} [${b.zone?.name}] ${b.lat.toFixed(4)},${b.lng.toFixed(4)}`);
    } else {
      ok++;
    }
  }
  console.log(`\n    En rango: ${ok}/${negocios.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
