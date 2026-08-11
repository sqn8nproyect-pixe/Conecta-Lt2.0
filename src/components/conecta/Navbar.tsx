'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  LogOut,
  Shield,
  Star,
  Ticket,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { useFavoritesSync } from '@/lib/hooks/use-favorites-sync';
import { useRedemptionsSync } from '@/lib/hooks/use-redemptions-sync';
import { useReservationsSync } from '@/lib/hooks/use-reservations-sync';
import {
  useNotificationsSync,
  useNotificationActions,
} from '@/lib/hooks/use-notifications-sync';
import { useAuthProviders } from '@/lib/hooks/use-auth-providers';
import { formatRelativeTime } from '@/lib/utils';
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

// ── Notification icon mapping ─────────────────────────────────
// Each notification type gets its own lucide icon so the user can
// scan the inbox visually. Default fallback is the generic Bell.
const NOTIFICATION_ICON: Record<string, typeof Bell> = {
  RESERVATION_CONFIRMED: CalendarCheck,
  RESERVATION_CANCELLED: CalendarX,
  COUPON_REDEEMED: Ticket,
  REVIEW_PUBLISHED: Star,
  CAPACITY_REPORTED: Bell,
  SYSTEM: Bell,
};

function getNotificationIcon(type: string): typeof Bell {
  return NOTIFICATION_ICON[type] ?? Bell;
}

/**
 * NotificationsBell — bell icon button with unread badge + dropdown.
 *
 * - Reads `persistentNotifications` from the Zustand store (hydrated
 *   by `useNotificationsSync` mounted once in the parent Navbar).
 * - Uses `useNotificationActions` for optimistic mark-as-read.
 * - Closes on outside click / Escape.
 *
 * The dropdown shows up to 10 most recent notifications (scrollable).
 * Each item shows an icon, title, message, relative time, and a gold
 * dot on the left when unread. Clicking an item marks it as read +
 * closes the dropdown. At the bottom, a "Marcar todo como leído"
 * button bulk-marks all unread (only shown when there are unread).
 *
 * Mobile: the dropdown becomes a near-full-width fixed panel
 * (`fixed inset-x-4 top-16`) instead of the desktop `absolute w-80`.
 */
