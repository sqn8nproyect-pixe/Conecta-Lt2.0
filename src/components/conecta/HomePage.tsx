'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Star, Heart, Clock, Eye, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useFavoriteActions } from '@/lib/hooks/use-favorite-actions';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import {
  fetchBusinesses,
  fetchBulkBusinessViews,
  fetchPopularBusinesses,
} from '@/lib/api';
import type {
  Category,
  Establishment,
  PopularBusiness,
  PriceRange,
} from '@/lib/types';
import { NightPlanner } from '@/components/planner/NightPlanner';
import { ActivePromotionsBadge } from '@/components/establishment/ActivePromotionsBadge';
import { CapacityBadge } from '@/components/establishment/CapacityBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Filter = 'Todas' | Category;
type PriceFilter = 'Todos' | PriceRange;
type SortBy = 'rating' | 'reviews' | 'name';

export function HomePage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('Todas');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('Todos');
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [matchmakerOpen, setMatchmakerOpen] = useState(false);

  const { trackSearch } = useAnalytics();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        trackSearch(value.trim());
      }, 800);
    }
  };

  const {
    data: establishments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => fetchBusinesses(),
    retry: 1,
  });

  // Safety net: if loading takes unusually long (e.g. a serverless DB
  // cold start or a hung request), surface a slow-loading hint with a
  // retry button instead of leaving the user staring at a spinner
  // forever. 8s is well past a healthy local response (~80ms) but
  // short enough to feel responsive. slowLoad is only read inside the
  // isLoading branch, so it never needs resetting (the whole loading
  // block unmounts once data arrives).
  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setSlowLoad(true), 8000);
    return () => clearTimeout(t);
  }, [isLoading]);

  // Etapa 6 — Populares esta semana (top BUSINESS_VIEW count, last 7 days).
  // Hidden entirely when empty so the homepage never shows an empty rail.
  const { data: popular = [], isLoading: popularLoading } = useQuery({
    queryKey: ['analytics', 'popular'],
    queryFn: () => fetchPopularBusinesses(8),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const goToDetail = useAppStore((s) => s.goToDetail);
  const favorites = useAppStore((s) => s.favorites);
  const { toggle: toggleFavorite } = useFavoriteActions();

  const filtered = establishments
    .filter((est) => {
      const matchesSearch =
        est.name.toLowerCase().includes(search.toLowerCase()) ||
        est.description.toLowerCase().includes(search.toLowerCase()) ||
        est.address.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeFilter === 'Todas' || est.category === activeFilter;
      const matchesPrice = priceFilter === 'Todos' || est.priceRange === priceFilter;
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        return b.avgRating - a.avgRating;
      }
      if (sortBy === 'reviews') {
        return b.reviewCount - a.reviewCount;
      }
      return a.name.localeCompare(b.name);
    });

  // Etapa 6 — bulk fetch view counts for every visible card so we can
  // annotate each grid card with a small "X vistas" badge next to the
  // review count. Single round-trip (no N+1).
  const visibleSlugs = useMemo(
    () => filtered.map((e) => e.slug),
    [filtered],
  );
  const { data: viewCounts = [] } = useQuery({
    queryKey: ['analytics', 'views', 'bulk', visibleSlugs.join(',')],
    queryFn: () => fetchBulkBusinessViews(visibleSlugs),
    enabled: visibleSlugs.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const viewCountMap = useMemo(
    () => new Map(viewCounts.map((v) => [v.slug, v.viewCount])),
    [viewCounts],
  );

  const filters: Filter[] = ['Todas', 'licorería', 'tasca', 'discoteca'];
  const priceFilters: PriceFilter[] = ['Todos', '$', '$$', '$$$'];

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">No pudimos cargar los locales</h2>
            <p className="text-sm text-white/50">
              Revisa tu conexión a internet e inténtalo de nuevo. Si el
              problema persiste, el servicio podría estar temporalmente no
              disponible.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-obsidian text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <div className="text-xs tracking-[4px] font-mono">CARGANDO…</div>
          {slowLoad && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-xs text-white/40 max-w-xs text-center">
                Está tardando más de lo habitual. Si la página no carga,
                puedes reintentar.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/70 text-xs font-medium hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          )}
        </div>
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
      {/* Hero */}
      <section className="relative min-h-[88vh] sm:h-[660px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black">
          {}
          <img
            src="/images/hero.png"
            alt="Vida nocturna en Los Teques"
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-obsidian/85 to-obsidian" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs tracking-[3px] mb-6 font-semibold"
          >
            <Sparkles size={13} className="animate-pulse" /> LOS TEQUES • MIRANDA
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] leading-[0.95] font-serif font-black tracking-[-2px] sm:tracking-[-3.5px] mb-5 text-white"
          >
            La vida nocturna,
            <br />
            <span className="text-gold">redescubierta.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          >
            Explora los 21 locales más selectos de la capital mirandina. Descubre ofertas
            únicas y planifica tu salida perfecta.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center"
          >
            <div className="relative w-full sm:flex-1">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40"
                size={20}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar licorerías, tascas, discotecas..."
                className="w-full bg-white/5 backdrop-blur-md border border-white/10 focus:border-gold focus:bg-white/10 px-14 h-14 rounded-2xl text-base placeholder:text-white/40 outline-none transition-all text-white"
              />
            </div>
            <button
              onClick={() => setMatchmakerOpen(true)}
              className="w-full sm:w-auto px-8 h-14 rounded-2xl bg-gold text-obsidian font-bold hover:bg-[#e5bf4a] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm tracking-wider glow-gold whitespace-nowrap"
            >
              <Sparkles size={16} /> PLANIFICAR NOCHE
            </button>
          </motion.div>
        </div>
      </section>

      {/* Etapa 6 — Populares esta semana (hidden entirely when empty). */}
      {popular.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-gold" size={20} />
            <div>
              <h3 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                POPULARES ESTA SEMANA
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                Los locales más vistos en los últimos 7 días
              </p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
            {popularLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-44 h-56 rounded-2xl bg-white/5 animate-pulse"
                  />
                ))
              : popular.map((item: PopularBusiness, i: number) => {
                  const isPodium = i < 3;
                  return (
                    <button
                      key={item.business.id}
                      onClick={() => goToDetail(item.business.slug)}
                      className="flex-shrink-0 w-44 text-left group"
                      aria-label={`Ver ${item.business.name} — ${item.viewCount} vistas`}
                    >
                      <div className="relative h-32 w-44 overflow-hidden rounded-2xl">
                        <img
                          src={item.business.coverImage}
                          alt={item.business.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Rank badge — gold solid for podium, gold outline for 4+ */}
                        <span
                          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black font-mono ${
                            isPodium
                              ? 'bg-gold text-obsidian border border-gold/60 glow-gold'
                              : 'bg-black/70 border border-gold/40 text-gold'
                          }`}
                        >
                          #{i + 1}
                        </span>

                        {/* View count badge */}
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] text-white/90 font-mono">
                          <Eye size={11} className="text-gold/80" />
                          {item.viewCount} vistas
                        </span>
                      </div>
                      <div className="mt-2">
                        <h4 className="font-serif text-sm font-bold text-white line-clamp-1 group-hover:text-gold transition-colors">
                          {item.business.name}
                        </h4>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50">
                          <Star
                            size={10}
                            fill="#d4af37"
                            className="text-gold"
                          />
                          <span className="font-mono">
                            {item.business.avgRating.toFixed(1)}
                          </span>
                          <span>·</span>
                          <span>{item.business.category}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </section>
      )}

      {/* Directory Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div>
            <div className="text-gold tracking-[3px] text-xs font-bold font-mono">
              DIRECTORIO EXCLUSIVO 2026
            </div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight mt-1 text-white">
              Explora Locales
            </div>
          </div>

          {/* Toolbar: category filters (row 1) + price filters & sort (row 2) */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase border border-white/10 transition-all whitespace-nowrap ${
                    activeFilter === f
                      ? 'bg-gold text-obsidian border-gold font-black glow-gold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f === 'Todas' ? 'Todos' : f + 's'}
                </button>
              ))}
            </div>

            {/* Price filters + Sort selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5">
                {priceFilters.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriceFilter(p)}
                    aria-pressed={priceFilter === p}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-all whitespace-nowrap ${
                      priceFilter === p
                        ? 'bg-gold text-obsidian border-gold font-black'
                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger
                  className="bg-white/5 border border-white/10 text-white text-xs h-9 w-[180px] hover:bg-white/10 focus-visible:ring-0 focus-visible:border-gold/50 data-[placeholder]:text-white/60"
                  aria-label="Ordenar locales"
                >
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-obsidian border-white/10 text-white">
                  <SelectItem
                    value="rating"
                    className="text-xs focus:bg-gold/20 focus:text-gold"
                  >
                    Mejor valorados
                  </SelectItem>
                  <SelectItem
                    value="reviews"
                    className="text-xs focus:bg-gold/20 focus:text-gold"
                  >
                    Más reseñas
                  </SelectItem>
                  <SelectItem
                    value="name"
                    className="text-xs focus:bg-gold/20 focus:text-gold"
                  >
                    Nombre A-Z
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((est: Establishment, index: number) => {
              const avg = est.avgRating;
              const count = est.reviewCount;
              const views = viewCountMap.get(est.slug) ?? 0;
              const cardClass =
                est.category === 'discoteca'
                  ? 'card-glow-hover-purple'
                  : 'card-glow-hover';

              return (
                <motion.div
                  layout
                  key={est.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <div
                    className={`glass-card rounded-3xl overflow-hidden ${cardClass} group relative`}
                  >
                    <button
                      onClick={() => goToDetail(est.slug)}
                      className="block w-full text-left"
                      aria-label={`Ver detalles de ${est.name}`}
                    >
                      <div className="relative h-56 sm:h-64 overflow-hidden">
                        <img
                          src={est.coverImage}
                          alt={est.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Category + Price badges */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <span className="px-3 py-1.5 bg-black/80 backdrop-blur-md text-[10px] font-bold tracking-widest rounded-full border border-white/20 text-white">
                            {est.category.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-1.5 bg-gold/20 backdrop-blur-md text-[10px] font-black tracking-wide rounded-full border border-gold/40 text-gold">
                            {est.priceRange}
                          </span>
                        </div>

                        {/* Etapa 3.6 — Aforo en tiempo real.
                            Bottom-left of the cover image so it never
                            collides with the top-right favorite button
                            (right-4) or the top-right ActivePromotionsBadge
                            (right-16) when both exist. */}
                        {est.currentCapacity && (
                          <div className="absolute bottom-4 left-4">
                            <CapacityBadge
                              capacity={est.currentCapacity}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white line-clamp-1 group-hover:text-gold transition-colors">
                            {est.name}
                          </h4>
                          <div className="flex items-center gap-1 text-gold mt-1 flex-shrink-0">
                            <Star size={15} fill="#d4af37" />
                            <span className="font-mono text-base font-bold tabular-nums">
                              {avg}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50 mb-3 font-medium">
                          <span>{count} reseñas</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye size={11} className="text-gold/70" />
                            <span className="font-mono">{views} vistas</span>
                          </span>
                          <span>•</span>
                          <span className="line-clamp-1">{est.address.split(',')[0]}</span>
                        </div>
                        <p className="text-white/70 text-sm line-clamp-2 leading-relaxed font-light mb-4">
                          {est.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/60 border-t border-white/5 pt-3">
                          <Clock size={13} className="text-gold shrink-0" />
                          <span className="truncate">{est.schedule}</span>
                        </div>
                      </div>
                    </button>

                    {/* Favorite button */}
                    <button
                      onClick={() => toggleFavorite(est.slug, est.name)}
                      aria-label={
                        favorites.includes(est.slug)
                          ? `Quitar ${est.name} de favoritos`
                          : `Añadir ${est.name} a favoritos`
                      }
                      className={`absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                        favorites.includes(est.slug)
                          ? 'bg-gold text-obsidian border-gold glow-gold'
                          : 'bg-black/60 text-white border-white/20 hover:bg-black/90 hover:text-gold'
                      }`}
                    >
                      <Heart
                        size={16}
                        fill={favorites.includes(est.slug) ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Active Promotion pulsing badge (only if activePromotion exists) */}
                    {est.activePromotion && (
                      <ActivePromotionsBadge promotion={est.activePromotion} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/40">
            No se encontraron locales con esos criterios.
          </div>
        )}
      </section>

      <NightPlanner open={matchmakerOpen} onClose={() => setMatchmakerOpen(false)} />
    </motion.div>
  );
}
