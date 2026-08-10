'use client';

import { LogOut, User } from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { useFavoritesSync } from '@/lib/hooks/use-favorites-sync';
import type { View } from '@/lib/types';

export function Navbar() {
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const addNotification = useAppStore((s) => s.addNotification);

  // Hydrate favorites + expose toggle() to children via the store.
  // Calling this here means every page has the favorites hydrated
  // as soon as the user logs in.
  useFavoritesSync();

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
    // Uses the "demo" credentials provider (configured in src/lib/auth.ts)
    // so the app is fully functional without real Google OAuth creds.
    // When GOOGLE_CLIENT_ID/SECRET are set, you can pass 'google' instead.
    void signIn('demo', { callbackUrl: '/' }).then(() => {
      addNotification('¡Sesión iniciada con éxito!');
    });
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
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-white text-obsidian font-semibold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-xs tracking-wider glow-gold"
            >
              <User size={15} /> <span className="hidden sm:inline">ACCEDER CON GOOGLE</span>
              <span className="sm:hidden">ACCEDER</span>
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
