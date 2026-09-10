// ─────────────────────────────────────────────────────────────
// CONECTA-LT — sitemap.xml dinámico
//
// Estático (/ , /local, /editorial) + dinámico: una URL por cada
// negocio ACTIVE (lastModified desde updatedAt) y una por cada
// post editorial PUBLISHED. ISR 1h: los locales nuevos, las
// ediciones de datos y las guías semanales se reflejan sin rebuild.
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
    {
      url: `${SITE_URL}/editorial`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  try {
    const [businesses, posts] = await Promise.all([
      db.business.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
      }),
      db.editorialPost.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const localEntries: MetadataRoute.Sitemap = businesses.map((b) => ({
      url: `${SITE_URL}/local/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const editorialEntries: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${SITE_URL}/editorial/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticEntries, ...localEntries, ...editorialEntries];
  } catch (error) {
    // Si la DB falla, el sitemap no muere: devuelve al menos el estático.
    console.error('[sitemap] DB no disponible', error);
    return staticEntries;
  }
}
