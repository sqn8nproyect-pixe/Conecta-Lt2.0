'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Footer with legal links
//
// Footer del sitio con links a las páginas legales (privacidad,
// términos) implementadas como vistas del SPA. Click → setView.
// ─────────────────────────────────────────────────────────────

import { useAppStore } from '@/lib/store';

export function Footer() {
  const setView = useAppStore((s) => s.setView);

  return (
    <footer className="mt-auto border-t border-white/5 bg-obsidian/80 backdrop-blur-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gold/30 flex items-center justify-center shrink-0">
            <img
              src="/images/logo.png"
              alt="Logo Conecta-LT"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-mono tracking-wider">
            CONECTA-LT © 2026 · Los Teques, Miranda
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono tracking-wider text-center sm:text-right">
          <button
            onClick={() => setView('privacy')}
            className="text-white/40 hover:text-gold transition-colors"
          >
            Privacidad
          </button>
          <span className="text-white/20">·</span>
          <button
            onClick={() => setView('terms')}
            className="text-white/40 hover:text-gold transition-colors"
          >
            Términos
          </button>
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
            <img
              src="/images/logo-cerotraba.png"
              alt="Agencia CeroTraba"
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
