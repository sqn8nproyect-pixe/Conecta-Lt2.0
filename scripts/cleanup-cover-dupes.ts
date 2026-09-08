// ─────────────────────────────────────────────────────────────
// CONECTA-LT — scripts/cleanup-cover-dupes.ts
//
// Elimina las imágenes GALLERY que tienen la misma URL que el
// coverImage del negocio. Estas imágenes duplicadas venían del
// seed original (cuando un local tenía /images/licoreria.png
// como COVER y también como GALLERY[1]).
//
// El transformBusiness ya hace dedup en runtime, pero tenerlas
// en la DB confunde al panel del dueño (ve 6 fotos cuando solo
// 4 son distintas) y ensucia el conteo "X/10".
//
// IDEMPOTENTE: solo borra GALLERY images cuya URL coincida
// exactamente con business.coverImage. Si se corre de nuevo no
// encuentra nada que borrar.
//
// Uso:
//   DATABASE_URL="$NEON" bun run scripts/cleanup-cover-dupes.ts
// ─────────────────────────────────────────────────────────────

import { db } from '../src/lib/db';

async function main() {
  const bizList = await db.business.findMany({
    select: {
      slug: true,
      name: true,
      coverImage: true,
      images: { select: { id: true, url: true, type: true } },
    },
    orderBy: { slug: 'asc' },
  });

  const toDelete: string[] = [];

  for (const biz of bizList) {
    if (!biz.coverImage) continue;
    const dupes = biz.images.filter(
      (img) => img.type === 'GALLERY' && img.url === biz.coverImage,
    );
    if (dupes.length > 0) {
      console.log(`[${biz.slug}] ${dupes.length} duplicada(s) del COVER:`);
      dupes.forEach((d) => {
        console.log(`  - id ${d.id} | url: ${d.url}`);
        toDelete.push(d.id);
      });
    }
  }

  if (toDelete.length === 0) {
    console.log('\n[cleanup-cover-dupes] ✅ Nada que limpiar. DB ya está sin duplicados.');
    return;
  }

  console.log(`\n[cleanup-cover-dupes] Eliminando ${toDelete.length} imagen(es) duplicada(s)...`);

  const result = await db.businessImage.deleteMany({
    where: { id: { in: toDelete } },
  });

  console.log(`[cleanup-cover-dupes] ✅ ${result.count} imagen(es) eliminada(s).`);

  // Verificación: contar GALLERY restantes por negocio
  const remaining = await db.business.findMany({
    select: { slug: true, coverImage: true, images: { select: { type: true, url: true } } },
    where: { slug: { in: bizList.map((b) => b.slug) } },
  });
  console.log('\n[cleanup-cover-dupes] Galerías tras limpieza:');
  remaining.forEach((b) => {
    const gallery = b.images.filter((i) => i.type === 'GALLERY');
    const stillDupes = gallery.filter((g) => g.url === b.coverImage);
    console.log(`  ${b.slug}: ${gallery.length} fotos en galería, ${stillDupes.length} duplicadas del COVER`);
  });
}

main()
  .catch((err) => {
    console.error('[cleanup-cover-dupes] ❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
