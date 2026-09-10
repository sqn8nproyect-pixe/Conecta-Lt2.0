// Archiva entradas antiguas de worklog.md para mantenerlo ligero.
// Estrategia: conservar las últimas N entradas en worklog.md y mover
// el resto a worklog-archivo-2026-09.md con encabezado explicativo.
// Uso: bun run scripts/archive-worklog.ts [N]

import { readFileSync, writeFileSync, existsSync } from 'fs';

const WORKLOG = '/home/z/my-project/worklog.md';
const ARCHIVE = '/home/z/my-project/worklog-archivo-2026-09.md';
const KEEP = Number(process.argv[2] ?? 10);

const content = readFileSync(WORKLOG, 'utf-8');
const lines = content.split('\n');

// Localizar líneas que marcan inicio de entrada (Task ID:)
const entryIdx = lines
  .map((l, i) => (l.startsWith('Task ID:') ? i : -1))
  .filter((i) => i >= 0);

console.log(`Entradas encontradas: ${entryIdx.length}`);
if (entryIdx.length <= KEEP) {
  console.log(`Solo hay ${entryIdx.length} entradas; nada que archivar (KEEP=${KEEP}).`);
  process.exit(0);
}

// Punto de corte: el separador '---' inmediatamente anterior a la entrada n
const cutEntryLine = entryIdx[entryIdx.length - KEEP];
let cut = cutEntryLine;
while (cut > 0 && lines[cut - 1].trim() === '---') cut--;
// Incluir la línea de separación en el archivo activo
if (cut > 0 && lines[cut - 1].trim() === '') cut--;

const archiveLines = lines.slice(0, cut);
const activeLines = lines.slice(cut);

// No pisar un archivo existente sin confirmación
if (existsSync(ARCHIVE)) {
  console.error(`ERROR: ${ARCHIVE} ya existe. Revisar antes de re-archivar.`);
  process.exit(1);
}

const archivedCount = entryIdx.length - KEEP;
const header = [
  '# 📦 ARCHIVO DE WORKLOG — Conecta-LT',
  `# Entradas 1-${archivedCount} (hasta 2026-09-09), archivadas el 2026-09-10`,
  '# Motivo: worklog.md llegó a 544KB/133 entradas y saturaba el contexto de los agentes.',
  '# El historial completo vive en git. Las entradas recientes están en worklog.md.',
  '',
];

writeFileSync(ARCHIVE, header.join('\n') + archiveLines.join('\n'));

const activeHeader = [
  '> ℹ️ El historial antiguo (' + archivedCount + ' entradas hasta el 2026-09-09) está en',
  '> `worklog-archivo-2026-09.md`. Leer la COLA de este archivo para contexto reciente.',
  '',
];

writeFileSync(WORKLOG, activeHeader.join('\n') + activeLines.join('\n'));

console.log(`✅ Archivadas ${archivedCount} entradas → ${ARCHIVE}`);
console.log(`✅ worklog.md conserva las últimas ${KEEP} entradas`);
console.log(`Tamaños nuevos:`);
