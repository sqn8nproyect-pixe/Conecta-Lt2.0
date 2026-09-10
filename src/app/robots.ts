// ─────────────────────────────────────────────────────────────
// CONECTA-LT — robots.txt
//
// Reemplaza a public/robots.txt (Next no permite ambos). La SPA
// (/) es indexable; las APIs y las páginas de reserva privada
// (/r/[code]) quedan fuera del rastreo.
// ─────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/r/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
