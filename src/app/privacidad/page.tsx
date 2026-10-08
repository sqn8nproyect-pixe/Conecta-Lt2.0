// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Ruta real /privacidad (auditoría SEO 2026-10-08)
//
// La Política de Privacidad vivía como vista SPA (setView) →
// invisible para crawlers: sin URL, sin indexación, sin sitemap.
// Ahora es una ruta server-rendered crawlable que reutiliza el
// componente <LegalPage kind="privacy" standalone />.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { LegalPage } from '@/components/conecta/LegalPage';

export const metadata: Metadata = {
  // Sin sufijo: el template del layout añade " | CONECTA-LT"
  title: 'Política de Privacidad',
  description:
    'Cómo CONECTA-LT recoge, usa y protege tus datos: inicio de sesión con Google, mensajería interna, cookies y la Ley venezolana de protección de datos.',
  alternates: { canonical: '/privacidad' },
  openGraph: {
    title: 'Política de Privacidad | CONECTA-LT',
    description:
      'Cómo CONECTA-LT recoge, usa y protege tus datos: Google OAuth, chat interno, cookies y protección de datos.',
    url: '/privacidad',
    siteName: 'CONECTA-LT',
    locale: 'es_VE',
    type: 'website',
  },
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <LegalPage kind="privacy" standalone />
    </main>
  );
}
