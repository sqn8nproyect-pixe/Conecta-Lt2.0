'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Navbar } from '@/components/conecta/Navbar';
import { Notifications } from '@/components/conecta/Notifications';
import { HomePage } from '@/components/conecta/HomePage';
import { MapPage } from '@/components/conecta/MapPage';
import { EstablishmentPage } from '@/components/conecta/EstablishmentPage';

export default function Home() {
  const view = useAppStore((s) => s.view);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view]);

  return (
    <div className="min-h-screen bg-obsidian text-white font-sans relative flex flex-col">
      {/* Decorative orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>

      <Notifications />
      <Navbar />

      <main className="pt-20 sm:pt-20 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomePage key="home" />}
          {view === 'map' && <MapPage key="map" />}
          {view === 'detail' && <EstablishmentPage key="detail" />}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-white/5 bg-obsidian/80 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
              <span className="text-gold font-bold text-[10px]">C</span>
            </div>
            <span className="font-mono tracking-wider">
              CONECTA-LT © 2026 · Los Teques, Miranda
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tracking-wider">
            <span>Directorio de vida nocturna</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Hecho con ✨ en Venezuela</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
