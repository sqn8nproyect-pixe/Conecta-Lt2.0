// ─────────────────────────────────────────────────────────────
// CONECTA-LT — robots.txt
//
// Reemplaza a public/robots.txt (Next no permite ambos). La SPA
// (/) es indexable; las APIs y las páginas de reserva privada
// (/r/[code]) quedan fuera del rastreo.
//
// GEO (Generative Engine Optimization): además del comodín '*',
// se declaran EXPLÍCITAMENTE los rastreadores que alimentan
// respuestas de IA (ChatGPT, Claude, Perplexity, Gemini,
// Copilot, Meta AI, Apple Intelligence...). Todos pueden leer
// el contenido público para citar conectalt.com en sus
// respuestas; solo se les cierra lo privado (/api/, /r/).
// ─────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** Rastreadores de IA (entrenamiento + búsqueda/asistentes). */
const AI_CRAWLERS = [
  // OpenAI (ChatGPT / SearchGPT)
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic (Claude)
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google (Gemini / AI Overviews)
  'Google-Extended',
  'Applebot-Extended', // Apple Intelligence
  'meta-externalagent', // Meta AI
  'Amazonbot', // Alexa
  'CCBot', // Common Crawl (corpus de varios modelos)
  'Bytespider', // ByteDance
  'YouBot', // You.com
  'Diffbot',
  'ImagesiftBot', // Hive
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/r/'],
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: '/',
        disallow: ['/api/', '/r/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
