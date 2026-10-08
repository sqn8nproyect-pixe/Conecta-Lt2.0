// ─────────────────────────────────────────────────────────────
// scripts/rename-africa-burguers.ts
//
// Fix puntual del caso detectado por el dueño: el local "Tasca el
// Patio" fue renombrado a "Africa Burguers" desde el panel, pero el
// slug público quedó con la marca vieja (tasca-el-patio) porque el
// renombre automático aún no existía.
//
// Este script migra el slug a la marca actual y archiva el viejo en
// formerSlugs para que /local/tasca-el-patio redirija (308) a
// /local/africa-burguers una vez desplegado el código nuevo.
//
// Ejecutar DESPUÉS de que el deploy de Vercel haya corrido
// `prisma migrate deploy` (necesita la columna formerSlugs).
//
// Idempotente: si el slug ya fue migrado, no hace nada y solo
// informa el estado. Aborta si el nombre del local ya no coincide
// con "Africa Burguers" (protección contra renombres intermedios).
//
// Uso: bun run scripts/rename-africa-burguers.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const OLD_SLUG = 'tasca-el-patio';
const NEW_SLUG = 'africa-burguers';
const EXPECTED_NAME = 'Africa Burguers';

async function main() {
  // 1. ¿El local todavía tiene el slug viejo?
  const withOldSlug = await db.business.findUnique({
    where: { slug: OLD_SLUG },
    select: { id: true, name: true, slug: true, formerSlugs: true },
  });

  if (!withOldSlug) {
    // ¿Ya fue migrado (o el usuario lo renombró de otra forma)?
    const migrated = await db.business.findFirst({
      where: { formerSlugs: { has: OLD_SLUG } },
      select: { id: true, name: true, slug: true, formerSlugs: true },
    });
    if (migrated) {
      console.log(
        `✓ Ya migrado: "${migrated.name}" vive en /local/${migrated.slug} ` +
          `(historial: ${migrated.formerSlugs.join(', ')})`,
      );
      return;
    }
    console.log(
      `✗ No existe ningún local con slug "${OLD_SLUG}" ni con ese slug en su historial. Nada que hacer.`,
    );
    return;
  }

  // 2. Protección: el nombre debe ser el esperado.
  if (withOldSlug.name.trim() !== EXPECTED_NAME) {
    console.log(
      `✗ ABORTADO: el local con slug "${OLD_SLUG}" se llama "${withOldSlug.name}", ` +
        `no "${EXPECTED_NAME}". Revisar manualmente.`,
    );
    return;
  }

  // 3. ¿El slug nuevo está libre (ni slug actual ni historial ajeno)?
  const clash = await db.business.findFirst({
    where: {
      id: { not: withOldSlug.id },
      OR: [{ slug: NEW_SLUG }, { formerSlugs: { has: NEW_SLUG } }],
    },
    select: { id: true, name: true },
  });
  if (clash) {
    console.log(
      `✗ ABORTADO: el slug "${NEW_SLUG}" ya lo usa/ocupa "${clash.name}".`,
    );
    return;
  }

  // 4. Migrar: slug nuevo + archivar el viejo.
  const updated = await db.business.update({
    where: { id: withOldSlug.id },
    data: {
      slug: NEW_SLUG,
      formerSlugs: {
        set: Array.from(new Set([...withOldSlug.formerSlugs, OLD_SLUG])),
      },
    },
    select: { id: true, name: true, slug: true, formerSlugs: true },
  });

  console.log(
    `✓ Renombrado: "${updated.name}" ahora vive en /local/${updated.slug} ` +
      `(redirige desde: ${updated.formerSlugs.join(', ')})`,
  );
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
