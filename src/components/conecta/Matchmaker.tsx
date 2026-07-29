'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, X, ChevronRight } from 'lucide-react';
import {
  calculateMatch,
  getRecommendedDrink,
  useAppStore,
} from '@/lib/store';
import { establishments } from '@/lib/data';
import type { Establishment, MatchAnswers } from '@/lib/types';

interface MatchmakerProps {
  open: boolean;
  onClose: () => void;
}

export function Matchmaker({ open, onClose }: MatchmakerProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<MatchAnswers>({
    mood: '',
    company: '',
    budget: '',
  });
  const [recommendation, setRecommendation] = useState<{
    establishment: Establishment;
    drink: string;
  } | null>(null);

  const goToDetail = useAppStore((s) => s.goToDetail);
  const getDynamicRating = useAppStore((s) => s.getDynamicRating);

  const handleAnswer = (key: keyof MatchAnswers, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    if (step < 3) {
      setStep((p) => p + 1);
    } else {
      const recEst = calculateMatch(updated, establishments);
      const recDrink = getRecommendedDrink(updated, recEst);
      setRecommendation({ establishment: recEst, drink: recDrink });
      setStep(4);
    }
  };

  const reset = () => {
    setStep(1);
    setAnswers({ mood: '', company: '', budget: '' });
    setRecommendation(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goToRecDetail = () => {
    if (recommendation) {
      handleClose();
      goToDetail(recommendation.establishment.id);
    }
  };

  const optionCard = (
    emoji: string,
    title: string,
    desc: string,
    onClick: () => void,
    hoverColor: 'gold' | 'purple',
  ) => (
    <button
      onClick={onClick}
      className={`p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-center transition-all group active:scale-95 ${
        hoverColor === 'gold' ? 'hover:border-gold' : 'hover:border-purple'
      }`}
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
        {emoji}
      </div>
      <div className="font-semibold text-white mb-1">{title}</div>
      <p className="text-xs text-white/40">{desc}</p>
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl glass-card rounded-3xl p-6 sm:p-8 border border-white/15 overflow-hidden z-10 shadow-2xl max-h-[90vh] overflow-y-auto conecta-scroll"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple via-gold to-amber" />

            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute top-5 right-5 text-white/50 hover:text-white rounded-full p-1.5 hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6 sm:mb-8">
              <span className="text-[10px] tracking-[4px] font-mono text-gold font-bold">
                RECOMENDADOR DIGITAL v1.0
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif mt-1 font-bold text-white">
                Planificador de Noche
              </h3>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <p className="text-center text-white/70">
                    Paso 1: ¿Cuál es el ambiente que buscas hoy?
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {optionCard(
                      '🍷',
                      'Tranquilo / Casual',
                      'Tasca, conversar, tomar algo relajado.',
                      () => handleAnswer('mood', 'chill'),
                      'gold',
                    )}
                    {optionCard(
                      '⚡',
                      'Rumba Activa',
                      'Discoteca, música alta, bailar hasta el amanecer.',
                      () => handleAnswer('mood', 'party'),
                      'purple',
                    )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <p className="text-center text-white/70">
                    Paso 2: ¿Con quién vas a salir?
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {optionCard(
                      '👩‍❤️‍👨',
                      'En Pareja',
                      'Ambiente íntimo, buena música y privacidad.',
                      () => handleAnswer('company', 'couple'),
                      'gold',
                    )}
                    {optionCard(
                      '🍻',
                      'Con Panas',
                      'Diversión grupal, mesas amplias, promociones.',
                      () => handleAnswer('company', 'friends'),
                      'purple',
                    )}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <p className="text-center text-white/70">
                    Paso 3: ¿Cuál es el presupuesto para hoy?
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {optionCard(
                      '💸',
                      'Ahorrativo',
                      'Buscando las mejores ofertas y tobos económicos.',
                      () => handleAnswer('budget', 'low'),
                      'gold',
                    )}
                    {optionCard(
                      '💎',
                      'Premium / VIP',
                      'Servicio exclusivo, licores añejos, zona reservada.',
                      () => handleAnswer('budget', 'premium'),
                      'purple',
                    )}
                  </div>
                </motion.div>
              )}

              {step === 4 && recommendation && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5 text-center"
                >
                  <div className="p-1 rounded-full bg-gold/10 inline-block border border-gold/30 mb-2">
                    <span className="text-xs text-gold font-mono px-4 py-1 block">
                      ¡COMBINACIÓN ENCONTRADA!
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group hover:border-gold/40 transition-colors">
                    <div className="absolute top-3 right-3 text-[10px] tracking-widest bg-black/60 border border-white/10 px-3 py-0.5 rounded-full font-bold text-white">
                      {recommendation.establishment.category.toUpperCase()}
                    </div>

                    <div className="text-xl sm:text-2xl font-serif text-white font-bold mb-2">
                      {recommendation.establishment.name}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-gold text-sm mb-4">
                      <Star size={14} fill="#d4af37" />
                      <span className="font-mono font-bold text-base">
                        {getDynamicRating(recommendation.establishment.id).avg}
                      </span>
                      <span className="text-white/40">
                        ({getDynamicRating(recommendation.establishment.id).count} reseñas)
                      </span>
                    </div>

                    <p className="text-xs text-white/60 mb-6 px-2 sm:px-4">
                      {recommendation.establishment.description}
                    </p>

                    <div className="p-4 rounded-xl bg-gold/5 border border-gold/15 text-left flex items-start gap-3">
                      <div className="text-xl mt-0.5">🍹</div>
                      <div>
                        <div className="text-[10px] text-gold font-bold tracking-widest font-mono">
                          BARRAS RECOMENDADAS
                        </div>
                        <div className="text-xs font-semibold text-white mt-0.5">
                          {recommendation.drink}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 pt-2">
                    <button
                      onClick={reset}
                      className="flex-1 py-3.5 border border-white/20 hover:bg-white/5 rounded-xl font-semibold text-xs tracking-wider transition-all text-white"
                    >
                      REPETIR TEST
                    </button>
                    <button
                      onClick={goToRecDetail}
                      className="flex-1 py-3.5 bg-gold hover:bg-[#e5bf4a] text-obsidian font-bold rounded-xl text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 glow-gold"
                    >
                      VER DETALLES <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step indicator */}
            {step < 4 && (
              <div className="flex justify-center gap-2 mt-6">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      s === step
                        ? 'w-8 bg-gold'
                        : s < step
                          ? 'w-4 bg-gold/60'
                          : 'w-4 bg-white/15'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
