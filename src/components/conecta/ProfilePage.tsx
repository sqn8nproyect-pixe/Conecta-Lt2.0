'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Star,
  LogOut,
  MapPin,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { establishments } from '@/lib/data';
import type { Review } from '@/lib/types';

export function ProfilePage() {
  const user = useAppStore((s) => s.user);
  const favorites = useAppStore((s) => s.favorites);
  const reviews = useAppStore((s) => s.reviews);
  const goToDetail = useAppStore((s) => s.goToDetail);
  const setView = useAppStore((s) => s.setView);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const logout = useAppStore((s) => s.logout);
  const loginWithGoogle = useAppStore((s) => s.loginWithGoogle);
  const getDynamicRating = useAppStore((s) => s.getDynamicRating);

  // Compute user reviews with useMemo to avoid returning a new array reference
  // on every render (which would cause a Zustand useSyncExternalStore infinite loop).
  const userReviews = useMemo<Review[]>(() => {
    if (!user) return [];
    return reviews
      .filter((r) => r.userId === user.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [user, reviews]);

  const favoriteEsts = establishments.filter((e) => favorites.includes(e.id));

  // Not-logged-in empty state
  if (!user) {
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
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-sm tracking-wider glow-gold"
            >
              <Sparkles size={16} /> ACCEDER CON GOOGLE
            </button>
          </div>
        </section>
      </motion.div>
    );
  }

  const handleLogout = () => {
    logout();
    setView('home');
  };

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
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 text-white hover:border-gold hover:text-gold transition-all text-xs font-semibold tracking-wider"
              >
                <LogOut size={14} /> CERRAR SESIÓN
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center sm:justify-start gap-8">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-gold" fill="#d4af37" />
              <div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {favorites.length}
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
              const { avg } = getDynamicRating(est.id);
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
                    onClick={() => goToDetail(est.id)}
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
                    onClick={() => toggleFavorite(est.id)}
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
            {userReviews.map((r: Review) => {
              const est = establishments.find((e) => e.id === r.establishmentId);
              return (
                <article key={r.id} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <button
                      onClick={() => goToDetail(r.establishmentId)}
                      className="font-serif text-lg font-bold text-gold hover:underline transition-all text-left"
                    >
                      {est ? est.name : 'Local eliminado'}
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
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
