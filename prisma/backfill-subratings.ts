// Backfill script — Etapa 3
// Llena ambienteRating, servicioRating, precioCalidadRating con el valor de rating
// para las reviews existentes (86 rows) que se crearon antes de Etapa 3.
import { db } from '../src/lib/db'

async function main() {
  const result = await db.$executeRaw`
    UPDATE "Review"
    SET
      "ambienteRating"     = "rating",
      "servicioRating"     = "rating",
      "precioCalidadRating" = "rating"
    WHERE "ambienteRating" = 0
       OR "servicioRating" = 0
       OR "precioCalidadRating" = 0
  `
  console.log(`✅ Backfill completado: ${result} reviews actualizadas`)

  // Verificación: mostrar muestra
  const sample = await db.review.findMany({
    take: 5,
    select: { id: true, rating: true, ambienteRating: true, servicioRating: true, precioCalidadRating: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\nMuestra (primeras 5 reviews):')
  console.table(sample)

  // Recalcular promedios por dimensión en Business
  const businesses = await db.business.findMany({
    select: { id: true, name: true, avgRating: true, ambienteRating: true, servicioRating: true, precioCalidadRating: true },
  })
  console.log(`\nRecalculando sub-ratings para ${businesses.length} negocios...`)

  for (const b of businesses) {
    const agg = await db.review.aggregate({
      where: { businessId: b.id, status: 'PUBLISHED' },
      _avg: { rating: true, ambienteRating: true, servicioRating: true, precioCalidadRating: true },
      _count: true,
    })
    if (agg._count === 0) continue
    await db.business.update({
      where: { id: b.id },
      data: {
        avgRating: agg._avg.rating ?? 0,
        ambienteRating: agg._avg.ambienteRating ?? 0,
        servicioRating: agg._avg.servicioRating ?? 0,
        precioCalidadRating: agg._avg.precioCalidadRating ?? 0,
        reviewCount: agg._count,
      },
    })
  }
  console.log('✅ Sub-ratings de Business recalculados')

  // Muestra de businesses
  const sampleBiz = await db.business.findMany({
    take: 5,
    select: { name: true, avgRating: true, ambienteRating: true, servicioRating: true, precioCalidadRating: true, reviewCount: true },
    orderBy: { reviewCount: 'desc' },
  })
  console.log('\nMuestra (top 5 negocios por reviewCount):')
  console.table(sampleBiz)
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
