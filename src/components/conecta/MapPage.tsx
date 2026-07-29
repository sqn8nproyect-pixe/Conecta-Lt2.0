'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Search,
  Star,
  ChevronRight,
  X,
  LocateFixed,
  Loader2,
  Navigation,
  LogIn,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { establishments } from '@/lib/data';
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

// Re-exported constant so MapPage and LeafletMap share the same radius.
const NEARBY_RADIUS_M = 1000;

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

/** Distancia Haversine entre dos puntos (en kilómetros). */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UserLocation {
  lat: number;
  lng: number;
}

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const selectedEst = useAppStore((s) => s.selectedMapEstablishment);
  const setSelectedEst = useAppStore((s) => s.setSelectedMapEstablishment);
  const getDynamicRating = useAppStore((s) => s.getDynamicRating);
  const goToDetail = useAppStore((s) => s.goToDetail);
  const user = useAppStore((s) => s.user);

  // Clear the selected establishment when leaving the map view so the
  // bottom sheet doesn't reappear on return.
  useEffect(() => () => setSelectedEst(null), [setSelectedEst]);

  /** Solicita la geolocalización del usuario (gateada por login). */
  const handleLocate = () => {
    if (!user) return; // solo disponible tras login
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Permiso denegado. Habilita el acceso a tu ubicación en el navegador.',
          2: 'No se pudo determinar tu ubicación. Verifica tu GPS o conexión.',
          3: 'La solicitud tardó demasiado. Inténtalo de nuevo.',
        };
        setGeoError(messages[err.code] || err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  /** Establecimientos dentro del radio de cercanía (1km), ordenados por distancia. */
  const nearbyEst = useMemo(() => {
    if (!userLocation) return [];
    return establishments
      .map((est) => ({
        ...est,
        distance: haversineKm(
          userLocation.lat,
          userLocation.lng,
          est.lat,
          est.lng,
        ),
      }))
      .filter((est) => est.distance * 1000 <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation]);

  const handleViewDetails = (est: Establishment) => {
    setSelectedEst(null);
    goToDetail(est.id);
  };

  const isLoggedIn = !!user;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="relative h-[calc(100vh-7rem)] sm:h-[calc(100vh-5rem)] overflow-hidden"
    >
      {/* Leaflet map fills its container */}
      <div className="absolute inset-0">
        <LeafletMap searchQuery={searchQuery} userLocation={userLocation} />
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

          {/* === Botón Mi ubicación (gateado por login) === */}
          <button
            type="button"
            onClick={handleLocate}
            disabled={!isLoggedIn || locating}
            aria-label={
              !isLoggedIn
                ? 'Inicia sesión para ver opciones cercanas'
                : 'Mostrar mi ubicación y opciones cercanas'
            }
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95 ${
              !isLoggedIn
                ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                : locating
                  ? 'bg-red-500/20 border border-red-500/40 text-red-300 cursor-wait'
                  : userLocation
                    ? 'bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30'
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
            }`}
          >
            {!isLoggedIn ? (
              <>
                <LogIn size={14} /> INICIA SESIÓN PARA VER CERCANOS
              </>
            ) : locating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> LOCALIZANDO…
              </>
            ) : userLocation ? (
              <>
                <LocateFixed size={14} /> ACTUALIZAR MI UBICACIÓN
              </>
            ) : (
              <>
                <Navigation size={14} /> MI UBICACIÓN
              </>
            )}
          </button>

          {/* Error de geolocalización */}
          {geoError && (
            <div className="flex items-start gap-2 text-left bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300 leading-relaxed">
                {geoError}
              </p>
            </div>
          )}

          {/* === Panel Cercanos === */}
          <AnimatePresence>
            {userLocation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold tracking-[2px] text-red-400 flex items-center gap-1.5">
                      <Navigation size={10} /> CERCANOS · 1 KM
                    </span>
                    <span className="text-[10px] font-mono text-white/50">
                      {nearbyEst.length}{' '}
                      {nearbyEst.length === 1 ? 'lugar' : 'lugares'}
                    </span>
                  </div>

                  {nearbyEst.length === 0 ? (
                    <p className="text-[11px] text-white/50 leading-relaxed py-2">
                      No hay locales registrados a menos de 1 km de tu
                      ubicación. Prueba moviéndote o usa el buscador.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto conecta-gallery-strip flex flex-col gap-1.5 pr-1">
                      {nearbyEst.map((est) => {
                        const rating = getDynamicRating(est.id);
                        return (
                          <button
                            key={est.id}
                            type="button"
                            onClick={() => setSelectedEst(est)}
                            className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white truncate group-hover:text-gold transition-colors">
                                {est.name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-white/50">
                                <span className="uppercase tracking-wide">
                                  {est.category}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Star
                                    size={9}
                                    fill="#d4af37"
                                    color="#d4af37"
                                  />
                                  {rating.avg}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-red-300 bg-red-500/15 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {est.distance < 1
                                ? `${Math.round(est.distance * 1000)} m`
                                : `${est.distance.toFixed(2)} km`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <>
        {/* Desktop: always visible */}
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
            <div className="flex items-center gap-2.5 pt-1 mt-1 border-t border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white/60" />
              <span className="text-white/80 font-medium">Tu ubicación</span>
            </div>
          </div>
        </div>

        {/* Mobile: collapsible toggle button (hidden while bottom sheet is open) */}
        <div className={`absolute top-4 right-4 md:hidden z-[1000] ${selectedEst ? 'hidden' : ''}`}>
          <button
            type="button"
            aria-label={legendOpen ? 'Cerrar leyenda' : 'Abrir leyenda'}
            aria-expanded={legendOpen}
            onClick={() => setLegendOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-elevated/95 backdrop-blur-md border border-white/15 rounded-full pl-2.5 pr-3 py-1.5 text-gold shadow-lg active:scale-95 transition"
          >
            <Info size={14} />
            <span className="text-[10px] font-mono font-bold tracking-[1.5px]">
              LEYENDA
            </span>
          </button>

          <AnimatePresence>
            {legendOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute top-full right-0 mt-2 bg-elevated/95 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 shadow-2xl min-w-[160px]"
              >
                <div className="flex flex-col gap-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-gold glow-gold" />
                    <span className="text-white/85 font-medium">Licorerías</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B] glow-amber" />
                    <span className="text-white/85 font-medium">Tascas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#C026D3] glow-purple" />
                    <span className="text-white/85 font-medium">Discotecas</span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1.5 mt-1 border-t border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white/60" />
                    <span className="text-white/85 font-medium">Tu ubicación</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>

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
                {userLocation && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-red-300 font-mono">
                      {(() => {
                        const d = haversineKm(
                          userLocation.lat,
                          userLocation.lng,
                          selectedEst.lat,
                          selectedEst.lng,
                        );
                        return d < 1
                          ? `a ${Math.round(d * 1000)} m de ti`
                          : `a ${d.toFixed(2)} km de ti`;
                      })()}
                    </span>
                  </>
                )}
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
