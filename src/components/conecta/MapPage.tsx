'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  MapPin,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Star,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { establishments } from '@/lib/data';
import type { Establishment } from '@/lib/types';

export function MapPage() {
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const selectedEst = useAppStore((s) => s.selectedMapEstablishment);
  const setSelectedEst = useAppStore((s) => s.setSelectedMapEstablishment);
  const getDynamicRating = useAppStore((s) => s.getDynamicRating);
  const goToDetail = useAppStore((s) => s.goToDetail);

  const mapX = useMotionValue(0);
  const mapY = useMotionValue(0);

  const handleZoomIn = () => setZoom((p) => Math.min(2.5, p + 0.3));
  const handleZoomOut = () => setZoom((p) => Math.max(0.8, p - 0.3));
  const handleReset = () => {
    setZoom(1);
    mapX.set(0);
    mapY.set(0);
  };

  const handlePinClick = (est: Establishment) => {
    setSelectedEst(est);
    setShowBottomSheet(true);
  };

  const filteredEst = establishments.filter(
    (est) =>
      est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="relative h-[calc(100vh-5rem-2rem)] sm:h-[calc(100vh-5rem)] overflow-hidden"
    >
      {/* Search Overlay */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm">
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

      {/* Map Controls */}
      <div className="absolute bottom-4 sm:bottom-10 right-4 sm:right-6 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          aria-label="Acercar"
          className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors font-bold text-xl active:scale-95 border border-white/15 text-white"
        >
          <Plus size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          aria-label="Alejar"
          className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors font-bold text-xl active:scale-95 border border-white/15 text-white"
        >
          <Minus size={20} />
        </button>
        <button
          onClick={handleReset}
          aria-label="Centrar mapa"
          title="Centrar Mapa"
          className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 border border-white/15 text-white"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Map Canvas */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 overflow-hidden">
        <motion.div
          drag
          dragMomentum
          dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
          style={{ x: mapX, y: mapY, scale: zoom }}
          className="relative w-[1000px] h-[620px] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl bg-gradient-to-tr from-[#0b0f19] to-[#121929] cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          {/* Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#222f46_1px,transparent_1px)] bg-[length:24px_24px] opacity-40" />

          <svg
            className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
            viewBox="0 0 1000 620"
          >
            <line x1="0" y1="180" x2="1000" y2="180" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="340" x2="1000" y2="340" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="490" x2="1000" y2="490" stroke="#475569" strokeWidth="1" />
            <line x1="180" y1="0" x2="180" y2="620" stroke="#475569" strokeWidth="1" />
            <line x1="520" y1="0" x2="520" y2="620" stroke="#475569" strokeWidth="1" />
            <line x1="780" y1="0" x2="780" y2="620" stroke="#475569" strokeWidth="1" />
            <path
              d="M 100 100 C 300 200, 500 50, 900 150"
              fill="transparent"
              stroke="#D4AF37"
              strokeWidth="1"
              strokeDasharray="5,5"
              opacity="0.3"
            />
            <path
              d="M 50 500 C 400 300, 600 550, 950 400"
              fill="transparent"
              stroke="#C026D3"
              strokeWidth="1"
              strokeDasharray="5,5"
              opacity="0.3"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[8px] text-white/10 font-mono pointer-events-none select-none">
            LOS TEQUES • RADAR NOCTURNO
          </div>

          {/* Pins */}
          {filteredEst.map((est) => {
            const { avg } = getDynamicRating(est.id);
            const left = 90 + (est.lng + 67.05) * 2200;
            const top = 110 + (est.lat - 10.34) * 3800;

            const isSelected = selectedEst && selectedEst.id === est.id;

            const colorClass =
              est.category === 'licorería'
                ? 'bg-gold radar-pulse-gold'
                : est.category === 'tasca'
                  ? 'bg-[#F59E0B] radar-pulse-amber'
                  : 'bg-[#C026D3] radar-pulse-purple';

            return (
              <div
                key={est.id}
                onClick={() => handlePinClick(est)}
                className="pin absolute flex flex-col items-center z-20 cursor-pointer"
                style={{
                  left: `${Math.max(4, Math.min(94, left))}%`,
                  top: `${Math.max(10, Math.min(85, top))}%`,
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-black/75 shadow-lg relative ${colorClass} ${
                    isSelected ? 'scale-125 border border-white' : ''
                  }`}
                >
                  <MapPin size={10} className="text-black" />
                </div>

                <div
                  className={`mt-1.5 text-center transition-all ${
                    isSelected ? 'scale-105' : ''
                  }`}
                >
                  <div
                    className={`text-[9px] font-bold tracking-tight text-white whitespace-nowrap bg-black/85 px-2 py-0.5 rounded-md border ${
                      isSelected ? 'border-gold' : 'border-white/10'
                    }`}
                  >
                    {est.name.split(' ')[0]}
                  </div>
                  <div className="text-gold text-[9px] font-bold font-mono tracking-tighter">
                    {avg}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-elevated/90 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 text-sm hidden md:block">
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
        {showBottomSheet && selectedEst && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
            className="absolute bottom-0 left-0 right-0 bg-[#0c101d] border-t border-white/15 rounded-t-[32px] px-5 sm:px-8 py-6 sm:py-8 z-40 shadow-2xl"
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
                  onClick={() => setShowBottomSheet(false)}
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
                  <span>({getDynamicRating(selectedEst.id).count} reseñas)</span>
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
                  onClick={() => {
                    setShowBottomSheet(false);
                    goToDetail(selectedEst.id);
                  }}
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
