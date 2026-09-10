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
import { LoginPromptModal } from '@/components/conecta/LoginPromptModal';
import { usePendingIntent } from '@/lib/hooks/use-pending-intent';

// ── Age verification (Sprint 7B) ───────────────────────────
// Persistencia en COOKIE propia (30 días) en lugar de
// sessionStorage. Criterio del dueño: una cookie de 30 días
// sigue cumpliendo la "verificación razonable de edad" exigida
// para sitios con promoción de alcohol — el gate reaparece cada
// 30 días, no en cada sesión de navegador. Además la cookie
// sobrevive el reload completo del flujo OAuth de Google (el
// callback vuelve a / y el usuario ya no ve el gate).
//
// Anti-hydration-mismatch (patrón original intacto):
//   - `getServerSnapshot` siempre devuelve `false` (el server no
//     conoce las cookies del cliente → renderiza el AgeGate).
//   - `getSnapshot` en el cliente lee la cookie DESPUÉS de la
//     hidratación, así el HTML del server y el primer render
//     cliente coinciden. React luego re-renderiza con el valor
//     real de la cookie.
//   - `confirmAge` escribe la cookie Y notifica a los listeners
//     para re-render sin recargar.
//   - `Secure` solo en https (en localhost http las cookies
//     Secure se pierden en algunos navegadores).

const AGE_COOKIE = 'age-verified';
const AGE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 días en segundos

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
    return document.cookie
      .split('; ')
      .some(
        (c) =>
          c.startsWith(`${AGE_COOKIE}=`) &&
          c.split('=')[1] === '1',
      );
  } catch {
    return false;
  }
}

function getAgeVerifiedServerSnapshot() {
  return false;
}

function writeAgeVerifiedCookie() {
  try {
    const secure =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:'
        ? '; Secure'
        : '';
    document.cookie = `${AGE_COOKIE}=1; Max-Age=${AGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // document.cookie puede fallar en contextos restringidos —
    // el flag en memoria basta para esta pestaña.
  }
}

export default function Home() {
  const view = useAppStore((s) => s.view);
  const selectedSlug = useAppStore((s) => s.selectedEstablishmentSlug);
  const goToDetail = useAppStore((s) => s.goToDetail);
  const ageVerified = useSyncExternalStore(
    subscribeAgeVerified,
    getAgeVerifiedSnapshot,
    getAgeVerifiedServerSnapshot,
  );

  // Sprint 7B — login contextual: ejecuta la acción pendiente
  // (favorito/cupón/reserva) tras volver del login con sesión activa.
  usePendingIntent();

  const confirmAge = useCallback(() => {
    ageVerifiedInMemory = true;
    writeAgeVerifiedCookie();
    emitAgeVerifiedChange();
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view]);

  // ── URL ↔ vista (Sprint 6B) ────────────────────────────────
  // 1) Deep link: /?local=<slug> (CTA de las fichas indexables
  //    /local/[slug]) abre la ficha en la SPA y limpia el param.
  // 2) La barra de direcciones siempre refleja el estado real:
  //    vista detail → /local/<slug>; cualquier otra vista → /.
  //    Se usa replaceState (sin navegación) para no recargar la
  //    SPA; Next sincroniza su router con updates externos.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const local = params.get('local');
    if (local) {
      goToDetail(local);
      const url = new URL(window.location.href);
      url.searchParams.delete('local');
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + url.search,
      );
    }
  }, [goToDetail]);

  useEffect(() => {
    const path = window.location.pathname;
    if (view === 'detail' && selectedSlug) {
      const expected = `/local/${selectedSlug}`;
      if (path !== expected) {
        window.history.replaceState(window.history.state, '', expected);
      }
    } else if (path.startsWith('/local/')) {
      window.history.replaceState(window.history.state, '', '/');
    }
  }, [view, selectedSlug]);

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
      <LoginPromptModal />
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
