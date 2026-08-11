'use client';

import { useEffect, useSyncExternalStore, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Navbar } from '@/components/conecta/Navbar';
import { Notifications } from '@/components/conecta/Notifications';
import { HomePage } from '@/components/conecta/HomePage';
import { MapPage } from '@/components/conecta/MapPage';
import { EstablishmentPage } from '@/components/conecta/EstablishmentPage';
import { ProfilePage } from '@/components/conecta/ProfilePage';
import { AdminDashboard } from '@/components/conecta/admin/AdminDashboard';
import { OwnerDashboard } from '@/components/conecta/owner/OwnerDashboard';
import { AgeGate } from '@/components/conecta/AgeGate';

// ── Age verification external store ───────────────────────────
// We use `useSyncExternalStore` to read sessionStorage without
// causing a hydration mismatch. The pattern:
//   - `getServerSnapshot` always returns `false` (server has no
//     sessionStorage → renders the AgeGate).
//   - `getSnapshot` on the client reads sessionStorage AFTER
//     hydration, so the server HTML and the first client render
//     match. React then re-renders with the client snapshot.
//   - `confirmAge` writes to sessionStorage AND notifies listeners
//     so the component re-renders without AgeGate.
//
// sessionStorage (not localStorage) ensures the check resets when
// the browser closes — keeps the intent of "ask once per session"
// for alcohol regulations while not breaking the Google OAuth
// callback flow (which does a full page reload back to /).

let ageVerifiedInMemory = false;
const ageVerifiedListeners = new Set<() => void>();

function emitAgeVerifiedChange() {
  for (const listener of ageVerifiedListeners) listener();
}

function subscribeAgeVerified(listener: () => void) {
  ageVerifiedListeners.add(listener);
  return () => {
    ageVerifiedListeners.delete(listener);
  };
}

function getAgeVerifiedSnapshot() {
  if (ageVerifiedInMemory) return true;
  try {
    return sessionStorage.getItem('age-verified') === 'true';
  } catch {
    return false;
  }
}

function getAgeVerifiedServerSnapshot() {
  return false;
}

export default function Home() {
  const view = useAppStore((s) => s.view);
  const ageVerified = useSyncExternalStore(
    subscribeAgeVerified,
    getAgeVerifiedSnapshot,
    getAgeVerifiedServerSnapshot,
  );

  const confirmAge = useCallback(() => {
    ageVerifiedInMemory = true;
    try {
      sessionStorage.setItem('age-verified', 'true');
    } catch {
      // sessionStorage may throw in private mode / blocked storage —
      // the in-memory flag above is enough for this tab.
    }
    emitAgeVerifiedChange();
  }, []);

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
      {!ageVerified && <AgeGate onConfirm={confirmAge} />}

      <Notifications />
      <Navbar />

      <main className="pt-28 sm:pt-20 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'home' && <HomePage key="home" />}
          {view === 'map' && <MapPage key="map" />}
          {view === 'detail' && <EstablishmentPage key="detail" />}
          {view === 'profile' && <ProfilePage key="profile" />}
          {view === 'admin' && <AdminDashboard key="admin" />}
          {view === 'owner' && <OwnerDashboard key="owner" />}
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
