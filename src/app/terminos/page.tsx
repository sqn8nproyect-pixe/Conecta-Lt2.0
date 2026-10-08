// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Ruta real /terminos (auditoría SEO 2026-10-08)
//
// Los Términos de Uso vivían como vista SPA (setView) →
// invisibles para crawlers: sin URL, sin indexación, sin sitemap.
// Ahora es una ruta server-rendered crawlable que reutiliza el
// componente <LegalPage kind="terms" standalone />.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { LegalPage } from '@/components/conecta/LegalPage';

export const metadata: Metadata = {
  // Sin sufijo: el template del layout añade " | CONECTA-LT"
  title: 'Términos de Uso',
  description:
    'Reglas de uso de CONECTA-LT: directorio nocturno de Los Teques. Disclaimers de alcohol y menores, responsabilidad del usuario y reglas del chat interno.',
  alternates: { canonical: '/terminos' },
  openGraph: {
    title: 'Términos de Uso | CONECTA-LT',
    description:
      'Reglas de uso de CONECTA-LT: disclaimers de alcohol, menores, responsabilidad del usuario y reglas del chat.',
    url: '/terminos',
    siteName: 'CONECTA-LT',
    locale: 'es_VE',
    type: 'website',
  },
};

export default function TerminosPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <LegalPage kind="terms" standalone />
    </main>
  );
}
