// ─────────────────────────────────────────────────────────────
// CONECTA-LT — sitemap.xml dinámico
//
// Estático (/ y /local) + dinámico: una URL por cada negocio
// ACTIVE con lastModified desde updatedAt (ISR 1h: los locales
// nuevos y las ediciones de datos se reflejan sin rebuild).
// ─────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/local`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const businesses = await db.business.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    });

    const localEntries: MetadataRoute.Sitemap = businesses.map((b) => ({
      url: `${SITE_URL}/local/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticEntries, ...localEntries];
  } catch (error) {
    // Si la DB falla, el sitemap no muere: devuelve al menos el estático.
    console.error('[sitemap] DB no disponible', error);
    return staticEntries;
  }
}