function NotificationsBell() {
  const persistentNotifications = useAppStore(
    (s) => s.persistentNotifications,
  );
  const addNotification = useAppStore((s) => s.addNotification);
  const { markAsRead, markAllAsRead } = useNotificationActions();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click-outside handler — close the dropdown if the user clicks
  // anywhere outside the bell container. We attach on mousedown so the
  // click that opens the dropdown doesn't immediately close it (the
  // toggle runs on click, which fires AFTER mousedown).
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Escape handler — close on ESC for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const unreadCount = persistentNotifications.filter((n) => !n.read).length;
  const visible = persistentNotifications.slice(0, 10);

  const handleClickItem = async (id: string) => {
    setIsOpen(false);
    try {
      await markAsRead(id);
    } catch (e) {
      addNotification(
        e instanceof Error && e.message === 'NOT_AUTHENTICATED'
          ? 'Inicia sesión para ver tus notificaciones.'
          : 'No se pudo marcar la notificación como leída.',
        'info',
      );
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      addNotification('Notificaciones marcadas como leídas.', 'info');
    } catch (e) {
      addNotification(
        e instanceof Error && e.message === 'NOT_AUTHENTICATED'
          ? 'Inicia sesión para ver tus notificaciones.'
          : 'No se pudieron marcar las notificaciones como leídas.',
        'info',
      );
    }
  };

  // Badge label: 1-99 as plain number, 99+ when above 99 (matches the
  // spec's "show count if > 0, hide if 0. If > 99, show '99+'").
  const badgeLabel =
    unreadCount === 0 ? null : unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-gold/40 hover:bg-gold/10 transition flex items-center justify-center text-white/80 hover:text-gold"
      >
        <Bell size={18} />
        {badgeLabel && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 bg-gold text-obsidian text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-label="Bandeja de notificaciones"
            className="fixed inset-x-4 top-16 sm:fixed-none sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] glass-card rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-gold" />
                <span className="font-serif text-sm text-white tracking-wide">
                  Notificaciones
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono text-gold/80 px-1.5 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                    {unreadCount} nueva{unreadCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[11px] font-medium text-gold/80 hover:text-gold transition"
                >
                  <CheckCheck size={12} />
                  <span className="hidden sm:inline">Marcar todo</span>
                  <span className="sm:hidden">Leer todas</span>
                </button>
              )}
            </div>

            {/* List — scrollable, max 10 items shown by `visible` */}
            {visible.length === 0 ? (
              <div className="px-4 py-10 flex flex-col items-center gap-3 text-white/40">
                <Bell size={24} className="text-white/30" />
                <p className="text-sm text-center">No tienes notificaciones</p>
                <p className="text-[11px] text-white/30 text-center max-w-[200px]">
                  Reserva una mesa, reclama un cupón o publica una reseña
                  para verlas aquí.
                </p>
              </div>
            ) : (
              <ul
                className="max-h-96 overflow-y-auto py-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {visible.map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClickItem(n.id)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex gap-3 items-start group"
                      >
                        {/* Unread dot OR a spacer to keep alignment */}
                        <span className="pt-1 w-2 flex-shrink-0 flex justify-center">
                          {!n.read && (
                            <span
                              aria-hidden="true"
                              className="w-2 h-2 rounded-full bg-gold"
                            />
                          )}
                        </span>
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            n.read
                              ? 'bg-white/5 text-white/40'
                              : 'bg-gold/15 text-gold'
                          }`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-sm leading-tight ${
                              n.read
                                ? 'text-white/60 font-normal'
                                : 'text-white font-semibold'
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="block text-xs text-white/70 mt-0.5 leading-snug line-clamp-2">
                            {n.message}
                          </span>
                          <span className="block text-[10px] text-white/40 mt-1 font-mono uppercase tracking-wide">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer with bulk action (mobile-friendly) */}
            {visible.length > 0 && unreadCount > 0 && (
              <div className="px-4 py-2 border-t border-white/10 sm:hidden">
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-gold/90 hover:text-gold py-1.5 rounded-lg hover:bg-gold/10 transition"
                >
                  <CheckCheck size={13} />
                  Marcar todo como leído
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  // Hydrate reservations (Etapa 5 persistent bookings).
  // Same singleton pattern — runs the ['my-reservations'] query once
  // per page tree so ProfilePage's MIS RESERVAS section is in sync.
  useReservationsSync();

  // Hydrate persistent notifications (Etapa 7.A).
  // Same singleton pattern — runs the ['my-notifications'] query once
  // per page tree so the bell badge + dropdown stay in sync. Also
  // invalidates on window focus so the user sees new notifications
  // without a manual refresh.
  useNotificationsSync();

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

  // Etapa 7.C.1 — Admin nav item. Only visible to ADMIN / MODERATOR.
  // Uses the Shield icon and the gold accent so it stands out from the
  // regular nav items. Position: after "Mapa" and before the user
  // avatar area (matches the spec brief).
  const adminNavItem = () => (
    <button
      onClick={() => setView('admin')}
      className={`inline-flex items-center gap-1 hover:text-gold transition-colors font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold after:scale-x-0 hover:after:scale-x-100 after:transition-transform ${
        view === 'admin'
          ? 'text-gold after:scale-x-100'
          : 'text-white/80'
      }`}
    >
      <Shield size={14} className="mr-0.5" /> Admin
    </button>
  );

  // Etapa 7.C.2 — Owner nav item ("Mis Locales"). Only visible to
  // BUSINESS_OWNER users. Uses the Briefcase icon and the gold accent
  // (same style as the admin nav item). Position: after "Mi Perfil"
  // and before the Admin entry (so a user who is both BUSINESS_OWNER
  // and ADMIN sees both, owner first).
  const ownerNavItem = () => (
    <button
      onClick={() => setView('owner')}
      className={`inline-flex items-center gap-1 hover:text-gold transition-colors font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold after:scale-x-0 hover:after:scale-x-100 after:transition-transform ${
        view === 'owner'
          ? 'text-gold after:scale-x-100'
          : 'text-white/80'
      }`}
    >
      <Briefcase size={14} className="mr-0.5" /> Mis Locales
    </button>
  );

  const handleLogin = () => {
    if (googleEnabled) {
      // Real Google OAuth — redirect: false so we can surface
      // success/error as a toast. Google OAuth requires a full redirect
      // to Google's consent screen, so redirect:false only affects the
      // RETURN from the callback, not the outbound redirect.
      void signIn('google', { callbackUrl: '/', redirect: false })
        .then((res) => {
          if (res?.error) {
            addNotification('No se pudo iniciar sesión con Google. Intenta de nuevo.', 'info');
          } else {
            addNotification('¡Sesión iniciada con Google!');
            // IMPORTANT: use reload(), NOT window.location.href = res.url.
            // res.url comes from NEXTAUTH_URL which may differ from the
            // browser's current origin (e.g. localhost vs 127.0.0.1 vs
            // the gateway domain). Navigating cross-origin would lose
            // the just-set session cookie and sessionStorage. A simple
            // reload stays same-origin and picks up the new cookie.
            window.location.reload();
          }
        })
        .catch(() => {
          addNotification('Error de conexión al iniciar sesión. Intenta de nuevo.', 'info');
        });
    } else {
      // Fallback Demo — entra directo como Ana Rodríguez.
      // redirect: false + reload() keeps everything same-origin.
      void signIn('demo', { callbackUrl: '/', redirect: false })
        .then((res) => {
          if (res?.error) {
            addNotification('No se pudo iniciar sesión. Intenta de nuevo.', 'info');
          } else {
            addNotification('¡Sesión iniciada con éxito!');
            window.location.reload();
          }
        })
        .catch(() => {
          addNotification('Error de conexión al iniciar sesión. Intenta de nuevo.', 'info');
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
            {user?.role === 'BUSINESS_OWNER' && ownerNavItem()}
            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') &&
              adminNavItem()}
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
              <NotificationsBell />
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
      <div className="sm:hidden flex items-center justify-center gap-4 pb-2 px-4 flex-wrap">
        {navItem('Directorio', 'home')}
        {navItem('Mapa', 'map')}
        {user && navItem('Mi Perfil', 'profile')}
        {user?.role === 'BUSINESS_OWNER' && ownerNavItem()}
        {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') &&
          adminNavItem()}
      </div>
    </nav>
  );
}
