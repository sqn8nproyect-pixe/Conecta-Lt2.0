'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldX, Wine, AlertTriangle, ExternalLink } from 'lucide-react';

interface AgeGateProps {
  onConfirm: () => void;
}

type GateState = 'verifying' | 'denied';

/**
 * Una sola copa de champán animada (vidrio + líquido + burbujas + tallo + base).
 * `parallaxRef` permite que el mouse mueva ligeramente la copa (efecto profundidad).
 */
function ChampagneGlass({
  side,
  bubbles,
  parallaxRef,
}: {
  side: 'left' | 'right';
  bubbles: Array<{ id: number; left: number; delay: number; duration: number }>;
  parallaxRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="conecta-glass-wrap" ref={parallaxRef}>
      <div className={`conecta-glass ${side === 'right' ? 'is-right' : ''}`}>
        <div className="conecta-glass-cup">
          <div className="conecta-liquid" />
          {bubbles.map((b) => (
            <span
              key={b.id}
              className="conecta-bubble"
              style={{
                left: `${b.left}%`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`,
              }}
            />
          ))}
        </div>
        <div className="conecta-glass-stem" />
        <div className="conecta-glass-base" />
      </div>
    </div>
  );
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  const [state, setState] = useState<GateState>('verifying');
  const glassRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Lock body scroll while the gate is showing
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Genera arreglos deterministas (memoizados) para partículas, burbujas,
  // splash y líneas — evita crear nuevos nodos en cada render.
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: Math.random() * 10 + 10,
      })),
    [],
  );

  const bubblesLeft = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: Math.random() * 80 + 10,
        delay: Math.random() * 2,
        duration: Math.random() * 1 + 1.5,
      })),
    [],
  );

  const bubblesRight = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: Math.random() * 80 + 10,
        delay: Math.random() * 2,
        duration: Math.random() * 1 + 1.5,
      })),
    [],
  );

  const splashParticles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        return {
          id: i,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          delay: i * 0.1,
        };
      }),
    [],
  );

  const connectionLines = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        rotate: Math.random() * 360,
      })),
    [],
  );

  // Parallax con el mouse sobre las copas (vía CSS vars --px/--py)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      glassRefs.current.forEach((el, index) => {
        if (!el) return;
        const speed = (index + 1) * 8;
        const x = (window.innerWidth - e.clientX * speed) / 120;
        const y = (window.innerHeight - e.clientY * speed) / 120;
        el.style.setProperty('--px', `${x}px`);
        el.style.setProperty('--py', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleDeny = useCallback(() => {
    setState('denied');
  }, []);

  const handleLeave = useCallback(() => {
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
          className="conecta-agegate-bg fixed inset-0 z-[100] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agegate-title"
          aria-describedby="agegate-desc"
        >
          {/* === Capa de fondo: partículas + líneas doradas === */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Partículas doradas flotantes */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="conecta-particle"
                style={{
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            ))}

            {/* Líneas de conexión doradas */}
            {connectionLines.map((l) => (
              <span
                key={l.id}
                className="conecta-golden-line"
                style={{
                  top: `${l.top}%`,
                  left: `${l.left}%`,
                  animationDelay: `${l.delay}s`,
                  transform: `rotate(${l.rotate}deg)`,
                }}
              />
            ))}
          </div>

          {/* === Contenido central === */}
          <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
            {/* Logo + nombre */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-center mb-6 sm:mb-8"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-2xl overflow-hidden ring-2 ring-[#FFD700]/40 shadow-[0_0_30px_rgba(255,215,0,0.3)] bg-white">
                <img
                  src="/images/logo.png"
                  alt="Logo de Conecta-LT"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="conecta-logo-glow font-serif text-2xl sm:text-3xl font-black tracking-[3px]">
                CONECTA-LT
              </h1>
              <p className="text-white/60 text-[10px] sm:text-xs tracking-[5px] mt-1">
                CONECTA CON LO NUESTRO
              </p>
            </motion.div>

            {/* Brindis: dos copas con splash central */}
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center justify-center gap-5 sm:gap-8 mb-6 sm:mb-8"
              aria-hidden="true"
            >
              <ChampagneGlass
                side="left"
                bubbles={bubblesLeft}
                parallaxRef={(el) => {
                  glassRefs.current[0] = el;
                }}
              />

              {/* Splash central entre las copas */}
              <div className="relative w-[150px] h-[150px] pointer-events-none">
                {splashParticles.map((s) => (
                  <span
                    key={s.id}
                    className="conecta-splash-particle"
                    style={
                      {
                        top: '50%',
                        left: '50%',
                        animationDelay: `${s.delay}s`,
                        '--tx': `${s.tx}px`,
                        '--ty': `${s.ty}px`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              <ChampagneGlass
                side="right"
                bubbles={bubblesRight}
                parallaxRef={(el) => {
                  glassRefs.current[1] = el;
                }}
              />
            </motion.div>

            {/* Texto legal + verificación */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-full max-w-lg text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[10px] font-bold tracking-widest mb-4">
                <Wine size={12} /> BEBIDAS ALCOHÓLICAS
              </div>

              <h2
                id="agegate-title"
                className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight mb-3"
              >
                ¿Eres mayor de <span className="text-[#FFD700]">18 años</span>?
              </h2>

              <p
                id="agegate-desc"
                className="text-sm sm:text-[15px] text-white/70 leading-relaxed mb-5 max-w-md mx-auto"
              >
                Este sitio web promociona locales de vida nocturna, licorerías y bebidas
                alcohólicas. De conformidad con la legislación venezolana vigente, el consumo
                de alcohol está prohibido para menores de edad.
              </p>

              <div className="flex items-start gap-2 text-left bg-[#FFA500]/10 border border-[#FFA500]/30 rounded-xl px-4 py-3 mb-6 max-w-md mx-auto">
                <AlertTriangle size={16} className="text-[#FFA500] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#FFA500]/90 leading-relaxed">
                  <strong className="font-bold">Advertencia:</strong> El consumo excesivo de
                  alcohol es perjudicial para la salud. Si bebes, no conduzcas. Promovemos el
                  consumo responsable.
                </p>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <button
                  onClick={handleConfirm}
                  className="conecta-cinema-btn flex-1 py-3.5 px-6 rounded-full font-bold text-sm tracking-[2px] uppercase flex items-center justify-center gap-2"
                  autoFocus
                >
                  <ShieldCheck size={16} /> SOY MAYOR DE EDAD
                </button>
                <button
                  onClick={handleDeny}
                  className="flex-1 py-3.5 px-6 rounded-full border border-white/20 text-white/80 hover:bg-white/5 hover:border-white/40 hover:text-white active:scale-95 transition-all text-sm tracking-wider font-semibold flex items-center justify-center gap-2"
                >
                  <ShieldX size={16} /> SOY MENOR DE EDAD
                </button>
              </div>

              <p className="mt-6 text-[10px] text-white/40 leading-relaxed max-w-sm mx-auto">
                Al ingresar confirmas tener al menos 18 años y aceptas nuestra política de
                privacidad y términos de uso. CONECTA-LT no se hace responsable por el uso
                indebido de la información publicada.
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="denied"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="conecta-agegate-bg fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="denied-title"
        >
          {/* Capa de fondo (partículas tenues) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40" aria-hidden="true">
            {particles.slice(0, 20).map((p) => (
              <span
                key={p.id}
                className="conecta-particle"
                style={{
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl bg-white/5 backdrop-blur-xl p-8 sm:p-10 text-center"
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
              Lo sentimos, pero este sitio web está dirigido exclusivamente a personas mayores
              de 18 años. Por favor, vuelve cuando cumplas con la edad legal requerida para
              consumir bebidas alcohólicas en Venezuela.
            </p>

            <button
              onClick={handleLeave}
              className="w-full py-3.5 px-6 rounded-2xl bg-white text-[#0c0c0c] font-bold hover:bg-[#FFD700] active:scale-95 transition-all text-sm tracking-wider flex items-center justify-center gap-2"
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
