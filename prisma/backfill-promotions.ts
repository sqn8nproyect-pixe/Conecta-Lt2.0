// Backfill Etapa 4 — Actualiza las promociones existentes con fechas reales
// + maxRedemptions + redemptionCount inicial. NO toca users, reviews, ni favoritos.
import { db } from '../src/lib/db'

async function main() {
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, code: true, redemptionCount: true },
  })
  console.log(`📋 Encontradas ${promotions.length} promociones para actualizar`)

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  for (const [idx, promo] of promotions.entries()) {
    // Patrón determinista:
    //   - idx % 3 === 0: vigente (startDate -7d, endDate +30d, maxRedemptions 50, redemptions 0-11)
    //   - idx % 3 === 1: próxima a expirar (endDate +3d, maxRedemptions 30, redemptions 25-29 casi agotada)
    //   - idx % 3 === 2: expirada (endDate -10d, status EXPIRED)
    const pattern = idx % 3
    let startDate: Date
    let endDate: Date
    let maxRedemptions: number | null
    let redemptionCount: number
    let status: 'ACTIVE' | 'EXPIRED' = 'ACTIVE'

    if (pattern === 0) {
      // Vigente
      startDate = new Date(now - 7 * DAY)
      endDate = new Date(now + 30 * DAY)
      maxRedemptions = 50
      redemptionCount = (idx + 3) % 12 // 0-11
    } else if (pattern === 1) {
      // Casi agotada / por expirar
      startDate = new Date(now - 25 * DAY)
      endDate = new Date(now + 3 * DAY)
      maxRedemptions = 30
      redemptionCount = 25 + (idx % 5) // 25-29, muy cerca del límite de 30
    } else {
      // Expirada
      startDate = new Date(now - 40 * DAY)
      endDate = new Date(now - 10 * DAY)
      maxRedemptions = 20
      redemptionCount = 20 // agotada
      status = 'EXPIRED'
    }

    await db.promotion.update({
      where: { id: promo.id },
      data: { startDate, endDate, maxRedemptions, redemptionCount, status },
    })
  }

  console.log(`✅ ${promotions.length} promociones actualizadas con fechas reales\n`)

  // Resumen
  const summary = await db.promotion.groupBy({
    by: ['status'],
    _count: true,
    _avg: { redemptionCount: true },
  })
  console.log('📊 Resumen por status:')
  console.table(summary)

  // Muestra de las primeras 6
  const sample = await db.promotion.findMany({
    take: 6,
    select: {
      title: true,
      code: true,
      status: true,
      startDate: true,
      endDate: true,
      maxRedemptions: true,
      redemptionCount: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\n📋 Muestra (primeras 6 promociones):')
  console.table(
    sample.map((p) => ({
      title: p.title.slice(0, 30),
      code: p.code,
      status: p.status,
      endDate: p.endDate?.toISOString().slice(0, 10),
      redeemed: `${p.redemptionCount}/${p.maxRedemptions ?? '∞'}`,
    })),
  )
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
