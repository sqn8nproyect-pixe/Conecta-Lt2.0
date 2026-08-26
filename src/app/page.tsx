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
import { LegalPage } from '@/components/conecta/LegalPage';
import { AboutPage } from '@/components/conecta/AboutPage';
import { Footer } from '@/components/conecta/Footer';

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
          {view === 'privacy' && <LegalPage key="privacy" kind="privacy" />}
          {view === 'terms' && <LegalPage key="terms" kind="terms" />}
          {view === 'about' && <AboutPage key="about" />}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
