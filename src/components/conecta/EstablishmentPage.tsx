'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Calendar,
  Phone,
  Instagram,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Ticket,
  Heart,
  X,
  Check,
  Copy,
  Flame,
} from 'lucide-react';
import {
  useAppStore,
  generateReservationCode,
  defaultBookingData,
} from '@/lib/store';
import { fetchBusinessBySlug } from '@/lib/api';
import type { BookingData, Offer, Review } from '@/lib/types';
import { ValuePropositionBanner } from '@/components/establishment/ValuePropositionBanner';
import { PhotoGallery } from '@/components/establishment/PhotoGallery';
import { SocialContactPanel } from '@/components/establishment/SocialContactPanel';
import {
  ActivePromotionsBadge,
  formatDate,
  daysUntil,
} from '@/components/establishment/ActivePromotionsBadge';

type TabId = 'info' | 'offers' | 'reviews';

// Sub-Rating progress bar helper
function RatingBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-white/70">{label}</span>
        <span className="text-gold font-bold font-mono">
          {score.toFixed(1)} / 5.0
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-gold to-amber rounded-full"
        />
      </div>
    </div>
  );
}

export function EstablishmentPage() {
  const slug = useAppStore((s) => s.selectedEstablishmentSlug);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const { data: est, isLoading } = useQuery({
    queryKey: ['business', slug],
    queryFn: () => fetchBusinessBySlug(slug!),
    enabled: !!slug,
  });

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewOrder, setReviewOrder] = useState<'recientes' | 'valoracion'>(
    'recientes',
  );
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>(
    defaultBookingData(user),
  );
  const [reservationCode, setReservationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = useCallback(async (code: string) => {
    // Attempt the async Clipboard API first, then fall back to execCommand.
    // Either way, we ALWAYS show the visual "Copiado" feedback because the
    // code is already visible on screen — the user's intent is clear.
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
    // Visual feedback regardless — the code is on screen for manual copy too.
    setCopiedCode(code);
    addNotification(
      copied ? `Código copiado: ${code}` : `Código: ${code} (cópialo manualmente)`,
      copied ? 'success' : 'info',
    );
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2200);
  }, [addNotification]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center text-white/60">
        Cargando...
      </div>
    );
  }

  if (!est) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center text-white/60">
        Local no encontrado.
        <button
          onClick={() => setView('home')}
          className="block mx-auto mt-6 text-gold hover:underline"
        >
          Volver al directorio
        </button>
      </div>
    );
  }

  const estOffers = est.offers ?? [];
  const estReviews = est.reviews ?? [];
  const avg = est.avgRating;
  const count = est.reviewCount;
  const isFav = favorites.includes(est.id);

  const handleNextPhoto = () =>
    setActivePhotoIndex((p) => (p + 1) % est.images.length);
  const handlePrevPhoto = () =>
    setActivePhotoIndex((p) => (p - 1 + est.images.length) % est.images.length);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addNotification('Debes iniciar sesión para dejar una reseña.', 'info');
      return;
    }
    addNotification('Las reseñas persistentes estarán disponibles pronto.', 'info');
    setComment('');
    setActiveTab('reviews');
  };

  const handleStartBooking = (dealId: string = '') => {
    setBookingData({
      ...defaultBookingData(user),
      dealId,
    });
    setBookingStep(1);
    setBookingOpen(true);
  };

  const handleConfirmBooking = () => {
    if (!bookingData.name.trim() || !bookingData.date || !bookingData.time) return;
    setBookingStep(2);
    setTimeout(() => {
      setReservationCode(generateReservationCode());
      setBookingStep(3);
      addNotification('¡Reserva confirmada!');
    }, 1800);
  };

  const handleClaimCode = (offer: Offer) => {
    if (claimedCodes.includes(offer.code)) {
      addNotification(`Cupón ya activado: ${offer.code}`, 'info');
      return;
    }
    setClaimedCodes((prev) => [...prev, offer.code]);
    addNotification(`¡Cupón activado!: ${offer.code}`);
  };

  const getRatingCount = (stars: number) =>
    estReviews.filter((r) => r.rating === stars).length;

  const sortedReviews = [...estReviews].sort((a, b) => {
    if (reviewOrder === 'valoracion') return b.rating - a.rating;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Información General' },
    { id: 'offers', label: `Promociones (${estOffers.length})` },
    { id: 'reviews', label: `Reseñas (${estReviews.length})` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 pb-24"
    >
      <button
        onClick={() => setView('home')}
        className="flex items-center text-xs gap-2 text-white/50 hover:text-white py-6 sm:py-8 transition-colors font-bold tracking-widest uppercase"
      >
        <ArrowLeft size={16} /> Volver al directorio
      </button>

      {/* Hero Media Slider */}
      <div className="relative h-[360px] sm:h-[440px] md:h-[480px] rounded-3xl sm:rounded-[40px] overflow-hidden mb-8 sm:mb-10 border border-white/10 group">
        <AnimatePresence mode="wait">
          <motion.img
            key={activePhotoIndex}
            src={est.images[activePhotoIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            alt={`${est.name} — foto ${activePhotoIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#090d1a]" />

        {est.images.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              aria-label="Foto anterior"
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/95 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNextPhoto}
              aria-label="Foto siguiente"
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/95 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-28 sm:bottom-32 left-0 right-0 flex justify-center gap-2">
              {est.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  aria-label={`Ir a foto ${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === activePhotoIndex ? 'bg-gold w-6' : 'bg-white/30 w-2.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="uppercase tracking-[4px] text-[10px] text-gold font-bold font-mono bg-gold/10 border border-gold/30 px-3 py-1 rounded-full">
              {est.category}
            </span>
            <span className="px-2.5 py-1 bg-gold/20 border border-gold/40 text-gold text-[10px] font-black tracking-wide rounded-full">
              {est.priceRange}
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-black tracking-[-1px] sm:tracking-[-2px] leading-tight text-white mb-2">
            {est.name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base md:text-lg">
            <div className="flex items-center gap-1.5 text-gold font-bold">
              <Star fill="#D4AF37" size={18} /> {avg}
            </div>
            <span className="text-white/60">
              ({count} reseñas de la comunidad)
            </span>
            {est.activePromotion && (
              <ActivePromotionsBadge
                promotion={est.activePromotion}
                variant="inline"
              />
            )}
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={() => toggleFavorite(est.id, est.name)}
          aria-label={isFav ? `Quitar ${est.name} de favoritos` : `Añadir ${est.name} a favoritos`}
          className={`absolute top-5 right-5 w-12 h-12 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
            isFav
              ? 'bg-gold text-obsidian border-gold glow-gold'
              : 'bg-black/60 text-white border-white/20 hover:bg-black/90 hover:text-gold'
          }`}
        >
          <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Value Proposition Banner — specialty + hook quote */}
      <ValuePropositionBanner
        specialty={est.specialty}
        valueProposition={est.valueProposition}
      />

      {/* Navigation Tabs */}
      <div className="flex gap-6 sm:gap-8 border-b border-white/10 mb-8 sm:mb-10 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-4 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-gold' : 'text-white/50 hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <motion.div
            key="tab-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid lg:grid-cols-3 gap-8 sm:gap-10"
          >
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                  SOBRE EL LOCAL
                </h4>
                <p className="text-base md:text-[17px] leading-relaxed text-white/80 font-light">
                  {est.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <button
                  onClick={() => handleStartBooking()}
                  className="px-6 sm:px-8 h-14 rounded-2xl bg-gold text-obsidian font-bold hover:bg-[#E5BF4A] active:scale-95 transition-all text-sm tracking-wider flex items-center gap-2 shadow-lg glow-gold"
                >
                  <Calendar size={16} /> RESERVAR MESA
                </button>
                <a
                  href={`https://wa.me/${est.phone.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 bg-white/5 px-5 sm:px-6 h-14 rounded-2xl font-bold text-xs tracking-wider transition-all text-white"
                >
                  <Phone size={16} /> WHATSAPP
                </a>
                <a
                  href={`https://instagram.com/${est.instagram.slice(1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 bg-white/5 px-5 sm:px-6 h-14 rounded-2xl font-bold text-xs tracking-wider transition-all text-white"
                >
                  <Instagram size={16} /> INSTAGRAM
                </a>
                <a
                  href={`https://maps.google.com/?q=${est.lat},${est.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 bg-white/5 px-5 sm:px-6 h-14 rounded-2xl font-bold text-xs tracking-wider transition-all text-white"
                >
                  <MapPin size={16} /> CÓMO LLEGAR
                </a>
              </div>

              {/* Sub-Ratings with RatingBar */}
              <div className="glass-card border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
                <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                  EVALUACIÓN DEL AMBIENTE
                </h4>
                <RatingBar label="Ambiente & Decoración" score={est.subRatings.ambiente} />
                <RatingBar label="Calidad del Servicio" score={est.subRatings.servicio} />
                <RatingBar label="Relación Precio / Calidad" score={est.subRatings.precioCalidad} />
              </div>

              {/* Ratings Distribution */}
              <div className="glass-card border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
                <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                  VALORACIÓN GENERAL
                </h4>
                <div className="grid md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 text-center">
                    <div className="text-6xl font-serif text-white font-black">{avg}</div>
                    <div className="flex justify-center text-gold my-1.5 text-lg">
                      {'★'.repeat(Math.round(avg))}
                      {'☆'.repeat(5 - Math.round(avg))}
                    </div>
                    <div className="text-xs text-white/50">{count} valoraciones</div>
                  </div>

                  <div className="md:col-span-8 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const ratingVal = getRatingCount(stars);
                      const pct = count > 0 ? (ratingVal / count) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 text-xs">
                          <span className="w-3 text-white/70 font-mono">{stars}</span>
                          <Star size={10} fill="#D4AF37" className="text-gold" />
                          <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className="h-full bg-gold rounded-full"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-white/50 font-mono">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Photo Gallery — 10 immersive photos with lightbox */}
              <PhotoGallery
                images={est.gallery}
                establishmentName={est.name}
              />
            </div>

            {/* Contact + Social Panel — replaces old contact sidebar */}
            <div className="lg:col-span-1">
              <SocialContactPanel establishment={est} />
            </div>
          </motion.div>
        )}

        {/* OFFERS TAB */}
        {activeTab === 'offers' && (
          <motion.div
            key="tab-offers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Active Promotion banner — full width, only if it exists */}
            {est.activePromotion && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="md:col-span-2 relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-amber/40"
                style={{
                  background:
                    'linear-gradient(120deg, rgba(245,158,11,0.18) 0%, rgba(192,38,211,0.10) 60%, rgba(212,175,55,0.14) 100%)',
                }}
              >
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="conecta-promo-badge shrink-0 w-12 h-12 rounded-2xl bg-amber text-obsidian flex items-center justify-center border border-amber/60">
                      <Flame size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black tracking-[3px] text-amber font-mono uppercase mb-1">
                        Promo Activa
                      </div>
                      <div className="font-serif text-lg sm:text-xl font-bold text-white truncate">
                        {est.activePromotion.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 sm:border-l sm:border-white/15 sm:pl-6">
                    <div>
                      <div className="text-[9px] text-white/40 font-bold tracking-wider uppercase">
                        Válido hasta
                      </div>
                      <div className="text-sm font-bold text-white">
                        {formatDate(est.activePromotion.validUntil)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-white/40 font-bold tracking-wider uppercase">
                        Días restantes
                      </div>
                      <div className="text-sm font-black text-amber font-mono">
                        {daysUntil(est.activePromotion.validUntil)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {estOffers.length > 0 ? (
              estOffers.map((offer: Offer) => {
                const claimed = claimedCodes.includes(offer.code);
                return (
                  <div
                    key={offer.id}
                    className="glass-card border border-white/10 rounded-3xl overflow-hidden flex flex-col"
                  >
                    <div className="relative h-44 sm:h-48 overflow-hidden">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold text-[10px] font-black tracking-wider">
                        {offer.discount}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h5 className="font-bold text-lg text-white leading-snug">
                          {offer.title}
                        </h5>
                        <span className="text-2xl font-mono text-gold font-black tracking-tight flex-shrink-0">
                          {offer.price}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed font-light mb-5">
                        {offer.description}
                      </p>

                      {claimed ? (
                        <div className="mt-auto space-y-2">
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                            <Check size={14} /> Cupón activado
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(offer.code)}
                            aria-label={copiedCode === offer.code ? 'Código copiado' : `Copiar código ${offer.code}`}
                            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-dashed border-gold/40 hover:border-gold/80 hover:bg-black/60 transition-all group"
                          >
                            <span className="text-[10px] text-white/50 font-bold tracking-wider uppercase group-hover:text-white/80 transition-colors">
                              {copiedCode === offer.code ? 'Copiado' : 'Tu código · copiar'}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono font-black text-gold tracking-wider text-lg">
                                {offer.code}
                              </span>
                              <span className="shrink-0 w-7 h-7 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-obsidian transition-colors">
                                {copiedCode === offer.code ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => handleStartBooking(offer.title)}
                            className="w-full py-3 rounded-xl bg-gold/15 hover:bg-gold text-gold hover:text-obsidian font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2"
                          >
                            <Calendar size={14} /> RESERVAR CON ESTA OFERTA
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimCode(offer)}
                          className="mt-auto w-full py-3 rounded-xl bg-gold hover:bg-[#E5BF4A] text-obsidian font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 glow-gold"
                        >
                          <Ticket size={16} /> RECLAMAR CÓDIGO {offer.code}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 text-center py-20 text-white/40">
                <Ticket size={40} className="mx-auto mb-4 opacity-40" />
                <p className="text-sm">No hay ofertas activas en este momento.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <motion.div
            key="tab-reviews"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid lg:grid-cols-12 gap-x-12 gap-y-8"
          >
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                  COMUNIDAD
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <Sliders size={12} />
                  <select
                    value={reviewOrder}
                    onChange={(e) =>
                      setReviewOrder(e.target.value as 'recientes' | 'valoracion')
                    }
                    className="bg-transparent text-white border-none focus:ring-0 outline-none font-bold cursor-pointer"
                  >
                    <option value="recientes" className="bg-[#111827]">
                      Recientes
                    </option>
                    <option value="valoracion" className="bg-[#111827]">
                      Mejor nota
                    </option>
                  </select>
                </div>
              </div>

              {/* Review Form */}
              {user ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4"
                >
                  <div className="text-xs font-bold tracking-widest text-white/50 uppercase">
                    TU VALORACIÓN
                  </div>

                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        aria-label={`${n} estrellas`}
                        className="text-3xl transition-transform hover:scale-110 active:scale-95"
                        style={{ color: n <= rating ? '#D4AF37' : '#475569' }}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    placeholder="Escribe tu opinión honesta..."
                    className="bg-black/40 border border-white/10 w-full p-4 rounded-xl text-white text-sm placeholder:text-white/30 h-24 focus:border-gold outline-none transition-colors resize-none"
                  />

                  <button
                    type="submit"
                    disabled={!comment.trim()}
                    className="disabled:opacity-40 w-full bg-gold hover:bg-[#C5A13A] active:scale-95 text-obsidian font-bold h-12 rounded-xl text-xs tracking-wider transition-all glow-gold"
                  >
                    ENVIAR VALORACIÓN
                  </button>
                </form>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-sm">
                  <span className="text-white/50 block mb-3">
                    Inicia sesión con Google para comentar y valorar.
                  </span>
                  <span className="text-gold font-bold text-xs">
                    Acceder en la esquina superior derecha.
                  </span>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 conecta-scroll">
                {sortedReviews.length > 0 ? (
                  sortedReviews.map((rev: Review) => (
                    <div
                      key={rev.id}
                      className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={rev.userAvatar}
                            alt={rev.userName}
                            className="rounded-full w-8 h-8 ring-1 ring-white/10 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-white truncate">
                              {rev.userName}
                            </div>
                            <div className="text-[10px] text-white/40">{rev.date}</div>
                          </div>
                        </div>
                        <div className="flex text-gold text-sm font-semibold flex-shrink-0">
                          {'★'.repeat(rev.rating)}
                          {'☆'.repeat(5 - rev.rating)}
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-white/80 leading-relaxed font-light">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-white/30 text-center py-6 text-sm">
                    Sé el primero en valorar este establecimiento.
                  </div>
                )}
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-5">
              <div className="glass-card border border-white/10 rounded-3xl p-6 sm:p-8 sticky top-24 space-y-5">
                <h4 className="text-xs font-bold tracking-[3px] text-gold font-mono">
                  RESUMEN DE VALORACIONES
                </h4>
                <div className="text-center py-2">
                  <div className="text-6xl font-serif text-white font-black">{avg}</div>
                  <div className="flex justify-center text-gold my-2 text-2xl">
                    {'★'.repeat(Math.round(avg))}
                    {'☆'.repeat(5 - Math.round(avg))}
                  </div>
                  <div className="text-xs text-white/50">
                    Basado en {count} valoraciones
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const ratingVal = getRatingCount(stars);
                    const pct = count > 0 ? (ratingVal / count) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-3 text-white/70 font-mono">{stars}</span>
                        <Star size={10} fill="#D4AF37" className="text-gold" />
                        <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-white/50 font-mono">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reservation Modal */}
      <AnimatePresence>
        {bookingOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookingOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/15 overflow-hidden z-10 shadow-2xl max-h-[90vh] overflow-y-auto conecta-scroll"
            >
              <button
                onClick={() => setBookingOpen(false)}
                aria-label="Cerrar"
                className="absolute top-5 right-5 text-white/50 hover:text-white rounded-full p-1.5 hover:bg-white/5 transition-colors z-10"
              >
                <X size={18} />
              </button>

              <AnimatePresence mode="wait">
                {bookingStep === 1 && (
                  <motion.div
                    key="booking-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <span className="text-[10px] tracking-[4px] font-mono text-gold font-bold">
                        RESERVAS ONLINE
                      </span>
                      <h4 className="text-2xl font-serif mt-1 font-bold text-white">
                        Confirmar Mesa
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {bookingData.dealId && (
                        <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl text-xs text-gold flex items-center gap-2">
                          <Ticket size={14} /> Oferta seleccionada:{' '}
                          <strong>{bookingData.dealId}</strong>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] tracking-wider text-white/40 block mb-1 font-bold uppercase">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          value={bookingData.name}
                          onChange={(e) =>
                            setBookingData({ ...bookingData, name: e.target.value })
                          }
                          placeholder="Tu nombre completo..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors text-white placeholder:text-white/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-wider text-white/40 block mb-1 font-bold uppercase">
                            Fecha
                          </label>
                          <input
                            type="date"
                            value={bookingData.date}
                            onChange={(e) =>
                              setBookingData({ ...bookingData, date: e.target.value })
                            }
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-wider text-white/40 block mb-1 font-bold uppercase">
                            Hora
                          </label>
                          <input
                            type="time"
                            value={bookingData.time}
                            onChange={(e) =>
                              setBookingData({ ...bookingData, time: e.target.value })
                            }
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] tracking-wider text-white/40 block mb-1 font-bold uppercase">
                          Número de personas
                        </label>
                        <div className="flex gap-2">
                          {['1', '2', '4', '6', '8+'].map((num) => (
                            <button
                              type="button"
                              key={num}
                              onClick={() =>
                                setBookingData({ ...bookingData, guests: num })
                              }
                              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                bookingData.guests === num
                                  ? 'bg-gold border-gold text-obsidian'
                                  : 'bg-black/40 border-white/10 text-white/80 hover:bg-white/5'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      disabled={
                        !bookingData.name.trim() ||
                        !bookingData.date ||
                        !bookingData.time
                      }
                      className="disabled:opacity-40 w-full bg-gold hover:bg-[#C5A13A] active:scale-95 text-obsidian font-bold h-14 rounded-2xl text-xs tracking-wider transition-all glow-gold flex items-center justify-center gap-2"
                    >
                      CONFIRMAR RESERVACIÓN
                    </button>
                  </motion.div>
                )}

                {bookingStep === 2 && (
                  <motion.div
                    key="booking-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 text-center space-y-4"
                  >
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                      <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
                    </div>
                    <div className="text-sm font-medium text-white/70">
                      Procesando código de acceso...
                    </div>
                  </motion.div>
                )}

                {bookingStep === 3 && (
                  <motion.div
                    key="booking-ticket"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <span className="text-[9px] tracking-[4px] font-mono text-emerald-400 font-bold">
                        ¡RESERVA REALIZADA!
                      </span>
                      <h4 className="text-2xl font-serif mt-1 font-bold text-white">
                        Pase Holográfico
                      </h4>
                    </div>

                    <div className="glass-ticket rounded-3xl p-6 border border-white/20 relative space-y-6">
                      <div className="flex justify-between items-start border-b border-white/10 pb-4 gap-3">
                        <div className="min-w-0">
                          <div className="text-[9px] text-gold font-bold font-mono tracking-widest uppercase">
                            {est.category}
                          </div>
                          <div className="text-lg sm:text-xl font-serif font-black text-white">
                            {est.name}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[9px] text-white/40 font-bold font-mono">
                            CÓDIGO PASE
                          </div>
                          <div className="text-sm font-mono font-bold text-white tracking-tight">
                            {reservationCode}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                        <div>
                          <div className="text-[9px] text-white/40 font-bold font-mono uppercase">
                            TITULAR
                          </div>
                          <div className="font-semibold text-white mt-0.5">
                            {bookingData.name}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-white/40 font-bold font-mono uppercase">
                            PERSONAS
                          </div>
                          <div className="font-semibold text-white mt-0.5">
                            {bookingData.guests} Personas
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-white/40 font-bold font-mono uppercase">
                            FECHA
                          </div>
                          <div className="font-semibold text-white mt-0.5">
                            {bookingData.date}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-white/40 font-bold font-mono uppercase">
                            HORA
                          </div>
                          <div className="font-semibold text-white mt-0.5">
                            {bookingData.time} HRS
                          </div>
                        </div>
                      </div>

                      {bookingData.dealId && (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/70">
                          PROMO: <strong>{bookingData.dealId}</strong>
                        </div>
                      )}

                      {/* Decorative QR */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center glow-purple">
                          <svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            className="text-purple"
                            aria-hidden="true"
                          >
                            <rect
                              x="5"
                              y="5"
                              width="25"
                              height="25"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="5"
                            />
                            <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                            <rect
                              x="70"
                              y="5"
                              width="25"
                              height="25"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="5"
                            />
                            <rect x="77" y="12" width="11" height="11" fill="currentColor" />
                            <rect
                              x="5"
                              y="70"
                              width="25"
                              height="25"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="5"
                            />
                            <rect x="12" y="77" width="11" height="11" fill="currentColor" />
                            <rect x="40" y="5" width="8" height="8" fill="currentColor" />
                            <rect x="50" y="15" width="12" height="6" fill="currentColor" />
                            <rect x="40" y="28" width="16" height="8" fill="currentColor" />
                            <rect x="5" y="45" width="15" height="8" fill="currentColor" />
                            <rect x="80" y="45" width="15" height="15" fill="currentColor" />
                            <rect x="45" y="45" width="25" height="25" fill="currentColor" />
                            <rect
                              x="40"
                              y="80"
                              width="15"
                              height="15"
                              fill="currentColor"
                              opacity="0.8"
                            />
                            <rect x="85" y="80" width="10" height="10" fill="currentColor" />
                            <rect x="70" y="70" width="8" height="8" fill="currentColor" />
                            <circle cx="50" cy="50" r="5" fill="#D4AF37" />
                          </svg>
                        </div>
                        <span className="text-[8px] text-white/40 mt-3 font-mono tracking-widest uppercase">
                          MUESTRA ESTE QR EN LA ENTRADA
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setBookingOpen(false)}
                      className="w-full bg-white text-obsidian hover:bg-gold hover:text-obsidian font-bold h-12 rounded-xl text-xs tracking-wider transition-all"
                    >
                      ENTENDIDO
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
