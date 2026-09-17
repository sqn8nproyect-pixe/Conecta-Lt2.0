// Limpieza de deployments viejos en Vercel — libera Function Storage.
// NO borra nada del proyecto actual: conserva los KEEP deployments más recientes.
//
// Uso (el token va por variable de entorno, JAMÁS en este archivo):
//   VERCEL_TOKEN=xxx bun scripts/vercel-purge.mjs list    → solo muestra el plan
//   VERCEL_TOKEN=xxx bun scripts/vercel-purge.mjs purge   → ejecuta el borrado

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) { console.error('Falta VERCEL_TOKEN'); process.exit(1); }
const MODE = process.argv[2] || 'list';
const KEEP = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

// ── 1. Localizar el proyecto (el token team-scoped lista proyectos auto-scoped) ──
let project = null;
try {
  const data = await api('/v9/projects?limit=100');
  for (const p of data.projects || []) {
    console.log(`proyecto: ${p.name} (accountId=${p.accountId})`);
    if (!project && p.name.toLowerCase().includes('conecta')) {
      project = { ...p, teamId: p.accountId.startsWith('team_') ? p.accountId : null };
    }
  }
} catch (e) { console.log(`(listado de proyectos falló: ${String(e.message).slice(0, 120)})`); }
if (!project) { console.error('✗ No encontré ningún proyecto "conecta"'); process.exit(1); }
console.log(`>>> Elegido: ${project.name} id=${project.id} teamId=${project.teamId ?? '(ninguno)'}\n`);

// ── 2. Listar deployments (paginado) ────────────────────────────────────────
const tqs = project.teamId ? `&teamId=${project.teamId}` : '';
let all = [];
let until;
for (let i = 0; i < 50; i++) {
  const u = until ? `&until=${until}` : '';
  const data = await api(`/v6/deployments?projectId=${project.id}&limit=100${tqs}${u}`);
  const deploys = data.deployments || [];
  all.push(...deploys);
  if (deploys.length < 100) break;
  until = Math.min(...deploys.map((d) => d.createdAt)) - 1;
}
all.sort((a, b) => b.createdAt - a.createdAt);
console.log(`Deployments encontrados: ${all.length}`);
const states = {};
for (const d of all) states[d.readyState] = (states[d.readyState] || 0) + 1;
console.log(`Estados: ${JSON.stringify(states)}`);

const keepers = all.slice(0, KEEP);
const victims = all.slice(KEEP);
console.log(`\nSE MANTIENEN (${keepers.length}, los más recientes):`);
for (const d of keepers) {
  console.log(`  ${d.uid} ${d.readyState} prod=${d.target === 'production'} ${new Date(d.createdAt).toISOString().slice(0, 16)} ${d.url}`);
}
console.log(`\nA BORRAR: ${victims.length}`);
if (MODE !== 'purge') { console.log('\n(modo list — nada borrado)'); process.exit(0); }

// ── 3. Borrar ────────────────────────────────────────────────────────────────
let ok = 0, fail = 0;
for (const d of victims) {
  try {
    await api(`/v13/deployments/${d.uid}${tqs ? `?teamId=${project.teamId}` : ''}`, { method: 'DELETE' });
    ok++;
    if (ok % 25 === 0) console.log(`  … ${ok} borrados`);
  } catch (e) {
    fail++;
    if (String(e.message).includes('429')) { await sleep(3000); fail--; continue; }
    console.log(`  ✗ ${d.uid}: ${String(e.message).slice(0, 100)}`);
  }
  await sleep(150);
}
console.log(`\nLISTO: ${ok} borrados · ${fail} fallos · ${keepers.length} conservados.`);
