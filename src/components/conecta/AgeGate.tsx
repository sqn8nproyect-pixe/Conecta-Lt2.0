'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldX, Wine, AlertTriangle, ExternalLink } from 'lucide-react';

interface AgeGateProps {
  onConfirm: () => void;
}

type GateState = 'verifying' | 'denied';

export function AgeGate({ onConfirm }: AgeGateProps) {
  const [state, setState] = useState<GateState>('verifying');

  // Lock body scroll while the gate is showing
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleDeny = useCallback(() => {
    setState('denied');
  }, []);

  const handleLeave = useCallback(() => {
    // Redirect to a safe, non-alcohol-related site
    window.location.href = 'https://www.google.com';
  }, []);

  return (
    <AnimatePresence mode="wait">
      {state === 'verifying' ? (
        <motion.div
          key="verifying"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agegate-title"
          aria-describedby="agegate-desc"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-obsidian/95 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-orbs opacity-60" aria-hidden="true">
            <div className="orb-1" />
            <div className="orb-2" />
          </div>

          {/* Card */}
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg glass-card rounded-3xl overflow-hidden border border-gold/30 shadow-2xl glow-gold"
          >
            {/* Logo header band (light backdrop so the white-bg logo reads cleanly) */}
            <div className="relative bg-gradient-to-b from-white via-white to-white/90 px-6 pt-8 pb-6 flex flex-col items-center">
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-obsidian/85 text-gold text-[9px] font-mono font-bold tracking-widest border border-gold/30">
                <ShieldCheck size={11} /> VERIFICACIÓN
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-2 ring-gold/40 shadow-lg bg-white">
                <img
                  src="/images/logo.png"
                  alt="Logo de Conecta-LT"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-3 text-center">
                <div className="font-serif text-xl sm:text-2xl font-black tracking-tight text-obsidian">
                  CONECTA<span className="text-[#0097CE]">-LT</span>
                </div>
                <div className="text-[9px] tracking-[3px] font-mono text-obsidian/60 mt-0.5">
                  CONECTA CON LO NUESTRO
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 sm:px-8 py-6 sm:py-7 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-[10px] font-bold tracking-widest mb-4">
                <Wine size={12} /> BEBIDAS ALCOHÓLICAS
              </div>

              <h1
                id="agegate-title"
                className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight mb-3"
              >
                ¿Eres mayor de <span className="text-gold">18 años</span>?
              </h1>

              <p
                id="agegate-desc"
                className="text-sm sm:text-[15px] text-white/70 leading-relaxed mb-5 max-w-md mx-auto"
              >
                Este sitio web promociona locales de vida nocturna, licorerías y bebidas
                alcohólicas. De conformidad con la legislación venezolana vigente, el
                consumo de alcohol está prohibido para menores de edad.
              </p>

              <div className="flex items-start gap-2 text-left bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-6">
                <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber/90 leading-relaxed">
                  <strong className="font-bold">Advertencia:</strong> El consumo
                  excesivo de alcohol es perjudicial para la salud. Si bebes, no
                  conduzcas. Promovemos el consumo responsable.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-gold text-obsidian font-bold hover:bg-[#e5bf4a] active:scale-95 transition-all text-sm tracking-wider glow-gold flex items-center justify-center gap-2"
                  autoFocus
                >
                  <ShieldCheck size={16} /> SOY MAYOR DE EDAD
                </button>
                <button
                  onClick={handleDeny}
                  className="flex-1 py-3.5 px-6 rounded-2xl border border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40 hover:text-white active:scale-95 transition-all text-sm tracking-wider font-semibold flex items-center justify-center gap-2"
                >
                  <ShieldX size={16} /> SOY MENOR DE EDAD
                </button>
              </div>

              <p className="mt-5 text-[10px] text-white/40 leading-relaxed max-w-sm mx-auto">
                Al ingresar confirmas tener al menos 18 años y aceptas nuestra política
                de privacidad y términos de uso. CONECTA-LT no se hace responsable por el
                uso indebido de la información publicada.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="denied"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="denied-title"
        >
          <div className="absolute inset-0 bg-obsidian/95 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-orbs opacity-40" aria-hidden="true">
            <div className="orb-1" />
            <div className="orb-2" />
          </div>

          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md glass-card rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl p-8 sm:p-10 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
              <ShieldX size={36} className="text-red-400" />
            </div>

            <h1
              id="denied-title"
              className="font-serif text-2xl sm:text-3xl font-black text-white mb-3"
            >
              Acceso denegado
            </h1>

            <p className="text-white/70 text-sm leading-relaxed mb-7">
              Lo sentimos, pero este sitio web está dirigido exclusivamente a personas
              mayores de 18 años. Por favor, vuelve cuando cumplas con la edad legal
              requerida para consumir bebidas alcohólicas en Venezuela.
            </p>

            <button
              onClick={handleLeave}
              className="w-full py-3.5 px-6 rounded-2xl bg-white text-obsidian font-bold hover:bg-gold hover:text-obsidian active:scale-95 transition-all text-sm tracking-wider flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} /> SALIR DE CONECTA-LT
            </button>

            <button
              onClick={() => setState('verifying')}
              className="mt-3 text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
            >
              Volver a la verificación
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
  );
}
