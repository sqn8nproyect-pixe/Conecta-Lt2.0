'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Navbar } from '@/components/conecta/Navbar';
import { Notifications } from '@/components/conecta/Notifications';
import { HomePage } from '@/components/conecta/HomePage';
import { MapPage } from '@/components/conecta/MapPage';
import { EstablishmentPage } from '@/components/conecta/EstablishmentPage';
import { ProfilePage } from '@/components/conecta/ProfilePage';
import { AgeGate } from '@/components/conecta/AgeGate';

export default function Home() {
  const view = useAppStore((s) => s.view);
  // Age verification: shows on EVERY page load (no persistence) per alcohol
  // regulations. The gate stays mounted until the user confirms being 18+.
  const [ageVerified, setAgeVerified] = useState(false);

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

      {/* Age verification gate (renders above everything until confirmed) */}
      {!ageVerified && <AgeGate onConfirm={() => setAgeVerified(true)} />}

      <Notifications />
      <Navbar />

      <main className="pt-20 sm:pt-20 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomePage key="home" />}
          {view === 'map' && <MapPage key="map" />}
          {view === 'detail' && <EstablishmentPage key="detail" />}
          {view === 'profile' && <ProfilePage key="profile" />}
        </AnimatePresence>
      </main>

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
            <span>Directorio de vida nocturna</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Hecho con ✨ en Venezuela</span>
          </div>
        </div>
        {/* Alcohol responsibility disclaimer */}
        <div className="border-t border-white/5 bg-obsidian/95 py-3 text-center">
          <p className="text-[10px] text-amber/70 font-mono tracking-wider px-4">
            ⚠ BEBIDAS ALCOHÓLICAS · SOLO MAYORES DE 18 AÑOS · SI BEBES, NO CONDUZCAS · CONSUMO RESPONSABLE
          </p>
        </div>
      </footer>
    </div>
  );
}
