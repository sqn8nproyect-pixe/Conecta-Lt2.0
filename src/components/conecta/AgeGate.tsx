'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldX, Wine, AlertTriangle, ExternalLink } from 'lucide-react';

interface AgeGateProps {
  onConfirm: () => void;
}

type GateState = 'verifying' | 'denied';

interface SvgBubble {
  id: number;
  cx: number;
  cy: number;
  r: number;
  delay: number;
  duration: number;
}

/**
 * Copa de champán SVG realista: flauta tulip con vidrio translúcido, reflejos
 * cilíndricos, líquido dorado con gradiente, corona de espuma (mousse),
 * burbujas que suben en cadenas desde puntos de nucleación, tallo elegante
 * y base con reflejo. `side` genera IDs únicos para evitar colisiones SVG.
 */
function ChampagneGlassSVG({
  side,
  bubbles,
}: {
  side: 'left' | 'right';
  bubbles: SvgBubble[];
}) {
  const uid = side;
  // Forma del bowl (flauta tulip): ancho arriba, se estrecha hacia el tallo
  const bowlPath =
    'M 30 15 C 26 35, 34 75, 44 98 C 48 106, 51 110, 54 113 L 66 113 C 69 110, 72 106, 76 98 C 86 75, 94 35, 90 15 Z';
  // Líquido dentro del bowl (desde y=45 hasta el fondo)
  const liquidPath =
    'M 32 45 C 34 58, 37 75, 41 90 C 44 100, 49 108, 54 112 L 66 112 C 71 108, 76 100, 79 90 C 83 75, 86 58, 88 45 Z';

  return (
    <svg
      viewBox="0 0 120 205"
      className="conecta-glass-svg"
      aria-hidden="true"
    >
      <defs>
        {/* Vidrio: degradado horizontal que simula curvatura cilíndrica */}
        <linearGradient id={`glass-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="10%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="90%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>

        {/* Champán: degradado vertical dorado (pálido arriba → profundo abajo) */}
        <linearGradient id={`liquid-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="25%" stopColor="#FFD700" />
          <stop offset="60%" stopColor="#F0B020" />
          <stop offset="100%" stopColor="#D88800" />
        </linearGradient>

        {/* Espuma (mousse): radial blanco → dorado pálido */}
        <radialGradient id={`foam-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="60%" stopColor="rgba(255,245,190,0.8)" />
          <stop offset="100%" stopColor="rgba(255,215,0,0.3)" />
        </radialGradient>

        {/* Superficie del líquido: brillo superior */}
        <linearGradient id={`surface-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Clip para que las burbujas solo se vean dentro del líquido */}
        <clipPath id={`liquidClip-${uid}`}>
          <path d={liquidPath} />
        </clipPath>

        {/* Glow suave para elementos dorados */}
        <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === Bowl (cuerpo de la copa) === */}
      <path
        d={bowlPath}
        fill={`url(#glass-${uid})`}
        stroke="rgba(255,215,0,0.55)"
        strokeWidth="1.4"
      />

      {/* Borde superior (la boca de la copa) — da profundidad 3D */}
      <ellipse
        cx="60"
        cy="15"
        rx="30"
        ry="5"
        fill="rgba(255,240,180,0.06)"
        stroke="rgba(255,215,0,0.65)"
        strokeWidth="1.4"
      />
      <ellipse cx="60" cy="15" rx="28" ry="3.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.7" />

      {/* === Líquido (champán) === */}
      <path d={liquidPath} fill={`url(#liquid-${uid})`} opacity="0.92" />

      {/* Superficie del líquido (menisco + brillo) */}
      <ellipse cx="60" cy="45" rx="28" ry="3.2" fill={`url(#surface-${uid})`} opacity="0.8" />
      <ellipse
        cx="60"
        cy="45"
        rx="28"
        ry="2.2"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.8"
      />

      {/* === Corona de espuma (mousse) en la superficie === */}
      <g filter={`url(#glow-${uid})`}>
        <circle cx="40" cy="44" r="2.6" fill={`url(#foam-${uid})`} />
        <circle cx="46" cy="42" r="2" fill={`url(#foam-${uid})`} />
        <circle cx="52" cy="43" r="2.8" fill={`url(#foam-${uid})`} />
        <circle cx="59" cy="42" r="2.3" fill={`url(#foam-${uid})`} />
        <circle cx="66" cy="43" r="2.6" fill={`url(#foam-${uid})`} />
        <circle cx="72" cy="42" r="2" fill={`url(#foam-${uid})`} />
        <circle cx="78" cy="44" r="2.4" fill={`url(#foam-${uid})`} />
        <circle cx="83" cy="45" r="1.6" fill={`url(#foam-${uid})`} />
        <circle cx="36" cy="45" r="1.5" fill={`url(#foam-${uid})`} />
      </g>

      {/* === Burbujas subiendo en cadenas (clip al líquido) === */}
      <g clipPath={`url(#liquidClip-${uid})`}>
        {bubbles.map((b) => (
          <circle
            key={b.id}
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill="rgba(255,255,255,0.8)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.3"
            className="conecta-svg-bubble"
            style={{
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}
      </g>

      {/* Puntos de nucleación en el fondo (origen de las burbujas) */}
      <circle cx="47" cy="108" r="0.7" fill="rgba(255,255,255,0.6)" />
      <circle cx="60" cy="109" r="0.7" fill="rgba(255,255,255,0.6)" />
      <circle cx="73" cy="108" r="0.7" fill="rgba(255,255,255,0.6)" />

      {/* === Reflejos del vidrio (brillos verticales cilíndricos) === */}
      <path
        d="M 37 22 C 35 50, 39 85, 43 105"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 40 26 C 38 48, 41 72, 44 92"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 82 28 C 84 50, 82 76, 78 96"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Brillo del borde superior */}
      <path
        d="M 38 13.5 Q 60 9.5, 82 13.5"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />

      {/* === Tallo elegante (ligeramente cónico) === */}
      <path
        d="M 57 113 L 56.5 183 L 63.5 183 L 63 113 Z"
        fill={`url(#glass-${uid})`}
        stroke="rgba(255,215,0,0.4)"
        strokeWidth="0.8"
      />
      {/* Brillo del tallo */}
      <line
        x1="59"
        y1="116"
        x2="58.5"
        y2="181"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* === Base === */}
      <ellipse
        cx="60"
        cy="190"
        rx="26"
        ry="5"
        fill={`url(#glass-${uid})`}
        stroke="rgba(255,215,0,0.55)"
        strokeWidth="1.2"
      />
      {/* Reflejo superior de la base */}
      <ellipse cx="60" cy="188.5" rx="23" ry="3" fill="rgba(255,215,0,0.14)" />
      {/* Brillo en la base */}
      <ellipse cx="54" cy="187.5" rx="8" ry="1.2" fill="rgba(255,255,255,0.38)" />
      {/* Resplandor dorado bajo la base */}
      <ellipse
        cx="60"
        cy="195"
        rx="22"
        ry="2"
        fill="rgba(255,215,0,0.16)"
        filter={`url(#glow-${uid})`}
      />
    </svg>
  );
}

/**
 * Wrapper con parallax + animación de brindis que contiene el SVG realista.
 */
function ChampagneGlass({
  side,
  bubbles,
  parallaxRef,
}: {
  side: 'left' | 'right';
  bubbles: SvgBubble[];
  parallaxRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="conecta-glass-wrap" ref={parallaxRef}>
      <div className={`conecta-glass ${side === 'right' ? 'is-right' : ''}`}>
        <ChampagneGlassSVG side={side} bubbles={bubbles} />
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

  // Genera burbujas en "streams" (cadenas) desde puntos de nucleación en el
  // fondo de la copa — como el champán real. Todas arrancan en el fondo (cy=106)
  // con delays repartidos para que siempre haya burbujas subiendo.
  const makeBubbles = useCallback((nucleationXs: number[]): SvgBubble[] => {
    let id = 0;
    const result: SvgBubble[] = [];
    nucleationXs.forEach((nx) => {
      const count = 5 + Math.floor(Math.random() * 3); // 5-7 por cadena
      for (let i = 0; i < count; i++) {
        result.push({
          id: id++,
          cx: nx + (Math.random() * 3 - 1.5),
          cy: 106,
          r: 0.8 + Math.random() * 1.6,
          delay: (i / count) * 2.4,
          duration: 2 + Math.random() * 1.2,
        });
      }
    });
    return result;
  }, []);

  const bubblesLeft = useMemo(() => makeBubbles([47, 60, 73]), [makeBubbles]);
  const bubblesRight = useMemo(() => makeBubbles([48, 60, 72]), [makeBubbles]);

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
