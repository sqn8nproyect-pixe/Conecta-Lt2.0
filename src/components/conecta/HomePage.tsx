'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Star, Heart, Clock } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { fetchBusinesses } from '@/lib/api';
import type { Category, Establishment, PriceRange } from '@/lib/types';
import { Matchmaker } from './Matchmaker';
import { ActivePromotionsBadge } from '@/components/establishment/ActivePromotionsBadge';
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

  const { data: establishments = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => fetchBusinesses(),
  });

  const goToDetail = useAppStore((s) => s.goToDetail);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

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

  const filters: Filter[] = ['Todas', 'licorería', 'tasca', 'discoteca'];
  const priceFilters: PriceFilter[] = ['Todos', '$', '$$', '$$$'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <div className="text-xs tracking-[4px] font-mono">CARGANDO…</div>
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
                onChange={(e) => setSearch(e.target.value)}
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
                        <div className="flex items-center gap-2 text-xs text-white/50 mb-3 font-medium">
                          <span>{count} reseñas</span>
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
                      onClick={() => toggleFavorite(est.id, est.name)}
                      aria-label={
                        favorites.includes(est.id)
                          ? `Quitar ${est.name} de favoritos`
                          : `Añadir ${est.name} a favoritos`
                      }
                      className={`absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                        favorites.includes(est.id)
                          ? 'bg-gold text-obsidian border-gold glow-gold'
                          : 'bg-black/60 text-white border-white/20 hover:bg-black/90 hover:text-gold'
                      }`}
                    >
                      <Heart
                        size={16}
                        fill={favorites.includes(est.id) ? 'currentColor' : 'none'}
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

      <Matchmaker open={matchmakerOpen} onClose={() => setMatchmakerOpen(false)} />
    </motion.div>
  );
}
