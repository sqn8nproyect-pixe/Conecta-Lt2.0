'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import {
  Heart,
  Star,
  LogOut,
  MapPin,
  MessageSquare,
  Sparkles,
  Ticket,
  Copy,
  Check,
  Calendar,
  Clock,
  Users,
  X,
  CalendarX,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useFavoriteActions } from '@/lib/hooks/use-favorite-actions';
import { useReservationActions } from '@/lib/hooks/use-reservation-actions';
import {
  fetchFavorites,
  fetchMyReviews,
  fetchMyRedemptions,
  fetchMyReservations,
} from '@/lib/api';
import type { CouponRedemption, Reservation, ReservationStatus } from '@/lib/types';

export function ProfilePage() {
  const goToDetail = useAppStore((s) => s.goToDetail);
  const setView = useAppStore((s) => s.setView);
  const addNotification = useAppStore((s) => s.addNotification);
  const { status } = useSession();
  const { toggle: toggleFavorite } = useFavoriteActions();
  const { cancelReservation, isCancelling } = useReservationActions();

  // Server-backed favorites (canonical) — same query the rest of the app uses
  const { data: favoriteEsts = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: status === 'authenticated',
  });

  // Server-backed reviews written by the current user
  const { data: userReviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: fetchMyReviews,
    enabled: status === 'authenticated',
  });

  // Server-backed coupon redemptions (Etapa 4) — drives the MIS CUPONES section.
  const { data: redemptions = [] } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: fetchMyRedemptions,
    enabled: status === 'authenticated',
  });

  // Server-backed reservations (Etapa 5) — drives the MIS RESERVAS section.
  const { data: reservations = [] } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: fetchMyReservations,
    enabled: status === 'authenticated',
  });

  // Not-logged-in empty state
  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-32 text-center text-white/40 text-sm">
        Cargando…
      </div>
    );
  }
  if (status !== 'authenticated') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
      >
        <section className="max-w-md mx-auto px-4 sm:px-6 py-20">
          <div className="glass-card rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Sparkles className="text-gold" size={28} />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-3">
              Tu perfil CONECTA-LT
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Inicia sesión para guardar tus locales favoritos, publicar reseñas
              y personalizar tu experiencia nocturna en Los Teques.
            </p>
            <button
              onClick={() => setView('home')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-sm tracking-wider glow-gold"
            >
              <Sparkles size={16} /> EXPLORAR DIRECTORIO
            </button>
          </div>
        </section>
      </motion.div>
    );
  }

  const handleLogout = () => {
    void signOut({ redirect: false }).then(() => setView('home'));
  };

  // Pull the user from the first favorite's avatar OR from the session via the store
  // (the store is hydrated by useFavoritesSync). For simplicity, read it from the store.
  // We can't call useAppStore conditionally, so this component reads it via a child.
  return <ProfileContent
    favoriteEsts={favoriteEsts}
    userReviews={userReviews}
    redemptions={redemptions}
    reservations={reservations}
    onLogout={handleLogout}
    onGoToDetail={goToDetail}
    onToggleFavorite={toggleFavorite}
    onCancelReservation={cancelReservation}
    isCancellingReservation={isCancelling}
    onSetView={setView}
    onNotify={addNotification}
  />;
}

