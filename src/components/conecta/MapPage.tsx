'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Star, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Establishment } from '@/lib/types';

// Leaflet accesses `window` at module evaluation, so the actual map is
// dynamically imported with `ssr: false`. This keeps MapPage itself
// server-renderable and only ships the leaflet bundle to the client.
const LeafletMap = dynamic(
  () => import('./LeafletMap').then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <LoadingSkeleton />,
  },
);

function LoadingSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#0b0f19] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-white/40">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <div className="text-xs tracking-[4px] font-mono">CARGANDO MAPA…</div>
      </div>
    </div>
  );
}

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEst = useAppStore((s) => s.selectedMapEstablishment);
  const setSelectedEst = useAppStore((s) => s.setSelectedMapEstablishment);
  const getDynamicRating = useAppStore((s) => s.getDynamicRating);
  const goToDetail = useAppStore((s) => s.goToDetail);

  // Clear the selected establishment when leaving the map view so the
  // bottom sheet doesn't reappear on return.
  useEffect(() => () => setSelectedEst(null), [setSelectedEst]);

  const handleViewDetails = (est: Establishment) => {
    setSelectedEst(null);
    goToDetail(est.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="relative h-[calc(100vh-5rem-2rem)] sm:h-[calc(100vh-5rem)] overflow-hidden"
    >
      {/* Leaflet map fills its container */}
      <div className="absolute inset-0">
        <LeafletMap searchQuery={searchQuery} />
      </div>

      {/* Search Overlay */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-[1000] w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm">
        <div className="glass-card rounded-2xl p-4 border border-white/10 shadow-2xl flex flex-col gap-3">
          <div className="font-semibold text-xs tracking-wider text-gold font-mono flex items-center gap-1.5">
            <MapPin size={12} /> EXPLORADOR DE RUMBA
          </div>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o tipo..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm placeholder:text-white/40 focus:border-gold outline-none transition-colors text-white"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-elevated/90 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 text-sm hidden md:block z-[1000]">
        <div className="font-bold mb-3 tracking-[3px] text-[10px] text-gold font-mono">
          LEYENDA
        </div>
        <div className="flex flex-col gap-y-2 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-gold glow-gold" />
            <span className="text-white/80 font-medium">Licorerías</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#F59E0B] glow-amber" />
            <span className="text-white/80 font-medium">Tascas</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#C026D3] glow-purple" />
            <span className="text-white/80 font-medium">Discotecas</span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {selectedEst && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
            className="absolute bottom-0 left-0 right-0 bg-[#0c101d] border-t border-white/15 rounded-t-[32px] px-5 sm:px-8 py-6 sm:py-8 z-[1100] shadow-2xl"
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="min-w-0">
                  <span className="uppercase tracking-[2.5px] text-[10px] text-gold font-bold font-mono">
                    {selectedEst.category}
                  </span>
                  <h4 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {selectedEst.name}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedEst(null)}
                  aria-label="Cerrar"
                  className="text-xs px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all font-semibold flex items-center gap-1.5 flex-shrink-0"
                >
                  <X size={12} /> Cerrar
                </button>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 mb-6 sm:mb-8 font-light">
                <div className="flex items-center gap-1.5">
                  <Star className="text-gold" size={16} fill="#D4AF37" />
                  <span className="font-mono font-bold text-white">
                    {getDynamicRating(selectedEst.id).avg}
                  </span>
                  <span>
                    ({getDynamicRating(selectedEst.id).count} reseñas)
                  </span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="line-clamp-1">{selectedEst.address}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href={`https://wa.me/${selectedEst.phone.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-4 flex justify-center items-center bg-[#25D366] hover:bg-[#20b45a] active:scale-95 text-black font-bold rounded-2xl transition-all text-sm tracking-wider"
                >
                  CONTACTAR POR WHATSAPP
                </a>
                <button
                  onClick={() => handleViewDetails(selectedEst)}
                  className="flex-1 py-4 text-center border border-gold text-gold hover:bg-gold hover:text-obsidian rounded-2xl font-bold transition-all text-sm tracking-wider flex items-center justify-center gap-1 shadow-md glow-gold"
                >
                  VER DETALLES COMPLETOS <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
