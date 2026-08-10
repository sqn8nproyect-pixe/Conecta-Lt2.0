'use client';

import { LogOut, User } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { useFavoritesSync } from '@/lib/hooks/use-favorites-sync';
import { useRedemptionsSync } from '@/lib/hooks/use-redemptions-sync';
import { useAuthProviders } from '@/lib/hooks/use-auth-providers';
import type { View } from '@/lib/types';

/** Google "G" logo (official 4-color mark) — used in the sign-in button. */
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function Navbar() {
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const addNotification = useAppStore((s) => s.addNotification);
  const { googleEnabled } = useAuthProviders();

  // Hydrate favorites + expose toggle() to children via the store.
  // Calling this here means every page has the favorites hydrated
  // as soon as the user logs in.
  useFavoritesSync();

  // Hydrate redeemed promotion IDs (Etapa 4 persistent coupons).
  // Same singleton pattern as useFavoritesSync — runs the
  // ['my-redemptions'] query once per page tree.
  useRedemptionsSync();

  const navItem = (label: string, target: View) => (
    <button
      onClick={() => setView(target)}
      className={`hover:text-gold transition-colors font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold after:scale-x-0 hover:after:scale-x-100 after:transition-transform ${
        view === target ? 'text-gold after:scale-x-100' : 'text-white/80'
      }`}
    >
      {label}
    </button>
  );

  const handleLogin = () => {
    if (googleEnabled) {
      // Real Google OAuth — redirige a Google y vuelve al callbackUrl.
      void signIn('google', { callbackUrl: '/' }).then(() => {
        addNotification('¡Sesión iniciada con Google!');
      });
    } else {
      // Fallback Demo — entra directo como Ana Rodríguez sin redirect.
      void signIn('demo', { callbackUrl: '/' }).then(() => {
        addNotification('¡Sesión iniciada con éxito!');
      });
    }
  };

  const handleLogout = () => {
    void signOut({ redirect: false }).then(() => {
      setView('home');
      addNotification('Sesión cerrada correctamente.', 'info');
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-3 group"
          aria-label="Ir al inicio"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-white border border-gold/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-gold shadow-md">
            <img
              src="/images/logo.png"
              alt="Logo Conecta-LT"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-left">
            <div className="font-serif text-xl sm:text-2xl tracking-[-1.5px] text-gold font-bold leading-none">
              CONECTA<span className="text-white">-LT</span>
            </div>
            <div className="text-[10px] text-white/50 mt-0.5 tracking-[2px] font-mono">
              LOS TEQUES
            </div>
          </div>
        </button>

        <div className="flex items-center gap-4 sm:gap-8 text-sm">
          <div className="hidden sm:flex items-center gap-6">
            {navItem('Directorio', 'home')}
            {navItem('Mapa', 'map')}
            {user && navItem('Mi Perfil', 'profile')}
          </div>

          {user ? (
            <div className="flex items-center gap-3 sm:gap-4 sm:pl-4 sm:border-l border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <img
                  src={user.avatar}
                  onClick={() => setView('profile')}
                  className="w-8 h-8 rounded-full ring-2 ring-gold/50 cursor-pointer hover:ring-gold transition-all"
                  alt={user.name}
                  aria-label="Ir a mi perfil"
                />
                <span className="hidden md:inline font-medium text-white">
                  {user.name.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs px-3 sm:px-4 py-2 rounded-full border border-white/20 hover:bg-white/5 hover:border-white/40 transition-all font-medium text-white"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              title={
                googleEnabled
                  ? 'Iniciar sesión con Google'
                  : 'Cuenta demo (Google no configurado)'
              }
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-white text-obsidian font-semibold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-xs tracking-wider glow-gold"
            >
              {googleEnabled ? (
                <>
                  <GoogleIcon size={15} />
                  <span className="hidden sm:inline">CONTINUAR CON GOOGLE</span>
                  <span className="sm:hidden">GOOGLE</span>
                </>
              ) : (
                <>
                  <User size={15} />
                  <span className="hidden sm:inline">CUENTA DEMO</span>
                  <span className="sm:hidden">ACCEDER</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden flex items-center justify-center gap-6 pb-2 px-4">
        {navItem('Directorio', 'home')}
        {navItem('Mapa', 'map')}
        {user && navItem('Mi Perfil', 'profile')}
      </div>
    </nav>
  );
}
