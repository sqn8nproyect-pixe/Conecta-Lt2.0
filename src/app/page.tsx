// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Home (ruta /)
//
// Server Component con SSG + ISR (revalidate 1h). Desde el fix
// SEO 2026-10-09 la home inyecta en SSR un directorio de
// enlaces internos hacia las fichas /local/[slug]: el análisis
// GSC mostró 32 fichas "Descubierta: actualmente sin indexar"
// con causa raíz verificada — el SSR de la home no tenía NI UN
// enlace hacia ellas (todo el flujo interno era SPA cliente) y
// Google solo las descubría vía sitemap.
//
// Estructura:
//   - <HomeShell>: la SPA interactiva completa (AgeGate, navbar,
//     vistas, footer). Es el antiguo page.tsx cliente, movido
//     sin cambios de comportamiento a
//     src/components/conecta/HomeShell.tsx.
//   - <LocalesDirectory>: Server Component con los <Link> SSR
//     (cero JS extra, cero CLS — viene en el HTML inicial).
//
// La query lleva try/catch: si el build corre sin DB accesible
// la sección desaparece sin romper el build (en Vercel la build
// SÍ tiene DATABASE_URL — las migraciones corren en buildCommand).
// ─────────────────────────────────────────────────────────────

import { HomeShell } from '@/components/conecta/HomeShell';
import { LocalesDirectory } from '@/components/conecta/LocalesDirectory';
import { db } from '@/lib/db';

// ISR: los locales nuevos/renombrados entran (o salen) del
// directorio en ≤1h sin rebuild — mismo ciclo que las fichas.
export const revalidate = 3600;

async function getLocalesForDirectory() {
  try {
    const rows = await db.business.findMany({
      where: { status: 'ACTIVE' },
      select: {
        slug: true,
        name: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      categoryName: r.category?.name ?? null,
    }));
  } catch {
    // Sin DB (build local/sandbox, error transitorio): la home
    // se renderiza sin directorio — nunca rompe el build.
    return [];
  }
}

export default async function Home() {
  const locales = await getLocalesForDirectory();
  return <HomeShell directory={<LocalesDirectory locales={locales} />} />;
}
