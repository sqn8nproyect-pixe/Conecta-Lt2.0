'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Footer with legal links
//
// Footer del sitio con links a las páginas legales (privacidad,
// términos). Desde la auditoría SEO 2026-10-08 las legales son
// rutas reales (/privacidad, /terminos) → <Link> crawlable.
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { trackAnalyticsEvent } from '@/lib/api';
import { waLink, CONTACT_WHATSAPP_DISPLAY } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/conecta/WhatsAppIcon';

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  // Fire-and-forget: el tracking nunca interfiere con la navegación.
  const handleWhatsAppClick = useCallback(() => {
    trackAnalyticsEvent({
      type: 'WHATSAPP_CLICK',
      metadata: { source: 'footer' },
    });
  }, []);

  return (
    <footer className="mt-auto border-t border-white/5 bg-obsidian/80 backdrop-blur-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gold/30 flex items-center justify-center shrink-0">
            <img
              src="/images/logo.webp"
              alt="Logo Conecta-LT"
              width={512}
              height={512}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-mono tracking-wider">
            CONECTA-LT © 2026 · Los Teques, Miranda
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono tracking-wider text-center sm:text-right">
          <button
            onClick={() => setView('about')}
            className="text-white/40 hover:text-gold transition-colors"
          >
            Quiénes Somos
          </button>
          <span className="text-white/20">·</span>
          {/* Rutas legales reales: crawlables/indexables (auditoría SEO 2026-10-08).
              Mismo aspecto que los botones; Next las precarga con <Link>. */}
          <Link
            href="/privacidad"
            className="text-white/40 hover:text-gold transition-colors"
          >
            Privacidad
          </Link>
          <span className="text-white/20">·</span>
          <Link
            href="/terminos"
            className="text-white/40 hover:text-gold transition-colors"
          >
            Términos
          </Link>
          <span className="text-white/20">·</span>
          {/* Canal directo del equipo — verde solo al hover, discreto en reposo */}
          <a
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            aria-label={`Contactar a CONECTA-LT por WhatsApp al ${CONTACT_WHATSAPP_DISPLAY}`}
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-[#25d366] transition-colors"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{CONTACT_WHATSAPP_DISPLAY}</span>
            <span className="sm:hidden whitespace-nowrap">WhatsApp</span>
          </a>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="hidden sm:inline">Directorio de vida nocturna</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="hidden sm:inline">Hecho con ✨ en Venezuela</span>
        </div>
      </div>
      {/* Agencia CeroTraba credit */}
      <div className="border-t border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-white/30">
          <a
            href="https://cerotraba.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 group"
          >
            <span className="font-mono tracking-wider">Desarrollado por</span>
            {/* P1 perf: antes logo-cerotraba.png crudo (134KB) para mostrarse
                a 24px de alto — PSI lo marcó como el 74% del ahorro de
                "Mejorar la entrega de imágenes". webp 160px = 14KB (-89%) y
                width/height explícitos evitan cualquier reflow. */}
            <img
              src="/images/logo-cerotraba.webp"
              alt="Agencia CeroTraba"
              width={412}
              height={160}
              className="h-6 w-auto object-contain opacity-60 group-hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      </div>
      {/* Alcohol responsibility disclaimer */}
      <div className="border-t border-white/5 bg-obsidian/95 py-3 text-center">
        <p className="text-[10px] text-amber/70 font-mono tracking-wider px-4">
          ⚠ BEBIDAS ALCOHÓLICAS · SOLO MAYORES DE 18 AÑOS · SI BEBES, NO CONDUZCAS · CONSUMO RESPONSABLE
        </p>
      </div>
    </footer>
  );
}