function ProfileContent({
  favoriteEsts,
  userReviews,
  redemptions,
  reservations,
  onLogout,
  onGoToDetail,
  onToggleFavorite,
  onCancelReservation,
  isCancellingReservation,
  onSetView,
  onNotify,
}: {
  favoriteEsts: import('@/lib/api').EstablishmentWithRelations[];
  userReviews: import('@/lib/api').ReviewWithEstablishment[];
  redemptions: CouponRedemption[];
  reservations: Reservation[];
  onLogout: () => void;
  onGoToDetail: (slug: string) => void;
  onToggleFavorite: (slug: string, name?: string) => void;
  onCancelReservation: (id: string) => Promise<boolean>;
  isCancellingReservation: (id: string) => boolean;
  onSetView: (view: 'home' | 'map' | 'detail' | 'profile') => void;
  onNotify: (message: string, type?: 'success' | 'info') => void;
}) {
  const user = useAppStore((s) => s.user);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = useCallback(
    async (code: string) => {
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
          copied = true;
        } else {
          const ta = document.createElement('textarea');
          ta.value = code;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand('copy');
          document.body.removeChild(ta);
        }
      } catch {
        copied = false;
      }
      setCopiedCode(code);
      onNotify(
        copied ? `Código copiado: ${code}` : `Código: ${code} (cópialo manualmente)`,
        copied ? 'success' : 'info',
      );
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2200);
    },
    [onNotify],
  );

  // user can be null for a brief moment while the session resolves; guard.
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-32 text-center text-white/40 text-sm">
        Cargando perfil…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header card */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img
              src={user.avatar}
              alt={`Avatar de ${user.name}`}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-gold/30"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/40 bg-gold/10 text-gold text-[10px] font-bold tracking-widest mb-2">
                <Sparkles size={10} /> MIEMBRO CONECTA-LT
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
                {user.name}
              </h1>
              <p className="text-white/60 text-sm mb-4">{user.email}</p>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 text-white hover:border-gold hover:text-gold transition-all text-xs font-semibold tracking-wider"
              >
                <LogOut size={14} /> CERRAR SESIÓN
              </button>
            </div>
          </div>

          {/* Stats row — 2x2 grid on mobile, single row on sm+.
           * Etapa 5 adds the 4th stat (Reservas) alongside the existing
           * Favoritos / Reseñas / Cupones counters. */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:justify-start gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-gold" fill="#d4af37" />
              <div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {favoriteEsts.length}
                </div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">
                  Favoritos
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-gold" />
              <div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {userReviews.length}
                </div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">
                  Reseñas
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Ticket size={18} className="text-gold" />
              <div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {redemptions.length}
                </div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">
                  Cupones
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gold" />
              <div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {reservations.length}
                </div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">
                  Reservas
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mis Favoritos */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            MIS FAVORITOS
          </h2>
          <span className="text-white/40 text-xs font-mono">
            ({favoriteEsts.length})
          </span>
        </div>

        {favoriteEsts.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 text-center text-white/40">
            Aún no tienes favoritos. Explora el directorio y toca el ♥ en tus
            locales preferidos.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoriteEsts.map((est) => {
              const avg = est.avgRating;
              const cardClass =
                est.category === 'discoteca'
                  ? 'card-glow-hover-purple'
                  : 'card-glow-hover';
              return (
                <div
                  key={est.id}
                  className={`glass-card rounded-2xl overflow-hidden ${cardClass} group relative`}
                >
                  <button
                    onClick={() => onGoToDetail(est.slug)}
                    className="block w-full text-left"
                    aria-label={`Ver detalles de ${est.name}`}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={est.coverImage}
                        alt={est.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md text-[9px] font-bold tracking-widest rounded-full border border-white/20 text-white">
                          {est.category.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gold/20 backdrop-blur-md text-[9px] font-black tracking-wide rounded-full border border-gold/40 text-gold">
                          {est.priceRange}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-lg font-bold tracking-tight text-white line-clamp-1 group-hover:text-gold transition-colors">
                        {est.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-white/50">
                        <Star size={13} className="text-gold" fill="#d4af37" />
                        <span className="font-mono font-bold text-gold">
                          {avg}
                        </span>
                        <span>·</span>
                        <span className="line-clamp-1 flex items-center gap-1">
                          <MapPin size={11} className="shrink-0" />
                          {est.address.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Favorite heart (active) */}
                  <button
                    onClick={() => onToggleFavorite(est.slug, est.name)}
                    aria-label={`Quitar ${est.name} de favoritos`}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 bg-gold text-obsidian border-gold glow-gold"
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mis Reseñas */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            MIS RESEÑAS
          </h2>
          <span className="text-white/40 text-xs font-mono">
            ({userReviews.length})
          </span>
        </div>

        {userReviews.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 text-center text-white/40">
            Aún no has publicado reseñas. Visita un local y comparte tu
            experiencia.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {userReviews.map((r) => (
              <article key={r.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <button
                    onClick={() => onGoToDetail(r.establishment.slug)}
                    className="font-serif text-lg font-bold text-gold hover:underline transition-all text-left"
                  >
                    {r.establishment.name}
                  </button>
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`Tu calificación: ${r.rating} de 5 estrellas`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < r.rating ? 'text-gold' : 'text-white/20'
                        }
                        fill={i < r.rating ? '#d4af37' : 'none'}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-white/40 font-mono mb-2">
                  {r.date}
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {r.comment}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Mis Cupones — Etapa 4 persistent coupon redemptions */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            MIS CUPONES
          </h2>
          <span className="text-white/40 text-xs font-mono">
            ({redemptions.length})
          </span>
        </div>

        {redemptions.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 px-6 text-center text-white/40 space-y-5">
            <Ticket size={36} className="mx-auto opacity-50" />
            <p className="text-sm leading-relaxed max-w-md mx-auto">
              Aún no has reclamado ningún cupón. Explora las promociones
              disponibles en el directorio.
            </p>
            <button
              onClick={() => onSetView('home')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-xs tracking-wider glow-gold"
            >
              <Sparkles size={14} /> EXPLORAR PROMOCIONES
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {redemptions.map((r) => {
              const promo = r.promotion;
              const endDateTs = promo.endDate
                ? new Date(promo.endDate).getTime()
                : null;
              const isExpired =
                endDateTs !== null && endDateTs < Date.now();
              const daysLeft =
                endDateTs !== null
                  ? Math.max(
                      0,
                      Math.ceil((endDateTs - Date.now()) / 86_400_000),
                    )
                  : null;

              // Status badge — drives the colored chip on top of the image.
              // CLAIMED → ACTIVO (green), USED → USADO (blue), EXPIRED → EXPIRADO (grey).
              const statusMeta =
                r.status === 'CLAIMED' && !isExpired
                  ? {
                      label: 'ACTIVO',
                      cls: 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300',
                    }
                  : r.status === 'USED'
                    ? {
                        label: 'USADO',
                        cls: 'bg-sky-500/25 border-sky-500/50 text-sky-300',
                      }
                    : {
                        label: 'EXPIRADO',
                        cls: 'bg-white/15 border-white/30 text-white/60',
                      };
              const canReserve = r.status === 'CLAIMED' && !isExpired;

              return (
                <article
                  key={r.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col group"
                >
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={promo.image}
                      alt={promo.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider ${statusMeta.cls}`}
                    >
                      {statusMeta.label}
                    </span>
                    {promo.discount && !isExpired && (
                      <span className="absolute top-3 right-3 px-2 py-1 bg-gold/20 backdrop-blur-md text-[9px] font-black tracking-wide rounded-full border border-gold/40 text-gold">
                        {promo.discount}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <div>
                      <h3 className="font-serif text-base font-bold tracking-tight text-white leading-snug line-clamp-2">
                        {promo.title}
                      </h3>
                      <button
                        onClick={() => onGoToDetail(promo.business.slug)}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                      >
                        <MapPin size={11} /> {promo.business.name}
                      </button>
                    </div>

                    {/* Coupon code — font-mono, dorado, con botón copiar */}
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.code)}
                      aria-label={
                        copiedCode === promo.code
                          ? 'Código copiado'
                          : `Copiar código ${promo.code}`
                      }
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-dashed border-gold/40 hover:border-gold/80 hover:bg-black/60 transition-all"
                    >
                      <span className="text-[9px] text-white/50 font-bold tracking-wider uppercase">
                        {copiedCode === promo.code ? 'Copiado' : 'Código'}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-black text-gold tracking-wider text-base">
                          {promo.code}
                        </span>
                        <span className="shrink-0 w-6 h-6 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                          {copiedCode === promo.code ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </span>
                      </span>
                    </button>

                    {/* Countdown — "Válido hasta X" / "Expira en N días" / "Expirado" */}
                    <div className="text-[10px] text-white/50 font-mono">
                      {isExpired
                        ? 'Expirado'
                        : endDateTs !== null
                          ? daysLeft !== null && daysLeft <= 7
                            ? `Expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
                            : `Válido hasta ${new Date(promo.endDate!).toLocaleDateString('es-VE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}`
                          : 'Válido sin fecha límite'}
                    </div>

                    {canReserve && (
                      <button
                        onClick={() => onGoToDetail(promo.business.slug)}
                        className="mt-auto w-full py-2.5 rounded-xl bg-gold/15 hover:bg-gold text-gold hover:text-obsidian font-bold text-[11px] tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <Calendar size={13} /> RESERVAR CON ESTA OFERTA
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Mis Reservas — Etapa 5 persistent reservations */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-gold tracking-[3px] text-xs font-mono font-bold">
            MIS RESERVAS
          </h2>
          <span className="text-white/40 text-xs font-mono">
            ({reservations.length})
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 px-6 text-center text-white/40 space-y-5">
            <CalendarX size={36} className="mx-auto opacity-50" />
            <p className="text-sm leading-relaxed max-w-md mx-auto">
              Aún no tienes reservas. ¡Explora los locales y reserva tu mesa!
            </p>
            <button
              onClick={() => onSetView('home')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-xs tracking-wider glow-gold"
            >
              <Sparkles size={14} /> EXPLORAR DIRECTORIO
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reservations.map((r) => {
              const status = r.status as ReservationStatus;
              const statusMeta =
                status === 'PENDING'
                  ? {
                      label: 'PENDIENTE',
                      cls: 'bg-amber-500/25 border-amber-500/50 text-amber-300',
                    }
                  : status === 'CONFIRMED'
                    ? {
                        label: 'CONFIRMADA',
                        cls: 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300',
                      }
                    : status === 'CANCELLED'
                      ? {
                          label: 'CANCELADA',
                          cls: 'bg-white/15 border-white/30 text-white/60',
                        }
                      : status === 'COMPLETED'
                        ? {
                            label: 'COMPLETADA',
                            cls: 'bg-sky-500/25 border-sky-500/50 text-sky-300',
                          }
                        : {
                            label: 'NO ASISTIÓ',
                            cls: 'bg-red-500/25 border-red-500/50 text-red-300',
                          };
              const canCancel =
                status === 'PENDING' || status === 'CONFIRMED';
              const cancelling = isCancellingReservation(r.id);

              return (
                <article
                  key={r.id}
                  className={`glass-card rounded-2xl p-5 transition-opacity ${
                    status === 'CANCELLED' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Top row: code + status badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/40 font-bold font-mono tracking-widest uppercase">
                        CÓDIGO
                      </span>
                      <span className="font-mono font-black text-gold tracking-wider text-base">
                        {r.confirmationCode}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider ${statusMeta.cls}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Business name (clickable → detail) */}
                  <button
                    onClick={() => onGoToDetail(r.business.slug)}
                    className="font-serif text-lg font-bold text-gold hover:underline transition-all text-left block"
                  >
                    {r.business.name}
                  </button>

                  {/* Date + time + guests row */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={12} className="text-gold" />
                      <span className="font-mono">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString(
                          'es-VE',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          },
                        )}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-gold" />
                      <span className="font-mono">{r.time}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={12} className="text-gold" />
                      <span>
                        {r.guests}{' '}
                        {r.guests === 1 ? 'persona' : 'personas'}
                      </span>
                    </span>
                  </div>

                  {/* Coupon code chip (if linked) */}
                  {r.coupon && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(r.coupon!.code)}
                      aria-label={
                        copiedCode === r.coupon.code
                          ? 'Código copiado'
                          : `Copiar código ${r.coupon.code}`
                      }
                      className="mt-3 w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-dashed border-gold/40 hover:border-gold/80 hover:bg-black/60 transition-all"
                    >
                      <span className="text-[9px] text-white/50 font-bold tracking-wider uppercase">
                        {copiedCode === r.coupon.code ? 'Copiado' : 'Cupón'}
                      </span>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-black text-gold tracking-wider text-sm truncate">
                          {r.coupon.code}
                        </span>
                        <span className="shrink-0 w-6 h-6 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                          {copiedCode === r.coupon.code ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={11} />
                          )}
                        </span>
                      </span>
                    </button>
                  )}

                  {/* Notes (if any) */}
                  {r.notes && (
                    <p className="mt-3 text-xs text-white/50 leading-relaxed italic">
                      “{r.notes}”
                    </p>
                  )}

                  {/* Bottom row: countdown + cancel button */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="text-[10px] text-white/50 font-mono">
                      {getReservationCountdown(r.date)}
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => onCancelReservation(r.id)}
                        disabled={cancelling}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 disabled:opacity-50 disabled:cursor-wait transition-all text-[11px] font-bold tracking-wider"
                      >
                        {cancelling ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin" />
                            CANCELANDO…
                          </>
                        ) : (
                          <>
                            <X size={12} /> CANCELAR
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}

// ─── Helpers (Etapa 5) ─────────────────────────────────────────────
// Countdown text shown next to each reservation card. Returns one of:
// "En N días" / "En 1 día" / "Hoy" / "Ayer" / "Hace N días" / "Fecha pasada"
function getReservationCountdown(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return 'Fecha pasada';
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays > 1) return `En ${diffDays} días`;
  if (diffDays === 1) return 'En 1 día';
  if (diffDays === 0) return 'Hoy';
  if (diffDays === -1) return 'Ayer';
  if (diffDays < -1) return `Hace ${Math.abs(diffDays)} días`;
  return 'Fecha pasada';
}
